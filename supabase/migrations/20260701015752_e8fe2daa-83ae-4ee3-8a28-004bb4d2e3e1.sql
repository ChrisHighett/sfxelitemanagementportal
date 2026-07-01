CREATE OR REPLACE FUNCTION public.set_member_active(_user_id uuid, _active boolean)
 RETURNS portal_users
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user public.portal_users;
BEGIN
  IF NOT public.is_eleva_ops() THEN
    RAISE EXCEPTION 'only eleva_ops may change member active status';
  END IF;

  IF _active = false AND _user_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot deactivate your own account';
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
$function$;