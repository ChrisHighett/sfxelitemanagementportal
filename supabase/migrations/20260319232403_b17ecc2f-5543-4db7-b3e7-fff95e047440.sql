
-- Athlete timeline events for expanded timeline
CREATE TABLE public.athlete_timeline_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  event_type text NOT NULL, -- 'milestone', 'representative', 'injury', 'contract', 'stage_change'
  event_date date NOT NULL,
  title text NOT NULL,
  description text,
  created_by uuid REFERENCES public.portal_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.athlete_timeline_events ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "admin_manage_timeline" ON public.athlete_timeline_events
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Agent access for their athletes
CREATE POLICY "agent_manage_timeline" ON public.athlete_timeline_events
  FOR ALL TO authenticated
  USING (is_agent() AND EXISTS (
    SELECT 1 FROM athletes WHERE athletes.id = athlete_timeline_events.athlete_id AND athletes.assigned_agent_id = auth.uid()
  ))
  WITH CHECK (is_agent() AND EXISTS (
    SELECT 1 FROM athletes WHERE athletes.id = athlete_timeline_events.athlete_id AND athletes.assigned_agent_id = auth.uid()
  ));

-- Parent/athlete read only
CREATE POLICY "parent_athlete_read_timeline" ON public.athlete_timeline_events
  FOR SELECT TO authenticated
  USING (is_approved_parent_or_athlete_for(athlete_id));

-- Follow-up tasks table
CREATE TABLE public.follow_up_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  assigned_to text NOT NULL, -- 'agent', 'athlete', 'parent'
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed'
  due_date date,
  created_by uuid REFERENCES public.portal_users(id),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.follow_up_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_manage_tasks" ON public.follow_up_tasks
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "agent_manage_tasks" ON public.follow_up_tasks
  FOR ALL TO authenticated
  USING (is_agent() AND EXISTS (
    SELECT 1 FROM athletes WHERE athletes.id = follow_up_tasks.athlete_id AND athletes.assigned_agent_id = auth.uid()
  ))
  WITH CHECK (is_agent() AND EXISTS (
    SELECT 1 FROM athletes WHERE athletes.id = follow_up_tasks.athlete_id AND athletes.assigned_agent_id = auth.uid()
  ));

CREATE POLICY "parent_athlete_read_tasks" ON public.follow_up_tasks
  FOR SELECT TO authenticated
  USING (is_approved_parent_or_athlete_for(athlete_id));
