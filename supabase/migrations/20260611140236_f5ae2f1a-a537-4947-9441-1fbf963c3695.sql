-- Part 1: capture columns
ALTER TABLE public.athlete_tasks
  ADD COLUMN IF NOT EXISTS original_due_date date,
  ADD COLUMN IF NOT EXISTS reschedule_count  int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dismissed_at      timestamptz,
  ADD COLUMN IF NOT EXISTS dismiss_reason    text;
-- completed_at already exists on this table.

-- Best-effort backfill of original_due_date for existing rows
UPDATE public.athlete_tasks
SET original_due_date = due_date
WHERE original_due_date IS NULL AND due_date IS NOT NULL;

-- Trigger: stamp original_due_date on insert; auto-set completed_at / dismissed_at;
-- count reschedules on due_date changes.
CREATE OR REPLACE FUNCTION public.athlete_tasks_capture_history()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.original_due_date IS NULL AND NEW.due_date IS NOT NULL THEN
      NEW.original_due_date := NEW.due_date;
    END IF;
    -- If a row is inserted already in a terminal state, stamp timestamps.
    IF NEW.status = 'done' AND NEW.completed_at IS NULL THEN
      NEW.completed_at := now();
    END IF;
    IF NEW.status IN ('cancelled','dismissed') AND NEW.dismissed_at IS NULL THEN
      NEW.dismissed_at := now();
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE
  -- First-time setting of due_date (was NULL) is not a reschedule.
  IF NEW.due_date IS DISTINCT FROM OLD.due_date
     AND OLD.due_date IS NOT NULL
     AND NEW.due_date IS NOT NULL THEN
    NEW.reschedule_count := COALESCE(OLD.reschedule_count, 0) + 1;
  END IF;

  -- If due_date is being set for the first time after creation,
  -- treat that as the original commitment.
  IF NEW.original_due_date IS NULL AND NEW.due_date IS NOT NULL THEN
    NEW.original_due_date := NEW.due_date;
  END IF;

  IF NEW.status = 'done' AND OLD.status IS DISTINCT FROM 'done'
     AND NEW.completed_at IS NULL THEN
    NEW.completed_at := now();
  END IF;

  IF NEW.status IN ('cancelled','dismissed')
     AND OLD.status NOT IN ('cancelled','dismissed')
     AND NEW.dismissed_at IS NULL THEN
    NEW.dismissed_at := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_athlete_tasks_capture_history ON public.athlete_tasks;
CREATE TRIGGER trg_athlete_tasks_capture_history
BEFORE INSERT OR UPDATE ON public.athlete_tasks
FOR EACH ROW EXECUTE FUNCTION public.athlete_tasks_capture_history();

-- Admin-only scorecard function
CREATE OR REPLACE FUNCTION public.get_agent_task_scorecard(p_window_days int DEFAULT 90)
RETURNS TABLE (
  agent_id              uuid,
  agent_name            text,
  athletes_assigned     int,
  tasks_created         int,
  tasks_completed       int,
  tasks_dismissed       int,
  completed_with_due    int,
  on_time_count         int,
  on_time_rate          numeric,
  avg_lag_days          numeric,
  currently_overdue     int,
  oldest_overdue_days   int,
  median_overdue_days   numeric,
  rescheduled_tasks     int,
  reschedule_rate       numeric,
  avg_reschedules       numeric,
  dismiss_rate          numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  RETURN QUERY
  WITH agents AS (
    SELECT pu.id, COALESCE(pu.display_name, pu.email, 'Agent') AS name
    FROM public.portal_users pu
    WHERE pu.role = 'agent' AND pu.approved = true
  ),
  athlete_counts AS (
    SELECT assigned_agent_user_id AS agent_id, COUNT(*)::int AS n
    FROM public.athletes
    WHERE assigned_agent_user_id IS NOT NULL
    GROUP BY assigned_agent_user_id
  ),
  -- Tasks that BELONG to an agent: prefer assigned_to_user_id, else the
  -- athlete's assigned agent. We attribute by athlete's assigned agent because
  -- created_by may be admin/parent on some insertion paths.
  scoped AS (
    SELECT
      t.*,
      COALESCE(t.assigned_to_user_id, a.assigned_agent_user_id) AS owner_agent_id
    FROM public.athlete_tasks t
    JOIN public.athletes a ON a.id = t.athlete_id
    WHERE COALESCE(t.assigned_to_user_id, a.assigned_agent_user_id) IS NOT NULL
      AND t.owner_type = 'agent'
  ),
  window_tasks AS (
    SELECT * FROM scoped
    WHERE created_at >= now() - (p_window_days || ' days')::interval
       OR p_window_days <= 0
  ),
  per_agent AS (
    SELECT
      g.id AS agent_id,
      g.name AS agent_name,
      COALESCE((SELECT n FROM athlete_counts ac WHERE ac.agent_id = g.id), 0) AS athletes_assigned,
      COUNT(wt.id)::int AS tasks_created,
      COUNT(wt.id) FILTER (WHERE wt.status = 'done')::int AS tasks_completed,
      COUNT(wt.id) FILTER (WHERE wt.status IN ('cancelled','dismissed'))::int AS tasks_dismissed,
      COUNT(wt.id) FILTER (
        WHERE wt.status = 'done' AND wt.original_due_date IS NOT NULL
      )::int AS completed_with_due,
      COUNT(wt.id) FILTER (
        WHERE wt.status = 'done'
          AND wt.original_due_date IS NOT NULL
          AND wt.completed_at IS NOT NULL
          AND wt.completed_at::date <= wt.original_due_date
      )::int AS on_time_count,
      AVG(
        EXTRACT(EPOCH FROM (wt.completed_at - wt.original_due_date::timestamptz)) / 86400.0
      ) FILTER (
        WHERE wt.status = 'done' AND wt.original_due_date IS NOT NULL AND wt.completed_at IS NOT NULL
      ) AS avg_lag_days,
      COUNT(wt.id) FILTER (WHERE wt.reschedule_count > 0)::int AS rescheduled_tasks,
      AVG(wt.reschedule_count) AS avg_reschedules
    FROM agents g
    LEFT JOIN window_tasks wt ON wt.owner_agent_id = g.id
    GROUP BY g.id, g.name
  ),
  -- Currently overdue is point-in-time, not window-bounded.
  overdue_per_agent AS (
    SELECT
      s.owner_agent_id AS agent_id,
      COUNT(*)::int AS currently_overdue,
      MAX( (CURRENT_DATE - s.due_date) )::int AS oldest_overdue_days,
      (
        percentile_cont(0.5) WITHIN GROUP (
          ORDER BY (CURRENT_DATE - s.due_date)::numeric
        )
      )::numeric AS median_overdue_days
    FROM scoped s
    WHERE s.status NOT IN ('done','cancelled','dismissed')
      AND s.due_date IS NOT NULL
      AND s.due_date < CURRENT_DATE
    GROUP BY s.owner_agent_id
  )
  SELECT
    pa.agent_id,
    pa.agent_name,
    pa.athletes_assigned,
    pa.tasks_created,
    pa.tasks_completed,
    pa.tasks_dismissed,
    pa.completed_with_due,
    pa.on_time_count,
    CASE WHEN pa.completed_with_due > 0
         THEN ROUND((pa.on_time_count::numeric / pa.completed_with_due) * 100, 1)
         ELSE NULL END AS on_time_rate,
    CASE WHEN pa.avg_lag_days IS NULL THEN NULL
         ELSE ROUND(pa.avg_lag_days::numeric, 1) END AS avg_lag_days,
    COALESCE(op.currently_overdue, 0) AS currently_overdue,
    COALESCE(op.oldest_overdue_days, 0) AS oldest_overdue_days,
    COALESCE(op.median_overdue_days, 0) AS median_overdue_days,
    pa.rescheduled_tasks,
    CASE WHEN pa.tasks_created > 0
         THEN ROUND((pa.rescheduled_tasks::numeric / pa.tasks_created) * 100, 1)
         ELSE 0 END AS reschedule_rate,
    CASE WHEN pa.avg_reschedules IS NULL THEN 0
         ELSE ROUND(pa.avg_reschedules::numeric, 2) END AS avg_reschedules,
    CASE WHEN pa.tasks_created > 0
         THEN ROUND((pa.tasks_dismissed::numeric / pa.tasks_created) * 100, 1)
         ELSE 0 END AS dismiss_rate
  FROM per_agent pa
  LEFT JOIN overdue_per_agent op ON op.agent_id = pa.agent_id
  ORDER BY pa.agent_name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_agent_task_scorecard(int) TO authenticated;

-- Admin-only: list of overdue tasks for a specific agent (for drill-in)
CREATE OR REPLACE FUNCTION public.get_agent_overdue_tasks(p_agent_id uuid)
RETURNS TABLE (
  task_id        uuid,
  title          text,
  athlete_id     uuid,
  athlete_name   text,
  priority       int,
  due_date       date,
  original_due_date date,
  reschedule_count  int,
  days_overdue   int,
  status         text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  RETURN QUERY
  SELECT
    t.id,
    t.title,
    a.id,
    (a.first_name || ' ' || a.last_name)::text AS athlete_name,
    t.priority,
    t.due_date,
    t.original_due_date,
    t.reschedule_count,
    (CURRENT_DATE - t.due_date)::int AS days_overdue,
    t.status::text
  FROM public.athlete_tasks t
  JOIN public.athletes a ON a.id = t.athlete_id
  WHERE COALESCE(t.assigned_to_user_id, a.assigned_agent_user_id) = p_agent_id
    AND t.owner_type = 'agent'
    AND t.status NOT IN ('done','cancelled','dismissed')
    AND t.due_date IS NOT NULL
    AND t.due_date < CURRENT_DATE
  ORDER BY t.due_date ASC
  LIMIT 100;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_agent_overdue_tasks(uuid) TO authenticated;

-- Admin-only: top dismiss reasons per agent over the window
CREATE OR REPLACE FUNCTION public.get_agent_dismiss_reasons(p_agent_id uuid, p_window_days int DEFAULT 90)
RETURNS TABLE (reason text, n int)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(NULLIF(TRIM(t.dismiss_reason), ''), '(no reason)') AS reason,
    COUNT(*)::int AS n
  FROM public.athlete_tasks t
  JOIN public.athletes a ON a.id = t.athlete_id
  WHERE COALESCE(t.assigned_to_user_id, a.assigned_agent_user_id) = p_agent_id
    AND t.owner_type = 'agent'
    AND t.status IN ('cancelled','dismissed')
    AND (p_window_days <= 0 OR t.dismissed_at >= now() - (p_window_days || ' days')::interval)
  GROUP BY reason
  ORDER BY n DESC
  LIMIT 5;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_agent_dismiss_reasons(uuid, int) TO authenticated;