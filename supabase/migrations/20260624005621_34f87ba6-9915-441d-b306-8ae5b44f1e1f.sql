CREATE OR REPLACE FUNCTION public.is_eleva_ops()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.portal_users
    WHERE id = auth.uid()
      AND role = 'eleva_ops'
      AND approved = true
  )
$function$;