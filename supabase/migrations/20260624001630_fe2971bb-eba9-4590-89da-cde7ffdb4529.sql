CREATE OR REPLACE FUNCTION public.user_has_athlete_access(user_uuid uuid, athlete_uuid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  SELECT EXISTS (
    -- Admin branch: only if admin's agency matches the athlete's agency
    SELECT 1 FROM public.portal_users pu
    JOIN public.athletes a ON a.agency_id = pu.agency_id
    WHERE pu.id = user_uuid AND pu.role = 'admin' AND pu.approved = true
      AND a.id = athlete_uuid
    UNION
    -- Agent branch: unchanged
    SELECT 1 FROM public.athletes a
    JOIN public.portal_users pu ON pu.id = user_uuid
    WHERE a.id = athlete_uuid
      AND pu.role = 'agent' AND pu.approved = true
      AND a.assigned_agent_user_id = user_uuid
    UNION
    -- Explicit access branch: unchanged
    SELECT 1 FROM public.user_athlete_access
    WHERE user_id = user_uuid AND athlete_id = athlete_uuid
      AND approved_at IS NOT NULL
  );
$function$;