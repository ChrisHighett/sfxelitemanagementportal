
-- Trigger function: when a new athlete is inserted, create a blank current-month review placeholder
CREATE OR REPLACE FUNCTION public.create_blank_tracker_for_new_athlete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Insert a blank monthly_reviews row for the current month
  INSERT INTO public.monthly_reviews (athlete_id, review_month, review_source)
  VALUES (NEW.id, date_trunc('month', now())::date, 'auto-created');
  
  RETURN NEW;
END;
$$;

-- Attach trigger to athletes table
CREATE TRIGGER trg_create_blank_tracker
  AFTER INSERT ON public.athletes
  FOR EACH ROW
  EXECUTE FUNCTION public.create_blank_tracker_for_new_athlete();
