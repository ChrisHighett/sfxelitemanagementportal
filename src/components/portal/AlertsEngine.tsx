import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { type Athlete } from "@/hooks/usePortalData";

type Severity = "critical" | "warning" | "info";

interface AlertItem {
  athlete: string;
  athleteId: string;
  message: string;
  severity: Severity;
  category: string;
}

function severityBadge(severity: Severity) {
  const map: Record<Severity, "destructive" | "secondary" | "default"> = {
    critical: "destructive",
    warning: "secondary",
    info: "default",
  };
  return <Badge variant={map[severity]}>{severity.toUpperCase()}</Badge>;
}

export default function AlertsEngine({ athletes }: { athletes: Athlete[] }) {
  const alerts: AlertItem[] = [];

  athletes.forEach((a) => {
    // Wellbeing alerts
    if (a.wellbeingScore <= 2) {
      alerts.push({
        athlete: a.name, athleteId: a.id,
        message: `Wellbeing score critically low (${a.wellbeingScore}/5)`,
        severity: "critical", category: "Wellbeing",
      });
    } else if (a.wellbeingScore === 3) {
      alerts.push({
        athlete: a.name, athleteId: a.id,
        message: `Wellbeing score at monitoring level (${a.wellbeingScore}/5)`,
        severity: "warning", category: "Wellbeing",
      });
    }

    // Status alerts
    if (a.status === "Needs Support") {
      alerts.push({
        athlete: a.name, athleteId: a.id,
        message: "Status: Needs Support — immediate attention required",
        severity: "critical", category: "Status",
      });
    } else if (a.status === "Monitoring") {
      alerts.push({
        athlete: a.name, athleteId: a.id,
        message: "Status: Monitoring — keep watch",
        severity: "warning", category: "Status",
      });
    }

    // Contract alerts
    const now = new Date();
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    if (a.managementContractExpiry) {
      const d = new Date(a.managementContractExpiry);
      if (d >= now && d <= thirtyDays) {
        alerts.push({
          athlete: a.name, athleteId: a.id,
          message: `Management contract expires ${a.managementContractExpiry}`,
          severity: d <= new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000) ? "critical" : "warning",
          category: "Contract",
        });
      }
    }
    if (a.clubContractExpiry) {
      const d = new Date(a.clubContractExpiry);
      if (d >= now && d <= thirtyDays) {
        alerts.push({
          athlete: a.name, athleteId: a.id,
          message: `Club contract expires ${a.clubContractExpiry}`,
          severity: d <= new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000) ? "critical" : "warning",
          category: "Contract",
        });
      }
    }
  });

  // Sort by severity
  const order: Record<Severity, number> = { critical: 0, warning: 1, info: 2 };
  alerts.sort((a, b) => order[a.severity] - order[b.severity]);

  const critical = alerts.filter((a) => a.severity === "critical");
  const warnings = alerts.filter((a) => a.severity === "warning");

  return (
    <div className="space-y-6 p-6">
      {critical.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{critical.length} Critical Alert{critical.length !== 1 ? "s" : ""}</AlertTitle>
          <AlertDescription>Immediate attention required for the athletes listed below.</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Alerts Engine</CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium text-destructive">{critical.length}</span> critical
              <span className="text-muted-foreground">•</span>
              <span className="font-medium">{warnings.length}</span> warning
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-2xl mb-2">✅</div>
              <p className="text-sm text-muted-foreground">All athletes are tracking well. No alerts.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.map((alert, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between rounded-lg border p-3 ${
                    alert.severity === "critical"
                      ? "border-destructive/30 bg-destructive/5"
                      : alert.severity === "warning"
                      ? "border-border bg-muted/30"
                      : ""
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{alert.athlete}</span>
                        {severityBadge(alert.severity)}
                        <Badge variant="outline" className="text-xs">{alert.category}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">{alert.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
