
ALTER TABLE public.athlete_resources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_full_access_athlete_resources" ON public.athlete_resources;
DROP POLICY IF EXISTS "agent_manage_athlete_resources" ON public.athlete_resources;

-- Admin writes scoped by agency
CREATE POLICY "admin write athlete_resources insert" ON public.athlete_resources
  FOR INSERT TO authenticated
  WITH CHECK (is_admin() AND agency_id IS NOT NULL AND agency_id = current_agency_id());
CREATE POLICY "admin write athlete_resources update" ON public.athlete_resources
  FOR UPDATE TO authenticated
  USING (is_admin() AND agency_id IS NOT NULL AND agency_id = current_agency_id())
  WITH CHECK (is_admin() AND agency_id IS NOT NULL AND agency_id = current_agency_id());
CREATE POLICY "admin write athlete_resources delete" ON public.athlete_resources
  FOR DELETE TO authenticated
  USING (is_admin() AND agency_id IS NOT NULL AND agency_id = current_agency_id());

-- Agent writes scoped to assigned athletes
CREATE POLICY "agent write athlete_resources insert" ON public.athlete_resources
  FOR INSERT TO authenticated
  WITH CHECK (
    is_agent() AND EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = athlete_resources.athlete_id AND a.assigned_agent_user_id = auth.uid()
    )
  );
CREATE POLICY "agent write athlete_resources update" ON public.athlete_resources
  FOR UPDATE TO authenticated
  USING (
    is_agent() AND EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = athlete_resources.athlete_id AND a.assigned_agent_user_id = auth.uid()
    )
  )
  WITH CHECK (
    is_agent() AND EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = athlete_resources.athlete_id AND a.assigned_agent_user_id = auth.uid()
    )
  );
CREATE POLICY "agent write athlete_resources delete" ON public.athlete_resources
  FOR DELETE TO authenticated
  USING (
    is_agent() AND EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = athlete_resources.athlete_id AND a.assigned_agent_user_id = auth.uid()
    )
  );

-- Scoped SELECTs
CREATE POLICY "admin read athlete_resources by agency" ON public.athlete_resources
  FOR SELECT TO authenticated
  USING (is_admin() AND agency_id IS NOT NULL AND agency_id = current_agency_id());
CREATE POLICY "agent read athlete_resources assigned" ON public.athlete_resources
  FOR SELECT TO authenticated
  USING (
    is_agent() AND EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = athlete_resources.athlete_id AND a.assigned_agent_user_id = auth.uid()
    )
  );
