import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, X, Plus, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

export interface ExtractedItem {
  task: string;
  due_date: string | null;
  relative_phrase: string | null;
  needs_date: boolean;
  priority: "high" | "medium" | "low";
}

interface Props {
  athleteId: string;
  conversationId: string | null;
  items: ExtractedItem[];
  onAllResolved?: () => void;
}

type RowState = ExtractedItem & {
  _key: string;
  _status: "pending" | "adding" | "added" | "dismissed";
};

const PRIORITY_TO_INT: Record<ExtractedItem["priority"], number> = {
  high: 1,
  medium: 3,
  low: 5,
};

const PRIORITY_OPTIONS: ExtractedItem["priority"][] = ["high", "medium", "low"];

export default function ActionItemConfirmPanel({
  athleteId,
  conversationId,
  items,
  onAllResolved,
}: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [rows, setRows] = useState<RowState[]>(() =>
    items.map((it, i) => ({
      ...it,
      _key: `${i}-${it.task.slice(0, 20)}`,
      _status: "pending" as const,
    })),
  );
  const [bulkAdding, setBulkAdding] = useState(false);

  const pendingRows = rows.filter((r) => r._status === "pending");
  if (rows.length === 0) return null;

  const updateRow = (key: string, patch: Partial<RowState>) =>
    setRows((prev) => prev.map((r) => (r._key === key ? { ...r, ...patch } : r)));

  const insertOne = async (row: RowState): Promise<boolean> => {
    if (!row.due_date) {
      toast.error("Set a due date before adding.");
      return false;
    }
    if (!athleteId) {
      toast.error("Missing athlete — cannot add task.");
      return false;
    }
    try {
      // Resolve the athlete's assigned agent so the task lands in their workflow
      // even when an admin is logging the conversation on their behalf.
      const { data: athleteRow, error: athleteErr } = await supabase
        .from("athletes")
        .select("assigned_agent_user_id")
        .eq("id", athleteId)
        .maybeSingle();
      if (athleteErr) {
        console.error("[ActionItemConfirmPanel] athlete lookup failed", athleteErr);
      }
      const assignedAgentId =
        (athleteRow as any)?.assigned_agent_user_id ?? user?.id ?? null;

      const payload: any = {
        athlete_id: athleteId,
        title: row.task,
        description: row.relative_phrase
          ? `Auto-extracted from conversation (“${row.relative_phrase}”).`
          : "Auto-extracted from conversation.",
        owner_type: "agent",
        assigned_to_user_id: assignedAgentId,
        created_by: user?.id ?? null,
        due_date: row.due_date,
        priority: PRIORITY_TO_INT[row.priority],
        status: "open",
        source: "conversation_ai",
      };
      // Only include related_call_id when we actually have one (uuid FK).
      if (conversationId) payload.related_call_id = conversationId;

      console.log("[ActionItemConfirmPanel] inserting task", payload);

      const { data, error } = await supabase
        .from("athlete_tasks")
        .insert(payload)
        .select("id")
        .single();

      if (error || !data?.id) {
        console.error("[ActionItemConfirmPanel] insert failed", error, payload);
        toast.error(
          error?.message
            ? `Save failed: ${error.message}`
            : "Save failed — task was not added. Check console for details.",
        );
        return false;
      }
      console.log("[ActionItemConfirmPanel] inserted task id", data.id);
      return true;
    } catch (e: any) {
      console.error("[ActionItemConfirmPanel] unexpected error", e);
      toast.error(`Save failed: ${e?.message ?? "unknown error"}`);
      return false;
    }
  };

  const handleAdd = async (key: string) => {
    const row = rows.find((r) => r._key === key);
    if (!row || !row.due_date) return;
    updateRow(key, { _status: "adding" });
    const ok = await insertOne(row);
    updateRow(key, { _status: ok ? "added" : "pending" });
    if (ok) {
      qc.invalidateQueries({ queryKey: ["athlete_tasks"] });
      qc.invalidateQueries({ queryKey: ["weekly_planner"] });
      toast.success("Added to planner");
      checkAllResolved();
    }
  };

  const handleDismiss = (key: string) => {
    updateRow(key, { _status: "dismissed" });
    checkAllResolved();
  };

  const handleAddAll = async () => {
    setBulkAdding(true);
    let added = 0;
    for (const row of pendingRows) {
      if (!row.due_date) continue;
      updateRow(row._key, { _status: "adding" });
      const ok = await insertOne(row);
      updateRow(row._key, { _status: ok ? "added" : "pending" });
      if (ok) added++;
    }
    setBulkAdding(false);
    if (added > 0) {
      qc.invalidateQueries({ queryKey: ["athlete_tasks"] });
      qc.invalidateQueries({ queryKey: ["weekly_planner"] });
      toast.success(`Added ${added} task${added === 1 ? "" : "s"} to planner`);
    }
    checkAllResolved();
  };

  const handleDismissAll = () => {
    setRows((prev) =>
      prev.map((r) => (r._status === "pending" ? { ...r, _status: "dismissed" } : r)),
    );
    checkAllResolved();
  };

  const checkAllResolved = () => {
    setTimeout(() => {
      setRows((cur) => {
        if (cur.every((r) => r._status !== "pending" && r._status !== "adding")) {
          onAllResolved?.();
        }
        return cur;
      });
    }, 50);
  };

  const visibleCount = rows.filter((r) => r._status !== "dismissed").length;

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold">
          {visibleCount} follow-up{visibleCount === 1 ? "" : "s"} detected
        </h4>
        <span className="text-[11px] text-muted-foreground ml-auto">
          Review then add to the Weekly Planner
        </span>
      </div>

      <div className="space-y-2">
        {rows.map((row) => {
          if (row._status === "dismissed") return null;
          const added = row._status === "added";
          const adding = row._status === "adding";
          const needsDate = !row.due_date;

          return (
            <div
              key={row._key}
              className="rounded-md border bg-background p-2.5 space-y-2"
              style={added ? { borderColor: "var(--success)", background: "var(--success-soft)" } : undefined}
            >
              <Input
                className="h-8 text-sm"
                value={row.task}
                onChange={(e) => updateRow(row._key, { task: e.target.value })}
                disabled={added || adding}
              />

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Due date
                  </Label>
                  <Input
                    type="date"
                    className="h-8 text-xs"
                    style={needsDate ? { borderColor: "var(--win)", background: "var(--win-soft)" } : undefined}
                    value={row.due_date || ""}
                    placeholder="Set a date"
                    onChange={(e) =>
                      updateRow(row._key, {
                        due_date: e.target.value || null,
                        needs_date: !e.target.value,
                      })
                    }
                    disabled={added || adding}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Priority
                  </Label>
                  <div className="flex gap-1">
                    {PRIORITY_OPTIONS.map((p) => {
                      const sel = row.priority === p;
                      const selStyle: React.CSSProperties = p === "high"
                        ? { background: "var(--danger)", borderColor: "var(--danger)", color: "#fff" }
                        : p === "medium"
                        ? { background: "var(--win)", borderColor: "var(--win)", color: "#fff" }
                        : { background: "var(--muted-fg)", borderColor: "var(--muted-fg)", color: "#fff" };
                      return (
                        <button
                          key={p}
                          type="button"
                          disabled={added || adding}
                          onClick={() => updateRow(row._key, { priority: p })}
                          className="flex-1 rounded border px-1.5 py-1 text-[10px] font-medium uppercase transition"
                          style={sel ? selStyle : undefined}
                        >
                          {p === "high" ? "H" : p === "medium" ? "M" : "L"}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {needsDate && !added && (
                <p className="text-[10px]" style={{ color: "var(--win-deep)" }}>
                  Set a date before adding — the planner needs one to place it.
                </p>
              )}

              {row.relative_phrase && (
                <p className="text-[10px] text-muted-foreground italic">
                  From note: “{row.relative_phrase}”
                </p>
              )}

              <div className="flex gap-1.5 justify-end">
                {added ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium" style={{ color: "var(--success-deep)" }}>
                    <CheckCircle2 className="h-3.5 w-3.5" /> Added to planner
                  </span>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-[11px] text-muted-foreground"
                      onClick={() => handleDismiss(row._key)}
                      disabled={adding}
                    >
                      <X className="h-3 w-3 mr-1" /> Dismiss
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 px-2 text-[11px]"
                      onClick={() => handleAdd(row._key)}
                      disabled={adding || needsDate}
                    >
                      {adding ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <>
                          <Plus className="h-3 w-3 mr-1" /> Add
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {pendingRows.length > 1 && (
        <div className="flex gap-2 pt-1 border-t border-primary/20">
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5 flex-1"
            onClick={handleAddAll}
            disabled={bulkAdding || pendingRows.every((r) => !r.due_date)}
          >
            {bulkAdding ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            Add all to planner
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs"
            onClick={handleDismissAll}
            disabled={bulkAdding}
          >
            Dismiss all
          </Button>
        </div>
      )}
    </div>
  );
}
