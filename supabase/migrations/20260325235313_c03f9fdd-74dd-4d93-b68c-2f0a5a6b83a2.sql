
-- Comms history table for storing generated emails
CREATE TABLE public.comms_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  athlete_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL, -- 'athlete' or 'parent'
  subject TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL,
  generated_from TEXT DEFAULT 'call', -- 'monthly_review', 'call', 'manual'
  sent_status TEXT NOT NULL DEFAULT 'not_sent', -- 'sent', 'not_sent'
  created_by UUID REFERENCES public.portal_users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Updated_at trigger
CREATE TRIGGER set_comms_history_updated_at
  BEFORE UPDATE ON public.comms_history
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.comms_history ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "admin_full_access_comms_history"
  ON public.comms_history FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Agent full access
CREATE POLICY "agent_manage_comms_history"
  ON public.comms_history FOR ALL
  TO authenticated
  USING (is_agent() OR is_admin())
  WITH CHECK (is_agent() OR is_admin());
