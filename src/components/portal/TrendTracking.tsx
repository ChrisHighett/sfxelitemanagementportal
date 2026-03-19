import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";
import { type Athlete } from "@/hooks/usePortalData";

function TrendIndicator({ current, previous }: { current: number; previous: number | null }) {
  if (previous === null) return <span className="text-xs text-muted-foreground">—</span>;
  const diff = current - previous;
  if (diff > 0) return <span className="text-xs font-medium text-accent">▲ +{diff.toFixed(1)}</span>;
  if (diff < 0) return <span className="text-xs font-medium text-destructive">▼ {diff.toFixed(1)}</span>;
  return <span className="text-xs text-muted-foreground">→ No change</span>;
}

export default function TrendTracking({ athlete }: { athlete: Athlete }) {
  // Fetch scorecard trends
  const { data: scorecards = [], isLoading: scLoading } = useQuery({
    queryKey: ["athlete_scorecards_trend", athlete.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("athlete_scorecards")
        .select("review_month, performance_score, lifestyle_score, personal_score, education_score, brand_score, overall_score")
        .eq("athlete_id", athlete.id)
        .order("review_month", { ascending: true })
        .limit(12);
      if (error) throw error;
      return data;
    },
  });

  // Fetch wellbeing trends from monthly_reviews
  const { data: wellbeingData = [], isLoading: wbLoading } = useQuery({
    queryKey: ["wellbeing_trend", athlete.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monthly_reviews")
        .select("review_month, wellbeing_score")
        .eq("athlete_id", athlete.id)
        .order("review_month", { ascending: true })
        .limit(12);
      if (error) throw error;
      return data;
    },
  });

  const isLoading = scLoading || wbLoading;

  // Combine monthly data
  const monthlyData = wellbeingData.map((w) => {
    const month = new Date(w.review_month).toISOString().slice(0, 7);
    const sc = scorecards.find((s) => new Date(s.review_month).toISOString().slice(0, 7) === month);
    return {
      month,
      wellbeing: w.wellbeing_score ?? 3,
      performance: sc?.performance_score ?? null,
      overall: sc ? Number(sc.overall_score) : null,
    };
  });

  const latestWb = wellbeingData.length > 0 ? wellbeingData[wellbeingData.length - 1] : null;
  const prevWb = wellbeingData.length > 1 ? wellbeingData[wellbeingData.length - 2] : null;
  const latestSc = scorecards.length > 0 ? scorecards[scorecards.length - 1] : null;
  const prevSc = scorecards.length > 1 ? scorecards[scorecards.length - 2] : null;

  const wellbeingTrend = latestWb && prevWb ? (latestWb.wellbeing_score ?? 0) - (prevWb.wellbeing_score ?? 0) : 0;
  const perfTrend = latestSc && prevSc ? latestSc.performance_score - prevSc.performance_score : 0;

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

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
                  <TrendIndicator
                    current={latestWb?.wellbeing_score ?? 3}
                    previous={prevWb?.wellbeing_score ?? null}
                  />
                </div>
                <div className="text-2xl font-bold">{latestWb?.wellbeing_score ?? "—"}/5</div>
                <Progress value={((latestWb?.wellbeing_score ?? 3) / 5) * 100} className="h-2" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Performance Trend</div>
                  <TrendIndicator
                    current={latestSc?.performance_score ?? 3}
                    previous={prevSc?.performance_score ?? null}
                  />
                </div>
                <div className="text-2xl font-bold">{latestSc?.performance_score ?? "—"}/5</div>
                <Progress value={((latestSc?.performance_score ?? 3) / 5) * 100} className="h-2" />
              </CardContent>
            </Card>
          </div>

          {/* Monthly bars */}
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
                          {m.performance !== null && <span className="text-muted-foreground">P: {m.performance}/5</span>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <div className="text-[10px] text-muted-foreground mb-0.5">Wellbeing</div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(m.wellbeing / 5) * 100}%` }} />
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="text-[10px] text-muted-foreground mb-0.5">Performance</div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${((m.performance ?? 0) / 5) * 100}%` }} />
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
