ALTER TABLE public.comms_history
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'email';

ALTER TABLE public.comms_history
  ALTER COLUMN subject DROP NOT NULL;