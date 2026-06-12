
-- =========================================================================
-- 1. Extend guardians: add guardian_user_id (nullable to keep legacy rows OK)
-- =========================================================================
ALTER TABLE public.guardians
  ADD COLUMN IF NOT EXISTS guardian_user_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS guardians_user_athlete_unique
  ON public.guardians (guardian_user_id, athlete_id)
  WHERE guardian_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS guardians_user_idx
  ON public.guardians (guardian_user_id);

-- =========================================================================
-- 2. user_invites
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.user_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('agent','scout','athlete','parent')),
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  athlete_id uuid REFERENCES public.athletes(id) ON DELETE CASCADE,
  athlete_first_name text,
  athlete_last_name  text,
  relationship text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','declined','activated')),
  activation_token uuid,
  token_expires_at timestamptz,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  activated_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  activated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS user_invites_token_unique
  ON public.user_invites (activation_token)
  WHERE activation_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS user_invites_status_idx
  ON public.user_invites (status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_invites TO authenticated;
GRANT ALL ON public.user_invites TO service_role;

ALTER TABLE public.user_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage all invites" ON public.user_invites;
CREATE POLICY "Admins manage all invites"
  ON public.user_invites
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Agents see and create their invites" ON public.user_invites;
CREATE POLICY "Agents see and create their invites"
  ON public.user_invites
  FOR SELECT
  TO authenticated
  USING (invited_by = auth.uid());

DROP POLICY IF EXISTS "Agents insert own invites" ON public.user_invites;
CREATE POLICY "Agents insert own invites"
  ON public.user_invites
  FOR INSERT
  TO authenticated
  WITH CHECK (
    invited_by = auth.uid()
    AND role IN ('athlete','parent')
    AND public.is_agent()
  );

CREATE TRIGGER user_invites_set_updated_at
  BEFORE UPDATE ON public.user_invites
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- 3. RPCs
-- =========================================================================

-- Approve: admin only. Creates athletes row if invite is for a brand-new athlete.
-- Mints activation token + 14 day expiry. Returns the token (UUID).
CREATE OR REPLACE FUNCTION public.approve_invite(_invite_id uuid)
RETURNS TABLE(activation_token uuid, expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite public.user_invites%ROWTYPE;
  v_athlete_id uuid;
  v_token uuid := gen_random_uuid();
  v_expires timestamptz := now() + interval '14 days';
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  SELECT * INTO v_invite FROM public.user_invites WHERE id = _invite_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'invite not found'; END IF;
  IF v_invite.status <> 'pending' THEN RAISE EXCEPTION 'invite not pending'; END IF;

  -- Athlete invites without an athlete_id: create the athletes row now,
  -- linked to the inviting agent.
  IF v_invite.role = 'athlete' AND v_invite.athlete_id IS NULL THEN
    INSERT INTO public.athletes (first_name, last_name, email, assigned_agent_user_id)
    VALUES (
      COALESCE(v_invite.athlete_first_name, 'New'),
      COALESCE(v_invite.athlete_last_name, 'Athlete'),
      v_invite.email,
      v_invite.invited_by
    )
    RETURNING id INTO v_athlete_id;
  ELSE
    v_athlete_id := v_invite.athlete_id;
  END IF;

  UPDATE public.user_invites
     SET status = 'approved',
         athlete_id = v_athlete_id,
         activation_token = v_token,
         token_expires_at = v_expires,
         approved_by = auth.uid(),
         approved_at = now()
   WHERE id = _invite_id;

  RETURN QUERY SELECT v_token, v_expires;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_invite(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_invite(uuid) TO authenticated;

-- Decline
CREATE OR REPLACE FUNCTION public.decline_invite(_invite_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'admin only'; END IF;
  UPDATE public.user_invites
     SET status = 'declined',
         approved_by = auth.uid(),
         approved_at = now()
   WHERE id = _invite_id AND status = 'pending';
END;
$$;
REVOKE ALL ON FUNCTION public.decline_invite(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decline_invite(uuid) TO authenticated;

-- Lookup invite by token (used by activate page to render context). Returns minimal data.
CREATE OR REPLACE FUNCTION public.get_invite_by_token(_token uuid)
RETURNS TABLE(
  id uuid,
  email text,
  role text,
  athlete_id uuid,
  athlete_first_name text,
  athlete_last_name text,
  expired boolean,
  status text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    i.id,
    i.email,
    i.role,
    i.athlete_id,
    COALESCE(i.athlete_first_name, a.first_name),
    COALESCE(i.athlete_last_name,  a.last_name),
    (i.token_expires_at IS NOT NULL AND i.token_expires_at < now()),
    i.status
  FROM public.user_invites i
  LEFT JOIN public.athletes a ON a.id = i.athlete_id
  WHERE i.activation_token = _token
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_invite_by_token(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_invite_by_token(uuid) TO anon, authenticated;

-- Finalise activation. Called by edge function AFTER it has created the auth user.
-- Receives the new auth user_id, writes portal_users (approved=true), and for
-- parent invites creates the guardians link.
CREATE OR REPLACE FUNCTION public.finalize_invite_activation(
  _token uuid,
  _new_user_id uuid,
  _display_name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite public.user_invites%ROWTYPE;
BEGIN
  SELECT * INTO v_invite
    FROM public.user_invites
   WHERE activation_token = _token
   FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'invalid token'; END IF;
  IF v_invite.status <> 'approved' THEN RAISE EXCEPTION 'invite not approved'; END IF;
  IF v_invite.token_expires_at < now() THEN RAISE EXCEPTION 'token expired'; END IF;

  -- portal_users (handle_new_user trigger may have inserted a row already)
  INSERT INTO public.portal_users (id, role, approved, display_name, email)
  VALUES (_new_user_id, v_invite.role, true, _display_name, v_invite.email)
  ON CONFLICT (id) DO UPDATE
    SET role = EXCLUDED.role,
        approved = true,
        display_name = COALESCE(EXCLUDED.display_name, public.portal_users.display_name),
        email = EXCLUDED.email;

  IF v_invite.role = 'parent' AND v_invite.athlete_id IS NOT NULL THEN
    INSERT INTO public.guardians (athlete_id, parent_name, parent_email, relationship, guardian_user_id)
    VALUES (
      v_invite.athlete_id,
      COALESCE(_display_name, v_invite.email),
      v_invite.email,
      COALESCE(v_invite.relationship, 'guardian'),
      _new_user_id
    )
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_invite.role = 'athlete' AND v_invite.athlete_id IS NOT NULL THEN
    -- Also keep the existing user_athlete_access path populated so legacy code paths work.
    INSERT INTO public.user_athlete_access (user_id, athlete_id, relationship_type, approved_by, approved_at)
    VALUES (_new_user_id, v_invite.athlete_id, 'athlete', v_invite.approved_by, now())
    ON CONFLICT DO NOTHING;
  END IF;

  UPDATE public.user_invites
     SET status = 'activated',
         activated_user_id = _new_user_id,
         activated_at = now(),
         activation_token = NULL
   WHERE id = v_invite.id;
END;
$$;
REVOKE ALL ON FUNCTION public.finalize_invite_activation(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finalize_invite_activation(uuid, uuid, text) TO service_role;

-- =========================================================================
-- 4. Helper: is_parent_of_via_guardians
-- =========================================================================
CREATE OR REPLACE FUNCTION public.is_guardian_of(_athlete_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.guardians
    WHERE guardian_user_id = auth.uid()
      AND athlete_id = _athlete_id
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_guardian_of(uuid) TO authenticated;

-- =========================================================================
-- 5. Parent-scoped read policies via guardians (ADDITIVE — existing policies stay)
-- =========================================================================

-- athletes
DROP POLICY IF EXISTS "Guardians view own child athlete" ON public.athletes;
CREATE POLICY "Guardians view own child athlete"
  ON public.athletes FOR SELECT TO authenticated
  USING (public.is_guardian_of(id));

-- monthly_reviews
DROP POLICY IF EXISTS "Guardians view child reviews" ON public.monthly_reviews;
CREATE POLICY "Guardians view child reviews"
  ON public.monthly_reviews FOR SELECT TO authenticated
  USING (public.is_guardian_of(athlete_id));

-- goal_tracker
DROP POLICY IF EXISTS "Guardians view child goals" ON public.goal_tracker;
CREATE POLICY "Guardians view child goals"
  ON public.goal_tracker FOR SELECT TO authenticated
  USING (public.is_guardian_of(athlete_id));

-- athlete_tasks
DROP POLICY IF EXISTS "Guardians view child tasks" ON public.athlete_tasks;
CREATE POLICY "Guardians view child tasks"
  ON public.athlete_tasks FOR SELECT TO authenticated
  USING (public.is_guardian_of(athlete_id));

-- athlete_scorecards
DROP POLICY IF EXISTS "Guardians view child scorecards" ON public.athlete_scorecards;
CREATE POLICY "Guardians view child scorecards"
  ON public.athlete_scorecards FOR SELECT TO authenticated
  USING (public.is_guardian_of(athlete_id));

-- athlete_timeline_events
DROP POLICY IF EXISTS "Guardians view child timeline" ON public.athlete_timeline_events;
CREATE POLICY "Guardians view child timeline"
  ON public.athlete_timeline_events FOR SELECT TO authenticated
  USING (public.is_guardian_of(athlete_id));

-- athlete_resources
DROP POLICY IF EXISTS "Guardians view child resources" ON public.athlete_resources;
CREATE POLICY "Guardians view child resources"
  ON public.athlete_resources FOR SELECT TO authenticated
  USING (public.is_guardian_of(athlete_id));
