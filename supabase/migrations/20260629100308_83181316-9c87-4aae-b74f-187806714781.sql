
-- Helper: can the current user tag a target user under division-scoped rules?
CREATE OR REPLACE FUNCTION public.can_tag_user_in_agency(_target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me_agency uuid;
  v_me_division uuid;
  v_me_role text;
  v_target_agency uuid;
  v_target_division uuid;
  v_division_count int;
BEGIN
  IF auth.uid() IS NULL OR _target_user_id IS NULL THEN
    RETURN false;
  END IF;

  -- eleva_ops can tag anyone, anywhere
  IF public.is_eleva_ops() THEN
    RETURN true;
  END IF;

  SELECT agency_id, division_id, role
    INTO v_me_agency, v_me_division, v_me_role
    FROM public.portal_users WHERE id = auth.uid();

  SELECT agency_id, division_id
    INTO v_target_agency, v_target_division
    FROM public.portal_users WHERE id = _target_user_id;

  -- Must be same agency
  IF v_me_agency IS NULL OR v_target_agency IS NULL OR v_me_agency <> v_target_agency THEN
    RETURN false;
  END IF;

  -- Admin / GM can tag across divisions in their agency
  IF v_me_role IN ('admin', 'gm') THEN
    RETURN true;
  END IF;

  SELECT count(*) INTO v_division_count
    FROM public.agency_divisions WHERE agency_id = v_me_agency;

  -- 0 or 1 divisions: same-agency is enough
  IF v_division_count <= 1 THEN
    RETURN true;
  END IF;

  -- >1 divisions: divisions must match (and caller must have one)
  RETURN v_me_division IS NOT NULL AND v_me_division = v_target_division;
END;
$$;

-- Replace the insert policy on recruitment_note_tags to enforce the rule
DROP POLICY IF EXISTS "author tags own-agency users" ON public.recruitment_note_tags;

CREATE POLICY "author tags allowed users"
ON public.recruitment_note_tags
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_eleva_ops()
  OR (
    tagged_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.recruitment_notes n
      WHERE n.id = recruitment_note_tags.note_id
        AND n.author_id = auth.uid()
    )
    AND public.can_tag_user_in_agency(tagged_user_id)
  )
);
