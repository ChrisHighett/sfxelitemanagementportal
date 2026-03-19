import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { type Athlete } from "@/hooks/usePortalData";

type Severity = "low" | "medium" | "high" | "critical";

function severityBadge(severity: string) {
  const map: Record<string, "destructive" | "secondary" | "default"> = {
    critical: "destructive",
    high: "destructive",
    medium: "secondary",
    low: "default",
  };
  return <Badge variant={map[severity] ?? "default"}>{severity.toUpperCase()}</Badge>;
}

export default function AlertsEngine({ athletes }: { athletes: Athlete[] }) {
  const queryClient = useQueryClient();
  const athleteIds = athletes.map((a) => a.id);

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ["athlete_alerts", athleteIds],
    queryFn: async () => {
      if (athleteIds.length === 0) return [];
      const { data, error } = await supabase
        .from("athlete_alerts")
        .select("*, athletes!inner(first_name, last_name)")
        .in("athlete_id", athleteIds)
        .in("status", ["open", "in_progress"])
        .order("triggered_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: athleteIds.length > 0,
  });

  const resolveAlert = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from("athlete_alerts")
        .update({ status: "resolved" as any, resolved_at: new Date().toISOString() })
        .eq("id", alertId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["athlete_alerts"] });
      toast.success("Alert resolved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const critical = alerts.filter((a) => a.severity === "critical" || a.severity === "high");
  const warnings = alerts.filter((a) => a.severity === "medium");

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {critical.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{critical.length} Critical/High Alert{critical.length !== 1 ? "s" : ""}</AlertTitle>
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
              <p className="text-sm text-muted-foreground">All athletes are tracking well. No open alerts.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.map((alert) => {
                const athleteName = (alert as any).athletes
                  ? `${(alert as any).athletes.first_name} ${(alert as any).athletes.last_name}`
                  : "Unknown";
                return (
                  <div
                    key={alert.id}
                    className={`flex items-center justify-between rounded-lg border p-3 ${
                      alert.severity === "critical" || alert.severity === "high"
                        ? "border-destructive/30 bg-destructive/5"
                        : alert.severity === "medium"
                        ? "border-border bg-muted/30"
                        : ""
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{athleteName}</span>
                        {severityBadge(alert.severity)}
                        <Badge variant="outline" className="text-xs">{alert.alert_type.replace("_", " ")}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">{alert.title}</p>
                      {alert.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{alert.description}</p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => resolveAlert.mutate(alert.id)}
                      className="gap-1 shrink-0"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Resolve
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
