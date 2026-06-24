
ALTER TABLE public.scout_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins see all scout leads" ON public.scout_leads;
DROP POLICY IF EXISTS "Agents see only their assigned leads" ON public.scout_leads;

CREATE POLICY "admin read scout_leads by agency" ON public.scout_leads
  FOR SELECT TO authenticated
  USING (is_admin() AND agency_id IS NOT NULL AND agency_id = current_agency_id());

CREATE POLICY "agent read scout_leads assigned" ON public.scout_leads
  FOR SELECT TO authenticated
  USING (is_agent() AND assigned_agent_id = auth.uid());
