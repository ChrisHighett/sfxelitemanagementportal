
CREATE TABLE IF NOT EXISTS public.scout_footage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scout_lead_id uuid NOT NULL REFERENCES public.scout_leads(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('link','file')),
  url text NOT NULL,
  label text,
  source text,
  captured_on date,
  consent_acknowledged boolean NOT NULL DEFAULT false,
  added_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.scout_footage TO authenticated;
GRANT ALL ON public.scout_footage TO service_role;

ALTER TABLE public.scout_footage ENABLE ROW LEVEL SECURITY;

-- Visibility mirrors scout_leads access: admin, lead creator, or assigned agent
CREATE POLICY "scout_footage_select" ON public.scout_footage
FOR SELECT TO authenticated
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1 FROM public.scout_leads sl
    WHERE sl.id = scout_footage.scout_lead_id
      AND (sl.created_by = auth.uid() OR sl.assigned_agent_id = auth.uid())
  )
);

CREATE POLICY "scout_footage_insert" ON public.scout_footage
FOR INSERT TO authenticated
WITH CHECK (
  added_by = auth.uid()
  AND consent_acknowledged = true
  AND (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.scout_leads sl
      WHERE sl.id = scout_footage.scout_lead_id
        AND (sl.created_by = auth.uid() OR sl.assigned_agent_id = auth.uid())
    )
  )
);

CREATE POLICY "scout_footage_delete" ON public.scout_footage
FOR DELETE TO authenticated
USING (
  public.is_admin()
  OR added_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.scout_leads sl
    WHERE sl.id = scout_footage.scout_lead_id
      AND (sl.created_by = auth.uid() OR sl.assigned_agent_id = auth.uid())
  )
);

CREATE INDEX IF NOT EXISTS scout_footage_lead_idx ON public.scout_footage(scout_lead_id);

-- Storage policies for scout-footage bucket (files stored at <scout_lead_id>/<filename>)
CREATE POLICY "scout_footage_storage_select" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'scout-footage'
  AND (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.scout_leads sl
      WHERE sl.id::text = (storage.foldername(name))[1]
        AND (sl.created_by = auth.uid() OR sl.assigned_agent_id = auth.uid())
    )
  )
);

CREATE POLICY "scout_footage_storage_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'scout-footage'
  AND (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.scout_leads sl
      WHERE sl.id::text = (storage.foldername(name))[1]
        AND (sl.created_by = auth.uid() OR sl.assigned_agent_id = auth.uid())
    )
  )
);

CREATE POLICY "scout_footage_storage_delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'scout-footage'
  AND (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.scout_leads sl
      WHERE sl.id::text = (storage.foldername(name))[1]
        AND (sl.created_by = auth.uid() OR sl.assigned_agent_id = auth.uid())
    )
  )
);
