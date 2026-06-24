
-- Ensure RLS enabled
ALTER TABLE public.guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athlete_tasks ENABLE ROW LEVEL SECURITY;

-- =========================
-- guardians
-- =========================
-- Drop broad-read SELECT and FOR ALL policies (writes recreated below)
DROP POLICY IF EXISTS "agents can read guardians of their athletes" ON public.guardians;
DROP POLICY IF EXISTS "admin can do everything on guardians" ON public.guardians;
DROP POLICY IF EXISTS "agents can manage guardians of their athletes" ON public.guardians;

-- Recreate writes (admin full; assigned agent for their athletes)
CREATE POLICY "admin write guardians insert" ON public.guardians
  FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "admin write guardians update" ON public.guardians
  FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "admin write guardians delete" ON public.guardians
  FOR DELETE TO authenticated USING (is_admin());

CREATE POLICY "agent write guardians insert" ON public.guardians
  FOR INSERT TO authenticated WITH CHECK (
    is_agent() AND guardian_user_id IS NULL AND EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = guardians.athlete_id AND a.assigned_agent_user_id = auth.uid()
    )
  );
CREATE POLICY "agent write guardians update" ON public.guardians
  FOR UPDATE TO authenticated USING (
    is_agent() AND EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = guardians.athlete_id AND a.assigned_agent_user_id = auth.uid()
    )
  ) WITH CHECK (
    is_agent() AND EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = guardians.athlete_id AND a.assigned_agent_user_id = auth.uid()
    )
  );
CREATE POLICY "agent write guardians delete" ON public.guardians
  FOR DELETE TO authenticated USING (
    is_agent() AND EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = guardians.athlete_id AND a.assigned_agent_user_id = auth.uid()
    )
  );

-- Scoped SELECTs
CREATE POLICY "admin read guardians by agency" ON public.guardians
  FOR SELECT TO authenticated
  USING (is_admin() AND agency_id IS NOT NULL AND agency_id = current_agency_id());
CREATE POLICY "agent read guardians assigned" ON public.guardians
  FOR SELECT TO authenticated
  USING (
    is_agent() AND EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = guardians.athlete_id AND a.assigned_agent_user_id = auth.uid()
    )
  );

-- =========================
-- monthly_reviews
-- =========================
DROP POLICY IF EXISTS "agents can read reviews of their athletes" ON public.monthly_reviews;
DROP POLICY IF EXISTS "admin can do everything on monthly_reviews" ON public.monthly_reviews;
DROP POLICY IF EXISTS "agents can manage reviews of their athletes" ON public.monthly_reviews;

-- Recreate writes
CREATE POLICY "admin write monthly_reviews insert" ON public.monthly_reviews
  FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "admin write monthly_reviews update" ON public.monthly_reviews
  FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "admin write monthly_reviews delete" ON public.monthly_reviews
  FOR DELETE TO authenticated USING (is_admin());

CREATE POLICY "agent write monthly_reviews insert" ON public.monthly_reviews
  FOR INSERT TO authenticated WITH CHECK (
    is_agent() AND EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = monthly_reviews.athlete_id AND a.assigned_agent_user_id = auth.uid()
    )
  );
CREATE POLICY "agent write monthly_reviews update" ON public.monthly_reviews
  FOR UPDATE TO authenticated USING (
    is_agent() AND EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = monthly_reviews.athlete_id AND a.assigned_agent_user_id = auth.uid()
    )
  ) WITH CHECK (
    is_agent() AND EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = monthly_reviews.athlete_id AND a.assigned_agent_user_id = auth.uid()
    )
  );
CREATE POLICY "agent write monthly_reviews delete" ON public.monthly_reviews
  FOR DELETE TO authenticated USING (
    is_agent() AND EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = monthly_reviews.athlete_id AND a.assigned_agent_user_id = auth.uid()
    )
  );

-- Scoped SELECTs
CREATE POLICY "admin read monthly_reviews by agency" ON public.monthly_reviews
  FOR SELECT TO authenticated
  USING (is_admin() AND agency_id IS NOT NULL AND agency_id = current_agency_id());
CREATE POLICY "agent read monthly_reviews assigned" ON public.monthly_reviews
  FOR SELECT TO authenticated
  USING (
    is_agent() AND EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = monthly_reviews.athlete_id AND a.assigned_agent_user_id = auth.uid()
    )
  );

-- =========================
-- athlete_tasks
-- =========================
DROP POLICY IF EXISTS "admin full access tasks" ON public.athlete_tasks;
DROP POLICY IF EXISTS "Admin or assigned agent manage tasks" ON public.athlete_tasks;

-- Recreate writes
CREATE POLICY "admin write athlete_tasks insert" ON public.athlete_tasks
  FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "admin write athlete_tasks update" ON public.athlete_tasks
  FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "admin write athlete_tasks delete" ON public.athlete_tasks
  FOR DELETE TO authenticated USING (is_admin());

CREATE POLICY "agent write athlete_tasks insert" ON public.athlete_tasks
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = athlete_tasks.athlete_id AND a.assigned_agent_user_id = auth.uid()
    )
  );
CREATE POLICY "agent write athlete_tasks update" ON public.athlete_tasks
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = athlete_tasks.athlete_id AND a.assigned_agent_user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = athlete_tasks.athlete_id AND a.assigned_agent_user_id = auth.uid()
    )
  );
CREATE POLICY "agent write athlete_tasks delete" ON public.athlete_tasks
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = athlete_tasks.athlete_id AND a.assigned_agent_user_id = auth.uid()
    )
  );

-- Scoped SELECTs
CREATE POLICY "admin read athlete_tasks by agency" ON public.athlete_tasks
  FOR SELECT TO authenticated
  USING (is_admin() AND agency_id IS NOT NULL AND agency_id = current_agency_id());
CREATE POLICY "agent read athlete_tasks assigned" ON public.athlete_tasks
  FOR SELECT TO authenticated
  USING (
    is_agent() AND EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = athlete_tasks.athlete_id AND a.assigned_agent_user_id = auth.uid()
    )
  );
