import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Loader2, CheckCircle2, Building2 } from "lucide-react";
import { toast } from "sonner";
import { type Athlete } from "@/hooks/usePortalData";

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

  const { data: clubCalls = [] } = useQuery({
    queryKey: ["club_calls_for_alerts", athleteIds],
    queryFn: async () => {
      if (athleteIds.length === 0) return [];
      // Only club-category conversations should drive the 56-day check-in alert.
      const { data, error } = await supabase
        .from("call_history")
        .select("athlete_id, call_date, conversation_category, call_type")
        .in("athlete_id", athleteIds)
        .eq("call_type", "club_conversation" as any)
        .order("call_date", { ascending: false });
      if (error) throw error;
      return (data || []).filter((c: any) => {
        const cat = c.conversation_category || "club";
        return cat === "club";
      });
    },
    enabled: athleteIds.length > 0,
  });

  const clubCheckInAlerts = useMemo(() => {
    const latestPerAthlete: Record<string, string> = {};
    for (const call of clubCalls) {
      if (!latestPerAthlete[call.athlete_id]) {
        latestPerAthlete[call.athlete_id] = call.call_date;
      }
    }

    return athletes
      .map((a) => {
        const lastCall = latestPerAthlete[a.id];
        if (!lastCall) return null;
        const days = Math.floor((Date.now() - new Date(lastCall).getTime()) / (1000 * 60 * 60 * 24));
        if (days < 56) return null;
        return {
          id: `club-${a.id}`,
          athleteId: a.id,
          athleteName: a.name,
          severity: days >= 84 ? "high" : "medium",
          title: `Club check-in overdue — ${a.name}`,
          description: `Last club conversation was ${days} days ago (${Math.floor(days / 7)} weeks). Call ${a.name}'s club for a development update.`,
          alert_type: "club_check_in",
          isClientSide: true,
        };
      })
      .filter(Boolean) as Array<{
        id: string;
        athleteId: string;
        athleteName: string;
        severity: string;
        title: string;
        description: string;
        alert_type: string;
        isClientSide: boolean;
      }>;
  }, [athletes, clubCalls]);

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

  const allAlerts = [...alerts, ...clubCheckInAlerts];
  const critical = allAlerts.filter((a) => a.severity === "critical" || a.severity === "high");
  const warnings = allAlerts.filter((a) => a.severity === "medium");

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
          {allAlerts.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-2xl mb-2">✅</div>
              <p className="text-sm text-muted-foreground">All athletes are tracking well. No open alerts.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {allAlerts.map((alert) => {
                const athleteName = (alert as any).athletes
                  ? `${(alert as any).athletes.first_name} ${(alert as any).athletes.last_name}`
                  : (alert as any).athleteName || "Unknown";
                const isClientSide = (alert as any).isClientSide;
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
                        <Badge variant="outline" className="text-xs capitalize">
                          {(alert as any).alert_type === "club_check_in"
                            ? "club check-in"
                            : String((alert as any).alert_type).replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">{alert.title}</p>
                      {alert.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{alert.description}</p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (isClientSide) {
                          window.location.hash = `athlete-${(alert as any).athleteId}-comms`;
                          toast.info("Open the athlete's Comms tab to log a club conversation.");
                        } else {
                          resolveAlert.mutate(alert.id);
                        }
                      }}
                      className="gap-1 shrink-0"
                    >
                      {isClientSide ? (
                        <><Building2 className="h-3.5 w-3.5" /> Log call</>
                      ) : (
                        <><CheckCircle2 className="h-3.5 w-3.5" /> Resolve</>
                      )}
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
