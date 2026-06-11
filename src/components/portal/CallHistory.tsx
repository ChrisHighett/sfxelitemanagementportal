import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Loader2 } from "lucide-react";
import { ArcLoader } from "@/components/brand/Brand";
import { EmptyState } from "@/components/brand/States";
import { type Athlete } from "@/hooks/usePortalData";
import { cn } from "@/lib/utils";

type CategoryFilter = "all" | "club" | "commercial" | "media" | "general";

const CATEGORY_STYLES: Record<string, { label: string; style: React.CSSProperties }> = {
  club:       { label: "Club",       style: { background: "var(--brand-base-soft)", color: "var(--brand-accent)", borderColor: "var(--brand-base-line)" } },
  commercial: { label: "Commercial", style: { background: "var(--success-soft)", color: "var(--success-deep)", borderColor: "var(--success-soft)" } },
  media:      { label: "Media",      style: { background: "var(--win-soft)", color: "var(--win-deep)", borderColor: "var(--win-soft)" } },
  general:    { label: "General",    style: { background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))", borderColor: "hsl(var(--border))" } },
};

const FILTER_CHIPS: Array<{ value: CategoryFilter; label: string }> = [
  { value: "all",        label: "All" },
  { value: "club",       label: "Club" },
  { value: "commercial", label: "Commercial" },
  { value: "media",      label: "Media" },
  { value: "general",    label: "General" },
];

export default function CallHistory({ athlete }: { athlete: Athlete }) {
  const [filter, setFilter] = useState<CategoryFilter>("all");

  const { data: calls = [], isLoading } = useQuery({
    queryKey: ["call_history", athlete.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("call_history")
        .select("*")
        .eq("athlete_id", athlete.id)
        .order("call_date", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const filteredCalls = useMemo(() => {
    if (filter === "all") return calls;
    return calls.filter((c) => {
      const cat = (c.conversation_category as string | null) ||
        (c.call_type === "club_conversation" ? "club" : null);
      return cat === filter;
    });
  }, [calls, filter]);

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle>Conversation History — {athlete.name}</CardTitle>
            <Badge variant="secondary">
              {filteredCalls.length} entr{filteredCalls.length !== 1 ? "ies" : "y"}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-2">
            {FILTER_CHIPS.map((chip) => {
              const selected = filter === chip.value;
              return (
                <button
                  key={chip.value}
                  type="button"
                  onClick={() => setFilter(chip.value)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition",
                    selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background hover:bg-muted"
                  )}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <ArcLoader size={20} />
            </div>
          ) : filteredCalls.length === 0 ? (
            <EmptyState
              icon={<Phone className="h-5 w-5" />}
              title="No conversations yet"
              hint="Log the first call from the Conversation tab — it'll show up here with category and follow-ups."
            />
          ) : (
            <div className="space-y-3">
              {filteredCalls.map((call) => {
                const rawCategory = (call.conversation_category as string | null)
                  || (call.call_type === "club_conversation" ? "club" : null);
                const catStyle = rawCategory ? CATEGORY_STYLES[rawCategory] : null;
                return (
                  <div key={call.id} className="rounded-lg border p-4 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">
                          {new Date(call.call_date).toLocaleDateString("en-AU", {
                            year: "numeric", month: "short", day: "numeric",
                          })}
                        </span>
                        {catStyle ? (
                          <Badge variant="outline" className={cn("text-xs border", catStyle.cls)}>
                            {catStyle.label}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            {String(call.call_type).replace(/_/g, " ")}
                          </Badge>
                        )}
                        {call.counterparty_name && (
                          <span className="text-xs text-muted-foreground">
                            · {call.counterparty_name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {call.duration_minutes != null && (
                          <span className="text-xs text-muted-foreground">⏱ {call.duration_minutes} min</span>
                        )}
                        {call.follow_up_at && (
                          <Badge variant="secondary" className="text-xs">
                            Follow up {new Date(call.follow_up_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                          </Badge>
                        )}
                        {call.follow_up_required && !call.follow_up_at && (
                          <Badge variant="destructive" className="text-xs">Follow-up needed</Badge>
                        )}
                        {call.parent_involved && (
                          <Badge variant="secondary" className="text-xs">Parent involved</Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{call.summary}</p>
                    {call.detailed_notes && (
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                        {call.detailed_notes}
                      </p>
                    )}
                    {call.outcome && (
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Outcome:</span> {call.outcome}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
