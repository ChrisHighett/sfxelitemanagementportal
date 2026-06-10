-- Fix 1: Auto-create portal_users row on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email))
  ON CONFLICT DO NOTHING;

  INSERT INTO public.portal_users (id, role, approved, display_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'athlete'),
    false,
    NEW.raw_user_meta_data->>'display_name',
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Fix 5a: Add assigned_agent_user_id FK and restrict agent SELECT policy
ALTER TABLE public.athletes
  ADD COLUMN IF NOT EXISTS assigned_agent_user_id uuid
  REFERENCES public.portal_users(id) ON DELETE SET NULL;

DROP POLICY IF EXISTS "Admins and agents can view all athletes" ON public.athletes;

CREATE POLICY "Agents see only their own athletes"
  ON public.athletes FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR assigned_agent_user_id = auth.uid()
    OR public.user_has_athlete_access(auth.uid(), id)
  );