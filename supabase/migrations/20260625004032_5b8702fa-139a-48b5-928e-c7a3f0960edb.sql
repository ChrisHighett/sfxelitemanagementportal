CREATE OR REPLACE FUNCTION public.set_monthly_reviews_agency_id()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.agency_id IS NULL THEN
    SELECT a.agency_id INTO NEW.agency_id
    FROM public.athletes a
    WHERE a.id = NEW.athlete_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_monthly_reviews_agency_id ON public.monthly_reviews;

CREATE TRIGGER trg_set_monthly_reviews_agency_id
  BEFORE INSERT OR UPDATE ON public.monthly_reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_monthly_reviews_agency_id();

UPDATE public.monthly_reviews r
SET agency_id = a.agency_id
FROM public.athletes a
WHERE r.athlete_id = a.id AND r.agency_id IS NULL;