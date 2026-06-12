CREATE OR REPLACE FUNCTION public.create_conversation_action_task(
  _athlete_id uuid,
  _title text,
  _description text,
  _due_date date,
  _priority integer,
  _related_call_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_assigned_agent_id uuid;
  v_task_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF _athlete_id IS NULL THEN
    RAISE EXCEPTION 'athlete is required';
  END IF;

  IF NULLIF(TRIM(_title), '') IS NULL THEN
    RAISE EXCEPTION 'task title is required';
  END IF;

  IF _due_date IS NULL THEN
    RAISE EXCEPTION 'due date is required';
  END IF;

  IF _priority IS NULL OR _priority < 1 OR _priority > 5 THEN
    RAISE EXCEPTION 'priority must be between 1 and 5';
  END IF;

  SELECT assigned_agent_user_id
    INTO v_assigned_agent_id
    FROM public.athletes
   WHERE id = _athlete_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'athlete not found';
  END IF;

  IF NOT (
    public.is_admin()
    OR v_assigned_agent_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'not allowed to create tasks for this athlete';
  END IF;

  IF _related_call_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.call_history WHERE id = _related_call_id AND athlete_id = _athlete_id
  ) THEN
    RAISE EXCEPTION 'conversation does not belong to this athlete';
  END IF;

  INSERT INTO public.athlete_tasks (
    athlete_id,
    title,
    description,
    owner_type,
    assigned_to_user_id,
    created_by,
    due_date,
    priority,
    status,
    source,
    related_call_id
  ) VALUES (
    _athlete_id,
    TRIM(_title),
    NULLIF(TRIM(COALESCE(_description, '')), ''),
    'agent',
    v_assigned_agent_id,
    v_user_id,
    _due_date,
    _priority,
    'open',
    'conversation_ai',
    _related_call_id
  )
  RETURNING id INTO v_task_id;

  RETURN v_task_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_conversation_action_task(uuid, text, text, date, integer, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_conversation_action_task(uuid, text, text, date, integer, uuid) TO service_role;