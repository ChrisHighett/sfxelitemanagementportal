-- athlete_tasks: scope admin writes to own agency
DROP POLICY IF EXISTS "admin write athlete_tasks insert" ON public.athlete_tasks;
DROP POLICY IF EXISTS "admin write athlete_tasks update" ON public.athlete_tasks;
DROP POLICY IF EXISTS "admin write athlete_tasks delete" ON public.athlete_tasks;

CREATE POLICY "admin write athlete_tasks insert" ON public.athlete_tasks FOR INSERT TO authenticated
  WITH CHECK (is_admin() AND agency_id IS NOT NULL AND agency_id = current_agency_id());
CREATE POLICY "admin write athlete_tasks update" ON public.athlete_tasks FOR UPDATE TO authenticated
  USING (is_admin() AND agency_id IS NOT NULL AND agency_id = current_agency_id())
  WITH CHECK (is_admin() AND agency_id IS NOT NULL AND agency_id = current_agency_id());
CREATE POLICY "admin write athlete_tasks delete" ON public.athlete_tasks FOR DELETE TO authenticated
  USING (is_admin() AND agency_id IS NOT NULL AND agency_id = current_agency_id());

-- call_history: scope admin writes + tighten the loose admin read to strict equality
DROP POLICY IF EXISTS "admin write call_history insert" ON public.call_history;
DROP POLICY IF EXISTS "admin write call_history update" ON public.call_history;
DROP POLICY IF EXISTS "admin write call_history delete" ON public.call_history;
DROP POLICY IF EXISTS "admin read call_history by agency" ON public.call_history;

CREATE POLICY "admin read call_history by agency" ON public.call_history FOR SELECT TO authenticated
  USING (is_admin() AND agency_id IS NOT NULL AND agency_id = current_agency_id());
CREATE POLICY "admin write call_history insert" ON public.call_history FOR INSERT TO authenticated
  WITH CHECK (is_admin() AND agency_id IS NOT NULL AND agency_id = current_agency_id());
CREATE POLICY "admin write call_history update" ON public.call_history FOR UPDATE TO authenticated
  USING (is_admin() AND agency_id IS NOT NULL AND agency_id = current_agency_id())
  WITH CHECK (is_admin() AND agency_id IS NOT NULL AND agency_id = current_agency_id());
CREATE POLICY "admin write call_history delete" ON public.call_history FOR DELETE TO authenticated
  USING (is_admin() AND agency_id IS NOT NULL AND agency_id = current_agency_id());

-- monthly_reviews: scope admin writes to own agency
DROP POLICY IF EXISTS "admin write monthly_reviews insert" ON public.monthly_reviews;
DROP POLICY IF EXISTS "admin write monthly_reviews update" ON public.monthly_reviews;
DROP POLICY IF EXISTS "admin write monthly_reviews delete" ON public.monthly_reviews;

CREATE POLICY "admin write monthly_reviews insert" ON public.monthly_reviews FOR INSERT TO authenticated
  WITH CHECK (is_admin() AND agency_id IS NOT NULL AND agency_id = current_agency_id());
CREATE POLICY "admin write monthly_reviews update" ON public.monthly_reviews FOR UPDATE TO authenticated
  USING (is_admin() AND agency_id IS NOT NULL AND agency_id = current_agency_id())
  WITH CHECK (is_admin() AND agency_id IS NOT NULL AND agency_id = current_agency_id());
CREATE POLICY "admin write monthly_reviews delete" ON public.monthly_reviews FOR DELETE TO authenticated
  USING (is_admin() AND agency_id IS NOT NULL AND agency_id = current_agency_id());