import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Role = "athlete" | "parent" | "agent" | "admin";

export function useUserRole() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["user_role", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from("portal_users")
        .select("role, approved")
        .eq("id", user.id)
        .single();
      
      if (error) {
        console.error("Error fetching user role:", error);
        throw error;
      }
      
      return {
        role: data.role as Role,
        approved: data.approved,
      };
    },
    enabled: !!user?.id,
  });
}
