import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AgentKPI {
  agentName: string;
  agentId: string;
  athleteCount: number;
  callsThisMonth: number;
  reviewsThisMonth: number;
  parentEmailsThisMonth: number;
  tasksCompletedThisMonth: number;
  avgWellbeing: number;
  thrivingCount: number;
  needsSupportCount: number;
  lastLogin: string | null;
  overallScore: number;
}

function scoreAgent(kpi: Omit<AgentKPI, "overallScore">): number {
  if (kpi.athleteCount === 0) return 0;
  const callRate = Math.min(1, kpi.callsThisMonth / kpi.athleteCount);
  const reviewRate = Math.min(1, kpi.reviewsThisMonth / kpi.athleteCount);
  const emailRate = Math.min(1, kpi.parentEmailsThisMonth / kpi.athleteCount);
  const taskRate = Math.min(1, kpi.tasksCompletedThisMonth / Math.max(1, kpi.athleteCount * 2));
  return Math.round(callRate * 30 + reviewRate * 30 + emailRate * 20 + taskRate * 20);
}

export function useAgentKPIs() {
  return useQuery({
    queryKey: ["agent_kpis"],
    queryFn: async () => {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const { data: agents, error: agentsError } = await supabase
        .from("portal_users")
        .select("id, display_name, email, role, approved")
        .eq("role", "agent")
        .eq("approved", true);

      if (agentsError) throw agentsError;
      if (!agents || agents.length === 0) return [];

      const agentIds = agents.map((a: any) => a.id);

      const { data: athletes } = await supabase
        .from("athletes")
        .select("id, assigned_agent_id, monthly_reviews(wellbeing_score, review_month)");

      const { data: calls } = await supabase
        .from("call_history")
        .select("conducted_by, athlete_id, call_date")
        .gte("call_date", monthStart)
        .in("conducted_by", agentIds);

      const { data: reviews } = await supabase
        .from("monthly_reviews")
        .select("created_by, athlete_id, review_month")
        .gte("review_month", monthStart.slice(0, 10))
        .in("created_by", agentIds);

      const { data: emails } = await supabase
        .from("comms_log")
        .select("athlete_id, sent_at, recipient_type")
        .gte("sent_at", monthStart)
        .eq("recipient_type", "parent");

      const { data: tasks } = await supabase
        .from("athlete_tasks")
        .select("completed_by, athlete_id, status, completed_at")
        .eq("status", "done")
        .gte("completed_at", monthStart)
        .in("completed_by", agentIds);

      const { data: activity } = await supabase
        .from("agent_activity" as any)
        .select("agent_id, created_at, action_type")
        .eq("action_type", "login")
        .in("agent_id", agentIds)
        .order("created_at", { ascending: false });

      const kpis: AgentKPI[] = agents.map((agent: any) => {
        const agentAthletes = (athletes || []).filter(
          (a: any) => a.assigned_agent_id === agent.id
        );
        const athleteIds = agentAthletes.map((a: any) => a.id);

        const callsThisMonth = (calls || []).filter(
          (c: any) => c.conducted_by === agent.id
        ).length;

        const reviewsThisMonth = (reviews || []).filter(
          (r: any) => r.created_by === agent.id
        ).length;

        const parentEmailsThisMonth = (emails || []).filter((e: any) =>
          athleteIds.includes(e.athlete_id)
        ).length;

        const tasksCompletedThisMonth = (tasks || []).filter(
          (t: any) => t.completed_by === agent.id
        ).length;

        const wellbeingScores = agentAthletes
          .map((a: any) => {
            const list = Array.isArray(a.monthly_reviews) ? a.monthly_reviews : [];
            const sorted = [...list].sort((x: any, y: any) =>
              (y.review_month || "").localeCompare(x.review_month || "")
            );
            return sorted[0]?.wellbeing_score ?? null;
          })
          .filter((s: any) => typeof s === "number" && s > 0) as number[];

        const avgWellbeing =
          wellbeingScores.length > 0
            ? Math.round(
                (wellbeingScores.reduce((a, b) => a + b, 0) / wellbeingScores.length) * 10
              ) / 10
            : 0;

        const thrivingCount = wellbeingScores.filter((s) => s >= 4).length;
        const needsSupportCount = wellbeingScores.filter((s) => s <= 2).length;

        const agentLogins = (activity || []).filter(
          (a: any) => a.agent_id === agent.id
        );
        const lastLogin = agentLogins.length > 0 ? (agentLogins[0] as any).created_at : null;

        const kpiBase = {
          agentId: agent.id,
          agentName: agent.display_name || agent.email || `Agent ${agent.id.slice(0, 6)}`,
          athleteCount: agentAthletes.length,
          callsThisMonth,
          reviewsThisMonth,
          parentEmailsThisMonth,
          tasksCompletedThisMonth,
          avgWellbeing,
          thrivingCount,
          needsSupportCount,
          lastLogin,
        };

        return { ...kpiBase, overallScore: scoreAgent(kpiBase) };
      });

      return kpis.sort((a, b) => b.overallScore - a.overallScore);
    },
    refetchInterval: 5 * 60 * 1000,
  });
}
