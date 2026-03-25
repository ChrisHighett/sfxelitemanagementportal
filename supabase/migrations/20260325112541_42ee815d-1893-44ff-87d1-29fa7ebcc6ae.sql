
-- 1. Create athlete_resources table
CREATE TABLE public.athlete_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  uploaded_by uuid REFERENCES public.portal_users(id),
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint,
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'Other',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.athlete_resources ENABLE ROW LEVEL SECURITY;

-- 3. Admin full access
CREATE POLICY "admin_full_access_athlete_resources"
  ON public.athlete_resources FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- 4. Agent full access
CREATE POLICY "agent_manage_athlete_resources"
  ON public.athlete_resources FOR ALL
  TO authenticated
  USING (is_agent() OR is_admin())
  WITH CHECK (is_agent() OR is_admin());

-- 5. Parent/athlete read-only for their linked athlete
CREATE POLICY "parent_athlete_read_own_resources"
  ON public.athlete_resources FOR SELECT
  TO authenticated
  USING (is_approved_parent_or_athlete_for(athlete_id));

-- 6. Updated_at trigger
CREATE TRIGGER set_updated_at_athlete_resources
  BEFORE UPDATE ON public.athlete_resources
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 7. Create storage bucket for athlete resources
INSERT INTO storage.buckets (id, name, public)
VALUES ('athlete-resources', 'athlete-resources', false)
ON CONFLICT (id) DO NOTHING;

-- 8. Storage RLS: admin/agent can upload
CREATE POLICY "admin_agent_upload_athlete_resources"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'athlete-resources'
    AND (is_admin() OR is_agent())
  );

-- 9. Storage RLS: admin/agent can delete
CREATE POLICY "admin_agent_delete_athlete_resources"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'athlete-resources'
    AND (is_admin() OR is_agent())
  );

-- 10. Storage RLS: authenticated users can read (row-level filtering done via athlete_resources table)
CREATE POLICY "authenticated_read_athlete_resources"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'athlete-resources');
