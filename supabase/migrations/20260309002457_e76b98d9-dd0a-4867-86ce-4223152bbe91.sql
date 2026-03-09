-- Drop existing policies on user_athlete_access
DROP POLICY IF EXISTS "Admins and agents can view all access records" ON public.user_athlete_access;
DROP POLICY IF EXISTS "Admins can manage access records" ON public.user_athlete_access;
DROP POLICY IF EXISTS "Users can view their own access records" ON public.user_athlete_access;

-- Create new policies using helper functions
CREATE POLICY "admin can manage user_athlete_access"
ON public.user_athlete_access
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "user_can_view_only_their_own_access_mapping"
ON public.user_athlete_access
FOR SELECT
USING (user_id = auth.uid());