ALTER TABLE public.athletes
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS footage_url text,
  ADD COLUMN IF NOT EXISTS key_attributes text,
  ADD COLUMN IF NOT EXISTS scout_rating text,
  ADD COLUMN IF NOT EXISTS scout_notes text,
  ADD COLUMN IF NOT EXISTS scout_credited boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS date_signed date,
  ADD COLUMN IF NOT EXISTS source_lead_id uuid REFERENCES public.scout_leads(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_athletes_source_lead_id ON public.athletes(source_lead_id);