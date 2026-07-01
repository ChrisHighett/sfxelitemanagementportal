CREATE OR REPLACE FUNCTION public.set_member_role(_user_id uuid, _role text, _division_id uuid DEFAULT NULL::uuid)
 RETURNS portal_users
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user public.portal_users;
  v_div_agency uuid;
  v_user_agency uuid;
BEGIN
  IF NOT public.is_eleva_ops() THEN
    RAISE EXCEPTION 'only eleva_ops may change member role';
  END IF;

  IF _role NOT IN ('admin','agent','scout','parent','athlete','eleva_ops','divisional_gm','agency_gm') THEN
    RAISE EXCEPTION 'invalid role';
  END IF;

  SELECT agency_id INTO v_user_agency FROM public.portal_users WHERE id = _user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'member not found';
  END IF;

  IF _role = 'divisional_gm' THEN
    IF _division_id IS NULL THEN
      RAISE EXCEPTION 'divisional_gm requires a division';
    END IF;
    SELECT agency_id INTO v_div_agency FROM public.agency_divisions WHERE id = _division_id;
    IF v_div_agency IS NULL THEN
      RAISE EXCEPTION 'division not found';
    END IF;
    IF v_div_agency IS DISTINCT FROM v_user_agency THEN
      RAISE EXCEPTION 'division does not belong to this member''s agency';
    END IF;

    UPDATE public.portal_users
       SET role = _role, division_id = _division_id
     WHERE id = _user_id
    RETURNING * INTO v_user;
  ELSIF _role = 'agency_gm' THEN
    -- Agency GM covers all divisions in the agency; clear any division binding.
    UPDATE public.portal_users
       SET role = _role, division_id = NULL
     WHERE id = _user_id
    RETURNING * INTO v_user;
  ELSE
    UPDATE public.portal_users
       SET role = _role
     WHERE id = _user_id
    RETURNING * INTO v_user;
  END IF;

  RETURN v_user;
END;
$function$;