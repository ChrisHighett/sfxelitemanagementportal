CREATE POLICY "agents read portal users in their agency"
ON public.portal_users
FOR SELECT
TO authenticated
USING (
  public.is_agent() AND agency_id = public.current_agency_id()
);