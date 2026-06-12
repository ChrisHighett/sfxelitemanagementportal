import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

type Mode =
  | { kind: "parent"; athleteId: string; athleteName: string }
  | { kind: "athlete" }; // brand-new athlete being invited

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

  function reset() {
    setEmail(""); setFirstName(""); setLastName(""); setRelationship("guardian");
  }

  async function submit() {
    if (!email) { toast.error("Email is required"); return; }
    if (mode.kind === "athlete" && (!firstName || !lastName)) {
      toast.error("Athlete name is required"); return;
    }
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    const payload: any = {
      email: email.trim().toLowerCase(),
      role: mode.kind === "parent" ? "parent" : "athlete",
      invited_by: user?.id,
      status: "pending",
    };
    if (mode.kind === "parent") {
      payload.athlete_id = mode.athleteId;
      payload.relationship = relationship;
    } else {
      payload.athlete_first_name = firstName;
      payload.athlete_last_name = lastName;
    }
    const { error } = await supabase.from("user_invites").insert(payload);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Invite submitted for admin approval");
    reset();
    onOpenChange(false);
    onCreated?.();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode.kind === "parent"
              ? `Invite parent for ${mode.athleteName}`
              : "Invite a new athlete"}
          </DialogTitle>
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
          <div className="space-y-1">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="person@example.com" />
          </div>
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
