
ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS legal_name text,
  ADD COLUMN IF NOT EXISTS trading_name text,
  ADD COLUMN IF NOT EXISTS sport text,
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.set_agencies_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_agencies_updated_at ON public.agencies;
CREATE TRIGGER trg_agencies_updated_at BEFORE UPDATE ON public.agencies
  FOR EACH ROW EXECUTE FUNCTION public.set_agencies_updated_at();

-- Only eleva_ops may create / update / delete agencies.
DROP POLICY IF EXISTS "eleva_ops insert agencies" ON public.agencies;
CREATE POLICY "eleva_ops insert agencies" ON public.agencies
  FOR INSERT TO authenticated
  WITH CHECK (public.is_eleva_ops());

DROP POLICY IF EXISTS "eleva_ops update agencies" ON public.agencies;
CREATE POLICY "eleva_ops update agencies" ON public.agencies
  FOR UPDATE TO authenticated
  USING (public.is_eleva_ops())
  WITH CHECK (public.is_eleva_ops());

DROP POLICY IF EXISTS "eleva_ops delete agencies" ON public.agencies;
CREATE POLICY "eleva_ops delete agencies" ON public.agencies
  FOR DELETE TO authenticated
  USING (public.is_eleva_ops());

-- RPC: create a new agency. Hard-gates to eleva_ops at the DB level.
CREATE OR REPLACE FUNCTION public.create_agency(
  _legal_name text,
  _trading_name text,
  _sport text DEFAULT NULL,
  _region text DEFAULT NULL
) RETURNS public.agencies
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_slug text;
  v_base text;
  v_n int := 1;
  v_row public.agencies;
BEGIN
  IF NOT public.is_eleva_ops() THEN
    RAISE EXCEPTION 'only eleva_ops may create agencies';
  END IF;

  IF NULLIF(TRIM(_legal_name), '') IS NULL THEN
    RAISE EXCEPTION 'legal_name required';
  END IF;
  IF NULLIF(TRIM(_trading_name), '') IS NULL THEN
    RAISE EXCEPTION 'trading_name required';
  END IF;

  v_base := regexp_replace(lower(TRIM(_trading_name)), '[^a-z0-9]+', '-', 'g');
  v_base := regexp_replace(v_base, '(^-+|-+$)', '', 'g');
  IF v_base = '' THEN v_base := 'agency'; END IF;
  v_slug := v_base;
  WHILE EXISTS (SELECT 1 FROM public.agencies WHERE slug = v_slug) LOOP
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n;
  END LOOP;

  INSERT INTO public.agencies (name, slug, legal_name, trading_name, sport, region, created_by)
  VALUES (TRIM(_trading_name), v_slug, TRIM(_legal_name), TRIM(_trading_name),
          NULLIF(TRIM(_sport), ''), NULLIF(TRIM(_region), ''), auth.uid())
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.create_agency(text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_agency(text,text,text,text) TO authenticated;
