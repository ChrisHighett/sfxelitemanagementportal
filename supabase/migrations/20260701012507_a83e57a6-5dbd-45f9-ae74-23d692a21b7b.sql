ALTER TABLE public.portal_users DROP CONSTRAINT IF EXISTS portal_users_role_check;
ALTER TABLE public.portal_users ADD CONSTRAINT portal_users_role_check
  CHECK (role IN ('admin','agent','scout','parent','athlete','eleva_ops','divisional_gm','agency_gm'));