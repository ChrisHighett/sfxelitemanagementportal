import { supabase } from "@/integrations/supabase/client";

export type ActivityAction =
  | "login"
  | "call_logged"
  | "review_saved"
  | "email_sent"
  | "athlete_viewed"
  | "task_completed"
  | "review_created";

export async function logActivity(
  agentId: string,
  action: ActivityAction,
  athleteId?: string,
  metadata?: Record<string, unknown>
) {
  try {
    await supabase.from("agent_activity" as any).insert({
      agent_id: agentId,
      action_type: action,
      athlete_id: athleteId ?? null,
      metadata: metadata ?? null,
    });
  } catch (e) {
    // Never block the main flow — activity logging is best-effort
    console.warn("Activity log failed:", e);
  }
}
