
-- Tighten comms_history visibility for athletes/parents:
-- They can only read SENT messages addressed to their audience.

DROP POLICY IF EXISTS "Parents and athletes can view comms history" ON public.comms_history;

CREATE POLICY "Athletes read own sent athlete-addressed comms"
ON public.comms_history
FOR SELECT
TO authenticated
USING (
  sent_status = 'sent'
  AND email_type = 'athlete'
  AND EXISTS (
    SELECT 1
    FROM public.portal_users pu
    JOIN public.user_athlete_access uaa ON uaa.user_id = pu.id
    WHERE pu.id = auth.uid()
      AND pu.approved = true
      AND pu.role = 'athlete'
      AND uaa.athlete_id = comms_history.athlete_id
      AND uaa.approved_at IS NOT NULL
  )
);

CREATE POLICY "Parents read child sent parent-addressed comms"
ON public.comms_history
FOR SELECT
TO authenticated
USING (
  sent_status = 'sent'
  AND email_type = 'parent'
  AND EXISTS (
    SELECT 1
    FROM public.portal_users pu
    JOIN public.user_athlete_access uaa ON uaa.user_id = pu.id
    WHERE pu.id = auth.uid()
      AND pu.approved = true
      AND pu.role = 'parent'
      AND uaa.athlete_id = comms_history.athlete_id
      AND uaa.approved_at IS NOT NULL
  )
);
