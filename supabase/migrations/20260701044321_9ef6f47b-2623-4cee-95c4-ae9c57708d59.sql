
CREATE OR REPLACE FUNCTION public.get_athlete_agent_email(_athlete_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agent_id uuid;
  v_email text;
BEGIN
  IF auth.uid() IS NULL OR _athlete_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Caller must have access to this athlete (parent/athlete via user_athlete_access
  -- or guardian, agent assigned to athlete, admin/eleva_ops per existing helper).
  IF NOT (
    public.user_has_athlete_access(auth.uid(), _athlete_id)
    OR public.is_guardian_of(_athlete_id)
    OR public.is_eleva_ops()
  ) THEN
    RETURN NULL;
  END IF;

  SELECT assigned_agent_user_id INTO v_agent_id
    FROM public.athletes WHERE id = _athlete_id;

  IF v_agent_id IS NULL THEN RETURN NULL; END IF;

  SELECT COALESCE(pu.email, u.email)
    INTO v_email
    FROM public.portal_users pu
    LEFT JOIN auth.users u ON u.id = pu.id
    WHERE pu.id = v_agent_id;

  RETURN v_email;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_athlete_agent_email(uuid) TO authenticated;
