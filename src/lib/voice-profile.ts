import { supabase } from "@/integrations/supabase/client";

export interface VoiceProfile {
  user_id: string;
  agent_name?: string | null;
  how_i_write?: string | null;
  formality?: string | null;
  length?: string | null;
  emoji?: string | null;
  greeting_style?: string | null;
  sign_off?: string | null;
  sample_messages?: string | null;
}

/**
 * Load the voice profile for a specific agent user id.
 * Returns null if no profile exists yet (caller can pass null to the edge function).
 */
export async function getVoiceProfileForUser(userId: string | null | undefined): Promise<VoiceProfile | null> {
  if (!userId) return null;
  const { data, error } = await supabase
    .from("agent_voice_profiles" as any)
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return null;
  // Enrich with display_name so the AI knows whose voice it is
  const { data: pu } = await supabase
    .from("portal_users")
    .select("display_name, email")
    .eq("id", userId)
    .maybeSingle();
  return {
    ...(data as any),
    agent_name: pu?.display_name || pu?.email || null,
  };
}

/**
 * Resolve which agent's voice should be used when drafting comms for an athlete.
 * Prefers the athlete's assigned agent; falls back to the composer.
 */
export async function getVoiceProfileForAthlete(
  athleteId: string | null | undefined,
  fallbackUserId?: string | null,
): Promise<VoiceProfile | null> {
  let targetUserId: string | null | undefined = fallbackUserId;
  if (athleteId) {
    const { data } = await supabase
      .from("athletes")
      .select("assigned_agent_user_id")
      .eq("id", athleteId)
      .maybeSingle();
    if (data?.assigned_agent_user_id) targetUserId = data.assigned_agent_user_id;
  }
  return getVoiceProfileForUser(targetUserId || null);
}
