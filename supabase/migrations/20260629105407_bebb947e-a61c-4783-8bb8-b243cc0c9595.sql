
-- ============================================================
-- PART A: Tighten admin WRITE policies to require agency match
-- ============================================================

-- athlete_alerts
DROP POLICY IF EXISTS "admin write athlete_alerts insert" ON public.athlete_alerts;
DROP POLICY IF EXISTS "admin write athlete_alerts update" ON public.athlete_alerts;
DROP POLICY IF EXISTS "admin write athlete_alerts delete" ON public.athlete_alerts;

CREATE POLICY "admin write athlete_alerts insert"
ON public.athlete_alerts FOR INSERT TO authenticated
WITH CHECK (is_admin() AND agency_id IS NOT NULL AND agency_id = current_agency_id());

CREATE POLICY "admin write athlete_alerts update"
ON public.athlete_alerts FOR UPDATE TO authenticated
USING (is_admin() AND agency_id IS NOT NULL AND agency_id = current_agency_id())
WITH CHECK (is_admin() AND agency_id IS NOT NULL AND agency_id = current_agency_id());

CREATE POLICY "admin write athlete_alerts delete"
ON public.athlete_alerts FOR DELETE TO authenticated
USING (is_admin() AND agency_id IS NOT NULL AND agency_id = current_agency_id());

-- goal_tracker
DROP POLICY IF EXISTS "admin write goal_tracker insert" ON public.goal_tracker;
DROP POLICY IF EXISTS "admin write goal_tracker update" ON public.goal_tracker;
DROP POLICY IF EXISTS "admin write goal_tracker delete" ON public.goal_tracker;

CREATE POLICY "admin write goal_tracker insert"
ON public.goal_tracker FOR INSERT TO authenticated
WITH CHECK (is_admin() AND agency_id IS NOT NULL AND agency_id = current_agency_id());

CREATE POLICY "admin write goal_tracker update"
ON public.goal_tracker FOR UPDATE TO authenticated
USING (is_admin() AND agency_id IS NOT NULL AND agency_id = current_agency_id())
WITH CHECK (is_admin() AND agency_id IS NOT NULL AND agency_id = current_agency_id());

CREATE POLICY "admin write goal_tracker delete"
ON public.goal_tracker FOR DELETE TO authenticated
USING (is_admin() AND agency_id IS NOT NULL AND agency_id = current_agency_id());

-- guardians
DROP POLICY IF EXISTS "admin write guardians insert" ON public.guardians;
DROP POLICY IF EXISTS "admin write guardians update" ON public.guardians;
DROP POLICY IF EXISTS "admin write guardians delete" ON public.guardians;

CREATE POLICY "admin write guardians insert"
ON public.guardians FOR INSERT TO authenticated
WITH CHECK (is_admin() AND agency_id IS NOT NULL AND agency_id = current_agency_id());

CREATE POLICY "admin write guardians update"
ON public.guardians FOR UPDATE TO authenticated
USING (is_admin() AND agency_id IS NOT NULL AND agency_id = current_agency_id())
WITH CHECK (is_admin() AND agency_id IS NOT NULL AND agency_id = current_agency_id());

CREATE POLICY "admin write guardians delete"
ON public.guardians FOR DELETE TO authenticated
USING (is_admin() AND agency_id IS NOT NULL AND agency_id = current_agency_id());


-- ============================================================
-- PART B: Add agency scoping to four previously unscoped tables
-- ============================================================

-- 1) Add agency_id columns
ALTER TABLE public.athlete_scorecards        ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES public.agencies(id);
ALTER TABLE public.athlete_timeline_events   ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES public.agencies(id);
ALTER TABLE public.follow_up_tasks           ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES public.agencies(id);
ALTER TABLE public.parent_engagement_scores  ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES public.agencies(id);

-- 2) Backfill from athletes
UPDATE public.athlete_scorecards s        SET agency_id = a.agency_id FROM public.athletes a WHERE a.id = s.athlete_id AND s.agency_id IS NULL;
UPDATE public.athlete_timeline_events s   SET agency_id = a.agency_id FROM public.athletes a WHERE a.id = s.athlete_id AND s.agency_id IS NULL;
UPDATE public.follow_up_tasks s           SET agency_id = a.agency_id FROM public.athletes a WHERE a.id = s.athlete_id AND s.agency_id IS NULL;
UPDATE public.parent_engagement_scores s  SET agency_id = a.agency_id FROM public.athletes a WHERE a.id = s.athlete_id AND s.agency_id IS NULL;

-- 3) BEFORE INSERT triggers to auto-set agency_id from athlete
CREATE OR REPLACE FUNCTION public.set_agency_id_from_athlete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.agency_id IS NULL THEN
    SELECT a.agency_id INTO NEW.agency_id FROM public.athletes a WHERE a.id = NEW.athlete_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_agency_athlete_scorecards ON public.athlete_scorecards;
CREATE TRIGGER trg_set_agency_athlete_scorecards BEFORE INSERT ON public.athlete_scorecards
FOR EACH ROW EXECUTE FUNCTION public.set_agency_id_from_athlete();

DROP TRIGGER IF EXISTS trg_set_agency_athlete_timeline_events ON public.athlete_timeline_events;
CREATE TRIGGER trg_set_agency_athlete_timeline_events BEFORE INSERT ON public.athlete_timeline_events
FOR EACH ROW EXECUTE FUNCTION public.set_agency_id_from_athlete();

DROP TRIGGER IF EXISTS trg_set_agency_follow_up_tasks ON public.follow_up_tasks;
CREATE TRIGGER trg_set_agency_follow_up_tasks BEFORE INSERT ON public.follow_up_tasks
FOR EACH ROW EXECUTE FUNCTION public.set_agency_id_from_athlete();

DROP TRIGGER IF EXISTS trg_set_agency_parent_engagement_scores ON public.parent_engagement_scores;
CREATE TRIGGER trg_set_agency_parent_engagement_scores BEFORE INSERT ON public.parent_engagement_scores
FOR EACH ROW EXECUTE FUNCTION public.set_agency_id_from_athlete();


-- 4) Replace broad admin/agent ALL policies with agency-scoped equivalents
--    + add eleva_ops read

-- ---- athlete_scorecards ----
DROP POLICY IF EXISTS "admin full access scorecards" ON public.athlete_scorecards;
DROP POLICY IF EXISTS "agent manage scorecards"     ON public.athlete_scorecards;

CREATE POLICY "admin manage scorecards by agency"
ON public.athlete_scorecards FOR ALL TO authenticated
USING (is_admin() AND agency_id IS NOT NULL AND agency_id = current_agency_id())
WITH CHECK (is_admin() AND agency_id IS NOT NULL AND agency_id = current_agency_id());

CREATE POLICY "agent manage scorecards assigned"
ON public.athlete_scorecards FOR ALL TO authenticated
USING (is_agent() AND EXISTS (SELECT 1 FROM public.athletes a WHERE a.id = athlete_scorecards.athlete_id AND a.assigned_agent_user_id = auth.uid()))
WITH CHECK (is_agent() AND EXISTS (SELECT 1 FROM public.athletes a WHERE a.id = athlete_scorecards.athlete_id AND a.assigned_agent_user_id = auth.uid()));

CREATE POLICY "eleva_ops read scorecards all"
ON public.athlete_scorecards FOR SELECT TO authenticated
USING (is_eleva_ops());

-- ---- athlete_timeline_events ----
DROP POLICY IF EXISTS "admin_manage_timeline" ON public.athlete_timeline_events;
DROP POLICY IF EXISTS "agent_manage_timeline" ON public.athlete_timeline_events;

CREATE POLICY "admin manage timeline by agency"
ON public.athlete_timeline_events FOR ALL TO authenticated
USING (is_admin() AND agency_id IS NOT NULL AND agency_id = current_agency_id())
WITH CHECK (is_admin() AND agency_id IS NOT NULL AND agency_id = current_agency_id());

CREATE POLICY "agent manage timeline assigned"
ON public.athlete_timeline_events FOR ALL TO authenticated
USING (is_agent() AND EXISTS (SELECT 1 FROM public.athletes a WHERE a.id = athlete_timeline_events.athlete_id AND a.assigned_agent_user_id = auth.uid()))
WITH CHECK (is_agent() AND EXISTS (SELECT 1 FROM public.athletes a WHERE a.id = athlete_timeline_events.athlete_id AND a.assigned_agent_user_id = auth.uid()));

CREATE POLICY "eleva_ops read timeline all"
ON public.athlete_timeline_events FOR SELECT TO authenticated
USING (is_eleva_ops());

-- ---- follow_up_tasks ----
DROP POLICY IF EXISTS "admin_manage_tasks" ON public.follow_up_tasks;
DROP POLICY IF EXISTS "agent_manage_tasks" ON public.follow_up_tasks;

CREATE POLICY "admin manage follow_up_tasks by agency"
ON public.follow_up_tasks FOR ALL TO authenticated
USING (is_admin() AND agency_id IS NOT NULL AND agency_id = current_agency_id())
WITH CHECK (is_admin() AND agency_id IS NOT NULL AND agency_id = current_agency_id());

CREATE POLICY "agent manage follow_up_tasks assigned"
ON public.follow_up_tasks FOR ALL TO authenticated
USING (is_agent() AND EXISTS (SELECT 1 FROM public.athletes a WHERE a.id = follow_up_tasks.athlete_id AND a.assigned_agent_user_id = auth.uid()))
WITH CHECK (is_agent() AND EXISTS (SELECT 1 FROM public.athletes a WHERE a.id = follow_up_tasks.athlete_id AND a.assigned_agent_user_id = auth.uid()));

CREATE POLICY "eleva_ops read follow_up_tasks all"
ON public.follow_up_tasks FOR SELECT TO authenticated
USING (is_eleva_ops());

-- ---- parent_engagement_scores ----
DROP POLICY IF EXISTS "admin full access parent_engagement" ON public.parent_engagement_scores;
DROP POLICY IF EXISTS "agent manage parent_engagement"     ON public.parent_engagement_scores;

CREATE POLICY "admin manage parent_engagement by agency"
ON public.parent_engagement_scores FOR ALL TO authenticated
USING (is_admin() AND agency_id IS NOT NULL AND agency_id = current_agency_id())
WITH CHECK (is_admin() AND agency_id IS NOT NULL AND agency_id = current_agency_id());

CREATE POLICY "agent manage parent_engagement assigned"
ON public.parent_engagement_scores FOR ALL TO authenticated
USING (is_agent() AND EXISTS (SELECT 1 FROM public.athletes a WHERE a.id = parent_engagement_scores.athlete_id AND a.assigned_agent_user_id = auth.uid()))
WITH CHECK (is_agent() AND EXISTS (SELECT 1 FROM public.athletes a WHERE a.id = parent_engagement_scores.athlete_id AND a.assigned_agent_user_id = auth.uid()));

CREATE POLICY "eleva_ops read parent_engagement all"
ON public.parent_engagement_scores FOR SELECT TO authenticated
USING (is_eleva_ops());
