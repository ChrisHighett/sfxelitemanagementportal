
-- Add new columns to monthly_reviews to match the tracker spreadsheet
ALTER TABLE public.monthly_reviews
  ADD COLUMN IF NOT EXISTS call_date date,
  ADD COLUMN IF NOT EXISTS call_duration text,
  ADD COLUMN IF NOT EXISTS training_highlights text,
  ADD COLUMN IF NOT EXISTS areas_for_improvement text,
  ADD COLUMN IF NOT EXISTS football_goal text,
  ADD COLUMN IF NOT EXISTS personal_goal text,
  ADD COLUMN IF NOT EXISTS school_life_goal text,
  ADD COLUMN IF NOT EXISTS parent_engagement_notes text,
  ADD COLUMN IF NOT EXISTS follow_up_actions text;

-- Create goal_tracker table for Sheet 3
CREATE TABLE IF NOT EXISTS public.goal_tracker (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  goal_type text NOT NULL, -- 'Football', 'Personal', 'School/Life'
  goal_description text NOT NULL,
  month_set text NOT NULL, -- e.g. 'Jan-26'
  status text NOT NULL DEFAULT 'In progress', -- 'In progress', 'Achieved', 'Dropped'
  comments text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.goal_tracker ENABLE ROW LEVEL SECURITY;

-- RLS: admin full access
CREATE POLICY "admin can manage goal_tracker" ON public.goal_tracker
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- RLS: agents can manage goals for their athletes
CREATE POLICY "agents can manage goal_tracker" ON public.goal_tracker
  FOR ALL TO authenticated
  USING (is_admin() OR (is_agent() AND EXISTS (
    SELECT 1 FROM athletes WHERE athletes.id = goal_tracker.athlete_id AND athletes.assigned_agent_id = auth.uid()
  )))
  WITH CHECK (is_admin() OR (is_agent() AND EXISTS (
    SELECT 1 FROM athletes WHERE athletes.id = goal_tracker.athlete_id AND athletes.assigned_agent_id = auth.uid()
  )));

-- RLS: parent/athlete can read their own
CREATE POLICY "parent_or_athlete_can_read_goals" ON public.goal_tracker
  FOR SELECT TO authenticated
  USING (is_approved_parent_or_athlete_for(athlete_id));

-- Updated_at trigger
CREATE TRIGGER update_goal_tracker_updated_at
  BEFORE UPDATE ON public.goal_tracker
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
