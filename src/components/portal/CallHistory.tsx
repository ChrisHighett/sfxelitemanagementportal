import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Loader2 } from "lucide-react";
import { type Athlete } from "@/hooks/usePortalData";

export default function CallHistory({ athlete }: { athlete: Athlete }) {
  const { data: calls = [], isLoading } = useQuery({
    queryKey: ["call_history", athlete.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("call_history")
        .select("*")
        .eq("athlete_id", athlete.id)
        .order("call_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Call History — {athlete.name}</CardTitle>
            <Badge variant="secondary">{calls.length} call{calls.length !== 1 ? "s" : ""}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : calls.length === 0 ? (
            <div className="text-center py-8">
              <Phone className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No calls recorded yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {calls.map((call) => (
                <div key={call.id} className="rounded-lg border p-4 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">
                        {new Date(call.call_date).toLocaleDateString("en-AU", {
                          year: "numeric", month: "short", day: "numeric",
                        })}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {call.call_type.replace("_", " ")}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {call.duration_minutes != null && (
                        <span className="text-xs text-muted-foreground">⏱ {call.duration_minutes} min</span>
                      )}
                      {call.follow_up_required && (
                        <Badge variant="destructive" className="text-xs">Follow-up needed</Badge>
                      )}
                      {call.parent_involved && (
                        <Badge variant="secondary" className="text-xs">Parent involved</Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{call.summary}</p>
                  {call.outcome && (
                    <p className="text-xs text-muted-foreground"><span className="font-medium">Outcome:</span> {call.outcome}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
