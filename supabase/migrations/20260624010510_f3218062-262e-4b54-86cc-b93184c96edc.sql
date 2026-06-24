ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user read own agency"
ON public.agencies
FOR SELECT
TO authenticated
USING (id = public.current_agency_id());