CREATE TABLE IF NOT EXISTS public.agent_activity (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id uuid REFERENCES public.portal_users(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  athlete_id uuid REFERENCES public.athletes(id) ON DELETE SET NULL,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT ON public.agent_activity TO authenticated;
GRANT ALL ON public.agent_activity TO service_role;

CREATE INDEX IF NOT EXISTS agent_activity_agent_idx ON public.agent_activity(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS agent_activity_type_idx ON public.agent_activity(action_type, created_at DESC);

ALTER TABLE public.agent_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read all activity"
  ON public.agent_activity FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.portal_users
      WHERE id = auth.uid() AND role = 'admin' AND approved = true
    )
  );

CREATE POLICY "Agents can insert their own activity"
  ON public.agent_activity FOR INSERT
  WITH CHECK (agent_id = auth.uid());

ALTER TABLE public.portal_users
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS email text;

UPDATE public.portal_users pu
SET email = u.email
FROM auth.users u
WHERE pu.id = u.id
  AND pu.email IS NULL;