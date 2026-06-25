CREATE POLICY "eleva_ops insert call_history" ON public.call_history FOR INSERT WITH CHECK (is_eleva_ops());
CREATE POLICY "eleva_ops update call_history" ON public.call_history FOR UPDATE USING (is_eleva_ops()) WITH CHECK (is_eleva_ops());

CREATE POLICY "eleva_ops insert comms_log" ON public.comms_log FOR INSERT WITH CHECK (is_eleva_ops());
CREATE POLICY "eleva_ops update comms_log" ON public.comms_log FOR UPDATE USING (is_eleva_ops()) WITH CHECK (is_eleva_ops());

CREATE POLICY "eleva_ops insert athlete_tasks" ON public.athlete_tasks FOR INSERT WITH CHECK (is_eleva_ops());
CREATE POLICY "eleva_ops update athlete_tasks" ON public.athlete_tasks FOR UPDATE USING (is_eleva_ops()) WITH CHECK (is_eleva_ops());