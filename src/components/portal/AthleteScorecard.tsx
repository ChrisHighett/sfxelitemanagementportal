import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { type Athlete } from "@/hooks/usePortalData";

function ScoreBar({ label, score }: { label: string; score: number }) {
  const pct = Math.min(100, Math.max(0, (score / 5) * 100));
  const color = score >= 4 ? "text-accent" : score >= 3 ? "text-primary" : "text-destructive";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className={`font-semibold ${color}`}>{score}/5</span>
      </div>
      <Progress value={pct} className="h-2" />
    </div>
  );
}

export default function AthleteScorecard({ athlete }: { athlete: Athlete }) {
  const { data: scorecards = [], isLoading } = useQuery({
    queryKey: ["athlete_scorecards", athlete.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("athlete_scorecards")
        .select("*")
        .eq("athlete_id", athlete.id)
        .order("review_month", { ascending: false })
        .limit(1);
      if (error) throw error;
      return data;
    },
  });

  const latest = scorecards[0];

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const scores = latest
    ? {
        performance: latest.performance_score,
        lifestyle: latest.lifestyle_score,
        personal: latest.personal_score,
        education: latest.education_score,
        brand: latest.brand_score,
      }
    : { performance: 0, lifestyle: 0, personal: 0, education: 0, brand: 0 };

  const overall = latest ? Number(latest.overall_score) : 0;
  const overallPct = (overall / 5) * 100;

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Athlete Scorecard — {athlete.name}</CardTitle>
            {latest && (
              <Badge variant={overall >= 4 ? "default" : overall >= 3 ? "secondary" : "destructive"}>
                Overall: {overall.toFixed(1)}/5
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {latest ? (
            <>
              <div className="flex items-center gap-6">
                <div className="relative h-24 w-24 shrink-0">
                  <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                    <circle
                      cx="50" cy="50" r="42" fill="none"
                      stroke="hsl(var(--primary))"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${overallPct * 2.64} 264`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl font-bold">{overall.toFixed(1)}</span>
                  </div>
                </div>
                <div className="flex-1 space-y-3">
                  <ScoreBar label="Performance" score={scores.performance} />
                  <ScoreBar label="Lifestyle" score={scores.lifestyle} />
                  <ScoreBar label="Personal" score={scores.personal} />
                  <ScoreBar label="Education" score={scores.education} />
                  <ScoreBar label="Brand" score={scores.brand} />
                </div>
              </div>

              <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
                <div className="text-xs text-muted-foreground uppercase font-medium">
                  Based on {new Date(latest.review_month).toISOString().slice(0, 7)} scorecard
                </div>
                {latest.scoring_notes && (
                  <div><span className="font-medium">Notes:</span> {latest.scoring_notes}</div>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No scorecards available yet. Create one from a monthly review.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
