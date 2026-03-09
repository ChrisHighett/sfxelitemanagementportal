
-- Create storage bucket for resources
INSERT INTO storage.buckets (id, name, public) VALUES ('resources', 'resources', true);

-- Create resources table to track uploaded files
CREATE TABLE public.resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can view resources
CREATE POLICY "Authenticated users can view resources"
ON public.resources FOR SELECT TO authenticated
USING (true);

-- Only admins and agents can upload/delete
CREATE POLICY "Admins and agents can manage resources"
ON public.resources FOR ALL TO authenticated
USING (is_admin() OR is_agent())
WITH CHECK (is_admin() OR is_agent());

-- Storage policies
CREATE POLICY "Authenticated users can read resource files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'resources');

CREATE POLICY "Admins and agents can upload resource files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'resources' AND (is_admin() OR is_agent()));

CREATE POLICY "Admins and agents can delete resource files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'resources' AND (is_admin() OR is_agent()));
