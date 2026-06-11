REVOKE EXECUTE ON FUNCTION public.get_agent_task_scorecard(int) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_agent_overdue_tasks(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_agent_dismiss_reasons(uuid, int) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.athlete_tasks_capture_history() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_agent_task_scorecard(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_agent_overdue_tasks(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_agent_dismiss_reasons(uuid, int) TO authenticated;