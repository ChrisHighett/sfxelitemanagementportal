GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

DROP POLICY IF EXISTS "Agents can insert athletes" ON public.athletes;

CREATE POLICY "Agents can insert athletes"
  ON public.athletes FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.portal_users
      WHERE id = auth.uid()
      AND role IN ('admin', 'agent')
    )
  );