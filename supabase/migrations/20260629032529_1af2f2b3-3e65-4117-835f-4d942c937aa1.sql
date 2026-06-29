
ALTER TABLE public.portal_users
  ADD COLUMN IF NOT EXISTS division_id uuid REFERENCES public.agency_divisions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS portal_users_division_id_idx ON public.portal_users(division_id);

CREATE OR REPLACE FUNCTION public.set_member_division(_user_id uuid, _division_id uuid)
RETURNS public.portal_users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user public.portal_users;
  v_div_agency uuid;
BEGIN
  IF NOT public.is_eleva_ops() THEN
    RAISE EXCEPTION 'only eleva_ops may set member division';
  END IF;

  IF _division_id IS NOT NULL THEN
    SELECT agency_id INTO v_div_agency FROM public.agency_divisions WHERE id = _division_id;
    IF v_div_agency IS NULL THEN
      RAISE EXCEPTION 'division not found';
    END IF;

    -- Division must belong to the same agency as the user
    IF NOT EXISTS (
      SELECT 1 FROM public.portal_users
      WHERE id = _user_id AND agency_id = v_div_agency
    ) THEN
      RAISE EXCEPTION 'division does not belong to this member''s agency';
    END IF;
  END IF;

  UPDATE public.portal_users
     SET division_id = _division_id
   WHERE id = _user_id
  RETURNING * INTO v_user;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'member not found';
  END IF;

  RETURN v_user;
END;
$$;
