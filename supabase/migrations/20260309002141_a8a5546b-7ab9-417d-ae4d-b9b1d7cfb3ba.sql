-- Drop existing policies on monthly_reviews
DROP POLICY IF EXISTS "Admins and agents can manage reviews" ON public.monthly_reviews;
DROP POLICY IF EXISTS "Admins and agents can view all reviews" ON public.monthly_reviews;
DROP POLICY IF EXISTS "Users can view reviews of their linked athletes" ON public.monthly_reviews;

-- Create new policies using helper functions
CREATE POLICY "admin can do everything on monthly_reviews"
ON public.monthly_reviews
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "agents can manage monthly_reviews"
ON public.monthly_reviews
FOR ALL
USING (public.is_agent() OR public.is_admin())
WITH CHECK (public.is_agent() OR public.is_admin());

CREATE POLICY "parent_or_athlete_can_read_only_their_athlete_reviews"
ON public.monthly_reviews
FOR SELECT
USING (public.is_approved_parent_or_athlete_for(athlete_id));