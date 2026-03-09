import { supabase } from "@/integrations/supabase/client";

export async function getMyAthleteAccess() {
  const { data: userData, error: userError } = await supabase
    .from("portal_users")
    .select("id, role, approved")
    .maybeSingle();

  if (userError) throw userError;
  
  if (!userData) {
    throw new Error("Portal user account not found. Please contact support.");
  }
  
  if (!userData.approved) {
    throw new Error("Your portal access is pending approval.");
  }

  if (userData.role === "parent" || userData.role === "athlete") {
    const { data: access, error: accessError } = await supabase
      .from("user_athlete_access")
      .select("athlete_id, relationship_type")
      .eq("user_id", userData.id)
      .maybeSingle();

    if (accessError) throw accessError;
    
    if (!access) {
      throw new Error("You haven't been linked to an athlete yet. Please contact your administrator.");
    }
    
    return access;
  }

  return null;
}
