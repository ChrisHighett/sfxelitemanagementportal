import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Mail, Copy, ChevronDown, ChevronUp, User, Users, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface CommsEntry {
  id: string;
  athlete_id: string;
  email_type: string;
  subject: string;
  body: string;
  generated_from: string | null;
  sent_status: string;
  created_at: string;
}

interface Props {
  athleteId: string;
  athleteName: string;
}

export default function CommsHistory({ athleteId, athleteName }: Props) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<CommsEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "athlete" | "parent">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("comms_history")
      .select("*")
      .eq("athlete_id", athleteId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Error fetching comms history:", error);
    } else {
      setEntries((data as CommsEntry[]) || []);
    }
    setLoading(false);
  }, [athleteId]);

  useEffect(() => {
    setEntries([]);
    setLoading(true);
    setExpandedId(null);
    fetchHistory();
  }, [athleteId, fetchHistory]);

  const filtered = filter === "all" ? entries : entries.filter(e => e.email_type === filter);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const handleCopy = (entry: CommsEntry) => {
    const text = entry.subject ? `Subject: ${entry.subject}\n\n${entry.body}` : entry.body;
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const handleMarkSent = async (id: string) => {
    const { error } = await supabase
      .from("comms_history")
      .update({ sent_status: "sent" })
      .eq("id", id);
    if (error) {
      toast.error("Failed to update status");
    } else {
      setEntries(prev => prev.map(e => e.id === id ? { ...e, sent_status: "sent" } : e));
      toast.success("Marked as sent");
    }
  };

  const getPreview = (body: string) => {
    const lines = body.split("\n").filter(l => l.trim());
    return lines.slice(0, 2).join(" ").slice(0, 120) + (lines.join(" ").length > 120 ? "…" : "");
  };

  return (
    <div className="space-y-3">
      {/* Filter pills */}
      <div className="flex gap-2">
        {(["all", "athlete", "parent"] as const).map(f => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "default" : "outline"}
            className="h-8 text-xs capitalize"
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "All" : f === "athlete" ? "Athlete" : "Parent"}
          </Button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground self-center">
          {filtered.length} {filtered.length === 1 ? "email" : "emails"}
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-sm text-muted-foreground">
          <Mail className="h-8 w-8 mx-auto mb-2 opacity-40" />
          No emails generated yet for {athleteName}.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(entry => {
            const isOpen = expandedId === entry.id;
            return (
              <Collapsible key={entry.id} open={isOpen} onOpenChange={() => setExpandedId(isOpen ? null : entry.id)}>
                <div className="rounded-lg border bg-card overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <button className="w-full text-left p-3 flex items-start gap-3 hover:bg-muted/30 transition-colors">
                      <div className="mt-0.5 shrink-0">
                        {entry.email_type === "parent" ? (
                          <Users className="h-4 w-4 text-primary" />
                        ) : (
                          <User className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary" className="text-[10px] capitalize">
                            {entry.email_type}
                          </Badge>
                          {entry.sent_status === "sent" ? (
                            <Badge variant="default" className="text-[10px] bg-green-600">Sent</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">Draft</Badge>
                          )}
                        </div>
                        <div className="font-medium text-sm truncate">
                          {entry.subject || "No subject"}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{getPreview(entry.body)}</p>
                        <span className="text-[10px] text-muted-foreground">{formatDate(entry.created_at)}</span>
                      </div>
                      <div className="shrink-0 mt-1">
                        {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </div>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="border-t px-3 py-3 space-y-3">
                      <div className="whitespace-pre-wrap text-sm bg-muted/40 p-3 rounded-md max-h-[400px] overflow-y-auto">
                        {entry.body}
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => handleCopy(entry)}>
                          <Copy className="h-3.5 w-3.5" />
                          Copy
                        </Button>
                        {entry.sent_status !== "sent" && (
                          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => handleMarkSent(entry.id)}>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Mark as Sent
                          </Button>
                        )}
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Utility to auto-save a generated email to comms_history */
export async function saveCommsEmail({
  athleteId,
  emailType,
  subject,
  body,
  generatedFrom = "call",
  createdBy,
}: {
  athleteId: string;
  emailType: "athlete" | "parent";
  subject: string;
  body: string;
  generatedFrom?: string;
  createdBy?: string;
}) {
  const { error } = await supabase.from("comms_history").insert({
    athlete_id: athleteId,
    email_type: emailType,
    subject,
    body,
    generated_from: generatedFrom,
    created_by: createdBy || null,
  });
  if (error) {
    console.error("Failed to save comms history:", error);
  }
}
