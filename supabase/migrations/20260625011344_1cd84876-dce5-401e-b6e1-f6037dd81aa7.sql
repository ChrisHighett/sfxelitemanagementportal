CREATE OR REPLACE FUNCTION public.enforce_single_primary_guardian()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.is_primary = true THEN
    UPDATE public.guardians
    SET is_primary = false
    WHERE athlete_id = NEW.athlete_id
      AND is_primary = true
      AND id IS DISTINCT FROM NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_single_primary_guardian ON public.guardians;

CREATE TRIGGER trg_enforce_single_primary_guardian
  BEFORE INSERT OR UPDATE ON public.guardians
  FOR EACH ROW EXECUTE FUNCTION public.enforce_single_primary_guardian();