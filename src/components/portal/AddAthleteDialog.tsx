import { useMemo, useState } from "react";
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
import AthleteContactsEditor, { type Contact, validateContacts } from "./AthleteContactsEditor";

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

function deriveAge(age: string, dob: string): number | null {
  if (dob) {
    const d = new Date(dob);
    if (!isNaN(d.getTime())) {
      const diff = Date.now() - d.getTime();
      return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
    }
  }
  if (age) {
    const n = parseInt(age, 10);
    if (!Number.isNaN(n) && n > 0 && n < 100) return n;
  }
  return null;
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
  const [contacts, setContacts] = useState<Contact[]>([]);

  const derivedAge = useMemo(() => deriveAge(age, dob), [age, dob]);

  function reset() {
    setFirstName(""); setLastName(""); setAge(""); setDob("");
    setPosition(""); setClub(""); setRegion(""); setStage("Emerging");
    setFootageUrl(""); setNotes(""); setContacts([]);
  }

  async function handleSave() {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("First name and last name are required");
      return;
    }
    const contactsCheck = validateContacts(contacts, derivedAge);
    if (!contactsCheck.ok) {
      toast.error(contactsCheck.error || "Check contacts");
      return;
    }

    const effectiveAgentId = agentUserId || user?.id || null;
    const effectiveAgentName = agentDisplayName || user?.user_metadata?.display_name || user?.email || null;

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
          assigned_agent_id: effectiveAgentId,
          source: "agent_direct",
        })
        .select("id")
        .single();
      if (error) throw error;

      // Flush contacts to guardians (one of them is_primary)
      if (contacts.length > 0) {
        const rows = contacts.map((c) => ({
          athlete_id: athlete.id,
          parent_name: c.name.trim(),
          parent_email: c.email?.trim() || null,
          phone: c.phone?.trim() || null,
          relationship: c.relationship,
          relationship_other: c.relationship === "other" ? (c.relationship_other?.trim() || null) : null,
          is_primary: !!c.is_primary,
          notes: c.notes?.trim() || null,
        }));
        const { error: gErr } = await (supabase as any).from("guardians").insert(rows);
        if (gErr) throw gErr;
      }

      qc.invalidateQueries({ queryKey: ["athletes"] });
      qc.invalidateQueries({ queryKey: ["athlete_contacts", athlete.id] });
      toast.success(`${firstName} ${lastName} added to your roster`);
      onCreated?.(athlete.id);
      reset();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Could not create athlete", { duration: 10000 });
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
              <Input value={firstName} maxLength={80} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Last name *</Label>
              <Input value={lastName} maxLength={80} onChange={(e) => setLastName(e.target.value)} />
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
              <Input value={position} maxLength={80} onChange={(e) => setPosition(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Club / School</Label>
              <Input value={club} maxLength={120} onChange={(e) => setClub(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Region</Label>
              <Input value={region} maxLength={80} onChange={(e) => setRegion(e.target.value)} placeholder="e.g. NSW, QLD" />
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
              maxLength={500}
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
              maxLength={1000}
              placeholder="Anything worth noting — context, attributes, sign story…"
            />
          </div>

          <div className="rounded-md border border-border p-3">
            <AthleteContactsEditor
              mode="buffer"
              athleteAge={derivedAge}
              initialContacts={contacts}
              onChange={setContacts}
            />
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
