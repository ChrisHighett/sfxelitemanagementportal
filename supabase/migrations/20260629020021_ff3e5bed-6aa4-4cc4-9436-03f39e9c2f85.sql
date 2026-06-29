CREATE OR REPLACE FUNCTION public.approve_invite(_invite_id uuid)
 RETURNS TABLE(activation_token uuid, expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_invite public.user_invites%ROWTYPE;
  v_athlete_id uuid;
  v_token uuid := gen_random_uuid();
  v_expires timestamptz := now() + interval '14 days';
  v_inviter_agency uuid;
BEGIN
  IF NOT (public.is_admin() OR public.is_eleva_ops()) THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  SELECT * INTO v_invite FROM public.user_invites WHERE id = _invite_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'invite not found'; END IF;
  IF v_invite.status <> 'pending' THEN RAISE EXCEPTION 'invite not pending'; END IF;

  -- Always derive agency from the inviting user, never from the approver's session.
  SELECT agency_id INTO v_inviter_agency
    FROM public.portal_users WHERE id = v_invite.invited_by;

  -- Athlete invites without an athlete_id: create the athletes row now,
  -- linked to the inviting agent and their agency.
  IF v_invite.role = 'athlete' AND v_invite.athlete_id IS NULL THEN
    INSERT INTO public.athletes (first_name, last_name, email, assigned_agent_user_id, agency_id)
    VALUES (
      COALESCE(v_invite.athlete_first_name, 'New'),
      COALESCE(v_invite.athlete_last_name, 'Athlete'),
      v_invite.email,
      v_invite.invited_by,
      v_inviter_agency
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
$function$;

CREATE OR REPLACE FUNCTION public.finalize_invite_activation(_token uuid, _new_user_id uuid, _display_name text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_invite public.user_invites%ROWTYPE;
  v_inviter_agency uuid;
BEGIN
  SELECT * INTO v_invite
    FROM public.user_invites
   WHERE activation_token = _token
   FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'invalid token'; END IF;
  IF v_invite.status <> 'approved' THEN RAISE EXCEPTION 'invite not approved'; END IF;
  IF v_invite.token_expires_at < now() THEN RAISE EXCEPTION 'token expired'; END IF;

  -- Always derive agency from the inviting user.
  SELECT agency_id INTO v_inviter_agency
    FROM public.portal_users WHERE id = v_invite.invited_by;

  -- portal_users (handle_new_user trigger may have inserted a row already)
  INSERT INTO public.portal_users (id, role, approved, display_name, email, agency_id)
  VALUES (_new_user_id, v_invite.role, true, _display_name, v_invite.email, v_inviter_agency)
  ON CONFLICT (id) DO UPDATE
    SET role = EXCLUDED.role,
        approved = true,
        display_name = COALESCE(EXCLUDED.display_name, public.portal_users.display_name),
        email = EXCLUDED.email,
        agency_id = COALESCE(public.portal_users.agency_id, EXCLUDED.agency_id);

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
$function$;