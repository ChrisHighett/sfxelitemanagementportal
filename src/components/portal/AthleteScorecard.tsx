import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useMonthlyReviews, type Athlete } from "@/hooks/usePortalData";

function ScoreBar({ label, score }: { label: string; score: number }) {
  const pct = Math.min(100, Math.max(0, (score / 5) * 100));
  const color = score >= 4 ? "text-accent" : score >= 3 ? "text-primary" : "text-destructive";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className={`font-semibold ${color}`}>{score.toFixed(1)}/5</span>
      </div>
      <Progress value={pct} className="h-2" />
    </div>
  );
}

// Map text notes to a simple 1–5 score heuristic
function noteToScore(note: string | undefined): number {
  if (!note || note === "—") return 3;
  const lower = note.toLowerCase();
  const positives = ["excellent", "outstanding", "great", "strong", "thriving", "impressive", "exceptional"];
  const negatives = ["poor", "struggling", "concern", "needs support", "declined", "weak", "issue"];
  if (positives.some((p) => lower.includes(p))) return 5;
  if (negatives.some((n) => lower.includes(n))) return 2;
  if (lower.includes("good") || lower.includes("solid") || lower.includes("progress")) return 4;
  if (lower.includes("average") || lower.includes("ok") || lower.includes("developing")) return 3;
  return 3;
}

export default function AthleteScorecard({ athlete }: { athlete: Athlete }) {
  const { data: reviews = [] } = useMonthlyReviews(athlete.id);
  const latest = reviews[0];

  const scores = {
    performance: noteToScore(latest?.performance),
    lifestyle: noteToScore(latest?.lifestyle),
    personal: noteToScore(latest?.personal),
    education: noteToScore(latest?.education),
    brand: noteToScore(latest?.brand),
  };

  const overall = Object.values(scores).reduce((a, b) => a + b, 0) / 5;
  const overallPct = (overall / 5) * 100;

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Athlete Scorecard — {athlete.name}</CardTitle>
            <Badge variant={overall >= 4 ? "default" : overall >= 3 ? "secondary" : "destructive"}>
              Overall: {overall.toFixed(1)}/5
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Overall ring */}
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

          {/* Latest review context */}
          {latest && (
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
              <div className="text-xs text-muted-foreground uppercase font-medium">Based on {latest.month} review</div>
              <div><span className="font-medium">Focus:</span> {latest.focus}</div>
              <div><span className="font-medium">Wellbeing:</span> {latest.wellbeingScore}/5</div>
              {latest.attentionRequired && (
                <Badge variant="destructive" className="mt-1">⚠ Attention Required</Badge>
              )}
            </div>
          )}

          {!latest && (
            <p className="text-sm text-muted-foreground">No monthly reviews available to generate scorecard.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
