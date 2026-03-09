-- =============================================
-- Helper Functions for Role-Based Access Control
-- =============================================

-- Function to get current user's role
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.portal_users
  WHERE id = auth.uid()
$$;

-- Function to check if current user is an approved admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.portal_users
    WHERE id = auth.uid()
      AND role = 'admin'
      AND approved = true
  )
$$;

-- Function to check if current user is an approved agent
CREATE OR REPLACE FUNCTION public.is_agent()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.portal_users
    WHERE id = auth.uid()
      AND role = 'agent'
      AND approved = true
  )
$$;

-- Function to check if current user is an approved parent or athlete for a specific athlete
CREATE OR REPLACE FUNCTION public.is_approved_parent_or_athlete_for(athlete_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.portal_users pu
    JOIN public.user_athlete_access uaa
      ON uaa.user_id = pu.id
    WHERE pu.id = auth.uid()
      AND pu.approved = true
      AND pu.role IN ('parent', 'athlete')
      AND uaa.athlete_id = athlete_uuid
      AND uaa.approved_at IS NOT NULL
  )
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_agent() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_approved_parent_or_athlete_for(uuid) TO authenticated;