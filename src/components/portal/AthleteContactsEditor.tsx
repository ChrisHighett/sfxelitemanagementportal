import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Plus, Star, Trash2, Pencil, Phone, Mail, Send, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";
import { ArcLoader } from "@/components/brand/Brand";

type InviteStatus = "pending" | "approved" | "activated" | "declined";
type InviteRecord = { id: string; email: string; status: InviteStatus };

export const RELATIONSHIP_OPTIONS = [
  { value: "mother", label: "Mother" },
  { value: "father", label: "Father" },
  { value: "guardian", label: "Guardian" },
  { value: "carer", label: "Carer" },
  { value: "partner", label: "Partner" },
  { value: "manager", label: "Manager" },
  { value: "other", label: "Other" },
] as const;

const GUARDIAN_TYPES = new Set(["mother", "father", "guardian", "carer"]);

export type Contact = {
  id?: string;          // present for live (DB) contacts
  _localId?: string;    // present for buffer contacts
  name: string;
  relationship: string;
  relationship_other?: string | null;
  phone?: string | null;
  email?: string | null;
  is_primary: boolean;
  notes?: string | null;
};

export function relationshipLabel(c: Pick<Contact, "relationship" | "relationship_other">) {
  if (c.relationship === "other") return c.relationship_other?.trim() || "Other";
  const found = RELATIONSHIP_OPTIONS.find((o) => o.value === c.relationship);
  return found?.label || "Contact";
}

export function isContactComplete(c: Contact): boolean {
  if (!c.name?.trim()) return false;
  const hasPhone = !!c.phone?.trim();
  const hasEmail = !!c.email?.trim();
  return hasPhone || hasEmail;
}

/**
 * Validates an athlete's contacts list against age-aware rules.
 * Returns { ok, error } so callers can surface a single short message.
 */
export function validateContacts(contacts: Contact[], age: number | null | undefined): { ok: boolean; error?: string } {
  for (const c of contacts) {
    if (!c.name?.trim()) return { ok: false, error: "Every contact needs a name." };
    if (!c.phone?.trim() && !c.email?.trim()) {
      return { ok: false, error: `Add a phone or email for ${c.name.trim()}.` };
    }
    if (c.relationship === "other" && !c.relationship_other?.trim()) {
      return { ok: false, error: `Add a label for ${c.name.trim()}'s relationship.` };
    }
  }
  if (contacts.length > 0) {
    const primaries = contacts.filter((c) => c.is_primary).length;
    if (primaries !== 1) return { ok: false, error: "Exactly one contact must be marked primary." };
  }
  const isMinor = typeof age === "number" && age > 0 && age < 18;
  if (isMinor) {
    if (contacts.length === 0) return { ok: false, error: "At least one parent / guardian contact is required for under-18 athletes." };
    const hasGuardian = contacts.some((c) => GUARDIAN_TYPES.has(c.relationship));
    if (!hasGuardian) return { ok: false, error: "Add at least one Mother, Father, Guardian or Carer contact." };
  }
  return { ok: true };
}

function emptyContact(makePrimary: boolean): Contact {
  return {
    _localId: Math.random().toString(36).slice(2),
    name: "",
    relationship: "guardian",
    relationship_other: "",
    phone: "",
    email: "",
    is_primary: makePrimary,
    notes: "",
  };
}

interface BufferProps {
  mode: "buffer";
  athleteAge?: number | null;
  initialContacts?: Contact[];
  onChange: (contacts: Contact[]) => void;
  athleteId?: undefined;
}
interface LiveProps {
  mode: "live";
  athleteAge?: number | null;
  athleteId: string;
}
type Props = BufferProps | LiveProps;

export default function AthleteContactsEditor(props: Props) {
  const isMinor = typeof props.athleteAge === "number" && props.athleteAge > 0 && props.athleteAge < 18;
  const title = isMinor ? "Parent / Guardian contacts" : "Key contacts";
  const helper = isMinor
    ? "At least one parent or guardian is required for under-18 athletes."
    : "Optional. Add anyone the agent might need to reach.";

  if (props.mode === "buffer") return <BufferEditor {...props} title={title} helper={helper} />;
  return <LiveEditor {...props} title={title} helper={helper} />;
}

/* ---------- Buffer mode (used inside Add-athlete form before athlete exists) ---------- */

function BufferEditor({ initialContacts, onChange, title, helper, athleteAge }: BufferProps & { title: string; helper: string }) {
  const [contacts, setContacts] = useState<Contact[]>(initialContacts ?? []);
  const [draft, setDraft] = useState<Contact | null>(null);
  const isMinor = typeof athleteAge === "number" && athleteAge > 0 && athleteAge < 18;

  useEffect(() => {
    onChange(contacts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contacts]);

  function startAdd() {
    setDraft(emptyContact(contacts.length === 0));
  }
  function startEdit(c: Contact) {
    setDraft({ ...c });
  }
  function commitDraft() {
    if (!draft) return;
    if (!isContactComplete(draft)) {
      toast.error("Add a name and a phone or email.");
      return;
    }
    if (draft.relationship === "other" && !draft.relationship_other?.trim()) {
      toast.error("Add a custom relationship label.");
      return;
    }
    setContacts((prev) => {
      const exists = prev.some((c) => (draft._localId && c._localId === draft._localId));
      let next = exists
        ? prev.map((c) => (c._localId === draft._localId ? draft : c))
        : [...prev, draft];
      // Enforce single primary
      if (draft.is_primary) {
        next = next.map((c) => ({ ...c, is_primary: (c._localId === draft._localId) }));
      } else if (next.length === 1) {
        next[0] = { ...next[0], is_primary: true };
      } else if (!next.some((c) => c.is_primary)) {
        next[0] = { ...next[0], is_primary: true };
      }
      return next;
    });
    setDraft(null);
  }
  function removeContact(localId: string) {
    setContacts((prev) => {
      const next = prev.filter((c) => c._localId !== localId);
      if (next.length > 0 && !next.some((c) => c.is_primary)) {
        next[0] = { ...next[0], is_primary: true };
      }
      return next;
    });
  }
  function makePrimary(localId: string) {
    setContacts((prev) => prev.map((c) => ({ ...c, is_primary: c._localId === localId })));
  }

  return (
    <div className="space-y-3">
      <Header title={title} helper={helper} required={isMinor} onAdd={!draft ? startAdd : undefined} />
      <ContactList
        contacts={contacts}
        onEdit={startEdit}
        onRemove={(c) => c._localId && removeContact(c._localId)}
        onMakePrimary={(c) => c._localId && makePrimary(c._localId)}
      />
      {draft && (
        <ContactForm
          value={draft}
          onChange={setDraft}
          onCancel={() => setDraft(null)}
          onSave={commitDraft}
          showPrimaryToggle={contacts.length > 0}
        />
      )}
    </div>
  );
}

/* ---------- Live mode (athlete already exists; reads/writes guardians directly) ---------- */

function LiveEditor({ athleteId, title, helper, athleteAge }: LiveProps & { title: string; helper: string }) {
  const qc = useQueryClient();
  const isMinor = typeof athleteAge === "number" && athleteAge > 0 && athleteAge < 18;
  const [draft, setDraft] = useState<Contact | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: contacts = [], isLoading, refetch } = useQuery<Contact[]>({
    queryKey: ["athlete_contacts", athleteId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("guardians")
        .select("id, parent_name, parent_email, phone, relationship, relationship_other, is_primary, notes, created_at")
        .eq("athlete_id", athleteId)
        .order("is_primary", { ascending: false })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []).map((r: any) => ({
        id: r.id,
        name: r.parent_name,
        relationship: (r.relationship || "guardian").toLowerCase(),
        relationship_other: r.relationship_other ?? "",
        phone: r.phone ?? "",
        email: r.parent_email ?? "",
        is_primary: !!r.is_primary,
        notes: r.notes ?? "",
      }));
    },
    enabled: !!athleteId,
  });

  const { data: invites = [], refetch: refetchInvites } = useQuery<InviteRecord[]>({
    queryKey: ["athlete_parent_invites", athleteId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("user_invites")
        .select("id, email, status, created_at")
        .eq("athlete_id", athleteId)
        .eq("role", "parent")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((r: any) => ({ id: r.id, email: (r.email || "").toLowerCase(), status: r.status as InviteStatus }));
    },
    enabled: !!athleteId,
  });

  const inviteByEmail = useMemo(() => {
    const m = new Map<string, InviteRecord>();
    // first occurrence wins (most recent due to ordering)
    for (const inv of invites) {
      if (!m.has(inv.email)) m.set(inv.email, inv);
    }
    return m;
  }, [invites]);

  async function inviteContact(c: Contact) {
    const email = c.email?.trim().toLowerCase();
    if (!email) { toast.error("Add an email first."); return; }
    const existing = inviteByEmail.get(email);
    if (existing && existing.status !== "declined") {
      toast.info("This contact already has a parent-portal invite.");
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await (supabase as any).from("user_invites").insert({
      email,
      role: "parent",
      invited_by: user?.id,
      athlete_id: athleteId,
      relationship: c.relationship === "other" ? (c.relationship_other || "guardian") : c.relationship,
      status: "pending",
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Invite submitted for admin approval");
    await refetchInvites();
  }

  function startAdd() {
    setDraft(emptyContact(contacts.length === 0));
  }
  function startEdit(c: Contact) {
    setDraft({ ...c });
  }

  async function saveDraft() {
    if (!draft) return;
    if (!isContactComplete(draft)) {
      toast.error("Add a name and a phone or email.");
      return;
    }
    if (draft.relationship === "other" && !draft.relationship_other?.trim()) {
      toast.error("Add a custom relationship label.");
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        athlete_id: athleteId,
        parent_name: draft.name.trim(),
        parent_email: draft.email?.trim() || null,
        phone: draft.phone?.trim() || null,
        relationship: draft.relationship,
        relationship_other: draft.relationship === "other" ? (draft.relationship_other?.trim() || null) : null,
        notes: draft.notes?.trim() || null,
      };
      // Handle primary toggle: first clear existing primary if we're claiming it
      if (draft.is_primary) {
        await (supabase as any).from("guardians").update({ is_primary: false }).eq("athlete_id", athleteId).eq("is_primary", true);
      }
      payload.is_primary = draft.is_primary || contacts.length === 0;
      if (draft.id) {
        const { error } = await (supabase as any).from("guardians").update(payload).eq("id", draft.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("guardians").insert(payload);
        if (error) throw error;
      }
      setDraft(null);
      await refetch();
      qc.invalidateQueries({ queryKey: ["athletes"] });
      toast.success("Contact saved");
    } catch (e: any) {
      toast.error(e.message || "Could not save contact");
    } finally {
      setSaving(false);
    }
  }

  async function removeContact(c: Contact) {
    if (!c.id) return;
    if (!confirm(`Remove ${c.name}?`)) return;
    const wasPrimary = c.is_primary;
    const { error } = await (supabase as any).from("guardians").delete().eq("id", c.id);
    if (error) { toast.error(error.message); return; }
    // Promote a new primary if needed
    if (wasPrimary) {
      const remaining = contacts.filter((x) => x.id !== c.id);
      if (remaining.length > 0 && remaining[0].id) {
        await (supabase as any).from("guardians").update({ is_primary: true }).eq("id", remaining[0].id);
      }
    }
    await refetch();
    toast.success("Contact removed");
  }

  async function makePrimary(c: Contact) {
    if (!c.id || c.is_primary) return;
    try {
      await (supabase as any).from("guardians").update({ is_primary: false }).eq("athlete_id", athleteId).eq("is_primary", true);
      const { error } = await (supabase as any).from("guardians").update({ is_primary: true }).eq("id", c.id);
      if (error) throw error;
      await refetch();
      toast.success("Primary contact updated");
    } catch (e: any) {
      toast.error(e.message || "Could not update primary");
    }
  }

  return (
    <div className="space-y-3">
      <Header title={title} helper={helper} required={isMinor} onAdd={!draft ? startAdd : undefined} />
      {isLoading ? (
        <div className="text-xs text-muted-foreground flex items-center gap-2"><ArcLoader size={14} /> Loading contacts…</div>
      ) : (
        <ContactList
          contacts={contacts}
          onEdit={startEdit}
          onRemove={removeContact}
          onMakePrimary={makePrimary}
          inviteByEmail={inviteByEmail}
          onInvite={inviteContact}
        />

      )}
      {draft && (
        <ContactForm
          value={draft}
          onChange={setDraft}
          onCancel={() => setDraft(null)}
          onSave={saveDraft}
          saving={saving}
          showPrimaryToggle={contacts.length > 0}
        />
      )}
    </div>
  );
}

/* ---------- Shared subcomponents ---------- */

function Header({ title, helper, required, onAdd }: { title: string; helper: string; required: boolean; onAdd?: () => void }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div>
        <div className="text-sm font-semibold flex items-center gap-2">
          {title}
          {required && <Badge variant="destructive" className="text-[10px] h-4">Required</Badge>}
        </div>
        <div className="text-xs text-muted-foreground">{helper}</div>
      </div>
      {onAdd && (
        <Button type="button" size="sm" variant="outline" className="h-8" onClick={onAdd}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add contact
        </Button>
      )}
    </div>
  );
}

function ContactList({
  contacts,
  onEdit,
  onRemove,
  onMakePrimary,
  inviteByEmail,
  onInvite,
}: {
  contacts: Contact[];
  onEdit: (c: Contact) => void;
  onRemove: (c: Contact) => void;
  onMakePrimary: (c: Contact) => void;
  inviteByEmail?: Map<string, InviteRecord>;
  onInvite?: (c: Contact) => void;
}) {
  if (contacts.length === 0) {
    return <div className="text-xs text-muted-foreground italic">No contacts yet.</div>;
  }
  const sorted = [...contacts].sort((a, b) => Number(b.is_primary) - Number(a.is_primary));
  return (
    <div className="space-y-2">
      {sorted.map((c, idx) => {
        const emailKey = c.email?.trim().toLowerCase();
        const invite = emailKey ? inviteByEmail?.get(emailKey) : undefined;
        const canInvite = !!onInvite && !!emailKey && (!invite || invite.status === "declined");
        return (
        <Card key={c.id ?? c._localId ?? idx} className="p-3 flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium truncate">{c.name || "(no name)"}</span>
              <Badge variant="secondary" className="text-[10px]">{relationshipLabel(c)}</Badge>
              {c.is_primary && (
                <Badge className="text-[10px] gap-1 bg-primary/15 text-primary border border-primary/30 hover:bg-primary/20">
                  <Star className="h-3 w-3 fill-current" /> Primary
                </Badge>
              )}
              {inviteByEmail && emailKey && <ParentPortalBadge invite={invite} />}
            </div>
            <div className="flex items-center gap-3 text-xs flex-wrap">
              {c.phone && (
                <a href={`tel:${c.phone}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                  <Phone className="h-3 w-3" /> {c.phone}
                </a>
              )}
              {c.email && (
                <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1 text-primary hover:underline truncate">
                  <Mail className="h-3 w-3" /> {c.email}
                </a>
              )}
            </div>
            {c.notes && <div className="text-xs text-muted-foreground">{c.notes}</div>}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {canInvite && (
              <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => onInvite!(c)} title="Invite to parent portal">
                <Send className="h-3.5 w-3.5 mr-1" /> Invite
              </Button>
            )}
            {!c.is_primary && (
              <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => onMakePrimary(c)} title="Make primary">
                <Star className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => onEdit(c)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-destructive" onClick={() => onRemove(c)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </Card>
        );
      })}
    </div>
  );
}

function ParentPortalBadge({ invite }: { invite?: InviteRecord }) {
  if (!invite || invite.status === "declined") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
        Not invited
      </span>
    );
  }
  if (invite.status === "activated") {
    return (
      <Badge className="text-[10px] gap-1 bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 hover:bg-emerald-500/20">
        <CheckCircle2 className="h-3 w-3" /> Portal active
      </Badge>
    );
  }
  // pending or approved
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-amber-600">
      <Clock className="h-3 w-3" /> Invited
    </span>
  );
}



function ContactForm({
  value,
  onChange,
  onCancel,
  onSave,
  saving,
  showPrimaryToggle,
}: {
  value: Contact;
  onChange: (c: Contact) => void;
  onCancel: () => void;
  onSave: () => void;
  saving?: boolean;
  showPrimaryToggle: boolean;
}) {
  const set = <K extends keyof Contact>(k: K, v: Contact[K]) => onChange({ ...value, [k]: v });
  return (
    <Card className="p-3 space-y-3 border-dashed border-primary/40 bg-primary/5">
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2 sm:col-span-1">
          <Label className="text-xs">Name *</Label>
          <Input value={value.name} maxLength={120} onChange={(e) => set("name", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Relationship</Label>
          <Select value={value.relationship} onValueChange={(v) => set("relationship", v)}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {RELATIONSHIP_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {value.relationship === "other" && (
          <div className="col-span-2">
            <Label className="text-xs">Custom relationship label</Label>
            <Input
              value={value.relationship_other ?? ""}
              maxLength={40}
              placeholder="e.g. Step-father, Coach"
              onChange={(e) => set("relationship_other", e.target.value)}
            />
          </div>
        )}
        <div>
          <Label className="text-xs">Phone</Label>
          <Input value={value.phone ?? ""} maxLength={40} onChange={(e) => set("phone", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Email</Label>
          <Input type="email" value={value.email ?? ""} maxLength={255} onChange={(e) => set("email", e.target.value)} />
        </div>
        <div className="col-span-2">
          <Label className="text-xs">Notes</Label>
          <Textarea rows={2} value={value.notes ?? ""} maxLength={500} onChange={(e) => set("notes", e.target.value)} />
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        {showPrimaryToggle ? (
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={value.is_primary}
              onChange={(e) => set("is_primary", e.target.checked)}
            />
            Mark as primary contact
          </label>
        ) : <span className="text-xs text-muted-foreground">This will be the primary contact.</span>}
        <div className="flex gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={saving}>Cancel</Button>
          <Button type="button" size="sm" onClick={onSave} disabled={saving}>
            {saving && <span className="mr-1"><ArcLoader size={12} /></span>}
            Save contact
          </Button>
        </div>
      </div>
      <div className="text-[11px] text-muted-foreground">
        Name plus a phone or email is enough — you can fill in the rest later.
      </div>
    </Card>
  );
}
