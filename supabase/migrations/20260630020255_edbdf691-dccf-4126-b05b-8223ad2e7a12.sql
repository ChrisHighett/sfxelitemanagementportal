
-- Helper: is_divisional_gm()
CREATE OR REPLACE FUNCTION public.is_divisional_gm()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.portal_users
    WHERE id = auth.uid()
      AND role = 'divisional_gm'
      AND approved = true
  )
$$;

-- Helper: divisional GM can read this athlete (athlete's assigned agent shares agency+division with the GM)
CREATE OR REPLACE FUNCTION public.divisional_gm_can_read_athlete(_athlete_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.portal_users gm
    JOIN public.athletes a ON a.id = _athlete_id
    JOIN public.portal_users agent_pu
      ON agent_pu.id = a.assigned_agent_user_id
    WHERE gm.id = auth.uid()
      AND gm.role = 'divisional_gm'
      AND gm.approved = true
      AND gm.agency_id IS NOT NULL
      AND gm.division_id IS NOT NULL
      AND agent_pu.agency_id = gm.agency_id
      AND agent_pu.division_id = gm.division_id
  )
$$;

-- Athletes
CREATE POLICY "divisional_gm read athletes in division"
ON public.athletes FOR SELECT
USING (public.divisional_gm_can_read_athlete(id));

-- monthly_reviews
CREATE POLICY "divisional_gm read monthly_reviews in division"
ON public.monthly_reviews FOR SELECT
USING (public.divisional_gm_can_read_athlete(athlete_id));

-- call_history
CREATE POLICY "divisional_gm read call_history in division"
ON public.call_history FOR SELECT
USING (public.divisional_gm_can_read_athlete(athlete_id));

-- comms_log
CREATE POLICY "divisional_gm read comms_log in division"
ON public.comms_log FOR SELECT
USING (public.divisional_gm_can_read_athlete(athlete_id));

-- comms_history
CREATE POLICY "divisional_gm read comms_history in division"
ON public.comms_history FOR SELECT
USING (public.divisional_gm_can_read_athlete(athlete_id));

-- goal_tracker
CREATE POLICY "divisional_gm read goal_tracker in division"
ON public.goal_tracker FOR SELECT
USING (public.divisional_gm_can_read_athlete(athlete_id));

-- athlete_tasks
CREATE POLICY "divisional_gm read athlete_tasks in division"
ON public.athlete_tasks FOR SELECT
USING (public.divisional_gm_can_read_athlete(athlete_id));

-- athlete_alerts
CREATE POLICY "divisional_gm read athlete_alerts in division"
ON public.athlete_alerts FOR SELECT
USING (public.divisional_gm_can_read_athlete(athlete_id));

-- athlete_resources
CREATE POLICY "divisional_gm read athlete_resources in division"
ON public.athlete_resources FOR SELECT
USING (public.divisional_gm_can_read_athlete(athlete_id));

-- athlete_scorecards
CREATE POLICY "divisional_gm read scorecards in division"
ON public.athlete_scorecards FOR SELECT
USING (public.divisional_gm_can_read_athlete(athlete_id));

-- athlete_timeline_events
CREATE POLICY "divisional_gm read timeline in division"
ON public.athlete_timeline_events FOR SELECT
USING (public.divisional_gm_can_read_athlete(athlete_id));

-- follow_up_tasks
CREATE POLICY "divisional_gm read follow_up_tasks in division"
ON public.follow_up_tasks FOR SELECT
USING (public.divisional_gm_can_read_athlete(athlete_id));

-- parent_engagement_scores
CREATE POLICY "divisional_gm read parent_engagement in division"
ON public.parent_engagement_scores FOR SELECT
USING (public.divisional_gm_can_read_athlete(athlete_id));

-- guardians (oversight needs contact info of the athletes they oversee)
CREATE POLICY "divisional_gm read guardians in division"
ON public.guardians FOR SELECT
USING (public.divisional_gm_can_read_athlete(athlete_id));
