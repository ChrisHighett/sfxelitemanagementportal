CREATE POLICY "eleva_ops can insert scout leads"
  ON public.scout_leads
  FOR INSERT
  WITH CHECK (
    public.is_eleva_ops()
    AND created_by = auth.uid()
  );

CREATE POLICY "eleva_ops can update scout leads"
  ON public.scout_leads
  FOR UPDATE
  USING ( public.is_eleva_ops() )
  WITH CHECK ( public.is_eleva_ops() );