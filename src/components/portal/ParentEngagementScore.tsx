import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";
import { type Athlete } from "@/hooks/usePortalData";

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
  const { data: scores = [], isLoading } = useQuery({
    queryKey: ["parent_engagement_scores", athlete.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parent_engagement_scores")
        .select("*")
        .eq("athlete_id", athlete.id)
        .order("review_month", { ascending: false })
        .limit(1);
      if (error) throw error;
      return data;
    },
  });

  const latest = scores[0];

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!latest) {
    return (
      <div className="space-y-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle>Parent Engagement — {athlete.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center py-6">
              No parent engagement scores recorded yet.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const overall = latest.engagement_score;
  const overallPct = (overall / 5) * 100;
  const responsiveness = latest.responsiveness_score ?? 0;
  const trust = latest.trust_score ?? 0;
  const involvement = latest.involvement_score ?? 0;

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Parent Engagement — {athlete.name}</CardTitle>
            <Badge variant={overall >= 4 ? "default" : overall >= 3 ? "secondary" : "destructive"}>
              {overall}/5
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
                <span className="text-xl font-bold">{overall}</span>
              </div>
            </div>
            <div className="flex-1 space-y-2">
              {[
                { label: "Engagement Score", score: overall },
                { label: "Responsiveness", score: responsiveness },
                { label: "Trust", score: trust },
                { label: "Involvement", score: involvement },
              ].filter(item => item.score > 0).map((item) => (
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
                label="Engagement Level"
                value={latest.engagement_level ?? "—"}
                positive={overall >= 3}
              />
              <IndicatorRow
                label="Review Month"
                value={new Date(latest.review_month).toISOString().slice(0, 7)}
                positive={true}
              />
            </CardContent>
          </Card>

          {/* Notes */}
          {latest.notes && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Notes</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{latest.notes}</p>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
