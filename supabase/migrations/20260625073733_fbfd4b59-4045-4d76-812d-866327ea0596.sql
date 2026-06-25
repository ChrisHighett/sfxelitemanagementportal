CREATE POLICY "eleva_ops insert athletes" ON public.athletes FOR INSERT WITH CHECK (is_eleva_ops());
CREATE POLICY "eleva_ops update athletes" ON public.athletes FOR UPDATE USING (is_eleva_ops()) WITH CHECK (is_eleva_ops());

CREATE POLICY "eleva_ops insert monthly_reviews" ON public.monthly_reviews FOR INSERT WITH CHECK (is_eleva_ops());
CREATE POLICY "eleva_ops update monthly_reviews" ON public.monthly_reviews FOR UPDATE USING (is_eleva_ops()) WITH CHECK (is_eleva_ops());