-- Enum values (must be committed before use)
ALTER TYPE public.alert_type ADD VALUE IF NOT EXISTS 'scout_lead_assigned';
ALTER TYPE public.alert_type ADD VALUE IF NOT EXISTS 'scout_action_overdue';
ALTER TYPE public.alert_type ADD VALUE IF NOT EXISTS 'scout_stage_stalled';

-- scout_leads table
CREATE TABLE IF NOT EXISTS public.scout_leads (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id                 text UNIQUE,
  date_in                 date DEFAULT CURRENT_DATE,
  scout_name              text,
  region                  text,
  first_name              text NOT NULL,
  last_name               text NOT NULL,
  age                     integer,
  position                text,
  school_club             text,
  comp_grade              text,
  key_attributes          text,
  competitor_interest     text,
  scout_rating            text CHECK (scout_rating IN ('A','B','C')),
  source_contact          text,
  triage_decision         text CHECK (triage_decision IN ('Pursue','Watch','Pass','Undecided')) DEFAULT 'Undecided',
  assigned_agent_id       uuid REFERENCES public.portal_users(id) ON DELETE SET NULL,
  assigned_agent_name     text,
  onboarding_stage        text CHECK (onboarding_stage IN ('New','Contacted','Pack Sent','Welcome Sent','Signed','Lost')) DEFAULT 'New',
  date_contacted          date,
  date_pack_sent          date,
  date_welcome_sent       date,
  date_signed             date,
  date_lost               date,
  scout_credited          boolean DEFAULT false,
  converted_athlete_id    uuid REFERENCES public.athletes(id) ON DELETE SET NULL,
  action_required         text,
  action_due_date         date,
  action_status           text CHECK (action_status IN ('Open','In Progress','Done','N/A')) DEFAULT 'Open',
  action_outcome          text,
  next_step               text,
  notes                   text,
  created_by              uuid REFERENCES public.portal_users(id) ON DELETE SET NULL,
  created_at              timestamptz DEFAULT now(),
  updated_at              timestamptz DEFAULT now(),
  last_stage_change_at    timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.scout_leads TO authenticated;
GRANT ALL ON public.scout_leads TO service_role;

ALTER TABLE public.scout_leads ENABLE ROW LEVEL SECURITY;

-- Auto-update updated_at and last_stage_change_at
CREATE OR REPLACE FUNCTION public.handle_scout_lead_update()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.onboarding_stage IS DISTINCT FROM OLD.onboarding_stage THEN
    NEW.last_stage_change_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_scout_lead_updated ON public.scout_leads;
CREATE TRIGGER on_scout_lead_updated
  BEFORE UPDATE ON public.scout_leads
  FOR EACH ROW EXECUTE FUNCTION public.handle_scout_lead_update();

-- Auto-generate lead_id
CREATE OR REPLACE FUNCTION public.generate_lead_id()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  prefix text;
  seq    integer;
BEGIN
  IF NEW.lead_id IS NULL THEN
    prefix := COALESCE(UPPER(LEFT(NEW.region, 3)), 'TGI');
    SELECT COUNT(*) + 1 INTO seq
    FROM public.scout_leads
    WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM now());
    NEW.lead_id := prefix || '-' || EXTRACT(YEAR FROM now())::text || '-' || LPAD(seq::text, 3, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS before_scout_lead_insert ON public.scout_leads;
CREATE TRIGGER before_scout_lead_insert
  BEFORE INSERT ON public.scout_leads
  FOR EACH ROW EXECUTE FUNCTION public.generate_lead_id();

-- RLS policies
DROP POLICY IF EXISTS "Admins see all scout leads"   ON public.scout_leads;
DROP POLICY IF EXISTS "Agents see assigned leads"     ON public.scout_leads;
DROP POLICY IF EXISTS "Agents can insert scout leads" ON public.scout_leads;
DROP POLICY IF EXISTS "Agents can update their leads" ON public.scout_leads;

CREATE POLICY "Admins see all scout leads"
  ON public.scout_leads FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "Agents see assigned leads"
  ON public.scout_leads FOR SELECT TO authenticated
  USING (assigned_agent_id = auth.uid() OR created_by = auth.uid());

CREATE POLICY "Agents can insert scout leads"
  ON public.scout_leads FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Agents can update their leads"
  ON public.scout_leads FOR UPDATE TO authenticated
  USING (assigned_agent_id = auth.uid() OR public.is_admin());