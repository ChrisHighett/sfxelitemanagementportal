import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Mail, MessageSquare, MessageCircle, ChevronDown, ChevronUp } from "lucide-react";
import { ArcLoader } from "@/components/brand/Brand";
import { EmptyState } from "@/components/brand/States";
import HeroBanner from "@/components/portal/ui/HeroBanner";

interface Entry {
  id: string;
  subject: string | null;
  body: string;
  channel: string | null;
  email_type: string;
  sent_status: string;
  created_at: string;
}

const CHANNEL_META: Record<string, { label: string; Icon: any; style: React.CSSProperties }> = {
  email:    { label: "Email",    Icon: Mail,          style: { background: "var(--brand-base-soft)", color: "var(--brand-accent)", borderColor: "var(--brand-base-line)" } },
  sms:      { label: "SMS",      Icon: MessageSquare, style: { background: "var(--win-soft)", color: "var(--win-deep)", borderColor: "var(--win-soft)" } },
  whatsapp: { label: "WhatsApp", Icon: MessageCircle, style: { background: "var(--success-soft)", color: "var(--success-deep)", borderColor: "var(--success-soft)" } },
};

interface Props {
  athleteId: string;
  /** "athlete" view shows athlete-addressed only; "parent" view shows parent-addressed only */
  audience: "athlete" | "parent";
  athleteName: string;
}

export default function FamilyCorrespondence({ athleteId, audience, athleteName }: Props) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setEntries([]);
    setExpandedId(null);
    (async () => {
      // RLS already restricts to sent + matching audience for this user,
      // but we filter client-side too for defence in depth.
      const { data, error } = await supabase
        .from("comms_history")
        .select("id, subject, body, channel, email_type, sent_status, created_at")
        .eq("athlete_id", athleteId)
        .eq("email_type", audience)
        .eq("sent_status", "sent")
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (error) {
        console.error("Failed to load correspondence", error);
        setEntries([]);
      } else {
        setEntries((data as Entry[]) || []);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [athleteId, audience]);

  const title = audience === "athlete" ? "Your updates" : `Updates about ${athleteName}`;
  const subtitle = audience === "athlete"
    ? "Messages sent to you by your agent"
    : "Messages sent to you about your child";

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const getPreview = (body: string) => {
    const lines = body.split("\n").filter(l => l.trim());
    const joined = lines.join(" ");
    return joined.slice(0, 140) + (joined.length > 140 ? "…" : "");
  };

  const emptyHint = useMemo(() => audience === "athlete"
    ? "No updates yet — your agent's messages to you will appear here."
    : `No updates yet — messages from your agent about ${athleteName} will appear here.`,
    [audience, athleteName]);

  return (
    <div className="space-y-5 p-4 md:p-6 max-w-4xl mx-auto">
      <HeroBanner title={title} subtitle={subtitle} size="sm" />

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <ArcLoader size={20} />
        </div>
      ) : entries.length === 0 ? (
        <EmptyState
          icon={<Mail className="h-5 w-5" />}
          title="Nothing here yet"
          hint={emptyHint}
        />
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => {
            const isOpen = expandedId === entry.id;
            const ch = (entry.channel || "email").toLowerCase();
            const chMeta = CHANNEL_META[ch] || CHANNEL_META.email;
            const ChIcon = chMeta.Icon;
            return (
              <Collapsible key={entry.id} open={isOpen} onOpenChange={() => setExpandedId(isOpen ? null : entry.id)}>
                <div className="rounded-lg border bg-card overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <button className="w-full text-left p-3 flex items-start gap-3 hover:bg-muted/30 transition-colors">
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-[10px] border gap-1" style={chMeta.style}>
                            <ChIcon className="h-3 w-3" />
                            {chMeta.label}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">{formatDate(entry.created_at)}</span>
                        </div>
                        <div className="font-medium text-sm truncate">
                          {entry.subject || (ch === "email" ? "No subject" : entry.body.slice(0, 60))}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{getPreview(entry.body)}</p>
                      </div>
                      <div className="shrink-0 mt-1">
                        {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </div>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="border-t px-3 py-3">
                      <div className="whitespace-pre-wrap text-sm bg-muted/40 p-3 rounded-md max-h-[500px] overflow-y-auto">
                        {entry.body}
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
