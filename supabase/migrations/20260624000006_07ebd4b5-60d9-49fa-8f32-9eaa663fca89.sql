ALTER TABLE public.guardians ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES public.agencies(id);
ALTER TABLE public.scout_leads ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES public.agencies(id);
ALTER TABLE public.monthly_reviews ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES public.agencies(id);
ALTER TABLE public.comms_history ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES public.agencies(id);
ALTER TABLE public.comms_log ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES public.agencies(id);
ALTER TABLE public.call_history ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES public.agencies(id);
ALTER TABLE public.athlete_tasks ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES public.agencies(id);
ALTER TABLE public.athlete_alerts ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES public.agencies(id);
ALTER TABLE public.goal_tracker ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES public.agencies(id);
ALTER TABLE public.athlete_resources ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES public.agencies(id);

DO $$
DECLARE
  tgi uuid := (SELECT id FROM public.agencies WHERE slug = 'tgi');
BEGIN
  UPDATE public.guardians         SET agency_id = tgi WHERE agency_id IS NULL;
  UPDATE public.scout_leads       SET agency_id = tgi WHERE agency_id IS NULL;
  UPDATE public.monthly_reviews   SET agency_id = tgi WHERE agency_id IS NULL;
  UPDATE public.comms_history     SET agency_id = tgi WHERE agency_id IS NULL;
  UPDATE public.comms_log         SET agency_id = tgi WHERE agency_id IS NULL;
  UPDATE public.call_history      SET agency_id = tgi WHERE agency_id IS NULL;
  UPDATE public.athlete_tasks     SET agency_id = tgi WHERE agency_id IS NULL;
  UPDATE public.athlete_alerts    SET agency_id = tgi WHERE agency_id IS NULL;
  UPDATE public.goal_tracker      SET agency_id = tgi WHERE agency_id IS NULL;
  UPDATE public.athlete_resources SET agency_id = tgi WHERE agency_id IS NULL;
END $$;