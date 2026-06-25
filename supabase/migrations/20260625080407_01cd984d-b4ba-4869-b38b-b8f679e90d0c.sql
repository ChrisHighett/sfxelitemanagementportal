
CREATE TABLE public.recruitment_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  author_id uuid NOT NULL DEFAULT auth.uid(),
  title text,
  body text NOT NULL,
  raw_transcript text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.recruitment_notes TO authenticated;
GRANT ALL ON public.recruitment_notes TO service_role;

ALTER TABLE public.recruitment_notes ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.set_recruitment_notes_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.agency_id IS NULL THEN
    NEW.agency_id := public.current_agency_id();
  END IF;
  IF NEW.author_id IS NULL THEN
    NEW.author_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_recruitment_notes_defaults
BEFORE INSERT ON public.recruitment_notes
FOR EACH ROW EXECUTE FUNCTION public.set_recruitment_notes_defaults();

CREATE TRIGGER trg_recruitment_notes_updated_at
BEFORE UPDATE ON public.recruitment_notes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "agency read recruitment_notes"
  ON public.recruitment_notes FOR SELECT
  USING ( public.is_eleva_ops() OR agency_id = public.current_agency_id() );

CREATE POLICY "agency insert recruitment_notes"
  ON public.recruitment_notes FOR INSERT
  WITH CHECK ( public.is_eleva_ops() OR agency_id = public.current_agency_id() );

CREATE POLICY "eleva_ops insert recruitment_notes"
  ON public.recruitment_notes FOR INSERT
  WITH CHECK ( public.is_eleva_ops() );

CREATE POLICY "author update recruitment_notes"
  ON public.recruitment_notes FOR UPDATE
  USING ( author_id = auth.uid() OR public.is_eleva_ops() )
  WITH CHECK ( author_id = auth.uid() OR public.is_eleva_ops() );
