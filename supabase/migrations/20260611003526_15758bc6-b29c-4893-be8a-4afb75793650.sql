ALTER TABLE public.scout_leads
  ADD COLUMN IF NOT EXISTS first_agent_action_at timestamptz;

ALTER TABLE public.scout_leads
  ADD COLUMN IF NOT EXISTS response_hours numeric GENERATED ALWAYS AS (
    CASE
      WHEN first_agent_action_at IS NOT NULL AND created_at IS NOT NULL
      THEN EXTRACT(EPOCH FROM (first_agent_action_at - created_at)) / 3600.0
      ELSE NULL
    END
  ) STORED;

CREATE OR REPLACE FUNCTION public.handle_scout_lead_first_action()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.onboarding_stage IS DISTINCT FROM OLD.onboarding_stage
     AND OLD.onboarding_stage = 'New'
     AND NEW.first_agent_action_at IS NULL THEN
    NEW.first_agent_action_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_scout_lead_first_action ON public.scout_leads;
CREATE TRIGGER on_scout_lead_first_action
  BEFORE UPDATE ON public.scout_leads
  FOR EACH ROW EXECUTE FUNCTION public.handle_scout_lead_first_action();

DROP POLICY IF EXISTS "Scouts see their own leads" ON public.scout_leads;
CREATE POLICY "Scouts see their own leads"
  ON public.scout_leads FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR assigned_agent_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.portal_users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Scouts can insert leads" ON public.scout_leads;
CREATE POLICY "Scouts can insert leads"
  ON public.scout_leads FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Scouts can update their own leads" ON public.scout_leads;
CREATE POLICY "Scouts can update their own leads"
  ON public.scout_leads FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR assigned_agent_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.portal_users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );