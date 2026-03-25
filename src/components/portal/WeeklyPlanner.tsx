import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { CalendarDays, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Athlete } from "@/hooks/usePortalData";

interface PlannerItem {
  id: string;
  athleteId: string;
  athleteName: string;
  title: string;
  reason: string;
  suggestedDay: string;
  priority: number; // 1=highest
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
    return (
      <Badge variant="destructive" className="text-xs">
        Urgent
      </Badge>
    );
  if (p === 2)
    return (
      <Badge variant="secondary" className="text-xs">
        High
      </Badge>
    );
  return (
    <Badge variant="outline" className="text-xs">
      Normal
    </Badge>
  );
}

/**
 * Generate smart weekly tasks from athlete data.
 */
function generateTasks(
  athletes: Athlete[],
  reviews: { athlete_id: string; review_month: string; follow_up_actions: string | null; wellbeing_score: number | null; parent_engagement_notes: string | null }[],
  existingTaskAthleteIds: Set<string>
): Omit<PlannerItem, "id" | "source">[] {
  const items: Omit<PlannerItem, "id" | "source">[] = [];
  const currentMonth = new Date().toISOString().slice(0, 7) + "-01";

  for (const a of athletes) {
    const latestReview = reviews.find((r) => r.athlete_id === a.id);
    const hasCurrentMonthReview = latestReview?.review_month === currentMonth;

    // 1. Wellbeing concern
    if (a.wellbeingScore <= 2) {
      items.push({
        athleteId: a.id,
        athleteName: a.name,
        title: "Wellbeing check-in required",
        reason: `Wellbeing score is ${a.wellbeingScore}/5 — needs immediate attention`,
        suggestedDay: "Monday",
        priority: 1,
      });
    }

    // 2. Overdue check-in (no call in 30+ days)
    if (a.lastCall === "No calls" || (a.lastCall !== "—" && a.lastCall !== "No calls")) {
      if (a.lastCall !== "No calls" && a.lastCall !== "—") {
        const daysSince = Math.floor(
          (Date.now() - new Date(a.lastCall).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSince >= 30) {
          items.push({
            athleteId: a.id,
            athleteName: a.name,
            title: "Overdue check-in",
            reason: `Last call was ${daysSince} days ago`,
            suggestedDay: "Monday",
            priority: 1,
          });
        }
      } else if (a.lastCall === "No calls") {
        items.push({
          athleteId: a.id,
          athleteName: a.name,
          title: "Initial check-in needed",
          reason: "No calls recorded yet",
          suggestedDay: "Tuesday",
          priority: 2,
        });
      }
    }

    // 3. Monthly review not yet completed
    if (!hasCurrentMonthReview) {
      items.push({
        athleteId: a.id,
        athleteName: a.name,
        title: "Complete monthly review",
        reason: `No review recorded for ${new Date().toLocaleDateString("en-AU", { month: "long", year: "numeric" })}`,
        suggestedDay: "Wednesday",
        priority: 2,
      });
    }

    // 4. Follow-up actions from latest review
    if (latestReview?.follow_up_actions && latestReview.follow_up_actions.trim() !== "") {
      items.push({
        athleteId: a.id,
        athleteName: a.name,
        title: "Follow up on review actions",
        reason: latestReview.follow_up_actions.length > 80
          ? latestReview.follow_up_actions.slice(0, 80) + "…"
          : latestReview.follow_up_actions,
        suggestedDay: "Tuesday",
        priority: 2,
      });
    }

    // 5. Parent update required
    if (latestReview?.parent_engagement_notes === null || latestReview?.parent_engagement_notes?.trim() === "") {
      items.push({
        athleteId: a.id,
        athleteName: a.name,
        title: "Send parent update",
        reason: "No parent engagement notes on latest review",
        suggestedDay: "Thursday",
        priority: 3,
      });
    }

    // 6. Monitoring status
    if (a.status === "Monitoring" && a.wellbeingScore > 2) {
      items.push({
        athleteId: a.id,
        athleteName: a.name,
        title: "Monitor status review",
        reason: "Athlete in monitoring — assess if support needed",
        suggestedDay: "Wednesday",
        priority: 3,
      });
    }
  }

  return items;
}

export default function WeeklyPlanner({ athletes }: { athletes: Athlete[] }) {
  const { user } = useAuth();
  const [savedTasks, setSavedTasks] = useState<
    { id: string; athlete_id: string; title: string; description: string | null; priority: number; suggested_day: string | null; status: string }[]
  >([]);
  const [reviews, setReviews] = useState<
    { athlete_id: string; review_month: string; follow_up_actions: string | null; wellbeing_score: number | null; parent_engagement_notes: string | null }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<Set<string>>(new Set());

  // Load saved tasks and reviews
  useEffect(() => {
    async function load() {
      setLoading(true);
      const athleteIds = athletes.map((a) => a.id);
      if (athleteIds.length === 0) {
        setLoading(false);
        return;
      }

      // Get this week's Monday
      const now = new Date();
      const mon = new Date(now);
      mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
      mon.setHours(0, 0, 0, 0);

      const [tasksRes, reviewsRes] = await Promise.all([
        supabase
          .from("athlete_tasks")
          .select("id, athlete_id, title, description, priority, suggested_day, status")
          .in("athlete_id", athleteIds)
          .eq("owner_type", "agent")
          .gte("created_at", mon.toISOString())
          .order("priority", { ascending: true }),
        supabase
          .from("monthly_reviews")
          .select("athlete_id, review_month, follow_up_actions, wellbeing_score, parent_engagement_notes")
          .in("athlete_id", athleteIds)
          .order("review_month", { ascending: false }),
      ]);

      setSavedTasks(tasksRes.data || []);
      // Keep only latest review per athlete
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

  // Merge generated + saved tasks
  const plannerItems = useMemo((): PlannerItem[] => {
    const savedIds = new Set(savedTasks.filter((t) => t.status === "done").map((t) => `${t.athlete_id}:${t.title}`));
    const existingIds = new Set(savedTasks.map((t) => t.athlete_id));

    // Active saved tasks
    const active: PlannerItem[] = savedTasks
      .filter((t) => t.status !== "done" && t.status !== "cancelled")
      .map((t) => ({
        id: t.id,
        athleteId: t.athlete_id,
        athleteName: athletes.find((a) => a.id === t.athlete_id)?.name ?? "Unknown",
        title: t.title,
        reason: t.description || "",
        suggestedDay: t.suggested_day || "Monday",
        priority: t.priority,
        source: "saved" as const,
      }));

    // Generate smart tasks
    const generated = generateTasks(athletes, reviews, existingIds);

    // Filter out generated tasks that match completed saved tasks
    const newGenerated: PlannerItem[] = generated
      .filter((g) => !savedIds.has(`${g.athleteId}:${g.title}`))
      // Also filter out if we already have an active saved task with same title for same athlete
      .filter((g) => !active.some((a) => a.athleteId === g.athleteId && a.title === g.title))
      .map((g, i) => ({
        ...g,
        id: `gen-${i}`,
        source: "generated" as const,
      }));

    return [...active, ...newGenerated].sort((a, b) => a.priority - b.priority);
  }, [savedTasks, athletes, reviews]);

  const handleComplete = useCallback(
    async (item: PlannerItem) => {
      setCompleting((prev) => new Set(prev).add(item.id));
      try {
        if (item.source === "saved") {
          // Update existing task
          await supabase
            .from("athlete_tasks")
            .update({
              status: "done" as any,
              completed_at: new Date().toISOString(),
              completed_by: user?.id || null,
            })
            .eq("id", item.id);
        } else {
          // Save as completed task
          await supabase.from("athlete_tasks").insert({
            athlete_id: item.athleteId,
            title: item.title,
            description: item.reason,
            priority: item.priority,
            suggested_day: item.suggestedDay,
            owner_type: "agent" as any,
            status: "done" as any,
            completed_at: new Date().toISOString(),
            completed_by: user?.id || null,
            created_by: user?.id || null,
          });
        }

        // Remove from UI
        setSavedTasks((prev) => {
          if (item.source === "saved") {
            return prev.map((t) => (t.id === item.id ? { ...t, status: "done" } : t));
          }
          return [
            ...prev,
            {
              id: crypto.randomUUID(),
              athlete_id: item.athleteId,
              title: item.title,
              description: item.reason,
              priority: item.priority,
              suggested_day: item.suggestedDay,
              status: "done",
            },
          ];
        });

        toast.success(`"${item.title}" completed`);
      } catch {
        toast.error("Failed to complete task");
      } finally {
        setCompleting((prev) => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
      }
    },
    [user?.id]
  );

  // Group by day
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

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CalendarDays className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Weekly Planner</CardTitle>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{getWeekLabel()}</span>
            {totalItems > 0 && (
              <Badge variant="secondary" className="text-xs">
                {totalItems} item{totalItems !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {totalItems === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            All caught up — no pressing tasks this week.
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-3 min-h-[280px]">
            {DAYS.map((day) => {
              const items = byDay[day];
              const today = new Date();
              const dayIndex = DAYS.indexOf(day);
              const currentDayIndex = (today.getDay() + 6) % 7; // 0=Mon
              const isToday = dayIndex === currentDayIndex && currentDayIndex < 5;

              return (
                <div
                  key={day}
                  className={`rounded-lg border p-3 flex flex-col ${
                    isToday
                      ? "border-primary/50 bg-primary/5"
                      : "border-border bg-muted/20"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <p
                      className={`text-xs font-semibold uppercase tracking-wide ${
                        isToday ? "text-primary" : "text-muted-foreground"
                      }`}
                    >
                      {day.slice(0, 3)}
                    </p>
                    {items.length > 0 && (
                      <span className="text-[10px] text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">
                        {items.length}
                      </span>
                    )}
                  </div>
                  <div className="space-y-2 flex-1 overflow-y-auto max-h-[400px]">
                    {items.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground/60 text-center mt-4">
                        No tasks
                      </p>
                    ) : (
                      items.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-md border bg-card p-2.5 space-y-1.5 hover:shadow-sm transition"
                        >
                          <div className="flex items-start gap-2">
                            <div className="pt-0.5 shrink-0">
                              {completing.has(item.id) ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                              ) : (
                                <Checkbox
                                  onCheckedChange={() => handleComplete(item)}
                                  className="h-3.5 w-3.5"
                                />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-semibold leading-tight">
                                  {item.athleteName}
                                </span>
                                {priorityBadge(item.priority)}
                              </div>
                              <p className="text-[11px] leading-snug mt-0.5">
                                {item.title}
                              </p>
                              {item.reason && (
                                <p className="text-[10px] text-muted-foreground leading-snug mt-0.5 line-clamp-2">
                                  {item.reason}
                                </p>
                              )}
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
