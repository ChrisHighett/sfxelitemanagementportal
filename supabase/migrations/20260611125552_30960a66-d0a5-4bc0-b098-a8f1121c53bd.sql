ALTER TABLE public.call_history
  ADD COLUMN IF NOT EXISTS conversation_category text NOT NULL DEFAULT 'club',
  ADD COLUMN IF NOT EXISTS counterparty_name text,
  ADD COLUMN IF NOT EXISTS follow_up_at date,
  ADD COLUMN IF NOT EXISTS email_audience text;

UPDATE public.call_history
SET conversation_category = 'club'
WHERE call_type = 'club_conversation'
  AND (conversation_category IS NULL OR conversation_category = 'club');

CREATE INDEX IF NOT EXISTS idx_call_history_category
  ON public.call_history (athlete_id, conversation_category, call_date DESC);