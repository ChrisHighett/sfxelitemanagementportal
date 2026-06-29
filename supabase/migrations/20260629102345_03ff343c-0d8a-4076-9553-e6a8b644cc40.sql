
CREATE OR REPLACE FUNCTION public.set_member_active(_user_id uuid, _active boolean)
RETURNS public.portal_users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user public.portal_users;
BEGIN
  IF NOT public.is_eleva_ops() THEN
    RAISE EXCEPTION 'only eleva_ops may change member active status';
  END IF;

  UPDATE public.portal_users
     SET approved = _active
   WHERE id = _user_id
  RETURNING * INTO v_user;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'member not found';
  END IF;

  RETURN v_user;
END;
$$;
