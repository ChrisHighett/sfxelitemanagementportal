import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, ArrowRight, AlertTriangle } from "lucide-react";
import type { ScoutLead } from "./ScoutLeadForm";

const STAGES = ["New", "Contacted", "Pack Sent", "Welcome Sent", "Signed", "Lost"];

function ratingBadge(rating?: string | null) {
  if (!rating) return null;
  const style: React.CSSProperties =
    rating === "A"
      ? { background: "var(--success-soft)", color: "var(--success-deep)", borderColor: "var(--success-soft)" }
      : rating === "B"
      ? { background: "var(--win-soft)", color: "var(--win-deep)", borderColor: "var(--win-soft)" }
      : { background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))", borderColor: "hsl(var(--border))" };
  return <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded border" style={style}>{rating}</span>;
}

function triageBadge(t?: string | null) {
  if (!t) return null;
  const style: React.CSSProperties =
    t === "Pursue"
      ? { background: "var(--brand-base-soft)", color: "var(--brand-accent)", borderColor: "var(--brand-base-line)" }
      : t === "Watch"
      ? { background: "var(--win-soft)", color: "var(--win-deep)", borderColor: "var(--win-soft)" }
      : { background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))", borderColor: "hsl(var(--border))" };
  return <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border" style={style}>{t}</span>;
}

interface Props {
  lead: ScoutLead;
  onEdit: (lead: ScoutLead) => void;
  onStageChange: (id: string, stage: string) => void;
  onActionUpdate: (id: string, fields: Partial<ScoutLead>) => void;
  onConvertToAthlete: (lead: ScoutLead) => void;
}

export default function ScoutLeadCard({ lead, onEdit, onStageChange, onActionUpdate, onConvertToAthlete }: Props) {
  const [actionRequired, setActionRequired] = useState(lead.action_required ?? "");
  const [dueDate, setDueDate] = useState(lead.action_due_date ?? "");
  const [actionStatus, setActionStatus] = useState(lead.action_status ?? "Open");
  const [nextStep, setNextStep] = useState(lead.next_step ?? "");

  const showActionRow = ["Contacted", "Pack Sent", "Welcome Sent"].includes(lead.onboarding_stage || "");
  const hasCompetition = !!(lead.competitor_interest && lead.competitor_interest.trim() !== "");

  return (
    <div className="rounded-xl border border-border bg-card p-3 sm:p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          {lead.lead_id && (
            <Badge className="bg-primary/15 text-primary border border-primary/30 hover:bg-primary/20 text-[10px]">
              {lead.lead_id}
            </Badge>
          )}
          <span className="font-bold truncate">{lead.first_name} {lead.last_name}</span>
          <span className="text-xs text-muted-foreground">
            {[lead.age && `${lead.age}y`, lead.position, lead.region].filter(Boolean).join(" · ")}
          </span>
          {ratingBadge(lead.scout_rating)}
          {triageBadge(lead.triage_decision)}
        </div>
        <Button variant="ghost" size="sm" onClick={() => onEdit(lead)} className="h-7 px-2">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Body row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
        <div>
          <div className="text-muted-foreground">School / Club</div>
          <div className="font-medium truncate">{lead.school_club || "—"}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Assigned to</div>
          <div className="font-medium truncate">{lead.assigned_agent_name || "Unassigned"}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Competitor interest</div>
          <div className={`font-medium truncate flex items-center gap-1 ${hasCompetition ? "text-destructive" : ""}`}>
            {hasCompetition && <AlertTriangle className="h-3 w-3" />}
            {lead.competitor_interest || "—"}
          </div>
        </div>
      </div>

      {/* Stage pills */}
      <div className="flex flex-wrap items-center gap-1">
        {STAGES.map((s, i) => {
          const active = lead.onboarding_stage === s;
          const isTerminal = s === "Signed" || s === "Lost";
          return (
            <div key={s} className="flex items-center gap-1">
              <button
                onClick={() => onStageChange(lead.id, s)}
                className="text-[10px] sm:text-[11px] font-medium px-2 py-1 rounded-md border transition"
                style={
                  active
                    ? s === "Signed"
                      ? { background: "var(--success-soft)", color: "var(--success-deep)", borderColor: "var(--success-soft)" }
                      : s === "Lost"
                      ? { background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))", borderColor: "hsl(var(--border))" }
                      : { background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", borderColor: "hsl(var(--primary))" }
                    : undefined
                }
              >
                {s}
              </button>
              {i < STAGES.length - 1 && !isTerminal && (
                <ArrowRight className="h-3 w-3 text-muted-foreground/50" />
              )}
            </div>
          );
        })}
        {lead.onboarding_stage === "Lost" && lead.lost_reason && (
          <span
            className="text-[10px] font-medium px-1.5 py-0.5 rounded border ml-1"
            style={{ background: "hsl(var(--destructive) / 0.08)", color: "hsl(var(--destructive))", borderColor: "hsl(var(--destructive) / 0.25)" }}
            title={lead.lost_reason}
          >
            {(lead.lost_reason.split(" — ")[0] || lead.lost_reason).trim()}
          </span>
        )}
      </div>

      {/* Action row */}
      {showActionRow && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2 border-t border-border/50">
          <Input
            placeholder="Action required"
            value={actionRequired}
            onChange={(e) => setActionRequired(e.target.value)}
            onBlur={() => actionRequired !== (lead.action_required ?? "") && onActionUpdate(lead.id, { action_required: actionRequired })}
            className="h-8 text-xs"
          />
          <Input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            onBlur={() => dueDate !== (lead.action_due_date ?? "") && onActionUpdate(lead.id, { action_due_date: dueDate || null })}
            className="h-8 text-xs"
          />
          <Select
            value={actionStatus}
            onValueChange={(v) => {
              setActionStatus(v as any);
              onActionUpdate(lead.id, { action_status: v as any });
            }}
          >
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Open">Open</SelectItem>
              <SelectItem value="In Progress">In Progress</SelectItem>
              <SelectItem value="Done">Done</SelectItem>
              <SelectItem value="N/A">N/A</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="Next step"
            value={nextStep}
            onChange={(e) => setNextStep(e.target.value)}
            onBlur={() => nextStep !== (lead.next_step ?? "") && onActionUpdate(lead.id, { next_step: nextStep })}
            className="h-8 text-xs"
          />
        </div>
      )}

      {/* Terminal stage actions */}
      {lead.onboarding_stage === "Signed" && !lead.converted_athlete_id && (
        <Button
          onClick={() => onConvertToAthlete(lead)}
          style={{ background: "var(--success)", color: "#fff" }}
          size="sm"
        >
          Convert to athlete profile →
        </Button>
      )}
      {lead.onboarding_stage === "Signed" && lead.converted_athlete_id && (
        <div className="text-xs font-medium" style={{ color: "var(--success-deep)" }}>✓ Athlete profile created</div>
      )}
      {lead.onboarding_stage === "Lost" && (
        <div className="text-xs text-muted-foreground italic">Archived — Lost</div>
      )}
    </div>
  );
}
