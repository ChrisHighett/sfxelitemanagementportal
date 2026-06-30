
-- Add phone column to portal_users
ALTER TABLE public.portal_users ADD COLUMN IF NOT EXISTS phone text;

-- Eleva-Ops-only RPC to update member profile/contact details
CREATE OR REPLACE FUNCTION public.update_member_profile(
  _user_id uuid,
  _display_name text DEFAULT NULL,
  _phone text DEFAULT NULL
)
RETURNS public.portal_users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user public.portal_users;
  v_display text;
  v_phone text;
BEGIN
  IF NOT public.is_eleva_ops() THEN
    RAISE EXCEPTION 'only eleva_ops may edit member profile';
  END IF;

  v_display := NULLIF(TRIM(COALESCE(_display_name, '')), '');
  v_phone := NULLIF(TRIM(COALESCE(_phone, '')), '');

  IF v_display IS NULL THEN
    RAISE EXCEPTION 'display_name required';
  END IF;

  UPDATE public.portal_users
     SET display_name = v_display,
         phone = v_phone,
         updated_at = now()
   WHERE id = _user_id
  RETURNING * INTO v_user;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'member not found';
  END IF;

  -- Mirror display_name to profiles where present
  UPDATE public.profiles SET display_name = v_display, updated_at = now()
   WHERE user_id = _user_id;

  RETURN v_user;
END;
$$;
