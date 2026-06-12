import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

export default function ScoutResponseTimes() {
  const { data: scoutResponses = [] } = useQuery({
    queryKey: ["scout_response_times"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scout_leads" as any)
        .select("assigned_agent_id, assigned_agent_name, triage_decision, response_hours, first_agent_action_at, created_at, onboarding_stage")
        .eq("triage_decision", "Pursue")
        .not("assigned_agent_id", "is", null);
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const agentResponseStats = useMemo(() => {
    const byAgent: Record<string, { name: string; leads: number; responded: number; totalHours: number; overdue: number }> = {};
    for (const lead of scoutResponses as any[]) {
      const key = lead.assigned_agent_id;
      if (!key) continue;
      if (!byAgent[key]) byAgent[key] = { name: lead.assigned_agent_name || "Unknown", leads: 0, responded: 0, totalHours: 0, overdue: 0 };
      byAgent[key].leads++;
      if (lead.response_hours != null) {
        byAgent[key].responded++;
        byAgent[key].totalHours += Number(lead.response_hours);
      } else if (lead.onboarding_stage === "New") {
        const daysPending = Math.floor((Date.now() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24));
        if (daysPending > 1) byAgent[key].overdue++;
      }
    }
    return Object.values(byAgent)
      .map((a) => ({
        ...a,
        avgHours: a.responded > 0 ? a.totalHours / a.responded : null,
        responseRate: a.leads > 0 ? Math.round((a.responded / a.leads) * 100) : 0,
      }))
      .sort((a, b) => (a.avgHours ?? 999) - (b.avgHours ?? 999));
  }, [scoutResponses]);

  if (agentResponseStats.length === 0) return null;

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-base font-semibold">Scout lead response times</h3>
        <p className="text-sm text-muted-foreground">How quickly each agent acts on Pursue leads assigned to them. Target: under 24 hours.</p>
      </div>
      <div className="space-y-2">
        {agentResponseStats.map((agent, i) => {
          const isGood = agent.avgHours != null && agent.avgHours <= 24;
          const isWarn = agent.avgHours != null && agent.avgHours > 24 && agent.avgHours <= 72;
          const toneColor = isGood ? "var(--success-deep)" : isWarn ? "var(--win-deep)" : "var(--danger-deep)";
          const toneBg = isGood ? "var(--success-soft)" : isWarn ? "var(--win-soft)" : "var(--danger-soft)";
          const barFill = isGood ? "var(--success)" : isWarn ? "var(--win)" : "var(--danger)";
          const rankBgs = ["var(--win)", "var(--border-strong)", "var(--win-soft)"];
          return (
            <div key={agent.name + i} className="rounded-lg border p-3" style={{ background: toneBg, borderColor: toneBg }}>
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold" style={{ background: rankBgs[i] || "var(--border-strong)", color: "var(--text)" }}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{agent.name}</span>
                    {agent.overdue > 0 && (
                      <Badge variant="destructive" className="text-xs">{agent.overdue} not actioned</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {agent.leads} Pursue {agent.leads === 1 ? "lead" : "leads"} · {agent.responded} actioned · {agent.responseRate}% response rate
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-base font-semibold num" style={{ color: toneColor }}>
                    {agent.avgHours != null ? `${Math.round(agent.avgHours)}h` : "—"}
                  </div>
                  <div className="text-xs text-muted-foreground">avg response</div>
                </div>
              </div>
              {agent.avgHours != null && (
                <div className="mt-2">
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border-strong)" }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${Math.min(100, (agent.avgHours / 72) * 100)}%`, background: barFill }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-0.5">
                    <span>0h</span>
                    <span>Target: 24h</span>
                    <span>72h+</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
        <div><span className="font-medium" style={{ color: "var(--success-deep)" }}>Green (under 24h)</span> — excellent. Lead actioned same day.</div>
        <div><span className="font-medium" style={{ color: "var(--win-deep)" }}>Amber (24–72h)</span> — acceptable. Consider reviewing workload.</div>
        <div><span className="text-destructive font-medium">Red (72h+)</span> — action needed. Scout leads going cold.</div>
        <div className="pt-1">Response time is measured from when a lead is assigned as Pursue to when the agent first moves it out of New stage.</div>
      </div>
    </div>
  );
}
