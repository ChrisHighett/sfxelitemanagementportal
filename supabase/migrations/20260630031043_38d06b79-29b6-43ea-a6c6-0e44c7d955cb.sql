
CREATE OR REPLACE FUNCTION public.current_division_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT division_id FROM public.portal_users WHERE id = auth.uid()
$$;

DROP POLICY IF EXISTS "divisional_gm read portal_users in their division" ON public.portal_users;

CREATE POLICY "divisional_gm read portal_users in their division"
ON public.portal_users
FOR SELECT
USING (
  public.is_divisional_gm()
  AND agency_id = public.current_agency_id()
  AND division_id IS NOT NULL
  AND division_id = public.current_division_id()
);
