
ALTER TABLE public.monthly_reviews
  ADD COLUMN IF NOT EXISTS completed_by text,
  ADD COLUMN IF NOT EXISTS review_source text DEFAULT 'portal';
