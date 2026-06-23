ALTER TABLE public.athletes ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES public.agencies(id);
ALTER TABLE public.portal_users ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES public.agencies(id);

UPDATE public.athletes SET agency_id = (SELECT id FROM public.agencies WHERE slug = 'tgi') WHERE agency_id IS NULL;
UPDATE public.portal_users SET agency_id = (SELECT id FROM public.agencies WHERE slug = 'tgi') WHERE agency_id IS NULL;