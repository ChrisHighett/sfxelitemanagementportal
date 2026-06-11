ALTER TABLE public.scout_leads
  ADD COLUMN IF NOT EXISTS lost_reason text,
  ADD COLUMN IF NOT EXISTS lost_at date;

UPDATE public.athletes
  SET assigned_agent_user_id = '74cf9e33-ff84-412f-a78c-50912743862a'
  WHERE (assigned_agent_name = 'Chris Highett' OR assigned_agent_name ILIKE '%highett%')
    AND assigned_agent_user_id IS NULL;