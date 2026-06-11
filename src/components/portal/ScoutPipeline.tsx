import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Binoculars } from "lucide-react";
import { ArcLoader } from "@/components/brand/Brand";
import { toast } from "sonner";
import ScoutLeadForm, { type ScoutLead } from "./ScoutLeadForm";
import ScoutLeadCard from "./ScoutLeadCard";
import { useUserRole } from "@/hooks/useUserRole";

type TopFilter = "All" | "Pursue" | "Watch" | "Mine" | "Stalled";
type StageFilter = "All" | "New" | "Contacted" | "Pack Sent" | "Welcome Sent" | "Signed" | "Lost";

const TOP_FILTERS: TopFilter[] = ["All", "Pursue", "Watch", "Mine", "Stalled"];
const STAGE_FILTERS: StageFilter[] = ["All", "New", "Contacted", "Pack Sent", "Welcome Sent", "Signed", "Lost"];

function daysSince(iso?: string | null) {
  if (!iso) return 0;
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

export default function ScoutPipeline() {
  const { user } = useAuth();
  const { data: roleData } = useUserRole();
  const isAdmin = roleData?.role === "admin";
  const qc = useQueryClient();

  const [filter, setFilter] = useState<TopFilter>("All");
  const [stageFilter, setStageFilter] = useState<StageFilter>("All");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingLead, setEditingLead] = useState<ScoutLead | null>(null);
  const [showConvertModal, setShowConvertModal] = useState<ScoutLead | null>(null);
  const [converting, setConverting] = useState(false);

  const { data: leads = [], isLoading, refetch } = useQuery({
    queryKey: ["scout_leads", user?.id, isAdmin],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("scout_leads")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as ScoutLead[];
    },
    enabled: !!user?.id,
  });

  // Stalled-alert detection (best-effort; needs converted athlete to satisfy schema)
  useEffect(() => {
    if (!leads.length) return;
    const stalled = leads.filter((l) =>
      l.triage_decision === "Pursue" &&
      l.onboarding_stage !== "Signed" &&
      l.onboarding_stage !== "Lost" &&
      daysSince(l.last_stage_change_at) >= 7
    );
    stalled.forEach(async (l) => {
      if (!l.converted_athlete_id) return; // schema requires athlete_id
      const title = `Scout lead stalled: ${l.first_name} ${l.last_name}`;
      const { data: existing } = await (supabase as any)
        .from("athlete_alerts")
        .select("id")
        .eq("title", title)
        .eq("status", "open")
        .limit(1);
      if (existing && existing.length > 0) return;
      await (supabase as any).from("athlete_alerts").insert({
        athlete_id: l.converted_athlete_id,
        alert_type: "scout_stage_stalled",
        severity: "medium",
        status: "open",
        title,
        description: `Has been at ${l.onboarding_stage} stage for ${daysSince(l.last_stage_change_at)} days`,
        assigned_to: l.assigned_agent_id,
      });
    });
  }, [leads]);

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (filter === "Pursue" && l.triage_decision !== "Pursue") return false;
      if (filter === "Watch" && l.triage_decision !== "Watch") return false;
      if (filter === "Mine" && l.assigned_agent_id !== user?.id) return false;
      if (filter === "Stalled") {
        const days = daysSince(l.last_stage_change_at);
        if (!(days >= 7 && l.onboarding_stage !== "Signed" && l.onboarding_stage !== "Lost" && l.onboarding_stage !== "New")) return false;
      }
      if (stageFilter !== "All" && l.onboarding_stage !== stageFilter) return false;
      return true;
    });
  }, [leads, filter, stageFilter, user?.id]);

  // Metrics
  const totalPursue = leads.filter((l) => l.triage_decision === "Pursue").length;
  const atContactOrLater = leads.filter((l) => ["Contacted", "Pack Sent", "Welcome Sent"].includes(l.onboarding_stage || "")).length;
  const signedThisYear = leads.filter((l) => {
    if (l.onboarding_stage !== "Signed" || !l.date_signed) return false;
    return new Date(l.date_signed).getFullYear() === new Date().getFullYear();
  }).length;
  const stalledCount = leads.filter((l) =>
    daysSince(l.last_stage_change_at) >= 7 &&
    l.onboarding_stage !== "Signed" &&
    l.onboarding_stage !== "Lost" &&
    l.onboarding_stage !== "New"
  ).length;

  async function handleStageChange(id: string, stage: string) {
    const fields: any = { onboarding_stage: stage };
    const today = new Date().toISOString().slice(0, 10);
    if (stage === "Contacted") fields.date_contacted = today;
    if (stage === "Pack Sent") fields.date_pack_sent = today;
    if (stage === "Welcome Sent") fields.date_welcome_sent = today;
    if (stage === "Signed") fields.date_signed = today;
    if (stage === "Lost") fields.date_lost = today;
    const { error } = await (supabase as any).from("scout_leads").update(fields).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Stage → ${stage}`);
    refetch();
  }

  async function handleActionUpdate(id: string, fields: Partial<ScoutLead>) {
    const { error } = await (supabase as any).from("scout_leads").update(fields).eq("id", id);
    if (error) return toast.error(error.message);
    refetch();
  }

  async function handleConfirmConvert() {
    if (!showConvertModal) return;
    setConverting(true);
    const lead = showConvertModal;
    try {
      const { data: athlete, error: athErr } = await (supabase as any)
        .from("athletes")
        .insert({
          first_name: lead.first_name,
          last_name: lead.last_name,
          position: lead.position,
          school: lead.school_club,
          assigned_agent_name: lead.assigned_agent_name,
          assigned_agent_user_id: lead.assigned_agent_id,
        })
        .select("id")
        .single();
      if (athErr) throw athErr;

      const { error: updErr } = await (supabase as any)
        .from("scout_leads")
        .update({
          onboarding_stage: "Signed",
          date_signed: new Date().toISOString().slice(0, 10),
          converted_athlete_id: athlete.id,
        })
        .eq("id", lead.id);
      if (updErr) throw updErr;

      toast.success(`${lead.first_name} ${lead.last_name} profile created — find them in your Roster`);
      setShowConvertModal(null);
      qc.invalidateQueries({ queryKey: ["athletes"] });
      refetch();
    } catch (e: any) {
      toast.error(e.message || "Conversion failed");
    } finally {
      setConverting(false);
    }
  }

  return (
    <div className="space-y-4 p-3 sm:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Binoculars className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold" style={{ fontFamily: "var(--font-heading)" }}>Scout pipeline</h1>
        </div>
        <Button onClick={() => { setEditingLead(null); setShowAddForm(true); }} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Add lead
        </Button>
      </div>

      {/* Dashboard strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <Card className="border-primary/40">
          <CardContent className="p-3">
            <div className="text-2xl font-bold">{totalPursue}</div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Pursue</div>
          </CardContent>
        </Card>
        <Card className="border-primary/40">
          <CardContent className="p-3">
            <div className="text-2xl font-bold">{atContactOrLater}</div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">At contact+</div>
          </CardContent>
        </Card>
        <Card className="border-emerald-500/40">
          <CardContent className="p-3">
            <div className="text-2xl font-bold">{signedThisYear}</div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Signed {new Date().getFullYear()}</div>
          </CardContent>
        </Card>
        <Card className="border-amber-500/40">
          <CardContent className="p-3">
            <div className="text-2xl font-bold">{stalledCount}</div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Stalled</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1">
          {TOP_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-2.5 py-1 rounded-md border transition ${
                filter === f
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:bg-secondary"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1">
          {STAGE_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStageFilter(s)}
              className={`text-[11px] px-2 py-0.5 rounded-md border transition ${
                stageFilter === s
                  ? "bg-secondary text-foreground border-border"
                  : "border-transparent text-muted-foreground hover:bg-secondary/50"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Add / Edit form */}
      {(showAddForm || editingLead) && (
        <ScoutLeadForm
          editLead={editingLead || undefined}
          onClose={() => { setShowAddForm(false); setEditingLead(null); }}
          onSaved={() => refetch()}
        />
      )}

      {/* Convert modal */}
      {showConvertModal && (
        <Card className="border-emerald-500/40">
          <CardHeader>
            <CardTitle className="text-base">Convert {showConvertModal.first_name} {showConvertModal.last_name} to athlete profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              This will create a full athlete profile for {showConvertModal.first_name} {showConvertModal.last_name} pre-filled from their scout record. Their scout lead will be marked as Signed.
            </p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">First name:</span> <span className="font-medium">{showConvertModal.first_name}</span></div>
              <div><span className="text-muted-foreground">Last name:</span> <span className="font-medium">{showConvertModal.last_name}</span></div>
              <div><span className="text-muted-foreground">Position:</span> <span className="font-medium">{showConvertModal.position || "—"}</span></div>
              <div><span className="text-muted-foreground">School/Club:</span> <span className="font-medium">{showConvertModal.school_club || "—"}</span></div>
              <div className="col-span-2"><span className="text-muted-foreground">Assigned agent:</span> <span className="font-medium">{showConvertModal.assigned_agent_name || "Unassigned"}</span></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowConvertModal(null)} disabled={converting}>Cancel</Button>
              <Button onClick={handleConfirmConvert} disabled={converting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {converting && <span className="mr-2"><ArcLoader size={16} /></span>}
                Create athlete profile
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* List */}
      {isLoading ? (
        <Card><CardContent className="p-6 flex items-center justify-center gap-2 text-muted-foreground">
          <ArcLoader size={16} /><span className="text-sm">Loading leads…</span>
        </CardContent></Card>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
          {leads.length === 0
            ? "No leads yet. Tap 'Add lead' to log your first player."
            : "No leads match these filters."}
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((lead) => (
            <ScoutLeadCard
              key={lead.id}
              lead={lead}
              onEdit={(l) => { setShowAddForm(false); setEditingLead(l); }}
              onStageChange={handleStageChange}
              onActionUpdate={handleActionUpdate}
              onConvertToAthlete={(l) => setShowConvertModal(l)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
