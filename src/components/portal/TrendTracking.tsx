import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useMonthlyReviews, type Athlete } from "@/hooks/usePortalData";

function TrendIndicator({ current, previous }: { current: number; previous: number | null }) {
  if (previous === null) return <span className="text-xs text-muted-foreground">—</span>;
  const diff = current - previous;
  if (diff > 0) return <span className="text-xs font-medium text-accent">▲ +{diff.toFixed(1)}</span>;
  if (diff < 0) return <span className="text-xs font-medium text-destructive">▼ {diff.toFixed(1)}</span>;
  return <span className="text-xs text-muted-foreground">→ No change</span>;
}

function noteToScore(note: string | undefined): number {
  if (!note || note === "—") return 3;
  const lower = note.toLowerCase();
  if (["excellent", "outstanding", "great", "strong", "thriving", "impressive"].some((p) => lower.includes(p))) return 5;
  if (["poor", "struggling", "concern", "needs support", "declined"].some((n) => lower.includes(n))) return 2;
  if (["good", "solid", "progress"].some((w) => lower.includes(w))) return 4;
  return 3;
}

export default function TrendTracking({ athlete }: { athlete: Athlete }) {
  const { data: reviews = [] } = useMonthlyReviews(athlete.id);

  // Build monthly data (most recent first, reversed for display)
  const monthlyData = reviews.slice(0, 12).reverse().map((r) => ({
    month: r.month,
    wellbeing: r.wellbeingScore,
    performance: noteToScore(r.performance),
  }));

  const latest = reviews[0];
  const previous = reviews[1] || null;

  const wellbeingTrend = latest && previous ? latest.wellbeingScore - previous.wellbeingScore : 0;
  const perfTrend = latest && previous ? noteToScore(latest.performance) - noteToScore(previous?.performance) : 0;

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Trend Tracking — {athlete.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Summary cards */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Wellbeing Trend</div>
                  <TrendIndicator current={latest?.wellbeingScore ?? 3} previous={previous?.wellbeingScore ?? null} />
                </div>
                <div className="text-2xl font-bold">{latest?.wellbeingScore ?? "—"}/5</div>
                <Progress value={((latest?.wellbeingScore ?? 3) / 5) * 100} className="h-2" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Performance Trend</div>
                  <TrendIndicator current={noteToScore(latest?.performance)} previous={previous ? noteToScore(previous.performance) : null} />
                </div>
                <div className="text-2xl font-bold">{noteToScore(latest?.performance)}/5</div>
                <Progress value={(noteToScore(latest?.performance) / 5) * 100} className="h-2" />
              </CardContent>
            </Card>
          </div>

          {/* Monthly bars chart */}
          {monthlyData.length > 0 ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Monthly Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {monthlyData.map((m) => (
                    <div key={m.month} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium">{m.month}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground">W: {m.wellbeing}/5</span>
                          <span className="text-muted-foreground">P: {m.performance}/5</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <div className="text-[10px] text-muted-foreground mb-0.5">Wellbeing</div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary transition-all"
                              style={{ width: `${(m.wellbeing / 5) * 100}%` }}
                            />
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="text-[10px] text-muted-foreground mb-0.5">Performance</div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-accent transition-all"
                              style={{ width: `${(m.performance / 5) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <p className="text-sm text-muted-foreground">No review data available for trend analysis.</p>
          )}

          {/* Status summary */}
          <div className="flex flex-wrap gap-2">
            <Badge variant={wellbeingTrend > 0 ? "default" : wellbeingTrend < 0 ? "destructive" : "secondary"}>
              Wellbeing {wellbeingTrend > 0 ? "improving" : wellbeingTrend < 0 ? "declining" : "stable"}
            </Badge>
            <Badge variant={perfTrend > 0 ? "default" : perfTrend < 0 ? "destructive" : "secondary"}>
              Performance {perfTrend > 0 ? "improving" : perfTrend < 0 ? "declining" : "stable"}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
