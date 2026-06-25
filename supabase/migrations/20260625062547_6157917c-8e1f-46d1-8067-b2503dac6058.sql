CREATE OR REPLACE FUNCTION public.set_scout_leads_agency_id()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.agency_id IS NULL THEN
    NEW.agency_id := public.current_agency_id();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_scout_leads_agency_id ON public.scout_leads;
CREATE TRIGGER trg_set_scout_leads_agency_id
  BEFORE INSERT ON public.scout_leads
  FOR EACH ROW EXECUTE FUNCTION public.set_scout_leads_agency_id();