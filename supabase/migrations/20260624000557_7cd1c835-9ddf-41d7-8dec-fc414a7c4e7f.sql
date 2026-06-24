
-- Helper: current user's agency
CREATE OR REPLACE FUNCTION public.current_agency_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT agency_id FROM public.portal_users WHERE id = auth.uid()
$$;

-- Ensure RLS on
ALTER TABLE public.call_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comms_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comms_log ENABLE ROW LEVEL SECURITY;

-- ============ call_history ============
-- Split "admin full access call_history" (ALL) -> keep writes, drop broad SELECT
DROP POLICY IF EXISTS "admin full access call_history" ON public.call_history;
CREATE POLICY "admin write call_history insert" ON public.call_history
  FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "admin write call_history update" ON public.call_history
  FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "admin write call_history delete" ON public.call_history
  FOR DELETE TO authenticated USING (is_admin());

-- Split "agent manage call_history" (ALL) -> keep writes, drop broad SELECT
DROP POLICY IF EXISTS "agent manage call_history" ON public.call_history;
CREATE POLICY "agent write call_history insert" ON public.call_history
  FOR INSERT TO authenticated WITH CHECK (
    is_agent() AND EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = call_history.athlete_id AND a.assigned_agent_user_id = auth.uid()
    )
  );
CREATE POLICY "agent write call_history update" ON public.call_history
  FOR UPDATE TO authenticated
  USING (is_agent() AND EXISTS (
    SELECT 1 FROM public.athletes a
    WHERE a.id = call_history.athlete_id AND a.assigned_agent_user_id = auth.uid()))
  WITH CHECK (is_agent() AND EXISTS (
    SELECT 1 FROM public.athletes a
    WHERE a.id = call_history.athlete_id AND a.assigned_agent_user_id = auth.uid()));
CREATE POLICY "agent write call_history delete" ON public.call_history
  FOR DELETE TO authenticated USING (
    is_agent() AND EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = call_history.athlete_id AND a.assigned_agent_user_id = auth.uid()
    )
  );

-- New scoped SELECT policies
CREATE POLICY "admin read call_history by agency" ON public.call_history
  FOR SELECT TO authenticated
  USING (is_admin() AND agency_id IS NOT DISTINCT FROM public.current_agency_id());
CREATE POLICY "agent read call_history assigned" ON public.call_history
  FOR SELECT TO authenticated
  USING (is_agent() AND EXISTS (
    SELECT 1 FROM public.athletes a
    WHERE a.id = call_history.athlete_id AND a.assigned_agent_user_id = auth.uid()
  ));

-- ============ comms_history ============
DROP POLICY IF EXISTS "admin_full_access_comms_history" ON public.comms_history;
CREATE POLICY "admin write comms_history insert" ON public.comms_history
  FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "admin write comms_history update" ON public.comms_history
  FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "admin write comms_history delete" ON public.comms_history
  FOR DELETE TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "Admin or assigned agent manage comms history" ON public.comms_history;
CREATE POLICY "admin or agent write comms_history insert" ON public.comms_history
  FOR INSERT TO authenticated WITH CHECK (
    is_admin() OR EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = comms_history.athlete_id AND a.assigned_agent_user_id = auth.uid()
    )
  );
CREATE POLICY "admin or agent write comms_history update" ON public.comms_history
  FOR UPDATE TO authenticated
  USING (is_admin() OR EXISTS (
    SELECT 1 FROM public.athletes a
    WHERE a.id = comms_history.athlete_id AND a.assigned_agent_user_id = auth.uid()))
  WITH CHECK (is_admin() OR EXISTS (
    SELECT 1 FROM public.athletes a
    WHERE a.id = comms_history.athlete_id AND a.assigned_agent_user_id = auth.uid()));
CREATE POLICY "admin or agent write comms_history delete" ON public.comms_history
  FOR DELETE TO authenticated USING (
    is_admin() OR EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = comms_history.athlete_id AND a.assigned_agent_user_id = auth.uid()
    )
  );

CREATE POLICY "admin read comms_history by agency" ON public.comms_history
  FOR SELECT TO authenticated
  USING (is_admin() AND agency_id IS NOT DISTINCT FROM public.current_agency_id());
CREATE POLICY "agent read comms_history assigned" ON public.comms_history
  FOR SELECT TO authenticated
  USING (is_agent() AND EXISTS (
    SELECT 1 FROM public.athletes a
    WHERE a.id = comms_history.athlete_id AND a.assigned_agent_user_id = auth.uid()
  ));

-- ============ comms_log ============
-- Drop broad SELECT
DROP POLICY IF EXISTS "Admins and agents can view all comms" ON public.comms_log;
-- Split ALL policy: preserve writes for admin/agent, remove broad SELECT
DROP POLICY IF EXISTS "Admins and agents can manage comms" ON public.comms_log;
CREATE POLICY "Admins and agents write comms_log insert" ON public.comms_log
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.portal_users
            WHERE id = auth.uid() AND role IN ('admin','agent'))
  );
CREATE POLICY "Admins and agents write comms_log update" ON public.comms_log
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.portal_users
                 WHERE id = auth.uid() AND role IN ('admin','agent')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.portal_users
                      WHERE id = auth.uid() AND role IN ('admin','agent')));
CREATE POLICY "Admins and agents write comms_log delete" ON public.comms_log
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.portal_users
                 WHERE id = auth.uid() AND role IN ('admin','agent')));

CREATE POLICY "admin read comms_log by agency" ON public.comms_log
  FOR SELECT TO authenticated
  USING (is_admin() AND agency_id IS NOT DISTINCT FROM public.current_agency_id());
CREATE POLICY "agent read comms_log assigned" ON public.comms_log
  FOR SELECT TO authenticated
  USING (is_agent() AND EXISTS (
    SELECT 1 FROM public.athletes a
    WHERE a.id = comms_log.athlete_id AND a.assigned_agent_user_id = auth.uid()
  ));
