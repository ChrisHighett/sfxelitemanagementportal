CREATE OR REPLACE FUNCTION public.set_call_history_agency_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.agency_id IS NULL THEN
    SELECT a.agency_id INTO NEW.agency_id
    FROM public.athletes a
    WHERE a.id = NEW.athlete_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_call_history_agency_id ON public.call_history;
CREATE TRIGGER trg_set_call_history_agency_id
  BEFORE INSERT ON public.call_history
  FOR EACH ROW
  EXECUTE FUNCTION public.set_call_history_agency_id();