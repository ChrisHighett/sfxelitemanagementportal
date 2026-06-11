import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, Clock, RotateCcw, XCircle, ChevronDown, ChevronRight } from "lucide-react";
import { ArcLoader } from "@/components/brand/Brand";
import { cn } from "@/lib/utils";

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

interface OverdueTask {
  task_id: string;
  title: string;
  athlete_id: string;
  athlete_name: string;
  priority: number;
  due_date: string;
  original_due_date: string | null;
  reschedule_count: number;
  days_overdue: number;
  status: string;
}

interface DismissReason {
  reason: string;
  n: number;
}

const WINDOWS: { label: string; value: number }[] = [
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
  { label: "All time", value: 0 },
];

function onTimeBadge(rate: number | null) {
  if (rate === null) return <Badge variant="outline" className="text-[10px]">No data</Badge>;
  if (rate >= 80) return <Badge className="bg-emerald-500 hover:bg-emerald-500 text-[10px]">{rate}%</Badge>;
  if (rate >= 60) return <Badge className="bg-amber-500 hover:bg-amber-500 text-[10px]">{rate}%</Badge>;
  return <Badge variant="destructive" className="text-[10px]">{rate}%</Badge>;
}

function lagBadge(lag: number | null) {
  if (lag === null) return <span className="text-muted-foreground">—</span>;
  const cls =
    lag <= 0
      ? "text-emerald-600 dark:text-emerald-400"
      : lag <= 3
      ? "text-amber-600 dark:text-amber-400"
      : "text-destructive";
  const sign = lag > 0 ? "+" : "";
  return <span className={cn("font-medium", cls)}>{sign}{lag}d</span>;
}

function overdueBadge(count: number, oldest: number) {
  if (count === 0) return <span className="text-emerald-600 dark:text-emerald-400 font-medium">0</span>;
  const cls = oldest >= 14 ? "text-destructive" : oldest >= 7 ? "text-amber-600 dark:text-amber-400" : "text-foreground";
  return (
    <span className={cn("font-medium", cls)}>
      {count} <span className="text-[10px] text-muted-foreground">(oldest {oldest}d)</span>
    </span>
  );
}

function rescheduleBadge(rate: number) {
  const cls = rate > 30 ? "text-amber-600 dark:text-amber-400 font-semibold" : "text-foreground";
  return <span className={cls}>{rate}%</span>;
}

function activityWarning(row: ScorecardRow) {
  // Empty planner is a warning, never a top score.
  if (row.tasks_created === 0) return true;
  if (row.athletes_assigned > 0 && row.tasks_created < row.athletes_assigned) return true;
  return false;
}

function AgentRow({
  row,
  expanded,
  onToggle,
  window,
}: {
  row: ScorecardRow;
  expanded: boolean;
  onToggle: () => void;
  window: number;
}) {
  const [overdue, setOverdue] = useState<OverdueTask[] | null>(null);
  const [reasons, setReasons] = useState<DismissReason[] | null>(null);
  const [loadingDrill, setLoadingDrill] = useState(false);
  const warning = activityWarning(row);

  useEffect(() => {
    if (!expanded || overdue !== null) return;
    let cancelled = false;
    setLoadingDrill(true);
    Promise.all([
      (supabase as any).rpc("get_agent_overdue_tasks", { p_agent_id: row.agent_id }),
      (supabase as any).rpc("get_agent_dismiss_reasons", { p_agent_id: row.agent_id, p_window_days: window }),
    ]).then(([ovd, rsn]) => {
      if (cancelled) return;
      setOverdue((ovd?.data as OverdueTask[]) || []);
      setReasons((rsn?.data as DismissReason[]) || []);
      setLoadingDrill(false);
    });
    return () => { cancelled = true; };
  }, [expanded, row.agent_id, window, overdue]);

  return (
    <>
      <tr className="border-t border-border hover:bg-muted/30 cursor-pointer" onClick={onToggle}>
        <td className="p-3">
          <div className="flex items-center gap-2">
            {expanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
            <div>
              <div className="font-medium text-sm">{row.agent_name}</div>
              <div className="text-[11px] text-muted-foreground">
                {row.athletes_assigned} athlete{row.athletes_assigned !== 1 ? "s" : ""} · {row.tasks_created} task{row.tasks_created !== 1 ? "s" : ""} {warning && (
                  <span className="text-amber-600 dark:text-amber-400 ml-1">· low activity</span>
                )}
              </div>
            </div>
          </div>
        </td>
        <td className="p-3 text-center">{onTimeBadge(row.on_time_rate)}</td>
        <td className="p-3 text-center text-xs">{overdueBadge(row.currently_overdue, row.oldest_overdue_days)}</td>
        <td className="p-3 text-center text-xs">{lagBadge(row.avg_lag_days)}</td>
        <td className="p-3 text-center text-xs">{rescheduleBadge(row.reschedule_rate)}</td>
        <td className="p-3 text-center text-xs">
          <span className={row.dismiss_rate > 20 ? "text-amber-600 dark:text-amber-400 font-semibold" : ""}>{row.dismiss_rate}%</span>
        </td>
        <td className="p-3 text-center text-xs text-muted-foreground">
          {row.tasks_completed}/{row.tasks_created}
        </td>
      </tr>
      {expanded && (
        <tr className="bg-muted/20">
          <td colSpan={7} className="p-4">
            {loadingDrill ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ArcLoader size={14} /> Loading details…
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Currently overdue ({overdue?.length ?? 0})
                  </div>
                  {!overdue || overdue.length === 0 ? (
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Nothing overdue
                    </div>
                  ) : (
                    <ul className="space-y-1 max-h-64 overflow-y-auto pr-1">
                      {overdue.map((t) => (
                        <li key={t.task_id} className="text-xs flex items-start justify-between gap-2 p-2 rounded border border-border bg-card">
                          <div className="min-w-0">
                            <div className="font-medium truncate">{t.title}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {t.athlete_name}
                              {t.reschedule_count > 0 && (
                                <span className="ml-1 text-amber-600 dark:text-amber-400">· rescheduled {t.reschedule_count}×</span>
                              )}
                            </div>
                          </div>
                          <Badge variant="destructive" className="text-[10px] shrink-0">{t.days_overdue}d</Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
                    <XCircle className="h-3 w-3" /> Top dismiss reasons
                  </div>
                  {!reasons || reasons.length === 0 ? (
                    <div className="text-xs text-muted-foreground">No dismissals in this window.</div>
                  ) : (
                    <ul className="space-y-1">
                      {reasons.map((r, i) => (
                        <li key={i} className="text-xs flex items-center justify-between p-2 rounded border border-border bg-card">
                          <span className="truncate pr-2">{r.reason}</span>
                          <Badge variant="outline" className="text-[10px] shrink-0">{r.n}</Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-3 pt-3 border-t border-border text-[11px] text-muted-foreground space-y-0.5">
                    <div>Rescheduled tasks: {row.rescheduled_tasks} · avg {row.avg_reschedules}/task</div>
                    <div>On-time: {row.on_time_count} of {row.completed_with_due} completed (with original due date)</div>
                  </div>
                </div>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

export default function AgentTaskScorecard() {
  const [windowDays, setWindowDays] = useState(90);
  const [rows, setRows] = useState<ScorecardRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"name" | "on_time" | "overdue">("on_time");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (supabase as any)
      .rpc("get_agent_task_scorecard", { p_window_days: windowDays })
      .then(({ data, error }: any) => {
        if (cancelled) return;
        if (error) {
          setError(error.message || "Failed to load scorecard");
          setRows([]);
        } else {
          setRows((data as ScorecardRow[]) || []);
        }
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [windowDays]);

  const sorted = useMemo(() => {
    if (!rows) return [];
    const copy = [...rows];
    if (sortBy === "name") copy.sort((a, b) => a.agent_name.localeCompare(b.agent_name));
    else if (sortBy === "on_time") copy.sort((a, b) => (b.on_time_rate ?? -1) - (a.on_time_rate ?? -1));
    else if (sortBy === "overdue") copy.sort((a, b) => b.currently_overdue - a.currently_overdue || b.oldest_overdue_days - a.oldest_overdue_days);
    return copy;
  }, [rows, sortBy]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" /> Agent task scorecard
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Coaching signals, not a ranking. High on-time with high reschedule or dismiss isn't real performance.
              Low task volume is a warning, not a top score.
            </p>
          </div>
          <div className="flex items-center gap-1">
            {WINDOWS.map((w) => (
              <Button
                key={w.value}
                size="sm"
                variant={windowDays === w.value ? "default" : "outline"}
                className="h-7 text-xs px-2"
                onClick={() => setWindowDays(w.value)}
              >
                {w.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="flex justify-center items-center gap-2 p-8 text-sm text-muted-foreground">
            <ArcLoader size={18} /> Loading scorecard…
          </div>
        ) : error ? (
          <div className="p-6 text-sm text-destructive">{error}</div>
        ) : sorted.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">No agent data available.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="text-left p-3 font-medium cursor-pointer" onClick={() => setSortBy("name")}>Agent</th>
                  <th className="text-center p-3 font-medium cursor-pointer" onClick={() => setSortBy("on_time")}>
                    <div className="inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> On-time</div>
                  </th>
                  <th className="text-center p-3 font-medium cursor-pointer" onClick={() => setSortBy("overdue")}>
                    <div className="inline-flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Overdue</div>
                  </th>
                  <th className="text-center p-3 font-medium">
                    <div className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> Avg lag</div>
                  </th>
                  <th className="text-center p-3 font-medium">
                    <div className="inline-flex items-center gap-1"><RotateCcw className="h-3 w-3" /> Reschedule</div>
                  </th>
                  <th className="text-center p-3 font-medium">
                    <div className="inline-flex items-center gap-1"><XCircle className="h-3 w-3" /> Dismiss</div>
                  </th>
                  <th className="text-center p-3 font-medium">Done / created</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((row) => (
                  <AgentRow
                    key={row.agent_id}
                    row={row}
                    expanded={expanded === row.agent_id}
                    onToggle={() => setExpanded(expanded === row.agent_id ? null : row.agent_id)}
                    window={windowDays}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-4 py-3 border-t border-border bg-muted/20 text-[11px] text-muted-foreground space-y-1">
          <div><strong>How to read this:</strong></div>
          <div>· <strong>On-time</strong> compares completion against the task's <em>original</em> due date — rescheduling can't game it. Green ≥80%, amber 60–79%, red &lt;60%.</div>
          <div>· <strong>Overdue</strong> is point-in-time live debt — a clean history with ageing open tasks still means coaching is needed.</div>
          <div>· <strong>Avg lag</strong>: negative = habitually early; &gt;3 days = habitually late.</div>
          <div>· <strong>Reschedule &gt; 30%</strong> or <strong>dismiss &gt; 20%</strong> alongside a high on-time rate suggests dates are being shuffled or tasks cleared — not delivered.</div>
          <div>· <strong>Low task volume</strong> usually means the planner isn't being used. It is not a top score.</div>
        </div>
      </CardContent>
    </Card>
  );
}
