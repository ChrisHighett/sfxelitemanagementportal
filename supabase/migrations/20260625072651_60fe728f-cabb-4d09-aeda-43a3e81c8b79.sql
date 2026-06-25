
CREATE POLICY "eleva_ops insert comms_history" ON public.comms_history FOR INSERT WITH CHECK (is_eleva_ops());
CREATE POLICY "eleva_ops update comms_history" ON public.comms_history FOR UPDATE USING (is_eleva_ops()) WITH CHECK (is_eleva_ops());
CREATE POLICY "eleva_ops insert guardians" ON public.guardians FOR INSERT WITH CHECK (is_eleva_ops());
CREATE POLICY "eleva_ops update guardians" ON public.guardians FOR UPDATE USING (is_eleva_ops()) WITH CHECK (is_eleva_ops());
