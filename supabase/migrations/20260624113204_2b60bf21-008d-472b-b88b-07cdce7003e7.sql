-- AGENT_ACTIVITY
DROP POLICY IF EXISTS "Admins can read all activity" ON public.agent_activity;
CREATE POLICY "admin read agent_activity by agency" ON public.agent_activity FOR SELECT TO authenticated
  USING (is_admin() AND EXISTS (
    SELECT 1 FROM public.portal_users pu
    WHERE pu.id = agent_activity.agent_id AND pu.agency_id = current_agency_id()));
CREATE POLICY "eleva_ops read agent_activity all" ON public.agent_activity FOR SELECT TO authenticated
  USING (is_eleva_ops());

-- COMMS_LOG read
DROP POLICY IF EXISTS "admin read comms_log by agency" ON public.comms_log;
CREATE POLICY "admin read comms_log by agency" ON public.comms_log FOR SELECT TO authenticated
  USING (is_admin() AND agency_id = current_agency_id());

-- COMMS_LOG writes
DROP POLICY IF EXISTS "Admins and agents write comms_log insert" ON public.comms_log;
DROP POLICY IF EXISTS "Admins and agents write comms_log update" ON public.comms_log;
DROP POLICY IF EXISTS "Admins and agents write comms_log delete" ON public.comms_log;

CREATE POLICY "admin insert comms_log by agency" ON public.comms_log FOR INSERT TO authenticated
  WITH CHECK (is_admin() AND agency_id = current_agency_id());
CREATE POLICY "admin update comms_log by agency" ON public.comms_log FOR UPDATE TO authenticated
  USING (is_admin() AND agency_id = current_agency_id())
  WITH CHECK (is_admin() AND agency_id = current_agency_id());
CREATE POLICY "admin delete comms_log by agency" ON public.comms_log FOR DELETE TO authenticated
  USING (is_admin() AND agency_id = current_agency_id());

CREATE POLICY "agent insert comms_log assigned" ON public.comms_log FOR INSERT TO authenticated
  WITH CHECK (is_agent() AND EXISTS (
    SELECT 1 FROM public.athletes a WHERE a.id = comms_log.athlete_id
      AND (a.assigned_agent_user_id = auth.uid() OR a.assigned_agent_id = auth.uid())));
CREATE POLICY "agent update comms_log assigned" ON public.comms_log FOR UPDATE TO authenticated
  USING (is_agent() AND EXISTS (
    SELECT 1 FROM public.athletes a WHERE a.id = comms_log.athlete_id
      AND (a.assigned_agent_user_id = auth.uid() OR a.assigned_agent_id = auth.uid())))
  WITH CHECK (is_agent() AND EXISTS (
    SELECT 1 FROM public.athletes a WHERE a.id = comms_log.athlete_id
      AND (a.assigned_agent_user_id = auth.uid() OR a.assigned_agent_id = auth.uid())));
CREATE POLICY "agent delete comms_log assigned" ON public.comms_log FOR DELETE TO authenticated
  USING (is_agent() AND EXISTS (
    SELECT 1 FROM public.athletes a WHERE a.id = comms_log.athlete_id
      AND (a.assigned_agent_user_id = auth.uid() OR a.assigned_agent_id = auth.uid())));

CREATE POLICY "eleva_ops write comms_log all" ON public.comms_log FOR ALL TO authenticated
  USING (is_eleva_ops()) WITH CHECK (is_eleva_ops());