import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CalendarDays, CheckCircle2, ChevronDown, ChevronRight, Check, Sparkles, ChevronLeft, MoreVertical, CalendarClock, XCircle } from "lucide-react";
import { ArcLoader } from "@/components/brand/Brand";
import { PlannerSkeleton } from "@/components/brand/Skeletons";
import { EmptyState } from "@/components/brand/States";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Athlete } from "@/hooks/usePortalData";

interface PlannerItem {
  id: string;
  athleteId: string;
  athleteName: string;
  title: string;
  reason: string;
  suggestedDay: string;
  priority: number;
  source: "generated" | "saved";
  aiSourced?: boolean;
  dueDate?: string | null;
  isOverdue?: boolean;
  daysOverdue?: number;
}

function todayISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function daysBetween(fromISO: string, toISO: string): number {
  const a = new Date(fromISO + "T00:00:00").getTime();
  const b = new Date(toISO + "T00:00:00").getTime();
  return Math.max(0, Math.round((b - a) / 86400000));
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const DAY_SHORT: Record<string, string> = {
  Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed", Thursday: "Thu", Friday: "Fri",
};

type FilterType = "All" | "Urgent" | "Calls" | "Reviews" | "Scout" | "Parent";
const FILTERS: FilterType[] = ["All", "Urgent", "Calls", "Reviews", "Scout", "Parent"];

function classifyTask(item: PlannerItem): Exclude<FilterType, "All" | "Urgent"> | "Other" {
  const t = item.title.toLowerCase();
  if (t.includes("scout") || t.includes("pursue") || t.includes("lead")) return "Scout";
  if (t.includes("parent")) return "Parent";
  if (t.includes("review")) return "Reviews";
  if (t.includes("call") || t.includes("check-in") || t.includes("club")) return "Calls";
  return "Other";
}

function getWeekRange(offset: number = 0): { start: Date; end: Date; label: string } {
  const now = new Date();
  const mon = new Date(now);
  mon.setDate(now.getDate() - ((now.getDay() + 6) % 7) + offset * 7);
  mon.setHours(0, 0, 0, 0);
  const fri = new Date(mon);
  fri.setDate(mon.getDate() + 4);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  sun.setHours(23, 59, 59, 999);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
  return { start: mon, end: sun, label: `${fmt(mon)} – ${fmt(fri)}` };
}

function priorityBadge(p: number) {
  const base = "text-[10px] px-1.5 py-0 border-0";
  if (p === 1)
    return <Badge className={base} style={{ background: "var(--danger-soft)", color: "var(--danger-deep)" }}>Urgent</Badge>;
  if (p === 2)
    return <Badge className={base} style={{ background: "var(--win-soft)", color: "var(--win-deep)" }}>High</Badge>;
  return <Badge className={base} style={{ background: "var(--border-hex)", color: "var(--muted-fg)" }}>Normal</Badge>;
}

function generateTasks(
  athletes: Athlete[],
  reviews: { athlete_id: string; review_month: string; follow_up_actions: string | null; wellbeing_score: number | null; parent_engagement_notes: string | null }[],
  existingTaskAthleteIds: Set<string>,
  latestClubCalls: Record<string, string>,
  pursueLeads: any[],
  currentUserId: string | undefined
): Omit<PlannerItem, "id" | "source">[] {
  const items: Omit<PlannerItem, "id" | "source">[] = [];
  const currentMonth = new Date().toISOString().slice(0, 7) + "-01";

  for (const a of athletes) {
    const latestReview = reviews.find((r) => r.athlete_id === a.id);
    const hasCurrentMonthReview = latestReview?.review_month === currentMonth;

    if (a.wellbeingScore <= 2) {
      items.push({ athleteId: a.id, athleteName: a.name, title: "Wellbeing check-in required", reason: `Wellbeing score is ${a.wellbeingScore}/5 — needs immediate attention`, suggestedDay: "Monday", priority: 1 });
    }

    if (a.lastCall !== "No calls" && a.lastCall !== "—") {
      const daysSince = Math.floor((Date.now() - new Date(a.lastCall).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince >= 30) {
        items.push({ athleteId: a.id, athleteName: a.name, title: "Overdue check-in", reason: `Last call was ${daysSince} days ago`, suggestedDay: "Monday", priority: 1 });
      }
    } else if (a.lastCall === "No calls") {
      items.push({ athleteId: a.id, athleteName: a.name, title: "Initial check-in needed", reason: "No calls recorded yet", suggestedDay: "Tuesday", priority: 2 });
    }

    if (!hasCurrentMonthReview) {
      items.push({ athleteId: a.id, athleteName: a.name, title: "Complete monthly review", reason: `No review for ${new Date().toLocaleDateString("en-AU", { month: "long", year: "numeric" })}`, suggestedDay: "Wednesday", priority: 2 });
    }

    if (latestReview?.follow_up_actions && latestReview.follow_up_actions.trim() !== "") {
      items.push({ athleteId: a.id, athleteName: a.name, title: "Follow up on review actions", reason: latestReview.follow_up_actions.length > 80 ? latestReview.follow_up_actions.slice(0, 80) + "…" : latestReview.follow_up_actions, suggestedDay: "Tuesday", priority: 2 });
    }

    if (latestReview?.parent_engagement_notes === null || latestReview?.parent_engagement_notes?.trim() === "") {
      items.push({ athleteId: a.id, athleteName: a.name, title: "Send parent update", reason: "No parent engagement notes on latest review", suggestedDay: "Thursday", priority: 3 });
    }

    if (a.status === "Monitoring" && a.wellbeingScore > 2) {
      items.push({ athleteId: a.id, athleteName: a.name, title: "Monitor status review", reason: "Athlete in monitoring — assess if support needed", suggestedDay: "Wednesday", priority: 3 });
    }

    const lastClubCall = latestClubCalls[a.id];
    if (lastClubCall) {
      const daysSinceClub = Math.floor((Date.now() - new Date(lastClubCall).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceClub >= 56) {
        items.push({
          athleteId: a.id,
          athleteName: a.name,
          title: "Club check-in overdue",
          reason: `Last club conversation was ${daysSinceClub} days ago — call the club for an update`,
          suggestedDay: "Tuesday",
          priority: 2,
        });
      }
    } else {
      items.push({
        athleteId: a.id,
        athleteName: a.name,
        title: "Log first club conversation",
        reason: "No club contact recorded yet — call the club and log the conversation",
        suggestedDay: "Wednesday",
        priority: 3,
      });
    }
  }

  for (const lead of pursueLeads) {
    if (lead.assigned_agent_id !== currentUserId) continue;
    const name = `${lead.first_name} ${lead.last_name}`;
    const stage = lead.onboarding_stage;
    const daysSinceChange = Math.floor((Date.now() - new Date(lead.last_stage_change_at).getTime()) / (1000 * 60 * 60 * 24));

    if (stage === "New") {
      items.push({
        athleteId: lead.id,
        athleteName: name,
        title: `Make first contact — ${name}`,
        reason: "New Pursue lead not yet contacted",
        suggestedDay: "Monday",
        priority: 1,
      });
    } else if (daysSinceChange >= 5 && stage !== "Signed" && stage !== "Lost") {
      items.push({
        athleteId: lead.id,
        athleteName: name,
        title: `Follow up scout lead — ${name}`,
        reason: `${stage} for ${daysSinceChange} days — move this forward`,
        suggestedDay: "Wednesday",
        priority: 2,
      });
    } else if (lead.action_due_date && new Date(lead.action_due_date) <= new Date() && lead.action_status === "Open") {
      items.push({
        athleteId: lead.id,
        athleteName: name,
        title: `Scout action overdue — ${name}`,
        reason: `Action was due ${new Date(lead.action_due_date).toLocaleDateString("en-AU")}`,
        suggestedDay: "Tuesday",
        priority: 1,
      });
    }
  }

  return items;
}

/* ── Task row used in band view ── */
function TaskRow({
  item,
  completing,
  completed,
  onComplete,
  onReschedule,
  onDismiss,
}: {
  item: PlannerItem;
  completing: boolean;
  completed: boolean;
  onComplete: () => void;
  onReschedule?: (item: PlannerItem, date: Date) => void;
  onDismiss?: (item: PlannerItem) => void;
}) {
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const canManage = item.source === "saved" && !completed;
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 py-2 px-2 rounded border bg-card",
        item.isOverdue
          ? "border-danger/40 overdue-border-l"
          : "border-border/40"
      )}
      style={item.isOverdue ? { background: "var(--danger-soft)" } : undefined}
    >
      <div className="pt-0.5 shrink-0">
        {completing ? (
          <ArcLoader size={16} />
        ) : completed ? (
          <div className="h-4 w-4 rounded-sm bg-emerald-500 flex items-center justify-center">
            <Check className="h-3 w-3" style={{ color: "#fff" }} />
          </div>
        ) : (
          <Checkbox onCheckedChange={onComplete} className="h-4 w-4" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className={`text-xs font-bold truncate ${completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
            {item.athleteName}
          </span>
          {item.isOverdue && item.daysOverdue ? (
            <Badge variant="destructive" className="text-[9px] px-1.5 py-0 leading-tight">
              {item.daysOverdue}d overdue
            </Badge>
          ) : null}
          {item.aiSourced && (
            <span title="From conversation" className="inline-flex items-center gap-0.5 rounded-sm bg-primary/10 text-primary px-1 py-px text-[9px] font-medium">
              <Sparkles className="h-2.5 w-2.5" />
            </span>
          )}
        </div>
        <p className={`text-sm font-medium leading-snug ${completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
          {item.title}
        </p>
        {item.reason && (
          <p className="text-xs text-muted-foreground leading-snug mt-0.5 line-clamp-2">{item.reason}</p>
        )}
        {item.isOverdue && item.dueDate && (
          <p className="text-[10px] mt-0.5" style={{ color: "var(--danger-deep)" }}>
            Originally due {new Date(item.dueDate + "T00:00:00").toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })}
          </p>
        )}
      </div>
      {canManage && (onReschedule || onDismiss) && (
        <div className="shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="p-1 rounded hover:bg-muted text-muted-foreground"
                aria-label="Task actions"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 bg-popover z-50">
              {onReschedule && (
                <DropdownMenuItem
                  onSelect={() => {
                    setTimeout(() => setRescheduleOpen(true), 0);
                  }}
                >
                  <CalendarClock className="h-3.5 w-3.5 mr-2" />
                  Reschedule
                </DropdownMenuItem>
              )}
              {onDismiss && (
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={() => onDismiss(item)}
                >
                  <XCircle className="h-3.5 w-3.5 mr-2" />
                  Dismiss…
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <Popover open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
            <PopoverTrigger asChild>
              <span className="sr-only">reschedule anchor</span>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-50" align="end">
              <Calendar
                mode="single"
                selected={item.dueDate ? new Date(item.dueDate + "T00:00:00") : undefined}
                onSelect={(d) => {
                  if (d && onReschedule) {
                    onReschedule(item, d);
                    setRescheduleOpen(false);
                  }
                }}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
}

/* ── Priority band ── */
function PriorityBand({
  label,
  items,
  bandClass,
  bandStyle,
  countClass,
  countStyle,
  defaultOpen,
  completing,
  completedIds,
  onComplete,
  onReschedule,
  onDismiss,
  cap = 5,
}: {
  label: string;
  items: PlannerItem[];
  bandClass: string;
  bandStyle?: React.CSSProperties;
  countClass: string;
  countStyle?: React.CSSProperties;
  defaultOpen: boolean;
  completing: Set<string>;
  completedIds: Set<string>;
  onComplete: (item: PlannerItem) => void;
  onReschedule?: (item: PlannerItem, date: Date) => void;
  onDismiss?: (item: PlannerItem) => void;
  cap?: number;
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (items.length === 0) return null;
  const visible = items.slice(0, cap);
  const overflow = items.length - visible.length;

  return (
    <div className={`rounded-lg border ${bandClass}`} style={bandStyle}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2"
      >
        <div className="flex items-center gap-2">
          {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          <span className="text-sm font-bold">{label}</span>
          <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${countClass}`} style={countStyle}>
            {items.length}
          </span>
        </div>
      </button>
      {open && (
        <div className="px-2 pb-2 space-y-1.5">
          {visible.map((item) => (
            <TaskRow
              key={item.id}
              item={item}
              completing={completing.has(item.id)}
              completed={completedIds.has(item.id)}
              onComplete={() => onComplete(item)}
              onReschedule={onReschedule}
              onDismiss={onDismiss}
            />
          ))}
          {overflow > 0 && (
            <p className="text-[11px] text-muted-foreground px-1 pt-1">
              +{overflow} more in this band
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function WeeklyPlanner({ athletes }: { athletes: Athlete[] }) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [savedTasks, setSavedTasks] = useState<
    { id: string; athlete_id: string; title: string; description: string | null; priority: number; suggested_day: string | null; status: string; source?: string | null; due_date?: string | null }[]
  >([]);
  const [reviews, setReviews] = useState<
    { athlete_id: string; review_month: string; follow_up_actions: string | null; wellbeing_score: number | null; parent_engagement_notes: string | null }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<Set<string>>(new Set());
  const [sessionCompleted, setSessionCompleted] = useState<Set<string>>(new Set());
  const [latestClubCalls, setLatestClubCalls] = useState<Record<string, string>>({});
  const [pursueLeads, setPursueLeads] = useState<any[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [upcomingCount, setUpcomingCount] = useState(0);

  const week = useMemo(() => getWeekRange(weekOffset), [weekOffset]);
  const isCurrentWeek = weekOffset === 0;

  const today = new Date();
  const currentDayIndex = (today.getDay() + 6) % 7;
  const todayName = currentDayIndex < 5 ? DAYS[currentDayIndex] : "Monday";

  const [selectedDay, setSelectedDay] = useState<string>("today"); // "today" | "Monday".. | "all"
  const [activeFilter, setActiveFilter] = useState<FilterType>("All");

  // When navigating away from current week, "today" no longer applies
  useEffect(() => {
    if (!isCurrentWeek && selectedDay === "today") setSelectedDay("all");
  }, [isCurrentWeek, selectedDay]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const athleteIds = athletes.map((a) => a.id);
      if (athleteIds.length === 0) { setLoading(false); return; }

      const weekStartISO = week.start.toISOString();
      const weekStartDate = week.start.toISOString().slice(0, 10);
      const weekEndDate = week.end.toISOString().slice(0, 10);

      const [tasksRes, overdueRes, reviewsRes, clubCallsRes, scoutRes, upcomingRes] = await Promise.all([
        // Tasks whose due_date falls in the visible week, OR (current week only)
        // recently created undated tasks.
        supabase.from("athlete_tasks")
          .select("id, athlete_id, title, description, priority, suggested_day, status, source, due_date")
          .in("athlete_id", athleteIds)
          .eq("owner_type", "agent")
          .or(
            isCurrentWeek
              ? `and(due_date.gte.${weekStartDate},due_date.lte.${weekEndDate}),and(due_date.is.null,created_at.gte.${weekStartISO})`
              : `and(due_date.gte.${weekStartDate},due_date.lte.${weekEndDate})`
          )
          .order("priority", { ascending: true }),
        // Overdue: still-open tasks with a due_date before this week's start.
        // Only fetched for the current week — future weeks stay clean.
        isCurrentWeek
          ? supabase.from("athlete_tasks")
              .select("id, athlete_id, title, description, priority, suggested_day, status, source, due_date")
              .in("athlete_id", athleteIds)
              .eq("owner_type", "agent")
              .lt("due_date", weekStartDate)
              .not("status", "in", '("done","cancelled")')
              .order("due_date", { ascending: true })
          : Promise.resolve({ data: [] as any[] }),
        supabase.from("monthly_reviews").select("athlete_id, review_month, follow_up_actions, wellbeing_score, parent_engagement_notes").in("athlete_id", athleteIds).order("review_month", { ascending: false }),
        supabase.from("call_history").select("athlete_id, call_date").in("athlete_id", athleteIds).eq("call_type", "club_conversation" as any).order("call_date", { ascending: false }),
        (supabase as any)
          .from("scout_leads")
          .select("id, first_name, last_name, triage_decision, onboarding_stage, action_due_date, action_status, assigned_agent_id, last_stage_change_at")
          .eq("triage_decision", "Pursue")
          .neq("onboarding_stage", "Signed")
          .neq("onboarding_stage", "Lost"),
        // Count of open tasks due AFTER this week's end (for "+N upcoming" hint)
        supabase.from("athlete_tasks")
          .select("id", { count: "exact", head: true })
          .in("athlete_id", athleteIds)
          .eq("owner_type", "agent")
          .neq("status", "done" as any)
          .gt("due_date", weekEndDate),
      ]);
      setPursueLeads(scoutRes?.data || []);
      setUpcomingCount(upcomingRes.count ?? 0);

      const overdueRows = (overdueRes as any)?.data || [];
      // Merge week tasks with overdue, dedup by id
      const merged: typeof savedTasks = [];
      const seenIds = new Set<string>();
      for (const t of [...(tasksRes.data || []), ...overdueRows]) {
        if (seenIds.has(t.id)) continue;
        seenIds.add(t.id);
        merged.push(t);
      }
      setSavedTasks(merged);
      const seen = new Set<string>();
      const latestReviews = (reviewsRes.data || []).filter((r) => {
        if (seen.has(r.athlete_id)) return false;
        seen.add(r.athlete_id);
        return true;
      });
      setReviews(latestReviews);

      const clubMap: Record<string, string> = {};
      for (const call of (clubCallsRes.data || [])) {
        if (!clubMap[call.athlete_id]) clubMap[call.athlete_id] = call.call_date;
      }
      setLatestClubCalls(clubMap);
      setLoading(false);
    }
    load();
  }, [athletes, weekOffset, isCurrentWeek, week.start, week.end]);

  const plannerItems = useMemo((): PlannerItem[] => {
    const savedIds = new Set(savedTasks.filter((t) => t.status === "done").map((t) => `${t.athlete_id}:${t.title}`));
    const existingIds = new Set(savedTasks.map((t) => t.athlete_id));
    const todayStr = todayISO();

    const active: PlannerItem[] = savedTasks
      .filter((t) => t.status !== "cancelled")
      .map((t) => {
        let day = t.suggested_day || "Monday";
        if (t.due_date) {
          const d = new Date(t.due_date + "T00:00:00");
          const idx = (d.getDay() + 6) % 7;
          day = idx < 5 ? DAYS[idx] : "Friday";
        }
        const isOpen = t.status !== "done" && t.status !== "cancelled";
        const isOverdue = !!(t.due_date && isOpen && t.due_date < todayStr);
        return {
          id: t.id, athleteId: t.athlete_id, athleteName: athletes.find((a) => a.id === t.athlete_id)?.name ?? "Unknown",
          title: t.title, reason: t.description || "", suggestedDay: day, priority: t.priority, source: "saved" as const,
          aiSourced: t.source === "conversation_ai",
          dueDate: t.due_date ?? null,
          isOverdue,
          daysOverdue: isOverdue && t.due_date ? daysBetween(t.due_date, todayStr) : 0,
        };
      });

    const generated = isCurrentWeek
      ? generateTasks(athletes, reviews, existingIds, latestClubCalls, pursueLeads, user?.id)
      : [];
    const newGenerated: PlannerItem[] = generated
      .filter((g) => !savedIds.has(`${g.athleteId}:${g.title}`))
      .filter((g) => !active.some((a) => a.athleteId === g.athleteId && a.title === g.title))
      .map((g, i) => ({ ...g, id: `gen-${i}`, source: "generated" as const }));

    return [...active, ...newGenerated].sort((a, b) => a.priority - b.priority);
  }, [savedTasks, athletes, reviews, latestClubCalls, pursueLeads, user?.id, isCurrentWeek]);

  // Saved-task completion lookup
  const savedDoneIds = useMemo(
    () => new Set(savedTasks.filter((t) => t.status === "done").map((t) => t.id)),
    [savedTasks]
  );
  const isCompleted = useCallback(
    (item: PlannerItem) => sessionCompleted.has(item.id) || savedDoneIds.has(item.id),
    [sessionCompleted, savedDoneIds]
  );

  const handleComplete = useCallback(
    async (item: PlannerItem) => {
      setCompleting((prev) => new Set(prev).add(item.id));
      try {
        if (item.source === "saved") {
          await supabase.from("athlete_tasks").update({ status: "done" as any, completed_at: new Date().toISOString(), completed_by: user?.id || null }).eq("id", item.id);
        } else {
          await supabase.from("athlete_tasks").insert({
            athlete_id: item.athleteId, title: item.title, description: item.reason, priority: item.priority,
            suggested_day: item.suggestedDay, owner_type: "agent" as any, status: "done" as any,
            completed_at: new Date().toISOString(), completed_by: user?.id || null, created_by: user?.id || null,
          });
        }

        setSavedTasks((prev) => {
          if (item.source === "saved") return prev.map((t) => (t.id === item.id ? { ...t, status: "done" } : t));
          return [...prev, { id: crypto.randomUUID(), athlete_id: item.athleteId, title: item.title, description: item.reason, priority: item.priority, suggested_day: item.suggestedDay, status: "done" }];
        });
        setSessionCompleted((prev) => new Set(prev).add(item.id));
        toast.success(`"${item.title}" completed`);
      } catch {
        toast.error("Failed to complete task");
      } finally {
        setCompleting((prev) => { const next = new Set(prev); next.delete(item.id); return next; });
      }
    },
    [user?.id]
  );

  // Reschedule: move task to a new due_date (no auto-rollover; agent decision).
  const handleReschedule = useCallback(
    async (item: PlannerItem, date: Date) => {
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      const newDate = `${yyyy}-${mm}-${dd}`;
      try {
        const { error } = await supabase
          .from("athlete_tasks")
          .update({ due_date: newDate } as any)
          .eq("id", item.id);
        if (error) throw error;
        setSavedTasks((prev) => prev.map((t) => (t.id === item.id ? { ...t, due_date: newDate } : t)));
        toast.success(`Rescheduled to ${date.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })}`);
      } catch {
        toast.error("Failed to reschedule");
      }
    },
    []
  );

  // Dismiss with reason — closes the task without deleting the record.
  const handleDismiss = useCallback(
    async (item: PlannerItem) => {
      const reason = window.prompt(`Dismiss "${item.title}" — why?`, "")?.trim();
      if (!reason) return;
      try {
        const { error } = await supabase
          .from("athlete_tasks")
          .update({
            status: "cancelled" as any,
            dismiss_reason: reason,
            completed_by: user?.id || null,
          } as any)
          .eq("id", item.id);
        if (error) throw error;
        setSavedTasks((prev) => prev.filter((t) => t.id !== item.id));
        toast.success("Task dismissed");
      } catch {
        toast.error("Failed to dismiss");
      }
    },
    [user?.id]
  );

  // Group by day. Overdue items (current week only) are routed to TODAY.
  const byDay = useMemo(() => {
    const map: Record<string, PlannerItem[]> = {};
    for (const day of DAYS) map[day] = [];
    for (const item of plannerItems) {
      let day: string;
      if (isCurrentWeek && item.isOverdue) {
        day = todayName;
      } else {
        day = DAYS.includes(item.suggestedDay) ? item.suggestedDay : "Friday";
      }
      map[day].push(item);
    }
    return map;
  }, [plannerItems, isCurrentWeek, todayName]);

  // Smart dedup per athlete per day — overdue first (oldest first), then by priority.
  const dedupedByDay = useMemo(() => {
    const map: Record<string, PlannerItem[]> = {};
    for (const day of DAYS) {
      const sorted = [...byDay[day]].sort((a, b) => {
        if (!!a.isOverdue !== !!b.isOverdue) return a.isOverdue ? -1 : 1;
        if (a.isOverdue && b.isOverdue) {
          return (b.daysOverdue || 0) - (a.daysOverdue || 0);
        }
        return a.priority - b.priority;
      });
      const seen = new Set<string>();
      const out: PlannerItem[] = [];
      for (const it of sorted) {
        // Allow multiple rows per athlete if one is overdue and another is fresh
        const key = `${it.athleteId}:${it.isOverdue ? "od" : "ok"}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(it);
      }
      map[day] = out;
    }
    return map;
  }, [byDay]);

  // Apply filter
  const applyFilter = useCallback(
    (items: PlannerItem[]) => {
      if (activeFilter === "All") return items;
      if (activeFilter === "Urgent") return items.filter((i) => i.priority === 1);
      return items.filter((i) => classifyTask(i) === activeFilter);
    },
    [activeFilter]
  );

  const resolvedDay = selectedDay === "today" ? todayName : selectedDay;
  const showFullWeek = selectedDay === "all";

  // Header progress — today only
  const todayItems = dedupedByDay[todayName] || [];
  const todayDone = todayItems.filter(isCompleted).length;
  const todayTotal = todayItems.length;
  const progressPct = todayTotal > 0 ? Math.round((todayDone / todayTotal) * 100) : 0;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <PlannerSkeleton />
        </CardContent>
      </Card>
    );
  }

  const totalItems = plannerItems.length;

  /* ── Day-view bands ── */
  const renderDayBands = (day: string) => {
    const filtered = applyFilter(dedupedByDay[day] || []);
    const urgent = filtered.filter((i) => i.priority === 1);
    const high = filtered.filter((i) => i.priority === 2);
    const normal = filtered.filter((i) => i.priority === 3);

    // overflow across week for this filter
    let weekOverflow = 0;
    for (const d of DAYS) {
      if (d === day) continue;
      weekOverflow += applyFilter(dedupedByDay[d] || []).length;
    }

    const empty = urgent.length === 0 && high.length === 0 && normal.length === 0;
    if (empty) {
      return (
        <EmptyState
          compact
          icon={<CheckCircle2 className="h-5 w-5" />}
          title={`Nothing for ${day} on this filter`}
          hint="Switch filter or jump to Full week to see what's queued."
        />
      );
    }

    const hasUrgentOrHigh = urgent.length > 0 || high.length > 0;

    return (
      <div className="space-y-2">
        <PriorityBand
          label="Urgent"
          items={urgent}
          bandClass=""
          bandStyle={{ background: "var(--danger-soft)", borderColor: "var(--danger-soft)" }}
          countClass=""
          countStyle={{ background: "var(--danger-soft)", color: "var(--danger-deep)" }}
          defaultOpen
          completing={completing}
          completedIds={sessionCompleted}
          onComplete={handleComplete}
          onReschedule={handleReschedule}
          onDismiss={handleDismiss}
        />
        <PriorityBand
          label="High"
          items={high}
          bandClass=""
          bandStyle={{ background: "var(--win-soft)", borderColor: "var(--win-soft)" }}
          countClass=""
          countStyle={{ background: "var(--win-soft)", color: "var(--win-deep)" }}
          defaultOpen
          completing={completing}
          completedIds={sessionCompleted}
          onComplete={handleComplete}
          onReschedule={handleReschedule}
          onDismiss={handleDismiss}
        />
        <PriorityBand
          label="Normal"
          items={normal}
          bandClass="border-border bg-muted/30"
          countClass="bg-muted text-muted-foreground"
          defaultOpen={!hasUrgentOrHigh}
          completing={completing}
          completedIds={sessionCompleted}
          onComplete={handleComplete}
          onReschedule={handleReschedule}
          onDismiss={handleDismiss}
        />
        {weekOverflow > 0 && (
          <p className="text-xs text-muted-foreground text-center pt-1">
            {weekOverflow} more task{weekOverflow !== 1 ? "s" : ""} this week — switch to Full week to see all
          </p>
        )}
      </div>
    );
  };

  /* ── Full-week column view (original layout, filter applied) ── */
  const renderFullWeek = () => (
    <div className={isMobile ? "space-y-2" : "flex gap-2 min-h-[240px]"}>
      {DAYS.map((day, i) => {
        const items = applyFilter(dedupedByDay[day]);
        const isToday = i === currentDayIndex && currentDayIndex < 5;
        const empty = items.length === 0;

        if (isMobile) {
          return (
            <div
              key={day}
              className={`rounded-lg border ${isToday ? "border-primary/40 bg-primary/5" : "border-border"}`}
            >
              <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${isToday ? "text-primary" : "text-foreground"}`}>{day}</span>
                  {isToday && <Badge className="text-[10px] px-1.5 py-0">Today</Badge>}
                </div>
                {items.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{items.length}</Badge>
                )}
              </div>
              <div className="p-2 space-y-1.5">
                {empty ? (
                  <p className="text-[11px] text-muted-foreground/60 text-center py-2">—</p>
                ) : (
                  items.slice(0, 5).map((item) => (
                    <TaskRow
                      key={item.id}
                      item={item}
                      completing={completing.has(item.id)}
                      completed={isCompleted(item)}
                      onComplete={() => handleComplete(item)}
                      onReschedule={handleReschedule}
                      onDismiss={handleDismiss}
                    />
                  ))
                )}
                {items.length > 5 && (
                  <p className="text-[10px] text-muted-foreground px-1">+{items.length - 5} more</p>
                )}
              </div>
            </div>
          );
        }

        return (
          <div
            key={day}
            className={`rounded-lg border flex flex-col transition-all ${
              empty ? "basis-[56px] shrink-0 grow-0" : "flex-1 min-w-0"
            } ${isToday ? "border-primary/40 bg-primary/5" : "border-border bg-muted/10"}`}
          >
            <div className={`flex items-center justify-between px-2.5 py-2 border-b ${isToday ? "border-primary/20" : "border-border/50"}`}>
              <p className={`text-[11px] font-bold uppercase tracking-wider ${isToday ? "text-primary" : "text-muted-foreground"}`}>{day.slice(0, 3)}</p>
              {items.length > 0 && (
                <span className={`text-[10px] font-medium rounded-full px-1.5 py-0.5 ${isToday ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>{items.length}</span>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-1.5 space-y-1.5" style={{ maxHeight: "360px" }}>
              {empty ? (
                <p className="text-[10px] text-muted-foreground/50 text-center mt-6">—</p>
              ) : (
                <>
                  {items.slice(0, 5).map((item) => {
                    const done = isCompleted(item);
                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "rounded border p-2 hover:shadow-sm transition",
                          item.isOverdue ? "overdue-border-l" : "bg-card"
                        )}
                        style={item.isOverdue ? { background: "var(--danger-soft)", borderColor: "var(--danger-soft)" } : undefined}
                      >
                        <div className="flex items-start gap-1.5">
                          <div className="pt-px shrink-0">
                            {completing.has(item.id) ? (
                              <ArcLoader size={12} />
                            ) : done ? (
                              <div className="h-3.5 w-3.5 rounded-sm flex items-center justify-center" style={{ background: "var(--success)" }}>
                                <Check className="h-2.5 w-2.5" style={{ color: "#fff" }} />
                              </div>
                            ) : (
                              <Checkbox onCheckedChange={() => handleComplete(item)} className="h-3.5 w-3.5" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="flex items-center gap-1 flex-wrap">
                              <p className={`text-[11px] font-semibold leading-tight truncate ${done ? "line-through text-muted-foreground" : ""}`}>{item.athleteName}</p>
                              {item.aiSourced && <Sparkles className="h-2.5 w-2.5 text-primary shrink-0" />}
                              {item.isOverdue && item.daysOverdue ? (
                                <Badge variant="destructive" className="text-[9px] px-1 py-0 leading-tight">
                                  {item.daysOverdue}d overdue
                                </Badge>
                              ) : null}
                            </div>
                            <p className={`text-[11px] leading-snug ${done ? "line-through text-muted-foreground" : ""}`}>{item.title}</p>
                            {item.reason && <p className="text-[10px] text-muted-foreground leading-snug line-clamp-1">{item.reason}</p>}
                            <div className="pt-0.5">{priorityBadge(item.priority)}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {items.length > 5 && (
                    <p className="text-[10px] text-muted-foreground px-1">+{items.length - 5} more</p>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Weekly Planner</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setWeekOffset((o) => o - 1)}
              className="p-1 rounded hover:bg-muted text-muted-foreground"
              aria-label="Previous week"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex flex-col items-center min-w-[120px]">
              <span className="text-xs font-medium text-foreground">{week.label}</span>
              {!isCurrentWeek && (
                <button
                  onClick={() => setWeekOffset(0)}
                  className="text-[10px] text-primary hover:underline"
                >
                  Back to this week
                </button>
              )}
            </div>
            <button
              onClick={() => setWeekOffset((o) => o + 1)}
              className="p-1 rounded hover:bg-muted text-muted-foreground"
              aria-label="Next week"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            {totalItems > 0 && (
              <Badge variant="secondary" className="text-xs ml-1">{totalItems}</Badge>
            )}
          </div>
        </div>

        {isCurrentWeek && upcomingCount > 0 && (
          <button
            onClick={() => setWeekOffset(1)}
            className="text-[11px] text-primary hover:underline mt-1 self-start"
          >
            +{upcomingCount} upcoming task{upcomingCount !== 1 ? "s" : ""} in future weeks →
          </button>
        )}

        {/* Progress for today */}
        {isCurrentWeek && (
          <div className="pt-2">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">
                <span className="num">{todayDone}</span> of <span className="num">{todayTotal}</span> task{todayTotal !== 1 ? "s" : ""} done today
              </span>
              <span className="num font-medium text-foreground">{progressPct}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: "var(--border-strong)" }}>
              <div
                className="h-full transition-all"
                style={{ width: `${progressPct}%`, background: "var(--brand-gradient)" }}
              />
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-3">
        {/* Day selector */}
        <div className="flex flex-wrap items-center gap-1.5">
          {isCurrentWeek && (
            <button
              onClick={() => setSelectedDay("today")}
              className={`text-xs font-semibold px-2.5 py-1 rounded-full border transition ${
                selectedDay === "today"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              Today
            </button>
          )}
          {DAYS.map((d, i) => {
            const isCurrent = selectedDay === d;
            const isToday = isCurrentWeek && i === currentDayIndex && currentDayIndex < 5;
            return (
              <button
                key={d}
                onClick={() => setSelectedDay(d)}
                className={`text-xs font-semibold px-2.5 py-1 rounded-full border transition ${
                  isCurrent
                    ? "bg-primary text-primary-foreground border-primary"
                    : isToday
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "bg-background text-muted-foreground border-border hover:text-foreground"
                }`}
              >
                {DAY_SHORT[d]}
              </button>
            );
          })}
          <button
            onClick={() => setSelectedDay("all")}
            className={`text-xs font-semibold px-2.5 py-1 rounded-full border transition ${
              selectedDay === "all"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            Full week
          </button>
        </div>

        {/* Filter pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`text-[11px] font-medium px-2 py-0.5 rounded-full border transition ${
                activeFilter === f
                  ? "bg-foreground text-background border-foreground"
                  : "bg-background text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {totalItems === 0 ? (
          <EmptyState
            compact
            icon={<CheckCircle2 className="h-5 w-5" />}
            title="All caught up for this week"
            hint="Nothing pressing on the board. Log a conversation or check the roster for next moves."
          />
        ) : showFullWeek ? (
          renderFullWeek()
        ) : (
          renderDayBands(resolvedDay)
        )}
      </CardContent>
    </Card>
  );
}
