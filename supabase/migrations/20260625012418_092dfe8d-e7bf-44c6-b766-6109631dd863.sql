CREATE OR REPLACE FUNCTION public.set_guardians_agency_id()
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

DROP TRIGGER IF EXISTS trg_set_guardians_agency_id ON public.guardians;
CREATE TRIGGER trg_set_guardians_agency_id
  BEFORE INSERT OR UPDATE ON public.guardians
  FOR EACH ROW EXECUTE FUNCTION public.set_guardians_agency_id();

UPDATE public.guardians g
SET agency_id = a.agency_id
FROM public.athletes a
WHERE g.athlete_id = a.id AND g.agency_id IS NULL;