import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useMonthlyReviews, useCommsLog, type Athlete } from "@/hooks/usePortalData";

function IndicatorRow({ label, value, positive }: { label: string; value: string; positive: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{value}</span>
        <div className={`h-2.5 w-2.5 rounded-full ${positive ? "bg-accent" : "bg-destructive"}`} />
      </div>
    </div>
  );
}

export default function ParentEngagementScore({ athlete }: { athlete: Athlete }) {
  const { data: comms = [] } = useCommsLog(athlete.id);
  const { data: reviews = [] } = useMonthlyReviews(athlete.id);

  const metrics = useMemo(() => {
    const parentComms = comms.filter((c) => c.recipient === "parent");
    const now = Date.now();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;

    // Recent comms in last 30 days
    const recentComms = parentComms.filter((c) => {
      const d = new Date(c.sentAt).getTime();
      return now - d < thirtyDays;
    });

    // Frequency score (0-5)
    const frequencyScore = Math.min(5, recentComms.length >= 4 ? 5 : recentComms.length >= 2 ? 4 : recentComms.length >= 1 ? 3 : parentComms.length > 0 ? 2 : 1);

    // Recency score
    const lastComm = parentComms.length > 0 ? new Date(parentComms[0].sentAt).getTime() : 0;
    const daysSince = lastComm ? Math.floor((now - lastComm) / (24 * 60 * 60 * 1000)) : 999;
    const recencyScore = daysSince <= 7 ? 5 : daysSince <= 14 ? 4 : daysSince <= 30 ? 3 : daysSince <= 60 ? 2 : 1;

    // Engagement notes from reviews
    const engagementNotes = reviews.filter((r) => r.parentEngagementNotes && r.parentEngagementNotes !== "—").length;
    const engagementScore = Math.min(5, engagementNotes >= 3 ? 5 : engagementNotes >= 2 ? 4 : engagementNotes >= 1 ? 3 : 2);

    // Total comms history
    const historyScore = Math.min(5, parentComms.length >= 10 ? 5 : parentComms.length >= 5 ? 4 : parentComms.length >= 2 ? 3 : parentComms.length >= 1 ? 2 : 1);

    // Responsiveness (proxy: if there are comms in multiple months)
    const uniqueMonths = new Set(parentComms.map((c) => c.sentAt.slice(0, 7)));
    const responsivenessScore = Math.min(5, uniqueMonths.size >= 4 ? 5 : uniqueMonths.size >= 2 ? 4 : uniqueMonths.size >= 1 ? 3 : 1);

    const overall = (frequencyScore + recencyScore + engagementScore + historyScore + responsivenessScore) / 5;

    return {
      overall: Math.round(overall * 10) / 10,
      frequency: frequencyScore,
      recency: recencyScore,
      engagement: engagementScore,
      history: historyScore,
      responsiveness: responsivenessScore,
      totalComms: parentComms.length,
      recentCount: recentComms.length,
      daysSinceContact: daysSince < 999 ? daysSince : null,
      latestNote: reviews.find((r) => r.parentEngagementNotes && r.parentEngagementNotes !== "—")?.parentEngagementNotes,
    };
  }, [comms, reviews]);

  const overallPct = (metrics.overall / 5) * 100;

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Parent Engagement — {athlete.name}</CardTitle>
            <Badge variant={metrics.overall >= 4 ? "default" : metrics.overall >= 3 ? "secondary" : "destructive"}>
              {metrics.overall}/5
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Overall score ring */}
          <div className="flex items-center gap-6">
            <div className="relative h-24 w-24 shrink-0">
              <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                <circle
                  cx="50" cy="50" r="42" fill="none"
                  stroke="hsl(var(--accent))"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${overallPct * 2.64} 264`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold">{metrics.overall}</span>
              </div>
            </div>
            <div className="flex-1 space-y-2">
              {[
                { label: "Communication Frequency", score: metrics.frequency },
                { label: "Recency of Contact", score: metrics.recency },
                { label: "Agent Engagement Notes", score: metrics.engagement },
                { label: "Comms History Depth", score: metrics.history },
                { label: "Responsiveness", score: metrics.responsiveness },
              ].map((item) => (
                <div key={item.label} className="space-y-0.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-medium">{item.score}/5</span>
                  </div>
                  <Progress value={(item.score / 5) * 100} className="h-1.5" />
                </div>
              ))}
            </div>
          </div>

          {/* Indicators */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Engagement Indicators</CardTitle></CardHeader>
            <CardContent>
              <IndicatorRow
                label="Total parent communications"
                value={String(metrics.totalComms)}
                positive={metrics.totalComms >= 3}
              />
              <IndicatorRow
                label="Comms in last 30 days"
                value={String(metrics.recentCount)}
                positive={metrics.recentCount >= 1}
              />
              <IndicatorRow
                label="Days since last contact"
                value={metrics.daysSinceContact !== null ? `${metrics.daysSinceContact} days` : "No contact"}
                positive={metrics.daysSinceContact !== null && metrics.daysSinceContact <= 14}
              />
            </CardContent>
          </Card>

          {/* Latest engagement note */}
          {metrics.latestNote && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Latest Engagement Note</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{metrics.latestNote}</p>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
