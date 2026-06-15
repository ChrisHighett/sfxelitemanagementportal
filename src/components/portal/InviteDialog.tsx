import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, AlertTriangle } from "lucide-react";

type Mode =
  | { kind: "parent"; athleteId: string; athleteName: string }
  | { kind: "athlete" } // brand-new athlete being invited
  | { kind: "existing-athlete"; athleteId: string; athleteName: string; email: string; isMinor: boolean };

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: Mode;
  onCreated?: () => void;
}

export default function InviteDialog({ open, onOpenChange, mode, onCreated }: Props) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [relationship, setRelationship] = useState("guardian");
  const [busy, setBusy] = useState(false);
  const [minorConfirmed, setMinorConfirmed] = useState(false);

  function reset() {
    setEmail(""); setFirstName(""); setLastName(""); setRelationship("guardian"); setMinorConfirmed(false);
  }

  async function submit() {
    if (mode.kind === "existing-athlete") {
      if (!mode.email) { toast.error("Athlete has no email on file"); return; }
      if (mode.isMinor && !minorConfirmed) {
        toast.error("Please confirm before inviting a minor"); return;
      }
    } else {
      if (!email) { toast.error("Email is required"); return; }
      if (mode.kind === "athlete" && (!firstName || !lastName)) {
        toast.error("Athlete name is required"); return;
      }
    }
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    const payload: any = {
      invited_by: user?.id,
      status: "pending",
    };
    if (mode.kind === "parent") {
      payload.role = "parent";
      payload.email = email.trim().toLowerCase();
      payload.athlete_id = mode.athleteId;
      payload.relationship = relationship;
    } else if (mode.kind === "athlete") {
      payload.role = "athlete";
      payload.email = email.trim().toLowerCase();
      payload.athlete_first_name = firstName;
      payload.athlete_last_name = lastName;
    } else {
      payload.role = "athlete";
      payload.email = mode.email.trim().toLowerCase();
      payload.athlete_id = mode.athleteId;
    }
    const { error } = await supabase.from("user_invites").insert(payload);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Invite submitted for admin approval");
    reset();
    onOpenChange(false);
    onCreated?.();
  }

  const title =
    mode.kind === "parent"
      ? `Invite parent for ${mode.athleteName}`
      : mode.kind === "existing-athlete"
      ? `Invite ${mode.athleteName} to their portal`
      : "Invite a new athlete";

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {mode.kind === "athlete" && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>First name</Label>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Last name</Label>
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
            </div>
          )}

          {mode.kind === "existing-athlete" ? (
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" value={mode.email} disabled />
            </div>
          ) : (
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="person@example.com" />
            </div>
          )}

          {mode.kind === "parent" && (
            <div className="space-y-1">
              <Label>Relationship</Label>
              <Select value={relationship} onValueChange={setRelationship}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mother">Mother</SelectItem>
                  <SelectItem value="father">Father</SelectItem>
                  <SelectItem value="guardian">Guardian</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {mode.kind === "existing-athlete" && mode.isMinor && (
            <div className="flex gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <label className="flex gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={minorConfirmed}
                  onChange={(e) => setMinorConfirmed(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  This athlete is under 18. I confirm a parent/guardian is on file and this invites the minor to their own login.
                </span>
              </label>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            The invite goes to the admin for approval. Once approved you'll get an activation link to share with them.
          </p>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Submit invite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
