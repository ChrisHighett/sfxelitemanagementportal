
CREATE TABLE public.agency_divisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agency_id, name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agency_divisions TO authenticated;
GRANT ALL ON public.agency_divisions TO service_role;

ALTER TABLE public.agency_divisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "eleva_ops full access on agency_divisions"
  ON public.agency_divisions FOR ALL
  USING (public.is_eleva_ops())
  WITH CHECK (public.is_eleva_ops());

CREATE POLICY "members can read own agency divisions"
  ON public.agency_divisions FOR SELECT
  USING (agency_id = public.current_agency_id());

CREATE INDEX agency_divisions_agency_id_idx ON public.agency_divisions(agency_id);
