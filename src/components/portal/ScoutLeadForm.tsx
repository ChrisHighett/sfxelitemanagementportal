import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

export interface ScoutLead {
  id: string;
  lead_id?: string | null;
  first_name: string;
  last_name: string;
  age?: number | null;
  region?: string | null;
  school_club?: string | null;
  position?: string | null;
  comp_grade?: string | null;
  key_attributes?: string | null;
  competitor_interest?: string | null;
  scout_rating?: "A" | "B" | "C" | null;
  triage_decision?: "Pursue" | "Watch" | "Pass" | "Undecided" | null;
  assigned_agent_id?: string | null;
  assigned_agent_name?: string | null;
  source_contact?: string | null;
  notes?: string | null;
  onboarding_stage?: string | null;
  date_contacted?: string | null;
  date_pack_sent?: string | null;
  date_welcome_sent?: string | null;
  date_signed?: string | null;
  date_lost?: string | null;
  converted_athlete_id?: string | null;
  action_required?: string | null;
  action_due_date?: string | null;
  action_status?: "Open" | "In Progress" | "Done" | "N/A" | null;
  next_step?: string | null;
  last_stage_change_at?: string | null;
  created_at?: string | null;
}

const REGIONS = ["QLD", "NSW", "VIC", "SA", "WA", "TAS", "ACT", "NZ", "Other"];
const POSITIONS = ["Halfback", "Five-eighth", "Hooker", "Prop", "Second Row", "Lock", "Centre", "Winger", "Fullback", "Utility"];
const TRIAGE: Array<ScoutLead["triage_decision"]> = ["Pursue", "Watch", "Pass", "Undecided"];

interface Props {
  onClose: () => void;
  onSaved?: () => void;
  editLead?: ScoutLead;
}

export default function ScoutLeadForm({ onClose, onSaved, editLead }: Props) {
  const { user } = useAuth();
  const [playerOpen, setPlayerOpen] = useState(true);
  const [saving, setSaving] = useState(false);

  const [firstName, setFirstName] = useState(editLead?.first_name ?? "");
  const [lastName, setLastName] = useState(editLead?.last_name ?? "");
  const [age, setAge] = useState<string>(editLead?.age?.toString() ?? "");
  const [region, setRegion] = useState(editLead?.region ?? "");
  const [schoolClub, setSchoolClub] = useState(editLead?.school_club ?? "");
  const [position, setPosition] = useState(editLead?.position ?? "");
  const [compGrade, setCompGrade] = useState(editLead?.comp_grade ?? "");
  const [keyAttributes, setKeyAttributes] = useState(editLead?.key_attributes ?? "");
  const [competitorInterest, setCompetitorInterest] = useState(editLead?.competitor_interest ?? "");
  const [scoutRating, setScoutRating] = useState<"A" | "B" | "C" | "">(editLead?.scout_rating ?? "");
  const [triage, setTriage] = useState<ScoutLead["triage_decision"]>(editLead?.triage_decision ?? "Undecided");
  const [assignedAgentId, setAssignedAgentId] = useState<string>(editLead?.assigned_agent_id ?? "");
  const [sourceContact, setSourceContact] = useState(editLead?.source_contact ?? "");
  const [notes, setNotes] = useState(editLead?.notes ?? "");

  const { data: agents = [] } = useQuery({
    queryKey: ["portal_users_agents"],
    queryFn: async () => {
      const { data } = await supabase
        .from("portal_users")
        .select("id, display_name, email")
        .eq("role", "agent")
        .eq("approved", true);
      return data || [];
    },
  });

  useEffect(() => {
    if (editLead) setPlayerOpen(true);
  }, [editLead]);

  async function handleSave() {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("First and last name are required");
      return;
    }
    setSaving(true);
    try {
      const assigned = agents.find((a: any) => a.id === assignedAgentId);
      const payload: any = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        age: age ? parseInt(age, 10) : null,
        region: region || null,
        school_club: schoolClub || null,
        position: position || null,
        comp_grade: compGrade || null,
        key_attributes: keyAttributes || null,
        competitor_interest: competitorInterest || null,
        scout_rating: scoutRating || null,
        triage_decision: triage,
        assigned_agent_id: assignedAgentId || null,
        assigned_agent_name: assigned ? (assigned.display_name || assigned.email) : null,
        source_contact: sourceContact || null,
        notes: notes || null,
      };

      if (editLead) {
        const { error } = await (supabase as any)
          .from("scout_leads")
          .update(payload)
          .eq("id", editLead.id);
        if (error) throw error;
        toast.success(`Lead updated — ${firstName} ${lastName}`);
      } else {
        payload.created_by = user?.id || null;
        const { data: inserted, error } = await (supabase as any)
          .from("scout_leads")
          .insert(payload)
          .select("id, converted_athlete_id")
          .single();
        if (error) throw error;

        // Best-effort alert (requires athlete_id, only fires once converted)
        if (triage === "Pursue" && assignedAgentId && inserted?.converted_athlete_id) {
          await (supabase as any).from("athlete_alerts").insert({
            athlete_id: inserted.converted_athlete_id,
            alert_type: "scout_lead_assigned",
            severity: "high",
            status: "open",
            title: `New scout lead assigned: ${firstName} ${lastName}`,
            description: `${scoutRating || "—"} rated ${position || "player"} from ${schoolClub || "—"}. Competitor interest: ${competitorInterest || "none"}`,
            assigned_to: assignedAgentId,
          });
        }
        toast.success(`Lead added — ${firstName} ${lastName}`);
      }

      onSaved?.();
      onClose();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to save lead");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{editLead ? "Edit scout lead" : "Add scout lead"}</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* SECTION 1 — PLAYER CARD */}
        <section className="border border-border rounded-lg">
          <button
            type="button"
            onClick={() => setPlayerOpen((v) => !v)}
            className="w-full flex items-center justify-between px-3 py-2 text-sm font-semibold"
          >
            <span>Player card</span>
            {playerOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          {playerOpen && (
            <div className="px-3 pb-3 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>First name *</Label>
                  <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Last name *</Label>
                  <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Age</Label>
                  <Input type="number" min={10} max={22} value={age} onChange={(e) => setAge(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Region</Label>
                  <Select value={region} onValueChange={setRegion}>
                    <SelectTrigger><SelectValue placeholder="Select region" /></SelectTrigger>
                    <SelectContent>
                      {REGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label>School / Club</Label>
                  <Input value={schoolClub} onChange={(e) => setSchoolClub(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Position</Label>
                  <Select value={position} onValueChange={setPosition}>
                    <SelectTrigger><SelectValue placeholder="Select position" /></SelectTrigger>
                    <SelectContent>
                      {POSITIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Competition / Grade</Label>
                  <Input value={compGrade} onChange={(e) => setCompGrade(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Key attributes</Label>
                <Textarea rows={3} value={keyAttributes} onChange={(e) => setKeyAttributes(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Other agents / interest</Label>
                <Textarea rows={2} value={competitorInterest} onChange={(e) => setCompetitorInterest(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Scout rating</Label>
                <div className="flex flex-wrap gap-2">
                  {([
                    { v: "A", label: "A — Elite prospect" },
                    { v: "B", label: "B — Strong watch" },
                    { v: "C", label: "C — Monitor" },
                  ] as const).map((opt) => (
                    <button
                      key={opt.v}
                      type="button"
                      onClick={() => setScoutRating(opt.v)}
                      className={`px-3 py-1.5 rounded-md text-xs border transition ${
                        scoutRating === opt.v
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-muted-foreground hover:bg-secondary"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* SECTION 2 — DECISION & ASSIGNMENT */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Decision & assignment</h3>
          <div className="space-y-2">
            <Label>Triage decision</Label>
            <div className="flex flex-wrap gap-2">
              {TRIAGE.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTriage(t)}
                  className={`px-3 py-1.5 rounded-md text-xs border transition ${
                    triage === t
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Assigned to</Label>
              <Select value={assignedAgentId} onValueChange={setAssignedAgentId}>
                <SelectTrigger><SelectValue placeholder="Select agent" /></SelectTrigger>
                <SelectContent>
                  {agents.map((a: any) => (
                    <SelectItem key={a.id} value={a.id}>{a.display_name || a.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Source / referral</Label>
              <Input value={sourceContact} onChange={(e) => setSourceContact(e.target.value)} />
            </div>
          </div>
        </section>

        {/* SECTION 3 — NOTES */}
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Notes</h3>
          <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </section>

        <div className="flex items-center justify-end gap-2 pt-2">
          {editLead?.lead_id && <Badge variant="secondary">{editLead.lead_id}</Badge>}
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {editLead ? "Save changes" : "Add lead"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
