
-- Create a security definer function to check admin without hitting RLS
CREATE OR REPLACE FUNCTION public.is_portal_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM portal_users
    WHERE id = user_id AND role = 'admin'
  );
$$;

-- Drop the recursive policies
DROP POLICY IF EXISTS "Admins can view all portal users" ON portal_users;
DROP POLICY IF EXISTS "Admins can insert portal users" ON portal_users;
DROP POLICY IF EXISTS "Admins can update portal users" ON portal_users;

-- Recreate without recursion
CREATE POLICY "Admins can view all portal users"
ON portal_users FOR SELECT TO authenticated
USING (id = auth.uid() OR public.is_portal_admin(auth.uid()));

CREATE POLICY "Admins can insert portal users"
ON portal_users FOR INSERT TO authenticated
WITH CHECK (public.is_portal_admin(auth.uid()) OR auth.uid() = id);

CREATE POLICY "Admins can update portal users"
ON portal_users FOR UPDATE TO authenticated
USING (public.is_portal_admin(auth.uid()));

-- Drop the duplicate "own record" policy since it's now covered above
DROP POLICY IF EXISTS "Users can view their own record" ON portal_users;
DROP POLICY IF EXISTS "Users can insert their own portal user record" ON portal_users;
