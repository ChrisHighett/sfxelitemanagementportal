import { supabase } from "@/integrations/supabase/client";

export async function approvePortalAccess(
  userId: string,
  athleteId: string,
  relationshipType: "parent" | "athlete"
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");

  const { data: me, error: meError } = await supabase
    .from("portal_users")
    .select("role, approved")
    .eq("id", user.id)
    .maybeSingle();

  if (meError) throw meError;
  if (!me || (me.role !== "admin" && me.role !== "eleva_ops") || !me.approved) {
    throw new Error("Only approved admins can approve access.");
  }

  const { error: approveError } = await supabase
    .from("portal_users")
    .update({ approved: true })
    .eq("id", userId);

  if (approveError) throw approveError;

  const { error: accessError } = await supabase
    .from("user_athlete_access")
    .insert({
      user_id: userId,
      athlete_id: athleteId,
      relationship_type: relationshipType,
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    });

  if (accessError) throw accessError;
}
