
ALTER TABLE public.agent_voice_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athlete_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_tracker ENABLE ROW LEVEL SECURITY;

-- ========== agent_voice_profiles ==========
DROP POLICY IF EXISTS "voice_profiles_read_any_auth" ON public.agent_voice_profiles;

CREATE POLICY "voice_profiles_owner_read" ON public.agent_voice_profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR is_admin());

-- ========== athlete_alerts ==========
DROP POLICY IF EXISTS "admin full access alerts" ON public.athlete_alerts;
DROP POLICY IF EXISTS "Admin or assigned agent manage alerts" ON public.athlete_alerts;

-- Writes (admin full; assigned agent for their athletes)
CREATE POLICY "admin write athlete_alerts insert" ON public.athlete_alerts
  FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "admin write athlete_alerts update" ON public.athlete_alerts
  FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "admin write athlete_alerts delete" ON public.athlete_alerts
  FOR DELETE TO authenticated USING (is_admin());

CREATE POLICY "agent write athlete_alerts insert" ON public.athlete_alerts
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.athletes a
            WHERE a.id = athlete_alerts.athlete_id AND a.assigned_agent_user_id = auth.uid())
  );
CREATE POLICY "agent write athlete_alerts update" ON public.athlete_alerts
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.athletes a
            WHERE a.id = athlete_alerts.athlete_id AND a.assigned_agent_user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.athletes a
            WHERE a.id = athlete_alerts.athlete_id AND a.assigned_agent_user_id = auth.uid())
  );
CREATE POLICY "agent write athlete_alerts delete" ON public.athlete_alerts
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.athletes a
            WHERE a.id = athlete_alerts.athlete_id AND a.assigned_agent_user_id = auth.uid())
  );

-- Scoped SELECTs
CREATE POLICY "admin read athlete_alerts by agency" ON public.athlete_alerts
  FOR SELECT TO authenticated
  USING (is_admin() AND agency_id IS NOT NULL AND agency_id = current_agency_id());
CREATE POLICY "agent read athlete_alerts assigned" ON public.athlete_alerts
  FOR SELECT TO authenticated
  USING (
    is_agent() AND EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = athlete_alerts.athlete_id AND a.assigned_agent_user_id = auth.uid()
    )
  );

-- ========== goal_tracker ==========
DROP POLICY IF EXISTS "admin can manage goal_tracker" ON public.goal_tracker;
DROP POLICY IF EXISTS "agents can manage goal_tracker" ON public.goal_tracker;

CREATE POLICY "admin write goal_tracker insert" ON public.goal_tracker
  FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "admin write goal_tracker update" ON public.goal_tracker
  FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "admin write goal_tracker delete" ON public.goal_tracker
  FOR DELETE TO authenticated USING (is_admin());

CREATE POLICY "agent write goal_tracker insert" ON public.goal_tracker
  FOR INSERT TO authenticated WITH CHECK (
    is_agent() AND EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = goal_tracker.athlete_id AND a.assigned_agent_user_id = auth.uid()
    )
  );
CREATE POLICY "agent write goal_tracker update" ON public.goal_tracker
  FOR UPDATE TO authenticated USING (
    is_agent() AND EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = goal_tracker.athlete_id AND a.assigned_agent_user_id = auth.uid()
    )
  ) WITH CHECK (
    is_agent() AND EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = goal_tracker.athlete_id AND a.assigned_agent_user_id = auth.uid()
    )
  );
CREATE POLICY "agent write goal_tracker delete" ON public.goal_tracker
  FOR DELETE TO authenticated USING (
    is_agent() AND EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = goal_tracker.athlete_id AND a.assigned_agent_user_id = auth.uid()
    )
  );

CREATE POLICY "admin read goal_tracker by agency" ON public.goal_tracker
  FOR SELECT TO authenticated
  USING (is_admin() AND agency_id IS NOT NULL AND agency_id = current_agency_id());
CREATE POLICY "agent read goal_tracker assigned" ON public.goal_tracker
  FOR SELECT TO authenticated
  USING (
    is_agent() AND EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = goal_tracker.athlete_id AND a.assigned_agent_user_id = auth.uid()
    )
  );
