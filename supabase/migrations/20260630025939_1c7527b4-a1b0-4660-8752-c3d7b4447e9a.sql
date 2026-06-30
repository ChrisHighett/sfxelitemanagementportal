CREATE POLICY "divisional_gm read portal_users in their division"
ON public.portal_users
FOR SELECT
USING (
  is_divisional_gm()
  AND agency_id = current_agency_id()
  AND division_id IS NOT NULL
  AND division_id = (SELECT division_id FROM public.portal_users WHERE id = auth.uid())
);