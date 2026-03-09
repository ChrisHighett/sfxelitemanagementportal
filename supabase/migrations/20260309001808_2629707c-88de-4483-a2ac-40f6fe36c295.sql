-- =============================================
-- SFX Pathways Portal Database Schema
-- =============================================

-- Enable RLS on all tables
ALTER TABLE IF EXISTS public.athletes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.portal_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_athlete_access DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.guardians DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.monthly_reviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.comms_log DISABLE ROW LEVEL SECURITY;

-- Drop existing tables if they exist (for clean migration)
DROP TABLE IF EXISTS public.comms_log CASCADE;
DROP TABLE IF EXISTS public.monthly_reviews CASCADE;
DROP TABLE IF EXISTS public.guardians CASCADE;
DROP TABLE IF EXISTS public.user_athlete_access CASCADE;
DROP TABLE IF EXISTS public.portal_users CASCADE;
DROP TABLE IF EXISTS public.athletes CASCADE;

-- =============================================
-- 1. Athlete Master Record
-- =============================================
CREATE TABLE public.athletes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text UNIQUE,
  club text,
  school text,
  position text,
  stage text CHECK (stage IN ('Emerging', 'Elite', 'Pre-Pro')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- 2. Portal Users (linked to Supabase Auth)
-- =============================================
CREATE TABLE public.portal_users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'agent', 'parent', 'athlete')),
  approved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- 3. User-Athlete Access Control
-- =============================================
CREATE TABLE public.user_athlete_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.portal_users(id) ON DELETE CASCADE,
  athlete_id uuid NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  relationship_type text NOT NULL CHECK (relationship_type IN ('athlete', 'parent')),
  approved_by uuid REFERENCES public.portal_users(id),
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id),
  UNIQUE (user_id, athlete_id)
);

-- =============================================
-- 4. Guardian/Parent Details
-- =============================================
CREATE TABLE public.guardians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  parent_name text NOT NULL,
  parent_email text,
  phone text,
  relationship text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- 5. Monthly Reviews
-- =============================================
CREATE TABLE public.monthly_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  review_month date NOT NULL,
  wellbeing_score int CHECK (wellbeing_score BETWEEN 1 AND 5),
  performance_notes text,
  lifestyle_notes text,
  personal_notes text,
  education_notes text,
  brand_notes text,
  focus_next_month text,
  attention_required boolean DEFAULT false,
  created_by uuid REFERENCES public.portal_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (athlete_id, review_month)
);

-- =============================================
-- 6. Communications Log
-- =============================================
CREATE TABLE public.comms_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  recipient_type text NOT NULL CHECK (recipient_type IN ('athlete', 'parent')),
  subject text NOT NULL,
  body text NOT NULL,
  sent_by uuid REFERENCES public.portal_users(id),
  sent_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- INDEXES for Performance
-- =============================================
CREATE INDEX idx_athletes_email ON public.athletes(email);
CREATE INDEX idx_athletes_stage ON public.athletes(stage);
CREATE INDEX idx_portal_users_role ON public.portal_users(role);
CREATE INDEX idx_user_athlete_access_user_id ON public.user_athlete_access(user_id);
CREATE INDEX idx_user_athlete_access_athlete_id ON public.user_athlete_access(athlete_id);
CREATE INDEX idx_guardians_athlete_id ON public.guardians(athlete_id);
CREATE INDEX idx_monthly_reviews_athlete_id ON public.monthly_reviews(athlete_id);
CREATE INDEX idx_monthly_reviews_review_month ON public.monthly_reviews(review_month);
CREATE INDEX idx_comms_log_athlete_id ON public.comms_log(athlete_id);

-- =============================================
-- TRIGGERS for updated_at
-- =============================================
CREATE TRIGGER update_athletes_updated_at
  BEFORE UPDATE ON public.athletes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_portal_users_updated_at
  BEFORE UPDATE ON public.portal_users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_guardians_updated_at
  BEFORE UPDATE ON public.guardians
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_monthly_reviews_updated_at
  BEFORE UPDATE ON public.monthly_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- HELPER FUNCTION: Check if user has access to athlete
-- =============================================
CREATE OR REPLACE FUNCTION public.user_has_athlete_access(user_uuid uuid, athlete_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Admin or agent can access all
    SELECT 1 FROM public.portal_users
    WHERE id = user_uuid AND role IN ('admin', 'agent')
    
    UNION
    
    -- Parent or athlete can access their linked athlete
    SELECT 1 FROM public.user_athlete_access
    WHERE user_id = user_uuid AND athlete_id = athlete_uuid
  );
$$;

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Athletes Table
ALTER TABLE public.athletes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and agents can view all athletes"
  ON public.athletes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.portal_users
      WHERE id = auth.uid() AND role IN ('admin', 'agent')
    )
  );

CREATE POLICY "Users can view their linked athletes"
  ON public.athletes FOR SELECT
  TO authenticated
  USING (
    public.user_has_athlete_access(auth.uid(), id)
  );

CREATE POLICY "Admins and agents can insert athletes"
  ON public.athletes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.portal_users
      WHERE id = auth.uid() AND role IN ('admin', 'agent')
    )
  );

CREATE POLICY "Admins and agents can update athletes"
  ON public.athletes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.portal_users
      WHERE id = auth.uid() AND role IN ('admin', 'agent')
    )
  );

CREATE POLICY "Admins can delete athletes"
  ON public.athletes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.portal_users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Portal Users Table
ALTER TABLE public.portal_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own record"
  ON public.portal_users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Admins can view all portal users"
  ON public.portal_users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.portal_users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert portal users"
  ON public.portal_users FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.portal_users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update portal users"
  ON public.portal_users FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.portal_users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- User Athlete Access Table
ALTER TABLE public.user_athlete_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own access records"
  ON public.user_athlete_access FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins and agents can view all access records"
  ON public.user_athlete_access FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.portal_users
      WHERE id = auth.uid() AND role IN ('admin', 'agent')
    )
  );

CREATE POLICY "Admins can manage access records"
  ON public.user_athlete_access FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.portal_users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Guardians Table
ALTER TABLE public.guardians ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and agents can view all guardians"
  ON public.guardians FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.portal_users
      WHERE id = auth.uid() AND role IN ('admin', 'agent')
    )
  );

CREATE POLICY "Users can view guardians of their linked athletes"
  ON public.guardians FOR SELECT
  TO authenticated
  USING (
    public.user_has_athlete_access(auth.uid(), athlete_id)
  );

CREATE POLICY "Admins and agents can manage guardians"
  ON public.guardians FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.portal_users
      WHERE id = auth.uid() AND role IN ('admin', 'agent')
    )
  );

-- Monthly Reviews Table
ALTER TABLE public.monthly_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and agents can view all reviews"
  ON public.monthly_reviews FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.portal_users
      WHERE id = auth.uid() AND role IN ('admin', 'agent')
    )
  );

CREATE POLICY "Users can view reviews of their linked athletes"
  ON public.monthly_reviews FOR SELECT
  TO authenticated
  USING (
    public.user_has_athlete_access(auth.uid(), athlete_id)
  );

CREATE POLICY "Admins and agents can manage reviews"
  ON public.monthly_reviews FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.portal_users
      WHERE id = auth.uid() AND role IN ('admin', 'agent')
    )
  );

-- Comms Log Table
ALTER TABLE public.comms_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and agents can view all comms"
  ON public.comms_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.portal_users
      WHERE id = auth.uid() AND role IN ('admin', 'agent')
    )
  );

CREATE POLICY "Users can view comms for their linked athletes"
  ON public.comms_log FOR SELECT
  TO authenticated
  USING (
    public.user_has_athlete_access(auth.uid(), athlete_id)
  );

CREATE POLICY "Admins and agents can manage comms"
  ON public.comms_log FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.portal_users
      WHERE id = auth.uid() AND role IN ('admin', 'agent')
    )
  );