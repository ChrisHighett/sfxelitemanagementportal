
-- ATHLETES: drop the unscoped/leaky policies
DROP POLICY IF EXISTS "admin can do everything on athletes"      ON public.athletes;
DROP POLICY IF EXISTS "Agents see only their own athletes"       ON public.athletes;
DROP POLICY IF EXISTS "agents can read their assigned athletes"  ON public.athletes;
DROP POLICY IF EXISTS "agents can update their assigned athletes" ON public.athletes;
DROP POLICY IF EXISTS "Agents can insert athletes"               ON public.athletes;

-- ATHLETES: admin scoped to own agency on every action
CREATE POLICY "admin select athletes by agency" ON public.athletes FOR SELECT TO authenticated
  USING (is_admin() AND agency_id = current_agency_id());

CREATE POLICY "admin insert athletes by agency" ON public.athletes FOR INSERT TO authenticated
  WITH CHECK (is_admin() AND agency_id = current_agency_id());

CREATE POLICY "admin update athletes by agency" ON public.athletes FOR UPDATE TO authenticated
  USING (is_admin() AND agency_id = current_agency_id())
  WITH CHECK (is_admin() AND agency_id = current_agency_id());

CREATE POLICY "admin delete athletes by agency" ON public.athletes FOR DELETE TO authenticated
  USING (is_admin() AND agency_id = current_agency_id());

-- ATHLETES: agent policies, existing conditions kept verbatim, is_admin() OR removed
CREATE POLICY "Agents see only their own athletes" ON public.athletes FOR SELECT TO authenticated
  USING ((assigned_agent_user_id = auth.uid()) OR user_has_athlete_access(auth.uid(), id));

CREATE POLICY "agents can read their assigned athletes" ON public.athletes FOR SELECT TO authenticated
  USING (is_agent() AND assigned_agent_id = auth.uid());

CREATE POLICY "agents can update their assigned athletes" ON public.athletes FOR UPDATE TO authenticated
  USING (is_agent() AND assigned_agent_id = auth.uid())
  WITH CHECK (is_agent() AND assigned_agent_id = auth.uid());

CREATE POLICY "Agents can insert athletes" ON public.athletes FOR INSERT TO authenticated
  WITH CHECK (is_agent() AND agency_id = current_agency_id());

-- PORTAL_USERS: admin scoped to own agency
DROP POLICY IF EXISTS "Admins can view all portal users" ON public.portal_users;
DROP POLICY IF EXISTS "Admins can update portal users"   ON public.portal_users;

CREATE POLICY "Admins can view portal users in their agency" ON public.portal_users FOR SELECT TO authenticated
  USING (id = auth.uid() OR (is_portal_admin(auth.uid()) AND agency_id = current_agency_id()));

CREATE POLICY "Admins can update portal users in their agency" ON public.portal_users FOR UPDATE TO authenticated
  USING (is_portal_admin(auth.uid()) AND agency_id = current_agency_id())
  WITH CHECK (is_portal_admin(auth.uid()) AND agency_id = current_agency_id());
