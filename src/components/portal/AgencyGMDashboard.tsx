import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Users,
  LayoutDashboard,
  Layers,
  ChevronRight,
  User as UserIcon,
  ArrowLeft,
  Gauge,
  ListChecks,
  Clock,
  ShieldCheck,
} from "lucide-react";
import AgentTaskScorecard from "./AgentTaskScorecard";

interface ScorecardRow {
  agent_id: string;
  agent_name: string;
  athletes_assigned: number;
  tasks_created: number;
  tasks_completed: number;
  tasks_dismissed: number;
  completed_with_due: number;
  on_time_count: number;
  on_time_rate: number | null;
  avg_lag_days: number | null;
  currently_overdue: number;
  oldest_overdue_days: number;
  median_overdue_days: number | null;
  rescheduled_tasks: number;
  reschedule_rate: number;
  avg_reschedules: number;
  dismiss_rate: number;
}

interface Member {
  id: string;
  display_name: string | null;
  email: string | null;
  role: string;
  division_id: string | null;
  approved: boolean;
}

interface Division {
  id: string;
  name: string;
}

type View = { kind: "overview" } | { kind: "division"; divisionId: string } | { kind: "staff"; userId: string };

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  agent: "Agent",
  scout: "Scout",
  divisional_gm: "Divisional GM",
  agency_gm: "Agency GM",
  eleva_ops: "Eleva Ops",
  parent: "Parent",
  athlete: "Athlete",
};

const STAFF_ROLES = new Set(["admin", "agent", "scout", "divisional_gm"]);

export default function AgencyGMDashboard() {
  const { user } = useAuth();
  const [view, setView] = useState<View>({ kind: "overview" });

  // My agency
  const { data: me } = useQuery({
    queryKey: ["agency_gm_me", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("portal_users")
        .select("agency_id, display_name")
        .eq("id", user!.id)
        .maybeSingle();
      return data as { agency_id: string | null; display_name: string | null } | null;
    },
  });
  const agencyId = me?.agency_id ?? null;

  // Divisions in my agency
  const { data: divisions = [] } = useQuery({
    queryKey: ["agency_gm_divisions", agencyId],
    enabled: !!agencyId,
    queryFn: async () => {
      const { data } = await supabase
        .from("agency_divisions")
        .select("id, name")
        .eq("agency_id", agencyId!)
        .order("name");
      return (data ?? []) as Division[];
    },
  });

  // All members in my agency (RLS scoped)
  const { data: members = [] } = useQuery({
    queryKey: ["agency_gm_members", agencyId],
    enabled: !!agencyId,
    queryFn: async () => {
      const { data } = await supabase
        .from("portal_users")
        .select("id, display_name, email, role, division_id, approved")
        .eq("agency_id", agencyId!);
      return (data ?? []) as Member[];
    },
  });

  // Agency-wide scorecard (RPC now accepts agency_gm)
  const { data: scorecard = [], isLoading: scorecardLoading } = useQuery({
    queryKey: ["agency_gm_scorecard", agencyId],
    enabled: !!agencyId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_agent_task_scorecard" as any, { p_window_days: 30 });
      if (error) throw error;
      return (data ?? []) as ScorecardRow[];
    },
  });

  const staffMembers = useMemo(() => members.filter((m) => STAFF_ROLES.has(m.role) && m.approved), [members]);

  // Sidebar
  const sidebar = (
    <aside className="w-full md:w-64 flex-shrink-0 md:border-r md:pr-4 md:mr-2">
      <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2 px-2">Agency</div>
      <button
        onClick={() => setView({ kind: "overview" })}
        className={`w-full flex items-center gap-2 rounded-md px-2 py-2 text-sm text-left hover:bg-muted transition ${view.kind === "overview" ? "bg-muted font-medium" : ""}`}
      >
        <LayoutDashboard className="h-4 w-4" /> Overview
      </button>
      <div className="text-xs uppercase tracking-wide text-muted-foreground mt-4 mb-2 px-2 flex items-center gap-1">
        <Layers className="h-3 w-3" /> Divisions
      </div>
      {divisions.length === 0 ? (
        <div className="px-2 py-1 text-xs text-muted-foreground">No divisions yet.</div>
      ) : (
        divisions.map((d) => {
          const isActive = view.kind === "division" && view.divisionId === d.id;
          return (
            <button
              key={d.id}
              onClick={() => setView({ kind: "division", divisionId: d.id })}
              className={`w-full flex items-center gap-2 rounded-md px-2 py-2 text-sm text-left hover:bg-muted transition ${isActive ? "bg-muted font-medium" : ""}`}
            >
              <Building2 className="h-4 w-4" /> {d.name}
            </button>
          );
        })
      )}
    </aside>
  );

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" /> Agency GM — staff performance lens
        </div>
        <h1 className="text-xl font-semibold">Agency dashboard</h1>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        {sidebar}
        <div className="flex-1 min-w-0">
          {view.kind === "overview" && (
            <OverviewPanel
              divisions={divisions}
              members={staffMembers}
              scorecard={scorecard}
              scorecardLoading={scorecardLoading}
              onOpenDivision={(id) => setView({ kind: "division", divisionId: id })}
              onOpenStaff={(id) => setView({ kind: "staff", userId: id })}
            />
          )}
          {view.kind === "division" && (
            <DivisionPanel
              division={divisions.find((d) => d.id === view.divisionId) ?? null}
              members={staffMembers.filter((m) => m.division_id === view.divisionId)}
              scorecard={scorecard}
              onBack={() => setView({ kind: "overview" })}
              onOpenStaff={(id) => setView({ kind: "staff", userId: id })}
            />
          )}
          {view.kind === "staff" && (
            <StaffPanel
              member={members.find((m) => m.id === view.userId) ?? null}
              scorecardRow={scorecard.find((r) => r.agent_id === view.userId) ?? null}
              onBack={() => setView({ kind: "overview" })}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Overview ---------- */

function OverviewPanel({
  divisions,
  members,
  scorecard,
  scorecardLoading,
  onOpenDivision,
  onOpenStaff,
}: {
  divisions: Division[];
  members: Member[];
  scorecard: ScorecardRow[];
  scorecardLoading: boolean;
  onOpenDivision: (id: string) => void;
  onOpenStaff: (id: string) => void;
}) {
  const totalStaff = members.length;
  const totalAgents = members.filter((m) => m.role === "agent").length;
  const totalAthletes = scorecard.reduce((s, r) => s + (r.athletes_assigned || 0), 0);
  const totalOverdue = scorecard.reduce((s, r) => s + (r.currently_overdue || 0), 0);
  const withRate = scorecard.filter((r) => r.on_time_rate !== null);
  const avgOnTime = withRate.length
    ? Math.round(withRate.reduce((s, r) => s + (r.on_time_rate as number), 0) / withRate.length)
    : null;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile icon={<Users className="h-3.5 w-3.5" />} label="Staff" value={totalStaff} />
        <StatTile icon={<UserIcon className="h-3.5 w-3.5" />} label="Agents" value={totalAgents} />
        <StatTile icon={<Users className="h-3.5 w-3.5" />} label="Athletes assigned" value={totalAthletes} />
        <StatTile
          icon={<Gauge className="h-3.5 w-3.5" />}
          label="Avg on-time rate (30d)"
          value={avgOnTime === null ? "—" : `${avgOnTime}%`}
        />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-4 w-4" /> Divisions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {divisions.length === 0 ? (
            <div className="text-sm text-muted-foreground">No divisions have been set up for this agency yet.</div>
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              {divisions.map((d) => {
                const divMembers = members.filter((m) => m.division_id === d.id);
                const divAgents = divMembers.filter((m) => m.role === "agent");
                const divScore = scorecard.filter((r) => divAgents.some((a) => a.id === r.agent_id));
                const divAthletes = divScore.reduce((s, r) => s + (r.athletes_assigned || 0), 0);
                const divOverdue = divScore.reduce((s, r) => s + (r.currently_overdue || 0), 0);
                return (
                  <button
                    key={d.id}
                    onClick={() => onOpenDivision(d.id)}
                    className="text-left rounded-lg border p-3 hover:bg-muted transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{d.name}</div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground flex flex-wrap gap-x-3">
                      <span>{divMembers.length} staff</span>
                      <span>{divAgents.length} agents</span>
                      <span>{divAthletes} athletes</span>
                      <span>{divOverdue} overdue</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ListChecks className="h-4 w-4" /> Agent performance — agency-wide (30 days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {scorecardLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : scorecard.length === 0 ? (
            <div className="text-sm text-muted-foreground">No agent activity yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b">
                    <th className="py-2 pr-3 font-medium">Agent</th>
                    <th className="py-2 pr-3 font-medium">Athletes</th>
                    <th className="py-2 pr-3 font-medium">Tasks done</th>
                    <th className="py-2 pr-3 font-medium">On-time</th>
                    <th className="py-2 pr-3 font-medium">Overdue</th>
                    <th className="py-2 pr-3" />
                  </tr>
                </thead>
                <tbody>
                  {scorecard
                    .slice()
                    .sort((a, b) => (b.tasks_completed || 0) - (a.tasks_completed || 0))
                    .map((r) => (
                      <tr key={r.agent_id} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="py-2 pr-3 font-medium">{r.agent_name}</td>
                        <td className="py-2 pr-3">{r.athletes_assigned}</td>
                        <td className="py-2 pr-3">{r.tasks_completed}</td>
                        <td className="py-2 pr-3">{r.on_time_rate === null ? "—" : `${r.on_time_rate}%`}</td>
                        <td className="py-2 pr-3">
                          {r.currently_overdue > 0 ? (
                            <Badge variant="destructive" className="text-[10px]">{r.currently_overdue}</Badge>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </td>
                        <td className="py-2 pr-3 text-right">
                          <Button size="sm" variant="ghost" onClick={() => onOpenStaff(r.agent_id)}>
                            View <ChevronRight className="h-3 w-3 ml-1" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <AgentTaskScorecard />
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------- Division ---------- */

function DivisionPanel({
  division,
  members,
  scorecard,
  onBack,
  onOpenStaff,
}: {
  division: Division | null;
  members: Member[];
  scorecard: ScorecardRow[];
  onBack: () => void;
  onOpenStaff: (id: string) => void;
}) {
  if (!division) return <div className="text-sm text-muted-foreground">Division not found.</div>;

  const memberScore = scorecard.filter((r) => members.some((m) => m.id === r.agent_id));
  const athletes = memberScore.reduce((s, r) => s + (r.athletes_assigned || 0), 0);
  const overdue = memberScore.reduce((s, r) => s + (r.currently_overdue || 0), 0);
  const done = memberScore.reduce((s, r) => s + (r.tasks_completed || 0), 0);
  const withRate = memberScore.filter((r) => r.on_time_rate !== null);
  const avgOnTime = withRate.length
    ? Math.round(withRate.reduce((s, r) => s + (r.on_time_rate as number), 0) / withRate.length)
    : null;

  return (
    <div className="space-y-4">
      <div>
        <Button variant="ghost" size="sm" onClick={onBack} className="mb-2 -ml-2">
          <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Overview
        </Button>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Building2 className="h-4 w-4" /> {division.name}
        </h2>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile icon={<Users className="h-3.5 w-3.5" />} label="Staff" value={members.length} />
        <StatTile icon={<Users className="h-3.5 w-3.5" />} label="Athletes assigned" value={athletes} />
        <StatTile icon={<ListChecks className="h-3.5 w-3.5" />} label="Tasks done (30d)" value={done} />
        <StatTile icon={<Clock className="h-3.5 w-3.5" />} label="Overdue" value={overdue} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Staff</CardTitle>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <div className="text-sm text-muted-foreground">No staff assigned to this division yet.</div>
          ) : (
            <div className="divide-y">
              {members.map((m) => {
                const row = scorecard.find((r) => r.agent_id === m.id);
                return (
                  <button
                    key={m.id}
                    onClick={() => onOpenStaff(m.id)}
                    className="w-full flex items-center justify-between py-3 hover:bg-muted/50 rounded-md px-2 -mx-2 text-left"
                  >
                    <div>
                      <div className="text-sm font-medium">{m.display_name || m.email || "Unnamed"}</div>
                      <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3">
                        <span>{ROLE_LABEL[m.role] ?? m.role}</span>
                        {row && <span>{row.athletes_assigned} athletes</span>}
                        {row && <span>{row.tasks_completed} tasks done</span>}
                        {row && row.currently_overdue > 0 && (
                          <span className="text-destructive">{row.currently_overdue} overdue</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {avgOnTime !== null && (
        <div className="text-xs text-muted-foreground">Division avg on-time rate: {avgOnTime}%</div>
      )}
    </div>
  );
}

/* ---------- Staff detail ---------- */

function StaffPanel({
  member,
  scorecardRow,
  onBack,
}: {
  member: Member | null;
  scorecardRow: ScorecardRow | null;
  onBack: () => void;
}) {
  const { user } = useAuth();
  const [overdue, setOverdue] = useState<any[]>([]);
  const [reasons, setReasons] = useState<{ reason: string; n: number }[]>([]);

  useEffect(() => {
    if (!member) return;
    (async () => {
      const [{ data: od }, { data: dr }] = await Promise.all([
        supabase.rpc("get_agent_overdue_tasks" as any, { p_agent_id: member.id }),
        supabase.rpc("get_agent_dismiss_reasons" as any, { p_agent_id: member.id, p_window_days: 90 }),
      ]);
      setOverdue((od as any[]) ?? []);
      setReasons((dr as any[]) ?? []);
    })();
  }, [member?.id, user?.id]);

  if (!member) return <div className="text-sm text-muted-foreground">Staff member not found.</div>;

  return (
    <div className="space-y-4">
      <div>
        <Button variant="ghost" size="sm" onClick={onBack} className="mb-2 -ml-2">
          <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
        </Button>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <UserIcon className="h-4 w-4" /> {member.display_name || member.email || "Unnamed"}
        </h2>
        <div className="text-xs text-muted-foreground mt-0.5">
          {ROLE_LABEL[member.role] ?? member.role}
          {member.email && ` · ${member.email}`}
        </div>
      </div>

      {scorecardRow ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile icon={<Users className="h-3.5 w-3.5" />} label="Athletes" value={scorecardRow.athletes_assigned} />
          <StatTile icon={<ListChecks className="h-3.5 w-3.5" />} label="Tasks done (30d)" value={scorecardRow.tasks_completed} />
          <StatTile
            icon={<Gauge className="h-3.5 w-3.5" />}
            label="On-time rate"
            value={scorecardRow.on_time_rate === null ? "—" : `${scorecardRow.on_time_rate}%`}
          />
          <StatTile icon={<Clock className="h-3.5 w-3.5" />} label="Currently overdue" value={scorecardRow.currently_overdue} />
        </div>
      ) : (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            No task performance data available for this member yet.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Overdue tasks</CardTitle>
        </CardHeader>
        <CardContent>
          {overdue.length === 0 ? (
            <div className="text-sm text-muted-foreground">Nothing overdue. Nice.</div>
          ) : (
            <div className="divide-y">
              {overdue.map((t) => (
                <div key={t.task_id} className="py-2 flex items-center justify-between text-sm">
                  <div>
                    <div className="font-medium">{t.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {t.athlete_name} · due {t.due_date}
                    </div>
                  </div>
                  <Badge variant="destructive" className="text-[10px]">{t.days_overdue}d</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Top dismiss reasons (90d)</CardTitle>
        </CardHeader>
        <CardContent>
          {reasons.length === 0 ? (
            <div className="text-sm text-muted-foreground">No dismissed tasks in the window.</div>
          ) : (
            <div className="space-y-1">
              {reasons.map((r) => (
                <div key={r.reason} className="flex items-center justify-between text-sm">
                  <span>{r.reason}</span>
                  <Badge variant="secondary" className="text-[10px]">{r.n}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------- Small tile ---------- */

function StatTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          {icon} {label}
        </div>
        <div className="text-2xl font-bold mt-1 tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}
