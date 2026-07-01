
-- 1. Columns
ALTER TABLE public.recruitment_notes ADD COLUMN IF NOT EXISTS division_id uuid REFERENCES public.agency_divisions(id) ON DELETE SET NULL;
ALTER TABLE public.recruitment_note_tags ADD COLUMN IF NOT EXISTS division_id uuid REFERENCES public.agency_divisions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_recruitment_notes_division ON public.recruitment_notes(division_id);
CREATE INDEX IF NOT EXISTS idx_recruitment_note_tags_division ON public.recruitment_note_tags(division_id);

-- 2. Helper: does the caller's agency have >1 division?
CREATE OR REPLACE FUNCTION public.agency_has_multiple_divisions(_agency_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (SELECT count(*) FROM public.agency_divisions WHERE agency_id = _agency_id) > 1
$$;

-- 3. Update default triggers to stamp division_id from caller
CREATE OR REPLACE FUNCTION public.set_recruitment_notes_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.agency_id IS NULL THEN
    NEW.agency_id := public.current_agency_id();
  END IF;
  IF NEW.author_id IS NULL THEN
    NEW.author_id := auth.uid();
  END IF;
  IF NEW.division_id IS NULL THEN
    NEW.division_id := public.current_division_id();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_recruitment_note_tags_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.agency_id IS NULL THEN
    NEW.agency_id := public.current_agency_id();
  END IF;
  IF NEW.tagged_by IS NULL THEN
    NEW.tagged_by := auth.uid();
  END IF;
  IF NEW.division_id IS NULL THEN
    -- inherit from parent note if available, otherwise caller's division
    SELECT n.division_id INTO NEW.division_id
      FROM public.recruitment_notes n WHERE n.id = NEW.note_id;
    IF NEW.division_id IS NULL THEN
      NEW.division_id := public.current_division_id();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 4. Replace SELECT policies with division-aware versions
DROP POLICY IF EXISTS "agency read recruitment_notes" ON public.recruitment_notes;
CREATE POLICY "agency read recruitment_notes"
ON public.recruitment_notes
FOR SELECT
USING (
  is_eleva_ops()
  OR (
    agency_id = current_agency_id()
    AND (
      is_admin()
      OR NOT public.agency_has_multiple_divisions(agency_id)
      OR division_id IS NOT DISTINCT FROM current_division_id()
    )
  )
);

DROP POLICY IF EXISTS "agency read note tags" ON public.recruitment_note_tags;
CREATE POLICY "agency read note tags"
ON public.recruitment_note_tags
FOR SELECT
USING (
  is_eleva_ops()
  OR tagged_user_id = auth.uid()  -- always see tags addressed to you
  OR (
    agency_id = current_agency_id()
    AND (
      is_admin()
      OR NOT public.agency_has_multiple_divisions(agency_id)
      OR division_id IS NOT DISTINCT FROM current_division_id()
    )
  )
);
