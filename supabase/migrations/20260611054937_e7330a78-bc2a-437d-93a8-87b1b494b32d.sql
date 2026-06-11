ALTER TABLE public.scout_leads DROP CONSTRAINT IF EXISTS scout_leads_triage_decision_check;
ALTER TABLE public.scout_leads ADD CONSTRAINT scout_leads_triage_decision_check
  CHECK (triage_decision = ANY (ARRAY['Pursue'::text, 'Watch'::text, 'Pass'::text, 'Undecided'::text, 'Signed'::text, 'Lost'::text]));
UPDATE public.scout_leads SET triage_decision = 'Signed' WHERE onboarding_stage = 'Signed';
UPDATE public.scout_leads SET triage_decision = 'Lost' WHERE onboarding_stage = 'Lost';