ALTER TABLE public.athletes
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'agent_direct';

UPDATE public.athletes
   SET source = 'scout'
 WHERE source = 'agent_direct'
   AND source_lead_id IS NOT NULL;