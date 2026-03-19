import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone } from "lucide-react";
import { useMonthlyReviews, useCommsLog, type Athlete } from "@/hooks/usePortalData";

export default function CallHistory({ athlete }: { athlete: Athlete }) {
  const { data: reviews = [] } = useMonthlyReviews(athlete.id);
  const { data: comms = [] } = useCommsLog(athlete.id);

  // Build call entries from monthly reviews (which have call_date) and comms_log transcripts
  const callEntries = reviews
    .filter((r) => r.callDate)
    .map((r) => ({
      date: r.callDate!,
      duration: r.callDuration || "—",
      summary: r.performance !== "—" ? `${r.performance} | Focus: ${r.focus}` : r.focus,
      outcome: r.attentionRequired ? "Attention Required" : "On Track",
      source: "review" as const,
      month: r.month,
    }));

  // Also include call transcripts from comms_log
  const transcriptCalls = comms
    .filter((c) => c.subject.toLowerCase().includes("call transcript"))
    .map((c) => ({
      date: c.sentAt.split(",")[0] || c.sentAt,
      duration: "—",
      summary: c.body.slice(0, 200) + (c.body.length > 200 ? "…" : ""),
      outcome: "Logged",
      source: "comms" as const,
      month: "",
    }));

  const allCalls = [...callEntries, ...transcriptCalls].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Call History — {athlete.name}</CardTitle>
            <Badge variant="secondary">{allCalls.length} call{allCalls.length !== 1 ? "s" : ""}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {allCalls.length === 0 ? (
            <div className="text-center py-8">
              <Phone className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No calls recorded yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {allCalls.map((call, idx) => (
                <div key={idx} className="rounded-lg border p-4 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">{call.date}</span>
                      {call.month && <Badge variant="outline" className="text-xs">{call.month}</Badge>}
                    </div>
                    <div className="flex items-center gap-2">
                      {call.duration !== "—" && (
                        <span className="text-xs text-muted-foreground">⏱ {call.duration}</span>
                      )}
                      <Badge variant={call.outcome === "Attention Required" ? "destructive" : "default"}>
                        {call.outcome}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{call.summary}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
