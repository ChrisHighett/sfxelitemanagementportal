import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAthletes } from "@/hooks/usePortalData";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, UserPlus, Users, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface AthleteForm {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  club: string;
  school: string;
  position: string;
  stage: string;
  email: string;
  management_contract_expiry: string;
  club_contract_expiry: string;
  assigned_agent: string;
  commercial_potential: string;
  avatar_url: string;
}

function useAgents() {
  return useQuery({
    queryKey: ["agents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portal_users")
        .select("id, display_name, email")
        .eq("role", "agent")
        .eq("approved", true)
        .order("display_name");
      if (error) throw error;
      return data || [];
    },
  });
}

interface GuardianForm {
  parent_name: string;
  parent_email: string;
  phone: string;
  relationship: string;
}

const emptyAthlete: AthleteForm = {
  first_name: "", last_name: "", date_of_birth: "", club: "", school: "",
  position: "", stage: "Emerging", email: "", management_contract_expiry: "", club_contract_expiry: "", assigned_agent: "",
  commercial_potential: "Not Scored", avatar_url: "",
};

const emptyGuardian: GuardianForm = {
  parent_name: "", parent_email: "", phone: "", relationship: "Parent",
};

function useGuardians(athleteId?: string) {
  return useQuery({
    queryKey: ["guardians", athleteId],
    queryFn: async () => {
      let query = supabase.from("guardians").select("*").order("parent_name");
      if (athleteId) query = query.eq("athlete_id", athleteId);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });
}

function AthleteFormDialog({ initial, athleteId, onClose, lockedAgentName, lockedAgentId }: {
  initial?: AthleteForm; athleteId?: string; onClose: () => void; lockedAgentName?: string; lockedAgentId?: string;
}) {
  const { user } = useAuth();
  const [form, setForm] = useState<AthleteForm>(() => ({
    ...(initial || emptyAthlete),
    assigned_agent: lockedAgentName ? (lockedAgentId ?? user?.id ?? "") : (initial?.assigned_agent ?? ""),
  }));
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();
  const isEdit = !!athleteId;
  const { data: agentList } = useAgents();

  const set = (k: keyof AthleteForm, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSave() {
    if (!form.first_name.trim() || !form.last_name.trim()) {
      toast.error("First and last name are required");
      return;
    }
    setSaving(true);
    const payload = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      date_of_birth: form.date_of_birth || null,
      club: form.club || null,
      school: form.school || null,
      position: form.position || null,
      stage: form.stage || null,
      email: form.email || null,
      management_contract_expiry: form.management_contract_expiry || null,
      club_contract_expiry: form.club_contract_expiry || null,
      assigned_agent_user_id: (() => {
        const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const candidate = lockedAgentId || form.assigned_agent || "";
        return uuidRe.test(candidate) ? candidate : null;
      })(),
      assigned_agent_name: lockedAgentName ||
        (agentList || []).find((a) => a.id === form.assigned_agent)?.display_name ||
        (agentList || []).find((a) => a.id === form.assigned_agent)?.email ||
        null,
      commercial_potential: form.commercial_potential || "Not Scored",
      avatar_url: form.avatar_url || null,
    } as any;

    const { error } = isEdit
      ? await supabase.from("athletes").update(payload).eq("id", athleteId)
      : await supabase.from("athletes").insert(payload);

    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(isEdit ? "Athlete updated" : "Athlete added");
    qc.invalidateQueries({ queryKey: ["athletes"] });
    onClose();
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>First Name *</Label>
          <Input value={form.first_name} onChange={(e) => set("first_name", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Last Name *</Label>
          <Input value={form.last_name} onChange={(e) => set("last_name", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Date of Birth</Label>
          <Input type="date" value={form.date_of_birth} onChange={(e) => set("date_of_birth", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Club</Label>
          <Input value={form.club} onChange={(e) => set("club", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>School</Label>
          <Input value={form.school} onChange={(e) => set("school", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Position</Label>
          <Input value={form.position} onChange={(e) => set("position", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Stage</Label>
          <Select value={form.stage} onValueChange={(v) => set("stage", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Emerging">Emerging</SelectItem>
              <SelectItem value="Elite">Elite</SelectItem>
              <SelectItem value="Pre-Pro">Pre-Pro</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Assigned Agent</Label>
          {lockedAgentName ? (
            <div className="flex items-center gap-2 h-10 px-3 rounded-md border border-input bg-muted text-sm text-muted-foreground">
              {lockedAgentName}
              <span className="ml-auto text-xs">(you)</span>
            </div>
          ) : (
            <Select value={form.assigned_agent} onValueChange={(v) => set("assigned_agent", v)}>
              <SelectTrigger><SelectValue placeholder="Select agent…" /></SelectTrigger>
              <SelectContent>
                {(agentList || []).map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.display_name || a.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="space-y-2">
          <Label>Management Contract Expiry</Label>
          <Input type="date" value={form.management_contract_expiry} onChange={(e) => set("management_contract_expiry", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Club Contract Expiry</Label>
          <Input type="date" value={form.club_contract_expiry} onChange={(e) => set("club_contract_expiry", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Commercial Potential</Label>
          <Select value={form.commercial_potential} onValueChange={(v) => set("commercial_potential", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Not Scored">Not Scored</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="High">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Photo URL (optional)</Label>
          <Input
            placeholder="https://…"
            value={form.avatar_url}
            onChange={(e) => set("avatar_url", e.target.value)}
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : isEdit ? "Update Athlete" : "Add Athlete"}</Button>
      </div>
    </div>
  );
}

function GuardianFormDialog({ athleteId, initial, guardianId, onClose }: {
  athleteId: string; initial?: GuardianForm; guardianId?: string; onClose: () => void;
}) {
  const [form, setForm] = useState<GuardianForm>(initial || emptyGuardian);
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();
  const isEdit = !!guardianId;

  const set = (k: keyof GuardianForm, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSave() {
    if (!form.parent_name.trim()) { toast.error("Guardian name is required"); return; }
    setSaving(true);
    const payload = {
      athlete_id: athleteId,
      parent_name: form.parent_name.trim(),
      parent_email: form.parent_email || null,
      phone: form.phone || null,
      relationship: form.relationship || null,
    };

    const { error } = isEdit
      ? await supabase.from("guardians").update(payload).eq("id", guardianId)
      : await supabase.from("guardians").insert(payload);

    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(isEdit ? "Guardian updated" : "Guardian added");
    qc.invalidateQueries({ queryKey: ["guardians"] });
    onClose();
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Guardian Name *</Label>
          <Input value={form.parent_name} onChange={(e) => set("parent_name", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input type="email" value={form.parent_email} onChange={(e) => set("parent_email", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Phone</Label>
          <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Relationship</Label>
          <Select value={form.relationship} onValueChange={(v) => set("relationship", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Parent">Parent</SelectItem>
              <SelectItem value="Mother">Mother</SelectItem>
              <SelectItem value="Father">Father</SelectItem>
              <SelectItem value="Guardian">Guardian</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : isEdit ? "Update Guardian" : "Add Guardian"}</Button>
      </div>
    </div>
  );
}

function AthleteDetail({ athleteId, onBack }: { athleteId: string; onBack: () => void }) {
  const { data: athletes = [] } = useAthletes();
  const { data: guardians = [], isLoading } = useGuardians(athleteId);
  const qc = useQueryClient();

  const athlete = athletes.find((a) => a.id === athleteId);
  const [editingAthlete, setEditingAthlete] = useState(false);
  const [addingGuardian, setAddingGuardian] = useState(false);
  const [editingGuardianId, setEditingGuardianId] = useState<string | null>(null);

  if (!athlete) return null;

  const athleteForm: AthleteForm = {
    first_name: athlete.name.split(" ")[0],
    last_name: athlete.name.split(" ").slice(1).join(" "),
    date_of_birth: athlete.dateOfBirth || "",
    club: athlete.club === "—" ? "" : athlete.club,
    school: athlete.school === "—" ? "" : athlete.school,
    position: athlete.position === "—" ? "" : athlete.position,
    stage: athlete.stage,
    email: "",
    management_contract_expiry: athlete.managementContractExpiry || "",
    club_contract_expiry: athlete.clubContractExpiry || "",
    assigned_agent: athlete.assignedAgent || "",
    commercial_potential: athlete.commercialPotential || "Not Scored",
    avatar_url: athlete.photoUrl || "",
  };

  async function handleDeleteGuardian(id: string) {
    if (!confirm("Delete this guardian?")) return;
    const { error } = await supabase.from("guardians").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Guardian deleted");
    qc.invalidateQueries({ queryKey: ["guardians"] });
  }

  async function handleDeleteAthlete() {
    if (!confirm(`Delete ${athlete.name}? This will also remove their guardians, reviews and comms.`)) return;
    const { error } = await supabase.from("athletes").delete().eq("id", athleteId);
    if (error) { toast.error(error.message); return; }
    toast.success("Athlete deleted");
    qc.invalidateQueries({ queryKey: ["athletes"] });
    onBack();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}>← Back to list</Button>
        <span className="text-lg font-semibold">{athlete.name}</span>
        <Badge variant="secondary">{athlete.stage}</Badge>
      </div>

      {/* Athlete Details */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Athlete Details</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditingAthlete(true)}>
              <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDeleteAthlete}>
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {editingAthlete ? (
            <AthleteFormDialog initial={athleteForm} athleteId={athleteId} onClose={() => setEditingAthlete(false)} />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 text-sm">
              <div><span className="text-muted-foreground">Name:</span> {athlete.name}</div>
              <div><span className="text-muted-foreground">DOB:</span> {athlete.dateOfBirth || "—"}</div>
              <div><span className="text-muted-foreground">Age:</span> {athlete.age}</div>
              <div><span className="text-muted-foreground">Club:</span> {athlete.club}</div>
              <div><span className="text-muted-foreground">School:</span> {athlete.school}</div>
              <div><span className="text-muted-foreground">Position:</span> {athlete.position}</div>
              <div><span className="text-muted-foreground">Stage:</span> {athlete.stage}</div>
              <div><span className="text-muted-foreground">Assigned Agent:</span> {athlete.assignedAgent}</div>
              <div><span className="text-muted-foreground">Mgmt Contract Expiry:</span> {athlete.managementContractExpiry || "—"}</div>
              <div><span className="text-muted-foreground">Club Contract Expiry:</span> {athlete.clubContractExpiry || "—"}</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Guardians */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Guardians / Parents</CardTitle>
          <Button variant="outline" size="sm" onClick={() => { setAddingGuardian(true); setEditingGuardianId(null); }}>
            <UserPlus className="h-3.5 w-3.5 mr-1" /> Add Guardian
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {addingGuardian && !editingGuardianId && (
            <Card className="border-dashed">
              <CardContent className="pt-4">
                <GuardianFormDialog athleteId={athleteId} onClose={() => setAddingGuardian(false)} />
              </CardContent>
            </Card>
          )}
          {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
          {!isLoading && guardians.length === 0 && !addingGuardian && (
            <div className="text-sm text-muted-foreground">No guardians linked to this athlete.</div>
          )}
          {guardians.map((g) => (
            <Card key={g.id}>
              <CardContent className="pt-4">
                {editingGuardianId === g.id ? (
                  <GuardianFormDialog
                    athleteId={athleteId}
                    guardianId={g.id}
                    initial={{
                      parent_name: g.parent_name,
                      parent_email: g.parent_email || "",
                      phone: g.phone || "",
                      relationship: g.relationship || "Parent",
                    }}
                    onClose={() => setEditingGuardianId(null)}
                  />
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="grid gap-1 sm:grid-cols-4 text-sm flex-1">
                      <div><span className="text-muted-foreground">Name:</span> {g.parent_name}</div>
                      <div><span className="text-muted-foreground">Email:</span> {g.parent_email || "—"}</div>
                      <div><span className="text-muted-foreground">Phone:</span> {g.phone || "—"}</div>
                      <div><span className="text-muted-foreground">Relationship:</span> {g.relationship || "—"}</div>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <Button variant="ghost" size="sm" onClick={() => { setEditingGuardianId(g.id); setAddingGuardian(false); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteGuardian(g.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminAthleteManager({ initialAthleteId, onBack, lockedAgentName, lockedAgentId }: {
  initialAthleteId?: string; onBack?: () => void; lockedAgentName?: string; lockedAgentId?: string;
} = {}) {
  const { data: athletes = [], isLoading } = useAthletes();
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(initialAthleteId || null);
  const [addingNew, setAddingNew] = useState(false);
  const [search, setSearch] = useState("");

  // If opened directly to an athlete (e.g. from agent profile view)
  if (selectedAthleteId) {
    return <AthleteDetail athleteId={selectedAthleteId} onBack={onBack || (() => setSelectedAthleteId(null))} />;
  }

  const filtered = athletes.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.club.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <Input
          placeholder="Search athletes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Button onClick={() => setAddingNew(true)}>
          <Plus className="h-4 w-4 mr-1" /> Add Athlete
        </Button>
      </div>

      {addingNew && (
        <Card className="border-dashed">
          <CardHeader><CardTitle className="text-base">New Athlete</CardTitle></CardHeader>
          <CardContent>
            <AthleteFormDialog onClose={() => setAddingNew(false)} lockedAgentName={lockedAgentName} lockedAgentId={lockedAgentId} />
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading athletes…</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-muted-foreground">No athletes found.</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((a) => (
            <Card
              key={a.id}
              className="cursor-pointer hover:bg-secondary/50 transition-colors"
              onClick={() => setSelectedAthleteId(a.id)}
            >
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{a.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {a.club} • {a.position} • {a.stage}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">{a.stage}</Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
