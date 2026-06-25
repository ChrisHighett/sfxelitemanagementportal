
CREATE TABLE public.recruitment_note_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL REFERENCES public.recruitment_notes(id) ON DELETE CASCADE,
  tagged_user_id uuid NOT NULL,
  tagged_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  agency_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  acknowledged_at timestamptz,
  UNIQUE (note_id, tagged_user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.recruitment_note_tags TO authenticated;
GRANT ALL ON public.recruitment_note_tags TO service_role;

CREATE OR REPLACE FUNCTION public.set_recruitment_note_tags_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.agency_id IS NULL THEN
    NEW.agency_id := public.current_agency_id();
  END IF;
  IF NEW.tagged_by IS NULL THEN
    NEW.tagged_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_recruitment_note_tags_defaults
BEFORE INSERT ON public.recruitment_note_tags
FOR EACH ROW EXECUTE FUNCTION public.set_recruitment_note_tags_defaults();

ALTER TABLE public.recruitment_note_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency read note tags"
ON public.recruitment_note_tags
FOR SELECT
USING ( public.is_eleva_ops() OR agency_id = public.current_agency_id() );

CREATE POLICY "author tags own-agency users"
ON public.recruitment_note_tags
FOR INSERT
WITH CHECK (
  public.is_eleva_ops()
  OR (
    EXISTS (SELECT 1 FROM public.recruitment_notes n
            WHERE n.id = note_id AND n.author_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.portal_users u
                WHERE u.id = tagged_user_id AND u.agency_id = public.current_agency_id())
    AND tagged_by = auth.uid()
  )
);

CREATE POLICY "ops or tagged user updates tag"
ON public.recruitment_note_tags
FOR UPDATE
USING ( public.is_eleva_ops() OR tagged_user_id = auth.uid() )
WITH CHECK ( public.is_eleva_ops() OR tagged_user_id = auth.uid() );
