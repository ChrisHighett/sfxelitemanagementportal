REVOKE EXECUTE ON FUNCTION public.create_conversation_action_task(uuid, text, text, date, integer, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_conversation_action_task(uuid, text, text, date, integer, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_conversation_action_task(uuid, text, text, date, integer, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_conversation_action_task(uuid, text, text, date, integer, uuid) TO service_role;