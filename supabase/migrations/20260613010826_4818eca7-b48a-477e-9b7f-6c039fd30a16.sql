
-- 1. Scope agent access on per-athlete tables to assigned athletes only.

DROP POLICY IF EXISTS "agent_manage_athlete_resources" ON public.athlete_resources;
CREATE POLICY "agent_manage_athlete_resources"
ON public.athlete_resources
FOR ALL
USING (
  is_agent() AND EXISTS (
    SELECT 1 FROM public.athletes a
    WHERE a.id = athlete_resources.athlete_id
      AND a.assigned_agent_user_id = auth.uid()
  )
)
WITH CHECK (
  is_agent() AND EXISTS (
    SELECT 1 FROM public.athletes a
    WHERE a.id = athlete_resources.athlete_id
      AND a.assigned_agent_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "agent manage scorecards" ON public.athlete_scorecards;
CREATE POLICY "agent manage scorecards"
ON public.athlete_scorecards
FOR ALL
USING (
  is_agent() AND EXISTS (
    SELECT 1 FROM public.athletes a
    WHERE a.id = athlete_scorecards.athlete_id
      AND a.assigned_agent_user_id = auth.uid()
  )
)
WITH CHECK (
  is_agent() AND EXISTS (
    SELECT 1 FROM public.athletes a
    WHERE a.id = athlete_scorecards.athlete_id
      AND a.assigned_agent_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "agent manage call_history" ON public.call_history;
CREATE POLICY "agent manage call_history"
ON public.call_history
FOR ALL
USING (
  is_agent() AND EXISTS (
    SELECT 1 FROM public.athletes a
    WHERE a.id = call_history.athlete_id
      AND a.assigned_agent_user_id = auth.uid()
  )
)
WITH CHECK (
  is_agent() AND EXISTS (
    SELECT 1 FROM public.athletes a
    WHERE a.id = call_history.athlete_id
      AND a.assigned_agent_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "agent manage parent_engagement" ON public.parent_engagement_scores;
CREATE POLICY "agent manage parent_engagement"
ON public.parent_engagement_scores
FOR ALL
USING (
  is_agent() AND EXISTS (
    SELECT 1 FROM public.athletes a
    WHERE a.id = parent_engagement_scores.athlete_id
      AND a.assigned_agent_user_id = auth.uid()
  )
)
WITH CHECK (
  is_agent() AND EXISTS (
    SELECT 1 FROM public.athletes a
    WHERE a.id = parent_engagement_scores.athlete_id
      AND a.assigned_agent_user_id = auth.uid()
  )
);

-- 2. Align follow_up_tasks agent scoping with assigned_agent_user_id.

DROP POLICY IF EXISTS "agent_manage_tasks" ON public.follow_up_tasks;
CREATE POLICY "agent_manage_tasks"
ON public.follow_up_tasks
FOR ALL
USING (
  is_agent() AND EXISTS (
    SELECT 1 FROM public.athletes a
    WHERE a.id = follow_up_tasks.athlete_id
      AND a.assigned_agent_user_id = auth.uid()
  )
)
WITH CHECK (
  is_agent() AND EXISTS (
    SELECT 1 FROM public.athletes a
    WHERE a.id = follow_up_tasks.athlete_id
      AND a.assigned_agent_user_id = auth.uid()
  )
);

-- 3. Gate is_guardian_of on an approved portal_users row to prevent
--    self-inserted guardian rows from granting silent access.

CREATE OR REPLACE FUNCTION public.is_guardian_of(_athlete_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.guardians g
    JOIN public.portal_users pu ON pu.id = g.guardian_user_id
    WHERE g.guardian_user_id = auth.uid()
      AND g.athlete_id = _athlete_id
      AND pu.approved = true
      AND pu.role IN ('parent', 'athlete')
  );
$function$;

-- 4. Lock down guardians writes so non-admins cannot set guardian_user_id,
--    which would otherwise let an agent silently link a user as a guardian.

DROP POLICY IF EXISTS "agents can manage guardians of their athletes" ON public.guardians;
CREATE POLICY "agents can manage guardians of their athletes"
ON public.guardians
FOR ALL
USING (
  is_admin() OR (
    is_agent() AND EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = guardians.athlete_id
        AND a.assigned_agent_user_id = auth.uid()
    )
  )
)
WITH CHECK (
  is_admin() OR (
    is_agent()
    AND guardian_user_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = guardians.athlete_id
        AND a.assigned_agent_user_id = auth.uid()
    )
  )
);

-- 5. Remove the self-insert branch on portal_users that allowed
--    authenticated users to assign themselves any role.

DROP POLICY IF EXISTS "Admins can insert portal users" ON public.portal_users;

-- 6. Remove the public-true profiles SELECT policy; keep the scoped one.

DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- 7. scout_leads: require approved admin role and tighten INSERT WITH CHECK.

DROP POLICY IF EXISTS "Agents can insert scout leads" ON public.scout_leads;
CREATE POLICY "Agents can insert scout leads"
ON public.scout_leads
FOR INSERT
WITH CHECK (
  created_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.portal_users pu
    WHERE pu.id = auth.uid()
      AND pu.approved = true
      AND pu.role IN ('agent','admin','scout')
  )
);

DROP POLICY IF EXISTS "Scouts can insert leads" ON public.scout_leads;
CREATE POLICY "Scouts can insert leads"
ON public.scout_leads
FOR INSERT
WITH CHECK (
  created_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.portal_users pu
    WHERE pu.id = auth.uid()
      AND pu.approved = true
      AND pu.role IN ('scout','agent','admin')
  )
);

DROP POLICY IF EXISTS "Scouts can update their own leads" ON public.scout_leads;
CREATE POLICY "Scouts can update their own leads"
ON public.scout_leads
FOR UPDATE
USING (
  (created_by = auth.uid())
  OR (assigned_agent_id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.portal_users pu
    WHERE pu.id = auth.uid()
      AND pu.role = 'admin'
      AND pu.approved = true
  )
);

DROP POLICY IF EXISTS "Scouts see their own leads" ON public.scout_leads;
CREATE POLICY "Scouts see their own leads"
ON public.scout_leads
FOR SELECT
USING (
  (created_by = auth.uid())
  OR (assigned_agent_id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.portal_users pu
    WHERE pu.id = auth.uid()
      AND pu.role = 'admin'
      AND pu.approved = true
  )
);
