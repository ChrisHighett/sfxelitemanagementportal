ALTER TABLE public.athlete_tasks
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';

CREATE INDEX IF NOT EXISTS idx_athlete_tasks_source ON public.athlete_tasks(source);