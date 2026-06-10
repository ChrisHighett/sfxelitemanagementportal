ALTER TABLE public.athletes
  ADD COLUMN IF NOT EXISTS commercial_potential text DEFAULT 'Not Scored',
  ADD COLUMN IF NOT EXISTS avatar_url text;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'athletes_commercial_potential_check'
  ) THEN
    ALTER TABLE public.athletes
      ADD CONSTRAINT athletes_commercial_potential_check
      CHECK (commercial_potential IN ('Low','Medium','High','Not Scored'));
  END IF;
END $$;