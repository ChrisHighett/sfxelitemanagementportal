CREATE OR REPLACE FUNCTION public.set_athletes_agency_id()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.agency_id IS NULL THEN
    NEW.agency_id := public.current_agency_id();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_athletes_agency_id ON public.athletes;

CREATE TRIGGER trg_set_athletes_agency_id
  BEFORE INSERT ON public.athletes
  FOR EACH ROW EXECUTE FUNCTION public.set_athletes_agency_id();