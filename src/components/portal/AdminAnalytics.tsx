import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Users, Phone, ClipboardList, Mail, CheckSquare } from "lucide-react";
import { ArcLoader } from "@/components/brand/Brand";
import { DashboardSkeleton } from "@/components/brand/Skeletons";
import { useAgentKPIs, type AgentKPI } from "@/hooks/useAgentKPIs";
import AgentTaskScorecard from "./AgentTaskScorecard";

function scoreBadge(score: number) {
  if (score >= 80) return <Badge className="bg-green-500 hover:bg-green-500">On track</Badge>;
  if (score >= 60) return <Badge className="bg-amber-500 hover:bg-amber-500">Review needed</Badge>;
  return <Badge variant="destructive">Action required</Badge>;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function avatarColor(name: string) {
  const colors = [
    "bg-blue-100 text-blue-700",
    "bg-green-100 text-green-700",
    "bg-purple-100 text-purple-700",
    "bg-amber-100 text-amber-700",
  ];
  const idx = (name.charCodeAt(0) || 0) % colors.length;
  return colors[idx];
}

function formatLastLogin(iso: string | null) {
  if (!iso) return "Never";
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

function AgentCard({ kpi }: { kpi: AgentKPI }) {
  const callPct = kpi.athleteCount > 0 ? Math.min(100, Math.round((kpi.callsThisMonth / kpi.athleteCount) * 100)) : 0;
  const reviewPct = kpi.athleteCount > 0 ? Math.min(100, Math.round((kpi.reviewsThisMonth / kpi.athleteCount) * 100)) : 0;
  const emailPct = kpi.athleteCount > 0 ? Math.min(100, Math.round((kpi.parentEmailsThisMonth / kpi.athleteCount) * 100)) : 0;

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold ${avatarColor(kpi.agentName)}`}>
              {initials(kpi.agentName)}
            </div>
            <div className="min-w-0">
              <div className="font-medium truncate">{kpi.agentName}</div>
              <div className="text-xs text-muted-foreground">
                {kpi.athleteCount} athletes · Last login: {formatLastLogin(kpi.lastLogin)}
              </div>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-2xl font-bold num">{kpi.overallScore}%</div>
            {scoreBadge(kpi.overallScore)}
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">Overall performance score</div>
          <Progress value={kpi.overallScore} />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Phone className="h-3 w-3" /> Calls
            </div>
            <div className="text-sm font-medium">{kpi.callsThisMonth} / {kpi.athleteCount}</div>
            <Progress value={callPct} className="h-1" />
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <ClipboardList className="h-3 w-3" /> Reviews
            </div>
            <div className="text-sm font-medium">{kpi.reviewsThisMonth} / {kpi.athleteCount}</div>
            <Progress value={reviewPct} className="h-1" />
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Mail className="h-3 w-3" /> Parent emails
            </div>
            <div className="text-sm font-medium">{kpi.parentEmailsThisMonth} / {kpi.athleteCount}</div>
            <Progress value={emailPct} className="h-1" />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 pt-2 border-t">
          <div>
            <div className="text-xs text-muted-foreground">Avg wellbeing</div>
            <div className="text-sm font-medium">{kpi.avgWellbeing}/5</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Thriving</div>
            <div className="text-sm font-medium text-green-600">{kpi.thrivingCount}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Needs support</div>
            <div className="text-sm font-medium text-red-600">{kpi.needsSupportCount}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminAnalytics() {
  const { data: kpis = [], isLoading } = useAgentKPIs();

  const totalAthletes = kpis.reduce((s, k) => s + k.athleteCount, 0);
  const totalCalls = kpis.reduce((s, k) => s + k.callsThisMonth, 0);
  const totalReviews = kpis.reduce((s, k) => s + k.reviewsThisMonth, 0);
  const avgScore = kpis.length > 0 ? Math.round(kpis.reduce((s, k) => s + k.overallScore, 0) / kpis.length) : 0;

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3" /> Total athletes
            </div>
            <div className="text-2xl font-bold num mt-1">{totalAthletes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Phone className="h-3 w-3" /> Calls this month
            </div>
            <div className="text-2xl font-bold num mt-1">{totalCalls}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <ClipboardList className="h-3 w-3" /> Reviews this month
            </div>
            <div className="text-2xl font-bold num mt-1">{totalReviews}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> Avg agent score
            </div>
            <div className="text-2xl font-bold num mt-1">{avgScore}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Agent cards */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold">Agent performance — this month</h3>
        {kpis.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              No agents found. Make sure agent accounts have role = "agent" and approved = true in portal_users.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {kpis.map((kpi) => (
              <AgentCard key={kpi.agentId} kpi={kpi} />
            ))}
          </div>
        )}
      </div>
      {/* Task completion scorecard */}
      <AgentTaskScorecard />


      {/* KPI legend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">How the score is calculated</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <Phone className="h-4 w-4 mt-0.5 shrink-0" />
            <span>Calls logged this month (30%) — target: 1 per athlete</span>
          </div>
          <div className="flex items-start gap-2">
            <ClipboardList className="h-4 w-4 mt-0.5 shrink-0" />
            <span>Reviews completed (30%) — target: 100% of roster</span>
          </div>
          <div className="flex items-start gap-2">
            <Mail className="h-4 w-4 mt-0.5 shrink-0" />
            <span>Parent emails sent (20%) — target: 1 per athlete</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckSquare className="h-4 w-4 mt-0.5 shrink-0" />
            <span>Planner tasks completed (20%) — target: 80% done</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
