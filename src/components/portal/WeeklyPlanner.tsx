import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarDays, CheckCircle2, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
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
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

function getWeekLabel(): string {
  const now = new Date();
  const mon = new Date(now);
  mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const fri = new Date(mon);
  fri.setDate(mon.getDate() + 4);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
  return `${fmt(mon)} – ${fmt(fri)}`;
}

function priorityBadge(p: number) {
  if (p === 1)
    return <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Urgent</Badge>;
  if (p === 2)
    return <Badge variant="secondary" className="text-[10px] px-1.5 py-0">High</Badge>;
  return <Badge variant="outline" className="text-[10px] px-1.5 py-0">Normal</Badge>;
}

function generateTasks(
  athletes: Athlete[],
  reviews: { athlete_id: string; review_month: string; follow_up_actions: string | null; wellbeing_score: number | null; parent_engagement_notes: string | null }[],
  existingTaskAthleteIds: Set<string>,
  latestClubCalls: Record<string, string>
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
  }

  return items;
}

/* ── Mobile task row ── */
function MobileTaskRow({ item, completing, onComplete }: { item: PlannerItem; completing: boolean; onComplete: () => void }) {
  return (
    <div className="flex items-start gap-2.5 py-2.5 px-1 border-b border-border/40 last:border-0">
      <div className="pt-0.5 shrink-0">
        {completing ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <Checkbox onCheckedChange={onComplete} className="h-4 w-4" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-bold text-foreground truncate">{item.athleteName}</span>
          {priorityBadge(item.priority)}
        </div>
        <p className="text-sm font-medium text-foreground leading-snug">{item.title}</p>
        {item.reason && (
          <p className="text-xs text-muted-foreground leading-snug mt-0.5 line-clamp-2">{item.reason}</p>
        )}
      </div>
    </div>
  );
}

/* ── Mobile day accordion ── */
function MobileDaySection({ day, items, isToday, completing, onComplete }: {
  day: string; items: PlannerItem[]; isToday: boolean; completing: Set<string>; onComplete: (item: PlannerItem) => void;
}) {
  const [open, setOpen] = useState(isToday || items.length > 0);
  const empty = items.length === 0;

  return (
    <div className={`rounded-lg border ${isToday ? "border-primary/40 bg-primary/5" : "border-border"}`}>
      <button
        onClick={() => !empty && setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2.5"
        disabled={empty}
      >
        <div className="flex items-center gap-2">
          {!empty && (open ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />)}
          <span className={`text-sm font-bold ${isToday ? "text-primary" : empty ? "text-muted-foreground/50" : "text-foreground"}`}>
            {day}
          </span>
          {isToday && <Badge className="text-[10px] px-1.5 py-0">Today</Badge>}
        </div>
        {items.length > 0 && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {items.length}
          </Badge>
        )}
      </button>
      {open && !empty && (
        <div className="px-2 pb-2">
          {items.map((item) => (
            <MobileTaskRow
              key={item.id}
              item={item}
              completing={completing.has(item.id)}
              onComplete={() => onComplete(item)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function WeeklyPlanner({ athletes }: { athletes: Athlete[] }) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [savedTasks, setSavedTasks] = useState<
    { id: string; athlete_id: string; title: string; description: string | null; priority: number; suggested_day: string | null; status: string }[]
  >([]);
  const [reviews, setReviews] = useState<
    { athlete_id: string; review_month: string; follow_up_actions: string | null; wellbeing_score: number | null; parent_engagement_notes: string | null }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      setLoading(true);
      const athleteIds = athletes.map((a) => a.id);
      if (athleteIds.length === 0) { setLoading(false); return; }

      const now = new Date();
      const mon = new Date(now);
      mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
      mon.setHours(0, 0, 0, 0);

      const [tasksRes, reviewsRes] = await Promise.all([
        supabase.from("athlete_tasks").select("id, athlete_id, title, description, priority, suggested_day, status").in("athlete_id", athleteIds).eq("owner_type", "agent").gte("created_at", mon.toISOString()).order("priority", { ascending: true }),
        supabase.from("monthly_reviews").select("athlete_id, review_month, follow_up_actions, wellbeing_score, parent_engagement_notes").in("athlete_id", athleteIds).order("review_month", { ascending: false }),
      ]);

      setSavedTasks(tasksRes.data || []);
      const seen = new Set<string>();
      const latestReviews = (reviewsRes.data || []).filter((r) => {
        if (seen.has(r.athlete_id)) return false;
        seen.add(r.athlete_id);
        return true;
      });
      setReviews(latestReviews);
      setLoading(false);
    }
    load();
  }, [athletes]);

  const plannerItems = useMemo((): PlannerItem[] => {
    const savedIds = new Set(savedTasks.filter((t) => t.status === "done").map((t) => `${t.athlete_id}:${t.title}`));
    const existingIds = new Set(savedTasks.map((t) => t.athlete_id));

    const active: PlannerItem[] = savedTasks
      .filter((t) => t.status !== "done" && t.status !== "cancelled")
      .map((t) => ({
        id: t.id, athleteId: t.athlete_id, athleteName: athletes.find((a) => a.id === t.athlete_id)?.name ?? "Unknown",
        title: t.title, reason: t.description || "", suggestedDay: t.suggested_day || "Monday", priority: t.priority, source: "saved" as const,
      }));

    const generated = generateTasks(athletes, reviews, existingIds);
    const newGenerated: PlannerItem[] = generated
      .filter((g) => !savedIds.has(`${g.athleteId}:${g.title}`))
      .filter((g) => !active.some((a) => a.athleteId === g.athleteId && a.title === g.title))
      .map((g, i) => ({ ...g, id: `gen-${i}`, source: "generated" as const }));

    return [...active, ...newGenerated].sort((a, b) => a.priority - b.priority);
  }, [savedTasks, athletes, reviews]);

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
        toast.success(`"${item.title}" completed`);
      } catch {
        toast.error("Failed to complete task");
      } finally {
        setCompleting((prev) => { const next = new Set(prev); next.delete(item.id); return next; });
      }
    },
    [user?.id]
  );

  const byDay = useMemo(() => {
    const map: Record<string, PlannerItem[]> = {};
    for (const day of DAYS) map[day] = [];
    for (const item of plannerItems) {
      const day = DAYS.includes(item.suggestedDay) ? item.suggestedDay : "Friday";
      map[day].push(item);
    }
    return map;
  }, [plannerItems]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading weekly planner…</span>
        </CardContent>
      </Card>
    );
  }

  const totalItems = plannerItems.length;
  const today = new Date();
  const currentDayIndex = (today.getDay() + 6) % 7;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Weekly Planner</CardTitle>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{getWeekLabel()}</span>
            {totalItems > 0 && (
              <Badge variant="secondary" className="text-xs">{totalItems} item{totalItems !== 1 ? "s" : ""}</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        {totalItems === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            All caught up — no pressing tasks this week.
          </div>
        ) : isMobile ? (
          /* ── MOBILE: stacked accordion view ── */
          <div className="space-y-2">
            {DAYS.map((day, i) => (
              <MobileDaySection
                key={day}
                day={day}
                items={byDay[day]}
                isToday={i === currentDayIndex && currentDayIndex < 5}
                completing={completing}
                onComplete={handleComplete}
              />
            ))}
          </div>
        ) : (
          /* ── DESKTOP: column view ── */
          <div className="flex gap-2 min-h-[240px]">
            {DAYS.map((day) => {
              const items = byDay[day];
              const dayIndex = DAYS.indexOf(day);
              const isToday = dayIndex === currentDayIndex && currentDayIndex < 5;
              const empty = items.length === 0;

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
                      items.map((item) => (
                        <div key={item.id} className="rounded border bg-card p-2 hover:shadow-sm transition">
                          <div className="flex items-start gap-1.5">
                            <div className="pt-px shrink-0">
                              {completing.has(item.id) ? (
                                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                              ) : (
                                <Checkbox onCheckedChange={() => handleComplete(item)} className="h-3.5 w-3.5" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1 space-y-0.5">
                              <p className="text-[11px] font-semibold leading-tight truncate">{item.athleteName}</p>
                              <p className="text-[11px] leading-snug">{item.title}</p>
                              {item.reason && <p className="text-[10px] text-muted-foreground leading-snug line-clamp-1">{item.reason}</p>}
                              <div className="pt-0.5">{priorityBadge(item.priority)}</div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}