
-- Scope agents' visibility of scout_leads strictly to leads assigned to them.
-- Admins keep full access; scouts continue to see leads they created or are assigned.

DROP POLICY IF EXISTS "Agents see assigned leads" ON public.scout_leads;
DROP POLICY IF EXISTS "Scouts see their own leads" ON public.scout_leads;
DROP POLICY IF EXISTS "Admins see all scout leads" ON public.scout_leads;
DROP POLICY IF EXISTS "Agents can update their leads" ON public.scout_leads;
DROP POLICY IF EXISTS "Scouts can update their own leads" ON public.scout_leads;

-- SELECT: admins see all
CREATE POLICY "Admins see all scout leads"
ON public.scout_leads
FOR SELECT
TO authenticated
USING (public.is_admin());

-- SELECT: agents see ONLY leads assigned to them (no created_by fallback,
-- no unassigned leads)
CREATE POLICY "Agents see only their assigned leads"
ON public.scout_leads
FOR SELECT
TO authenticated
USING (
  assigned_agent_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.portal_users pu
    WHERE pu.id = auth.uid()
      AND pu.role = 'agent'
      AND pu.approved = true
  )
);

-- SELECT: scouts see leads they created or were assigned to them
CREATE POLICY "Scouts see their own leads"
ON public.scout_leads
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.portal_users pu
    WHERE pu.id = auth.uid()
      AND pu.role = 'scout'
      AND pu.approved = true
  )
  AND (created_by = auth.uid() OR assigned_agent_id = auth.uid())
);

-- UPDATE: admins
CREATE POLICY "Admins can update scout leads"
ON public.scout_leads
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- UPDATE: agents only on leads assigned to them
CREATE POLICY "Agents can update their assigned leads"
ON public.scout_leads
FOR UPDATE
TO authenticated
USING (
  assigned_agent_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.portal_users pu
    WHERE pu.id = auth.uid()
      AND pu.role = 'agent'
      AND pu.approved = true
  )
)
WITH CHECK (
  assigned_agent_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.portal_users pu
    WHERE pu.id = auth.uid()
      AND pu.role = 'agent'
      AND pu.approved = true
  )
);

-- UPDATE: scouts on leads they created or are assigned
CREATE POLICY "Scouts can update their own leads"
ON public.scout_leads
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.portal_users pu
    WHERE pu.id = auth.uid()
      AND pu.role = 'scout'
      AND pu.approved = true
  )
  AND (created_by = auth.uid() OR assigned_agent_id = auth.uid())
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.portal_users pu
    WHERE pu.id = auth.uid()
      AND pu.role = 'scout'
      AND pu.approved = true
  )
  AND (created_by = auth.uid() OR assigned_agent_id = auth.uid())
);
