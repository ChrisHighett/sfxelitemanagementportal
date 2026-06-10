
-- 1. profiles: restrict SELECT
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Profiles select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_public" ON public.profiles;
CREATE POLICY "Users can view own profile or admins/agents view all"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin() OR public.is_agent());

-- 2. portal_users: remove self-insert; admin-only (trigger uses SECURITY DEFINER and bypasses RLS)
DROP POLICY IF EXISTS "Users can insert their own portal_users row" ON public.portal_users;
DROP POLICY IF EXISTS "portal_users_self_insert" ON public.portal_users;
DROP POLICY IF EXISTS "Users insert own portal_users" ON public.portal_users;
DROP POLICY IF EXISTS "Allow self insert" ON public.portal_users;
DROP POLICY IF EXISTS "portal_users insert" ON public.portal_users;
CREATE POLICY "Only admins can insert portal_users"
  ON public.portal_users FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- 3. is_portal_admin: require approved
CREATE OR REPLACE FUNCTION public.is_portal_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.portal_users
    WHERE id = user_id AND role = 'admin' AND approved = true
  );
$$;

-- 4. user_has_athlete_access: scope agents to assigned athletes
CREATE OR REPLACE FUNCTION public.user_has_athlete_access(user_uuid uuid, athlete_uuid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.portal_users
    WHERE id = user_uuid AND role = 'admin' AND approved = true
    UNION
    SELECT 1 FROM public.athletes a
    JOIN public.portal_users pu ON pu.id = user_uuid
    WHERE a.id = athlete_uuid
      AND pu.role = 'agent' AND pu.approved = true
      AND a.assigned_agent_user_id = user_uuid
    UNION
    SELECT 1 FROM public.user_athlete_access
    WHERE user_id = user_uuid AND athlete_id = athlete_uuid
      AND approved_at IS NOT NULL
  );
$$;

-- 5. athlete_alerts: scope agent + parent/athlete read
DROP POLICY IF EXISTS "agent manage alerts" ON public.athlete_alerts;
DROP POLICY IF EXISTS "Agents manage alerts" ON public.athlete_alerts;
CREATE POLICY "Admin or assigned agent manage alerts"
  ON public.athlete_alerts FOR ALL
  TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.athletes a WHERE a.id = athlete_alerts.athlete_id AND a.assigned_agent_user_id = auth.uid())
  )
  WITH CHECK (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.athletes a WHERE a.id = athlete_alerts.athlete_id AND a.assigned_agent_user_id = auth.uid())
  );
CREATE POLICY "Parents and athletes can view their alerts"
  ON public.athlete_alerts FOR SELECT
  TO authenticated
  USING (public.is_approved_parent_or_athlete_for(athlete_id));

-- 6. athlete_tasks: scope agent
DROP POLICY IF EXISTS "agent manage tasks" ON public.athlete_tasks;
DROP POLICY IF EXISTS "Agents manage tasks" ON public.athlete_tasks;
CREATE POLICY "Admin or assigned agent manage tasks"
  ON public.athlete_tasks FOR ALL
  TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.athletes a WHERE a.id = athlete_tasks.athlete_id AND a.assigned_agent_user_id = auth.uid())
  )
  WITH CHECK (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.athletes a WHERE a.id = athlete_tasks.athlete_id AND a.assigned_agent_user_id = auth.uid())
  );

-- 7. comms_history: scope agent + parent/athlete read
DROP POLICY IF EXISTS "agent_manage_comms_history" ON public.comms_history;
DROP POLICY IF EXISTS "Agents manage comms history" ON public.comms_history;
CREATE POLICY "Admin or assigned agent manage comms history"
  ON public.comms_history FOR ALL
  TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.athletes a WHERE a.id = comms_history.athlete_id AND a.assigned_agent_user_id = auth.uid())
  )
  WITH CHECK (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.athletes a WHERE a.id = comms_history.athlete_id AND a.assigned_agent_user_id = auth.uid())
  );
CREATE POLICY "Parents and athletes can view comms history"
  ON public.comms_history FOR SELECT
  TO authenticated
  USING (public.is_approved_parent_or_athlete_for(athlete_id));

-- 8. athlete-resources storage SELECT scoped
DROP POLICY IF EXISTS "authenticated_read_athlete_resources" ON storage.objects;
CREATE POLICY "athlete_resources_scoped_read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'athlete-resources'
    AND EXISTS (
      SELECT 1 FROM public.athlete_resources ar
      WHERE ar.file_path = storage.objects.name
        AND (
          public.is_admin()
          OR EXISTS (SELECT 1 FROM public.athletes a WHERE a.id = ar.athlete_id AND a.assigned_agent_user_id = auth.uid())
          OR public.is_approved_parent_or_athlete_for(ar.athlete_id)
        )
    )
  );

-- 9. call-audio: add parent/athlete SELECT scoped via call_history
CREATE POLICY "Parents and athletes can read their call audio"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'call-audio'
    AND EXISTS (
      SELECT 1 FROM public.call_history ch
      WHERE ch.audio_file_url IS NOT NULL
        AND position(storage.objects.name in ch.audio_file_url) > 0
        AND public.is_approved_parent_or_athlete_for(ch.athlete_id)
    )
  );

-- 10. resources bucket: remove broad authenticated listing (public URLs still work for public buckets)
DROP POLICY IF EXISTS "Authenticated users can read resource files" ON storage.objects;

-- 11. Revoke EXECUTE from anon on internal SECURITY DEFINER helpers
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_agent() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_portal_admin(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.user_has_athlete_access(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_approved_parent_or_athlete_for(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.current_user_role() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.generate_athlete_code(text, text) FROM anon, public, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, public, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_blank_tracker_for_new_athlete() FROM anon, public, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_wellbeing_alert() FROM anon, public, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_athlete_code() FROM anon, public, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon, public, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, public, authenticated;
