CREATE OR REPLACE FUNCTION public.set_comms_history_agency_id()
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

DROP TRIGGER IF EXISTS trg_set_comms_history_agency_id ON public.comms_history;

CREATE TRIGGER trg_set_comms_history_agency_id
  BEFORE INSERT ON public.comms_history
  FOR EACH ROW
  EXECUTE FUNCTION public.set_comms_history_agency_id();

UPDATE public.comms_history ch
SET agency_id = a.agency_id
FROM public.athletes a
WHERE ch.athlete_id = a.id
  AND ch.agency_id IS NULL;