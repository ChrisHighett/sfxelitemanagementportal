import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Building2, ChevronRight, ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface Agency {
  id: string;
  name: string;
  slug: string;
  legal_name: string | null;
  trading_name: string | null;
  sport: string | null;
  region: string | null;
  created_at: string;
  // billing
  billing_contact_name?: string | null;
  billing_email?: string | null;
  billing_address?: string | null;
  abn?: string | null;
  plan_tier?: string | null;
  agreed_price?: number | null;
  currency?: string | null;
  billing_cycle?: string | null;
  licensed_seats?: number | null;
  included_client_limit?: number | null;
  contract_start_date?: string | null;
  trial_period_months?: number | null;
  payment_terms?: string | null;
  account_status?: string | null;
}

const SPORTS = ["AFL", "Cricket", "NRL", "Other"];
const PLANS = ["Core", "Pro", "Enterprise"];
const CYCLES = ["Monthly", "Annual"];
const TERMS = ["14 days", "30 days"];
const STATUSES = ["Trial", "Active", "Suspended"];

export default function AgencyManager() {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [legalName, setLegalName] = useState("");
  const [tradingName, setTradingName] = useState("");
  const [sport, setSport] = useState<string>("");
  const [region, setRegion] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("agencies")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Failed to load agencies", description: error.message, variant: "destructive" });
    } else {
      setAgencies((data ?? []) as Agency[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const reset = () => {
    setLegalName("");
    setTradingName("");
    setSport("");
    setRegion("");
    setShowForm(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!legalName.trim() || !tradingName.trim()) {
      toast({ title: "Legal name and trading name are required", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.rpc("create_agency", {
      _legal_name: legalName.trim(),
      _trading_name: tradingName.trim(),
      _sport: sport || null,
      _region: region.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Could not create agency", description: error.message, variant: "destructive" });
      return;
    }
    const created = Array.isArray(data) ? data[0] : data;
    toast({
      title: "Agency created",
      description: `${created?.trading_name ?? tradingName} is now on the platform.`,
    });
    reset();
    load();
  };

  const selected = agencies.find((a) => a.id === selectedId) ?? null;

  if (selected) {
    return (
      <AgencyDetail
        agency={selected}
        onBack={() => setSelectedId(null)}
        onSaved={async () => {
          await load();
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Building2 className="h-5 w-5" /> Agencies
          </h3>
          <p className="text-sm text-muted-foreground">
            Eleva Ops only. Create and review tenant agencies on the platform.
          </p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Create new agency
          </Button>
        )}
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Create new agency</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="legal_name">Legal entity name *</Label>
                <Input
                  id="legal_name"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  placeholder="e.g. TGI Sport Pty Ltd"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="trading_name">Trading / display name *</Label>
                <Input
                  id="trading_name"
                  value={tradingName}
                  onChange={(e) => setTradingName(e.target.value)}
                  placeholder="Shown inside the app, e.g. TGI Sport"
                  required
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="sport">Sport / code</Label>
                  <Select value={sport} onValueChange={setSport}>
                    <SelectTrigger id="sport">
                      <SelectValue placeholder="Select sport" />
                    </SelectTrigger>
                    <SelectContent>
                      {SPORTS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="region">State / region</Label>
                  <Input
                    id="region"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    placeholder="Optional, e.g. VIC"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  Create agency
                </Button>
                <Button type="button" variant="ghost" onClick={reset} disabled={submitting}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All agencies ({agencies.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : agencies.length === 0 ? (
            <p className="text-sm text-muted-foreground">No agencies yet.</p>
          ) : (
            <div className="divide-y">
              {agencies.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setSelectedId(a.id)}
                  className="w-full py-3 flex flex-wrap items-center justify-between gap-2 text-left hover:bg-muted/40 px-2 -mx-2 rounded transition-colors cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="font-medium">{a.trading_name ?? a.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {a.legal_name ?? a.name}
                      {a.sport ? ` · ${a.sport}` : ""}
                      {a.region ? ` · ${a.region}` : ""}
                      {" · "}slug: {a.slug}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {new Date(a.created_at).toLocaleDateString()}
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface AgencyDetailProps {
  agency: Agency;
  onBack: () => void;
  onSaved: () => Promise<void> | void;
}

function AgencyDetail({ agency, onBack, onSaved }: AgencyDetailProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [legalName, setLegalName] = useState(agency.legal_name ?? agency.name ?? "");
  const [tradingName, setTradingName] = useState(agency.trading_name ?? agency.name ?? "");
  const [sport, setSport] = useState(agency.sport ?? "");
  const [region, setRegion] = useState(agency.region ?? "");
  const [current, setCurrent] = useState<Agency>(agency);

  const cancel = () => {
    setLegalName(current.legal_name ?? current.name ?? "");
    setTradingName(current.trading_name ?? current.name ?? "");
    setSport(current.sport ?? "");
    setRegion(current.region ?? "");
    setEditing(false);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!legalName.trim() || !tradingName.trim()) {
      toast({ title: "Legal name and trading name are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { data, error } = await supabase.rpc("update_agency", {
      _agency_id: current.id,
      _legal_name: legalName.trim(),
      _trading_name: tradingName.trim(),
      _sport: sport || null,
      _region: region.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Could not save changes", description: error.message, variant: "destructive" });
      return;
    }
    const updated = (Array.isArray(data) ? data[0] : data) as Agency;
    setCurrent(updated);
    toast({ title: "Agency updated" });
    setEditing(false);
    await onSaved();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" /> All agencies
          </Button>
          <div className="min-w-0">
            <h3 className="text-lg font-semibold truncate">
              {current.trading_name ?? current.name}
            </h3>
            <p className="text-xs text-muted-foreground">Agency detail</p>
          </div>
        </div>
        {!editing && (
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4 mr-1" /> Edit
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Core details</CardTitle>
        </CardHeader>
        <CardContent>
          {editing ? (
            <form onSubmit={save} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="d_legal">Legal entity name *</Label>
                <Input id="d_legal" value={legalName} onChange={(e) => setLegalName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="d_trading">Trading / display name *</Label>
                <Input id="d_trading" value={tradingName} onChange={(e) => setTradingName(e.target.value)} required />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="d_sport">Sport / code</Label>
                  <Select value={sport} onValueChange={setSport}>
                    <SelectTrigger id="d_sport">
                      <SelectValue placeholder="Select sport" />
                    </SelectTrigger>
                    <SelectContent>
                      {SPORTS.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="d_region">State / region</Label>
                  <Input id="d_region" value={region} onChange={(e) => setRegion(e.target.value)} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  Save changes
                </Button>
                <Button type="button" variant="ghost" onClick={cancel} disabled={saving}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <dl className="grid gap-4 sm:grid-cols-2 text-sm">
              <DetailRow label="Legal entity name" value={current.legal_name ?? "—"} />
              <DetailRow label="Trading / display name" value={current.trading_name ?? current.name} />
              <DetailRow label="Sport / code" value={current.sport ?? "—"} />
              <DetailRow label="State / region" value={current.region ?? "—"} />
              <DetailRow label="Slug" value={current.slug} mono />
              <DetailRow label="Created" value={new Date(current.created_at).toLocaleString()} />
            </dl>
          )}
        </CardContent>
      </Card>

      <BillingCard
        agency={current}
        onSaved={async (updated) => {
          setCurrent(updated);
          await onSaved();
        }}
      />

      <MembersCard agencyId={current.id} />

      <DivisionsCard agencyId={current.id} />





      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base text-muted-foreground">Feature toggles</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Coming soon.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={`mt-1 ${mono ? "font-mono text-xs" : ""}`}>{value}</dd>
    </div>
  );
}

function fmtMoney(amount: number | null | undefined, currency: string | null | undefined) {
  if (amount === null || amount === undefined) return "—";
  const cur = currency || "AUD";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: cur }).format(Number(amount));
  } catch {
    return `${cur} ${amount}`;
  }
}

function BillingCard({
  agency,
  onSaved,
}: {
  agency: Agency;
  onSaved: (updated: Agency) => Promise<void> | void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [contact, setContact] = useState(agency.billing_contact_name ?? "");
  const [email, setEmail] = useState(agency.billing_email ?? "");
  const [address, setAddress] = useState(agency.billing_address ?? "");
  const [abn, setAbn] = useState(agency.abn ?? "");
  const [plan, setPlan] = useState(agency.plan_tier ?? "");
  const [price, setPrice] = useState<string>(agency.agreed_price?.toString() ?? "");
  const [currency, setCurrency] = useState(agency.currency ?? "AUD");
  const [cycle, setCycle] = useState(agency.billing_cycle ?? "");
  const [seats, setSeats] = useState<string>(agency.licensed_seats?.toString() ?? "");
  const [clientLimit, setClientLimit] = useState<string>(agency.included_client_limit?.toString() ?? "");
  const [contractStart, setContractStart] = useState(agency.contract_start_date ?? "");
  const [trial, setTrial] = useState<string>(agency.trial_period_months?.toString() ?? "");
  const [terms, setTerms] = useState(agency.payment_terms ?? "");
  const [status, setStatus] = useState(agency.account_status ?? "");

  const resetFrom = (a: Agency) => {
    setContact(a.billing_contact_name ?? "");
    setEmail(a.billing_email ?? "");
    setAddress(a.billing_address ?? "");
    setAbn(a.abn ?? "");
    setPlan(a.plan_tier ?? "");
    setPrice(a.agreed_price?.toString() ?? "");
    setCurrency(a.currency ?? "AUD");
    setCycle(a.billing_cycle ?? "");
    setSeats(a.licensed_seats?.toString() ?? "");
    setClientLimit(a.included_client_limit?.toString() ?? "");
    setContractStart(a.contract_start_date ?? "");
    setTrial(a.trial_period_months?.toString() ?? "");
    setTerms(a.payment_terms ?? "");
    setStatus(a.account_status ?? "");
  };

  const cancel = () => {
    resetFrom(agency);
    setEditing(false);
  };

  const numOrNull = (s: string): number | null => {
    if (s.trim() === "") return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  };
  const intOrNull = (s: string): number | null => {
    if (s.trim() === "") return null;
    const n = parseInt(s, 10);
    return Number.isFinite(n) ? n : null;
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { data, error } = await supabase.rpc("update_agency_billing", {
      _agency_id: agency.id,
      _billing_contact_name: contact || null,
      _billing_email: email || null,
      _billing_address: address || null,
      _abn: abn || null,
      _plan_tier: plan || null,
      _agreed_price: numOrNull(price),
      _currency: currency || null,
      _billing_cycle: cycle || null,
      _licensed_seats: intOrNull(seats),
      _included_client_limit: intOrNull(clientLimit),
      _contract_start_date: contractStart || null,
      _trial_period_months: intOrNull(trial),
      _payment_terms: terms || null,
      _account_status: status || null,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Could not save billing", description: error.message, variant: "destructive" });
      return;
    }
    const updated = (Array.isArray(data) ? data[0] : data) as Agency;
    toast({ title: "Billing updated" });
    setEditing(false);
    await onSaved(updated);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Billing</CardTitle>
        {!editing && (
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4 mr-1" /> Edit billing
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {editing ? (
          <form onSubmit={save} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Billing contact name">
                <Input value={contact} onChange={(e) => setContact(e.target.value)} />
              </Field>
              <Field label="Billing email">
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </Field>
            </div>
            <Field label="Billing address">
              <Textarea rows={2} value={address} onChange={(e) => setAddress(e.target.value)} />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="ABN">
                <Input value={abn} onChange={(e) => setAbn(e.target.value)} />
              </Field>
              <Field label="Account status">
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Plan / tier">
                <Select value={plan} onValueChange={setPlan}>
                  <SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger>
                  <SelectContent>
                    {PLANS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Agreed price">
                <Input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
              </Field>
              <Field label="Currency">
                <Input value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="AUD" />
              </Field>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Billing cycle">
                <Select value={cycle} onValueChange={setCycle}>
                  <SelectTrigger><SelectValue placeholder="Select cycle" /></SelectTrigger>
                  <SelectContent>
                    {CYCLES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Payment terms">
                <Select value={terms} onValueChange={setTerms}>
                  <SelectTrigger><SelectValue placeholder="Select terms" /></SelectTrigger>
                  <SelectContent>
                    {TERMS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Contract start date">
                <Input type="date" value={contractStart} onChange={(e) => setContractStart(e.target.value)} />
              </Field>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Licensed seats">
                <Input type="number" min="0" value={seats} onChange={(e) => setSeats(e.target.value)} />
              </Field>
              <Field label="Included client limit">
                <Input type="number" min="0" value={clientLimit} onChange={(e) => setClientLimit(e.target.value)} />
              </Field>
              <Field label="Free / trial period (months)">
                <Input type="number" min="0" value={trial} onChange={(e) => setTrial(e.target.value)} />
              </Field>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Save billing
              </Button>
              <Button type="button" variant="ghost" onClick={cancel} disabled={saving}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <dl className="grid gap-4 sm:grid-cols-2 text-sm">
            <DetailRow label="Billing contact name" value={agency.billing_contact_name ?? "—"} />
            <DetailRow label="Billing email" value={agency.billing_email ?? "—"} />
            <DetailRow label="Billing address" value={agency.billing_address ?? "—"} />
            <DetailRow label="ABN" value={agency.abn ?? "—"} />
            <DetailRow label="Plan / tier" value={agency.plan_tier ?? "—"} />
            <DetailRow label="Account status" value={agency.account_status ?? "—"} />
            <DetailRow label="Agreed price" value={fmtMoney(agency.agreed_price, agency.currency)} />
            <DetailRow label="Currency" value={agency.currency ?? "AUD"} />
            <DetailRow label="Billing cycle" value={agency.billing_cycle ?? "—"} />
            <DetailRow label="Payment terms" value={agency.payment_terms ?? "—"} />
            <DetailRow label="Licensed seats" value={agency.licensed_seats?.toString() ?? "—"} />
            <DetailRow label="Included client limit" value={agency.included_client_limit?.toString() ?? "—"} />
            <DetailRow
              label="Contract start date"
              value={agency.contract_start_date ? new Date(agency.contract_start_date).toLocaleDateString() : "—"}
            />
            <DetailRow
              label="Free / trial period"
              value={agency.trial_period_months !== null && agency.trial_period_months !== undefined
                ? `${agency.trial_period_months} month${agency.trial_period_months === 1 ? "" : "s"}`
                : "—"}
            />
          </dl>
        )}
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

interface Member {
  id: string;
  display_name: string | null;
  email: string | null;
  role: string | null;
  approved: boolean | null;
  division_id: string | null;
  phone: string | null;
}

interface DivisionLite {
  id: string;
  name: string;
}

function MembersCard({ agencyId }: { agencyId: string }) {
  const { user } = useAuth();
  const currentUserId = user?.id ?? null;
  const [members, setMembers] = useState<Member[]>([]);
  const [divisions, setDivisions] = useState<DivisionLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editMember, setEditMember] = useState<Member | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const openEdit = (m: Member) => {
    setEditMember(m);
    setEditName(m.display_name ?? "");
    setEditPhone(m.phone ?? "");
  };

  const saveEdit = async () => {
    if (!editMember) return;
    if (!editName.trim()) {
      toast({ title: "Display name required", variant: "destructive" });
      return;
    }
    setEditSaving(true);
    const { data, error } = await supabase.rpc("update_member_profile" as any, {
      _user_id: editMember.id,
      _display_name: editName.trim(),
      _phone: editPhone.trim() || null,
    });
    setEditSaving(false);
    if (error) {
      toast({ title: "Could not save", description: error.message, variant: "destructive" });
      return;
    }
    const updated = (Array.isArray(data) ? data[0] : data) as Member | null;
    setMembers((prev) =>
      prev.map((m) =>
        m.id === editMember.id
          ? { ...m, display_name: updated?.display_name ?? editName.trim(), phone: updated?.phone ?? (editPhone.trim() || null) }
          : m,
      ),
    );
    setEditMember(null);
    toast({ title: "Member updated" });
  };


  const load = async () => {
    setLoading(true);
    const [{ data: mData, error: mErr }, { data: dData, error: dErr }] = await Promise.all([
      supabase
        .from("portal_users")
        .select("id, display_name, email, role, approved, division_id, phone" as any)
        .eq("agency_id", agencyId)
        .order("role", { ascending: true }),
      supabase
        .from("agency_divisions" as any)
        .select("id, name")
        .eq("agency_id", agencyId)
        .order("name", { ascending: true }),
    ]);
    if (mErr) {
      toast({ title: "Failed to load members", description: mErr.message, variant: "destructive" });
      setMembers([]);
    } else {
      setMembers(((mData as unknown) ?? []) as Member[]);
    }
    if (dErr) {
      toast({ title: "Failed to load divisions", description: dErr.message, variant: "destructive" });
      setDivisions([]);
    } else {
      setDivisions(((dData as unknown) ?? []) as DivisionLite[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agencyId]);

  const setDivision = async (userId: string, divisionId: string | null) => {
    setSavingId(userId);
    const { data, error } = await supabase.rpc("set_member_division" as any, {
      _user_id: userId,
      _division_id: divisionId,
    });
    setSavingId(null);
    if (error) {
      toast({ title: "Could not update division", description: error.message, variant: "destructive" });
      return;
    }
    const updated = (Array.isArray(data) ? data[0] : data) as { division_id: string | null } | null;
    setMembers((prev) =>
      prev.map((m) =>
        m.id === userId ? { ...m, division_id: updated?.division_id ?? divisionId } : m,
      ),
    );
    toast({ title: "Division updated" });
  };

  const toggleActive = async (userId: string, currentApproved: boolean) => {
    setSavingId(userId);
    const { error } = await supabase.rpc("set_member_active" as any, {
      _user_id: userId,
      _active: !currentApproved,
    });
    setSavingId(null);
    if (error) {
      toast({ title: "Could not update status", description: error.message, variant: "destructive" });
      return;
    }
    setMembers((prev) =>
      prev.map((m) => (m.id === userId ? { ...m, approved: !currentApproved } : m)),
    );
    toast({ title: currentApproved ? "Member deactivated" : "Member reactivated" });
  };

  const setRole = async (userId: string, newRole: string, currentDivisionId: string | null) => {
    if (newRole === "divisional_gm") {
      if (divisions.length === 0) {
        toast({
          title: "No divisions available",
          description: "Add a division to this agency before assigning a Divisional GM.",
          variant: "destructive",
        });
        return;
      }
      if (!currentDivisionId) {
        toast({
          title: "Division required",
          description: "Set the member's division first, then assign the Divisional GM role.",
          variant: "destructive",
        });
        return;
      }
    }
    setSavingId(userId);
    const { data, error } = await supabase.rpc("set_member_role" as any, {
      _user_id: userId,
      _role: newRole,
      _division_id: newRole === "divisional_gm" ? currentDivisionId : null,
    });
    setSavingId(null);
    if (error) {
      toast({ title: "Could not update role", description: error.message, variant: "destructive" });
      return;
    }
    const updated = (Array.isArray(data) ? data[0] : data) as
      | { role: string | null; division_id: string | null }
      | null;
    setMembers((prev) =>
      prev.map((m) =>
        m.id === userId
          ? {
              ...m,
              role: updated?.role ?? newRole,
              division_id: updated ? updated.division_id : m.division_id,
            }
          : m,
      ),
    );
    toast({ title: "Role updated" });
  };

  const ROLE_OPTIONS: { value: string; label: string }[] = [
    { value: "agent", label: "Agent" },
    { value: "scout", label: "Scout" },
    { value: "admin", label: "Admin" },
    { value: "divisional_gm", label: "Divisional GM" },
    { value: "agency_gm", label: "Agency GM" },
    { value: "eleva_ops", label: "Eleva Ops" },
  ];

  const isStaffRole = (r: string | null | undefined) =>
    !!r && ROLE_OPTIONS.some((o) => o.value === r);

  const NONE_VALUE = "__none__";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Users in this agency ({members.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : members.length === 0 ? (
          <p className="text-sm text-muted-foreground">No members yet.</p>
        ) : (
          <div className="divide-y">
            {members.map((m) => {
              const current = divisions.find((d) => d.id === m.division_id);
              return (
                <div key={m.id} className="py-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0 flex items-start gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 shrink-0 -ml-1"
                      title="Edit name & phone"
                      aria-label="Edit member profile"
                      disabled={savingId === m.id}
                      onClick={() => openEdit(m)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <div className="min-w-0">
                      <div className="font-medium flex items-center gap-2">
                        <span>{m.display_name ?? m.email ?? "—"}</span>
                        <button
                          type="button"
                          onClick={() => openEdit(m)}
                          className="text-xs text-primary hover:underline"
                        >
                          Edit
                        </button>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {m.email ?? "no email"}{m.phone ? ` · ${m.phone}` : ""}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs flex-wrap justify-end">
                    {divisions.length === 0 ? (
                      <span className="text-muted-foreground">Division: —</span>
                    ) : (
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">Division:</span>
                        <Select
                          value={m.division_id ?? NONE_VALUE}
                          onValueChange={(v) =>
                            setDivision(m.id, v === NONE_VALUE ? null : v)
                          }
                          disabled={savingId === m.id}
                        >
                          <SelectTrigger className="h-7 w-[140px] text-xs">
                            <SelectValue placeholder={current?.name ?? "—"} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NONE_VALUE}>—</SelectItem>
                            {divisions.map((d) => (
                              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {savingId === m.id && <Loader2 className="h-3 w-3 animate-spin" />}
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">Role:</span>
                      <Select
                        value={isStaffRole(m.role) ? (m.role as string) : undefined}
                        onValueChange={(v) => setRole(m.id, v, m.division_id)}
                        disabled={savingId === m.id}
                      >
                        <SelectTrigger className="h-7 w-[150px] text-xs capitalize">
                          <SelectValue placeholder={m.role ?? "Set role"} />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLE_OPTIONS.map((r) => (
                            <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded ${
                        m.approved
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {m.approved ? "Active" : "Inactive"}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      disabled={savingId === m.id}
                      onClick={() => openEdit(m)}
                    >
                      <Pencil className="h-3 w-3 mr-1" />Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      disabled={savingId === m.id}
                      onClick={() => toggleActive(m.id, !!m.approved)}
                    >
                      {m.approved ? "Deactivate" : "Reactivate"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
      <Dialog open={!!editMember} onOpenChange={(o) => !o && setEditMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit member</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="edit-name">Display name</Label>
              <Input id="edit-name" value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="edit-phone">Phone / mobile</Label>
              <Input id="edit-phone" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="e.g. 0412 345 678" />
            </div>
            <p className="text-xs text-muted-foreground">
              Email and password aren't editable here — they're managed via authentication.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMember(null)} disabled={editSaving}>Cancel</Button>
            <Button onClick={saveEdit} disabled={editSaving}>
              {editSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}


interface Division {
  id: string;
  agency_id: string;
  name: string;
  created_at: string;
}

function DivisionsCard({ agencyId }: { agencyId: string }) {
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("agency_divisions" as any)
      .select("*")
      .eq("agency_id", agencyId)
      .order("name", { ascending: true });
    if (error) {
      toast({ title: "Failed to load divisions", description: error.message, variant: "destructive" });
    } else {
      setDivisions(((data as unknown) ?? []) as Division[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agencyId]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setAdding(true);
    const { error } = await supabase
      .from("agency_divisions" as any)
      .insert({ agency_id: agencyId, name: trimmed } as any);
    setAdding(false);
    if (error) {
      toast({ title: "Could not add division", description: error.message, variant: "destructive" });
      return;
    }
    setName("");
    toast({ title: "Division added" });
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("agency_divisions" as any).delete().eq("id", id);
    if (error) {
      toast({ title: "Could not remove", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Division removed" });
    load();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Divisions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={add} className="flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Add a division (e.g. AFL, Cricket)"
          />
          <Button type="submit" size="sm" disabled={adding || !name.trim()}>
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </form>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : divisions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No divisions yet.</p>
        ) : (
          <div className="divide-y">
            {divisions.map((d) => (
              <div key={d.id} className="py-2 flex items-center justify-between gap-2">
                <span className="font-medium">{d.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(d.id)}
                  aria-label={`Remove ${d.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}


