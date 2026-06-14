ALTER TABLE public.guardians
  ADD COLUMN IF NOT EXISTS is_primary boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS relationship_other text;

-- Backfill: first guardian per athlete becomes primary
WITH ranked AS (
  SELECT id,
         row_number() OVER (PARTITION BY athlete_id ORDER BY created_at, id) AS rn
    FROM public.guardians
)
UPDATE public.guardians g
   SET is_primary = true
  FROM ranked r
 WHERE g.id = r.id AND r.rn = 1
   AND NOT EXISTS (
     SELECT 1 FROM public.guardians g2
      WHERE g2.athlete_id = g.athlete_id AND g2.is_primary = true
   );

-- Enforce one primary per athlete
CREATE UNIQUE INDEX IF NOT EXISTS guardians_one_primary_per_athlete
  ON public.guardians(athlete_id)
  WHERE is_primary = true;