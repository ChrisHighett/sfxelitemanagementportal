CREATE OR REPLACE FUNCTION public.get_agent_task_scorecard(p_window_days integer DEFAULT 90)
 RETURNS TABLE(agent_id uuid, agent_name text, athletes_assigned integer, tasks_created integer, tasks_completed integer, tasks_dismissed integer, completed_with_due integer, on_time_count integer, on_time_rate numeric, avg_lag_days numeric, currently_overdue integer, oldest_overdue_days integer, median_overdue_days numeric, rescheduled_tasks integer, reschedule_rate numeric, avg_reschedules numeric, dismiss_rate numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_is_eleva boolean := public.is_eleva_ops();
  v_agency uuid := public.current_agency_id();
BEGIN
  IF NOT (public.is_admin() OR v_is_eleva) THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  RETURN QUERY
  WITH agents AS (
    SELECT pu.id, COALESCE(pu.display_name, pu.email, 'Agent') AS name
    FROM public.portal_users pu
    WHERE pu.role = 'agent' AND pu.approved = true
      AND (v_is_eleva OR pu.agency_id = v_agency)
  ),
  athlete_counts AS (
    SELECT a.assigned_agent_user_id AS agent_id, COUNT(*)::int AS n
    FROM public.athletes a
    WHERE a.assigned_agent_user_id IS NOT NULL
      AND (v_is_eleva OR a.agency_id = v_agency)
    GROUP BY a.assigned_agent_user_id
  ),
  scoped AS (
    SELECT
      t.*,
      COALESCE(t.assigned_to_user_id, a.assigned_agent_user_id) AS owner_agent_id
    FROM public.athlete_tasks t
    JOIN public.athletes a ON a.id = t.athlete_id
    WHERE COALESCE(t.assigned_to_user_id, a.assigned_agent_user_id) IS NOT NULL
      AND t.owner_type = 'agent'
      AND (v_is_eleva OR a.agency_id = v_agency)
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
      COUNT(wt.id) FILTER (WHERE wt.status = 'cancelled')::int AS tasks_dismissed,
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
  overdue_per_agent AS (
    SELECT
      s.owner_agent_id AS agent_id,
      COUNT(*)::int AS currently_overdue,
      MAX((CURRENT_DATE - s.due_date))::int AS oldest_overdue_days,
      (
        percentile_cont(0.5) WITHIN GROUP (
          ORDER BY (CURRENT_DATE - s.due_date)::numeric
        )
      )::numeric AS median_overdue_days
    FROM scoped s
    WHERE s.status NOT IN ('done','cancelled')
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
$function$;

CREATE OR REPLACE FUNCTION public.get_agent_overdue_tasks(p_agent_id uuid)
 RETURNS TABLE(task_id uuid, title text, athlete_id uuid, athlete_name text, priority integer, due_date date, original_due_date date, reschedule_count integer, days_overdue integer, status text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_is_eleva boolean := public.is_eleva_ops();
  v_agency uuid := public.current_agency_id();
BEGIN
  IF NOT (public.is_admin() OR v_is_eleva) THEN
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
    AND t.status NOT IN ('done','cancelled')
    AND t.due_date IS NOT NULL
    AND t.due_date < CURRENT_DATE
    AND (v_is_eleva OR a.agency_id = v_agency)
  ORDER BY t.due_date ASC
  LIMIT 100;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_agent_dismiss_reasons(p_agent_id uuid, p_window_days integer DEFAULT 90)
 RETURNS TABLE(reason text, n integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_is_eleva boolean := public.is_eleva_ops();
  v_agency uuid := public.current_agency_id();
BEGIN
  IF NOT (public.is_admin() OR v_is_eleva) THEN
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
    AND t.status = 'cancelled'
    AND (p_window_days <= 0 OR t.dismissed_at >= now() - (p_window_days || ' days')::interval)
    AND (v_is_eleva OR a.agency_id = v_agency)
  GROUP BY reason
  ORDER BY n DESC
  LIMIT 5;
END;
$function$;