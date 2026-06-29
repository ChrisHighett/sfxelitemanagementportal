
ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS billing_contact_name text,
  ADD COLUMN IF NOT EXISTS billing_email text,
  ADD COLUMN IF NOT EXISTS billing_address text,
  ADD COLUMN IF NOT EXISTS abn text,
  ADD COLUMN IF NOT EXISTS plan_tier text,
  ADD COLUMN IF NOT EXISTS agreed_price numeric,
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'AUD',
  ADD COLUMN IF NOT EXISTS billing_cycle text,
  ADD COLUMN IF NOT EXISTS licensed_seats integer,
  ADD COLUMN IF NOT EXISTS included_client_limit integer,
  ADD COLUMN IF NOT EXISTS contract_start_date date,
  ADD COLUMN IF NOT EXISTS trial_period_months integer,
  ADD COLUMN IF NOT EXISTS payment_terms text,
  ADD COLUMN IF NOT EXISTS account_status text;

CREATE OR REPLACE FUNCTION public.update_agency_billing(
  _agency_id uuid,
  _billing_contact_name text DEFAULT NULL,
  _billing_email text DEFAULT NULL,
  _billing_address text DEFAULT NULL,
  _abn text DEFAULT NULL,
  _plan_tier text DEFAULT NULL,
  _agreed_price numeric DEFAULT NULL,
  _currency text DEFAULT NULL,
  _billing_cycle text DEFAULT NULL,
  _licensed_seats integer DEFAULT NULL,
  _included_client_limit integer DEFAULT NULL,
  _contract_start_date date DEFAULT NULL,
  _trial_period_months integer DEFAULT NULL,
  _payment_terms text DEFAULT NULL,
  _account_status text DEFAULT NULL
)
RETURNS public.agencies
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_row public.agencies;
BEGIN
  IF NOT public.is_eleva_ops() THEN
    RAISE EXCEPTION 'only eleva_ops may update agency billing';
  END IF;

  IF _plan_tier IS NOT NULL AND _plan_tier NOT IN ('Core','Pro','Enterprise') THEN
    RAISE EXCEPTION 'invalid plan_tier';
  END IF;
  IF _billing_cycle IS NOT NULL AND _billing_cycle NOT IN ('Monthly','Annual') THEN
    RAISE EXCEPTION 'invalid billing_cycle';
  END IF;
  IF _payment_terms IS NOT NULL AND _payment_terms NOT IN ('14 days','30 days') THEN
    RAISE EXCEPTION 'invalid payment_terms';
  END IF;
  IF _account_status IS NOT NULL AND _account_status NOT IN ('Trial','Active','Suspended') THEN
    RAISE EXCEPTION 'invalid account_status';
  END IF;

  UPDATE public.agencies SET
    billing_contact_name  = NULLIF(TRIM(COALESCE(_billing_contact_name,'')), ''),
    billing_email         = NULLIF(TRIM(COALESCE(_billing_email,'')), ''),
    billing_address       = NULLIF(TRIM(COALESCE(_billing_address,'')), ''),
    abn                   = NULLIF(TRIM(COALESCE(_abn,'')), ''),
    plan_tier             = _plan_tier,
    agreed_price          = _agreed_price,
    currency              = COALESCE(NULLIF(TRIM(COALESCE(_currency,'')), ''), 'AUD'),
    billing_cycle         = _billing_cycle,
    licensed_seats        = _licensed_seats,
    included_client_limit = _included_client_limit,
    contract_start_date   = _contract_start_date,
    trial_period_months   = _trial_period_months,
    payment_terms         = _payment_terms,
    account_status        = _account_status,
    updated_at            = now()
  WHERE id = _agency_id
  RETURNING * INTO v_row;

  IF NOT FOUND THEN RAISE EXCEPTION 'agency not found'; END IF;
  RETURN v_row;
END;
$$;
