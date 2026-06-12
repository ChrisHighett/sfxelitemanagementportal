import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Copy, Check, MessageCircle, Phone } from "lucide-react";

export default function PendingInvitesList() {
  const qc = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [linkModal, setLinkModal] = useState<{ url: string; email: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: invites = [], isLoading } = useQuery({
    queryKey: ["pending_invites"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_invites")
        .select("id, email, role, athlete_id, athlete_first_name, athlete_last_name, invited_by, status, created_at, relationship, activation_token, token_expires_at")
        .in("status", ["pending", "approved"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000,
  });

  // Lookups for nicer display
  const inviterIds = Array.from(new Set(invites.map((i) => i.invited_by).filter(Boolean) as string[]));
  const athleteIds = Array.from(new Set(invites.map((i) => i.athlete_id).filter(Boolean) as string[]));

  const { data: inviters = [] } = useQuery({
    queryKey: ["invite_inviters", inviterIds],
    queryFn: async () => {
      if (!inviterIds.length) return [];
      const { data } = await supabase.from("portal_users").select("id, display_name, email").in("id", inviterIds);
      return data || [];
    },
    enabled: inviterIds.length > 0,
  });

  const { data: athletes = [] } = useQuery({
    queryKey: ["invite_athletes", athleteIds],
    queryFn: async () => {
      if (!athleteIds.length) return [];
      const { data } = await supabase.from("athletes").select("id, first_name, last_name").in("id", athleteIds);
      return data || [];
    },
    enabled: athleteIds.length > 0,
  });

  function nameInviter(id: string | null) {
    if (!id) return "—";
    const x = inviters.find((u) => u.id === id);
    return x?.display_name || x?.email || id.slice(0, 8);
  }
  function nameAthlete(id: string | null, fallbackFirst?: string | null, fallbackLast?: string | null) {
    if (!id) return [fallbackFirst, fallbackLast].filter(Boolean).join(" ") || "—";
    const a = athletes.find((x) => x.id === id);
    return a ? `${a.first_name} ${a.last_name}` : "—";
  }

  async function approve(inviteId: string) {
    setBusyId(inviteId);
    const { data, error } = await supabase.functions.invoke("approve-invite", { body: { inviteId } });
    setBusyId(null);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Failed to approve");
      return;
    }
    const url = (data as any).activationUrl as string;
    const invite = invites.find((i) => i.id === inviteId);
    setLinkModal({ url, email: invite?.email || "" });
    qc.invalidateQueries({ queryKey: ["pending_invites"] });
  }

  async function decline(inviteId: string) {
    setBusyId(inviteId);
    const { error } = await supabase.rpc("decline_invite", { _invite_id: inviteId });
    setBusyId(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Invite declined");
    qc.invalidateQueries({ queryKey: ["pending_invites"] });
  }

  function showLinkFor(invite: typeof invites[number]) {
    if (!invite.activation_token) { toast.error("No active token"); return; }
    const origin = window.location.origin;
    setLinkModal({ url: `${origin}/activate?token=${invite.activation_token}`, email: invite.email });
  }

  if (isLoading) {
    return <Card><CardContent className="p-4 text-sm text-muted-foreground flex items-center gap-2">
      <Loader2 className="h-4 w-4 animate-spin" /> Loading invites…
    </CardContent></Card>;
  }

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-muted-foreground">Pending invites</div>
      {invites.length === 0 ? (
        <Card><CardContent className="p-4 text-sm text-muted-foreground">No pending invites.</CardContent></Card>
      ) : invites.map((inv) => (
        <Card key={inv.id}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="font-medium">{inv.email}</div>
                <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                  <div>Role: <span className="font-medium text-foreground">{inv.role}</span>
                    {inv.role === "parent" && inv.relationship ? ` (${inv.relationship})` : ""}
                  </div>
                  {(inv.athlete_id || inv.athlete_first_name) && (
                    <div>For athlete: <span className="text-foreground">{nameAthlete(inv.athlete_id, inv.athlete_first_name, inv.athlete_last_name)}</span></div>
                  )}
                  <div>Invited by: {nameInviter(inv.invited_by)} · {new Date(inv.created_at).toLocaleDateString("en-AU")}</div>
                </div>
              </div>
              <Badge variant={inv.status === "approved" ? "default" : "outline"}>{inv.status}</Badge>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {inv.status === "pending" && (
                <>
                  <Button size="sm" onClick={() => approve(inv.id)} disabled={busyId === inv.id}>
                    {busyId === inv.id && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                    Approve & get link
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => decline(inv.id)} disabled={busyId === inv.id}>
                    Decline
                  </Button>
                </>
              )}
              {inv.status === "approved" && (
                <Button size="sm" variant="secondary" onClick={() => showLinkFor(inv)}>
                  Show activation link
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      <Dialog open={!!linkModal} onOpenChange={(v) => { if (!v) { setLinkModal(null); setCopied(false); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Activation link ready</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Send this link to <span className="font-medium text-foreground">{linkModal?.email}</span>.
              They'll set their own password and land in their portal.
            </p>
            <div className="flex gap-2">
              <Input readOnly value={linkModal?.url ?? ""} onFocus={(e) => e.currentTarget.select()} />
              <Button
                size="icon"
                variant="secondary"
                onClick={async () => {
                  if (!linkModal) return;
                  await navigator.clipboard.writeText(linkModal.url);
                  setCopied(true);
                  toast.success("Link copied");
                  setTimeout(() => setCopied(false), 1500);
                }}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <div className="flex gap-2 flex-wrap pt-1">
              <Button size="sm" variant="outline" asChild>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Your Eleva activation link: ${linkModal?.url ?? ""}`)}`}
                  target="_blank" rel="noopener noreferrer"
                >
                  <MessageCircle className="h-4 w-4 mr-1" /> WhatsApp
                </a>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <a href={`sms:?&body=${encodeURIComponent(`Your Eleva activation link: ${linkModal?.url ?? ""}`)}`}>
                  <Phone className="h-4 w-4 mr-1" /> SMS
                </a>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <a href={`mailto:${linkModal?.email}?subject=${encodeURIComponent("Your Eleva activation link")}&body=${encodeURIComponent(linkModal?.url ?? "")}`}>
                  Email
                </a>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Link expires in 14 days.</p>
          </div>
          <DialogFooter>
            <Button onClick={() => setLinkModal(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
