
CREATE OR REPLACE FUNCTION public.update_agency(
  _agency_id uuid,
  _legal_name text,
  _trading_name text,
  _sport text DEFAULT NULL,
  _region text DEFAULT NULL
) RETURNS public.agencies
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_row public.agencies;
BEGIN
  IF NOT public.is_eleva_ops() THEN
    RAISE EXCEPTION 'only eleva_ops may update agencies';
  END IF;
  IF NULLIF(TRIM(_legal_name), '') IS NULL THEN
    RAISE EXCEPTION 'legal_name required';
  END IF;
  IF NULLIF(TRIM(_trading_name), '') IS NULL THEN
    RAISE EXCEPTION 'trading_name required';
  END IF;

  UPDATE public.agencies
     SET legal_name = TRIM(_legal_name),
         trading_name = TRIM(_trading_name),
         name = TRIM(_trading_name),
         sport = NULLIF(TRIM(_sport), ''),
         region = NULLIF(TRIM(_region), ''),
         updated_at = now()
   WHERE id = _agency_id
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'agency not found';
  END IF;

  RETURN v_row;
END;
$$;
