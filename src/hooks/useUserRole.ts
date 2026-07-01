import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Role = "athlete" | "parent" | "agent" | "admin" | "eleva_ops" | "divisional_gm" | "agency_gm" | "scout";

interface UserRoleData {
  role: Role;
  approved: boolean;
  allocatedAthleteId: string | null;
}

export function useUserRole() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user_role", user?.id],
    queryFn: async (): Promise<UserRoleData | null> => {
      if (!user?.id) return null;

      // 1. Get role + approved from portal_users
      const { data: portalUser, error: portalError } = await supabase
        .from("portal_users")
        .select("role, approved")
        .eq("id", user.id)
        .single();

      if (portalError) {
        console.error("Error fetching user role:", portalError);
        throw portalError;
      }

      const role = portalUser.role as Role;
      const approved = portalUser.approved;

      // 2. For athlete/parent roles, look up their allocated athlete_id
      let allocatedAthleteId: string | null = null;
      if (role === "athlete" || role === "parent") {
        const { data: access } = await supabase
          .from("user_athlete_access")
          .select("athlete_id")
          .eq("user_id", user.id)
          .maybeSingle();

        allocatedAthleteId = access?.athlete_id ?? null;
      }

      return { role, approved, allocatedAthleteId };
    },
    enabled: !!user?.id,
  });
}
