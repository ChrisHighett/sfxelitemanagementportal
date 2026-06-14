
CREATE TABLE public.agent_voice_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  how_i_write text,
  formality text,
  length text,
  emoji text,
  greeting_style text,
  sign_off text,
  sample_messages text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_voice_profiles TO authenticated;
GRANT ALL ON public.agent_voice_profiles TO service_role;

ALTER TABLE public.agent_voice_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "voice_profiles_read_any_auth"
  ON public.agent_voice_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "voice_profiles_owner_insert"
  ON public.agent_voice_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "voice_profiles_owner_update"
  ON public.agent_voice_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "voice_profiles_owner_delete"
  ON public.agent_voice_profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

CREATE TRIGGER trg_voice_profiles_updated_at
  BEFORE UPDATE ON public.agent_voice_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
