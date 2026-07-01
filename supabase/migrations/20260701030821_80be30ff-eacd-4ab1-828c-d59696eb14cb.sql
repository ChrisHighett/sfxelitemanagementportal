
-- Keep athletes.assigned_agent_id in sync with assigned_agent_user_id so the
-- agent UPDATE RLS policy (which checks assigned_agent_id = auth.uid()) works
-- for any athlete created via any flow.

CREATE OR REPLACE FUNCTION public.sync_athlete_assigned_agent_ids()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Whichever column the caller populated, mirror to the other.
  IF NEW.assigned_agent_user_id IS NOT NULL AND NEW.assigned_agent_id IS NULL THEN
    NEW.assigned_agent_id := NEW.assigned_agent_user_id;
  ELSIF NEW.assigned_agent_id IS NOT NULL AND NEW.assigned_agent_user_id IS NULL THEN
    NEW.assigned_agent_user_id := NEW.assigned_agent_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_athlete_assigned_agent_ids ON public.athletes;
CREATE TRIGGER trg_sync_athlete_assigned_agent_ids
BEFORE INSERT OR UPDATE ON public.athletes
FOR EACH ROW EXECUTE FUNCTION public.sync_athlete_assigned_agent_ids();

-- Backfill existing mismatched rows so already-created athletes are editable.
UPDATE public.athletes
   SET assigned_agent_id = assigned_agent_user_id
 WHERE assigned_agent_id IS NULL
   AND assigned_agent_user_id IS NOT NULL;

UPDATE public.athletes
   SET assigned_agent_user_id = assigned_agent_id
 WHERE assigned_agent_user_id IS NULL
   AND assigned_agent_id IS NOT NULL;
