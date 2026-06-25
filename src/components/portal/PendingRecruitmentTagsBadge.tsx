import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Shows a clickable badge when the current user has pending
 * recruitment-note tags. Click → R&R Notes view, focused on the
 * pending note (single) or with pending list surfaced (multiple).
 */
export default function PendingRecruitmentTagsBadge({
  view,
}: {
  /** which `?view=` to use when navigating (matches the portal role view) */
  view?: string;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: pending = [] } = useQuery({
    queryKey: ["my_pending_recruitment_tags", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recruitment_note_tags" as any)
        .select("id, note_id, created_at")
        .eq("tagged_user_id", user!.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
    refetchInterval: 60_000,
  });

  const count = pending.length;
  if (count === 0) return null;

  const handleClick = () => {
    const params = new URLSearchParams();
    if (view) params.set("view", view);
    params.set("tab", "recruitment-notes");
    if (count === 1) params.set("focus", pending[0].note_id);
    else params.set("pendingOnly", "1");
    navigate(`/portal?${params.toString()}`);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-muted"
      style={{
        borderColor: "var(--brand-spectrum-from, hsl(var(--primary)))",
        color: "var(--brand-spectrum-from, hsl(var(--primary)))",
        background: "var(--brand-base-soft, hsl(var(--muted)))",
      }}
      title="You have been tagged on recruitment notes"
    >
      <Bell className="h-3.5 w-3.5" />
      {count} Recruitment {count === 1 ? "Note" : "Notes"}
    </button>
  );
}
