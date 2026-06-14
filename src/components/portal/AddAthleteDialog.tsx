import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArcLoader } from "@/components/brand/Brand";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const STAGE_OPTIONS = ["Emerging", "Elite", "Pre-Pro"] as const;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with new athlete id after successful creation */
  onCreated?: (athleteId: string) => void;
  /** Override agent (admin previewing). Defaults to signed-in user. */
  agentUserId?: string;
  agentDisplayName?: string;
}

export default function AddAthleteDialog({ open, onOpenChange, onCreated, agentUserId, agentDisplayName }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [age, setAge] = useState<string>("");
  const [dob, setDob] = useState("");
  const [position, setPosition] = useState("");
  const [club, setClub] = useState("");
  const [region, setRegion] = useState("");
  const [stage, setStage] = useState<string>("Emerging");
  const [footageUrl, setFootageUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [parentPhone, setParentPhone] = useState("");

  function reset() {
    setFirstName(""); setLastName(""); setAge(""); setDob("");
    setPosition(""); setClub(""); setRegion(""); setStage("Emerging");
    setFootageUrl(""); setNotes("");
    setParentName(""); setParentEmail(""); setParentPhone("");
  }

  async function handleSave() {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("First name and last name are required");
      return;
    }

    const effectiveAgentId = agentUserId || user?.id || null;
    const effectiveAgentName = agentDisplayName || user?.user_metadata?.display_name || user?.email || null;

    // Derive DOB from age if DOB not provided
    let derivedDob: string | null = dob || null;
    if (!derivedDob && age) {
      const ageNum = parseInt(age, 10);
      if (!Number.isNaN(ageNum) && ageNum > 0 && ageNum < 100) {
        derivedDob = `${new Date().getFullYear() - ageNum}-01-01`;
      }
    }

    setSaving(true);
    try {
      const { data: athlete, error } = await (supabase as any)
        .from("athletes")
        .insert({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          position: position.trim() || null,
          school: club.trim() || null,
          region: region.trim() || null,
          date_of_birth: derivedDob,
          stage,
          footage_url: footageUrl.trim() || null,
          scout_notes: notes.trim() || null,
          assigned_agent_name: effectiveAgentName,
          assigned_agent_user_id: effectiveAgentId,
          source: "agent_direct",
        })
        .select("id")
        .single();
      if (error) throw error;

      // Optional guardian
      if (parentName.trim() || parentEmail.trim() || parentPhone.trim()) {
        await (supabase as any).from("guardians").insert({
          athlete_id: athlete.id,
          parent_name: parentName.trim() || "Guardian",
          parent_email: parentEmail.trim() || null,
          parent_phone: parentPhone.trim() || null,
          relationship: "guardian",
        });
      }

      qc.invalidateQueries({ queryKey: ["athletes"] });
      toast.success(`${firstName} ${lastName} added to your roster`);
      onCreated?.(athlete.id);
      reset();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Could not create athlete");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!saving) onOpenChange(o); }}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New athlete</DialogTitle>
          <DialogDescription>
            Add an athlete directly to your roster. They'll be assigned to you and routed to the right life-stage portal based on age.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">First name *</Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Last name *</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Age</Label>
              <Input
                type="number"
                inputMode="numeric"
                placeholder="e.g. 18"
                value={age}
                onChange={(e) => setAge(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Date of birth</Label>
              <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Position</Label>
              <Input value={position} onChange={(e) => setPosition(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Club / School</Label>
              <Input value={club} onChange={(e) => setClub(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Region</Label>
              <Input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="e.g. NSW, QLD" />
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={stage} onValueChange={setStage}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STAGE_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs">Footage / highlights link</Label>
            <Input
              type="url"
              value={footageUrl}
              onChange={(e) => setFootageUrl(e.target.value)}
              placeholder="Paste a YouTube, Hudl, or Instagram link"
            />
          </div>

          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Anything worth noting — context, attributes, sign story…"
            />
          </div>

          <div className="rounded-md border border-border p-3 space-y-2">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Parent / guardian contact (optional)
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Name</Label>
                <Input value={parentName} onChange={(e) => setParentName(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Phone</Label>
                <Input value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input type="email" value={parentEmail} onChange={(e) => setParentEmail(e.target.value)} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <span className="mr-2"><ArcLoader size={14} /></span>}
            Create athlete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
