import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Save, Pencil, X, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMonthlyReviews, type Athlete, type MonthlyReview } from "@/hooks/usePortalData";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// ─── Editable Review Card ───────────────────────────────────────────────
function EditableReviewCard({
  review,
  athleteId,
  onSaved,
}: {
  review: MonthlyReview;
  athleteId: string;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...review });

  useEffect(() => setForm({ ...review }), [review]);

  const field = (label: string, key: keyof MonthlyReview, multiline = false) => {
    const val = (form[key] as string) ?? "";
    if (!editing) {
      return (
        <div className="text-sm">
          <span className="font-medium">{label}:</span> {val || "—"}
        </div>
      );
    }
    return (
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">{label}</label>
        {multiline ? (
          <Textarea
            value={val}
            onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
            className="min-h-[60px]"
          />
        ) : (
          <Input
            value={val}
            onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
          />
        )}
      </div>
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("monthly_reviews")
        .update({
          wellbeing_score: form.wellbeingScore,
          performance_notes: form.performance,
          lifestyle_notes: form.lifestyle,
          personal_notes: form.personal,
          education_notes: form.education,
          brand_notes: form.brand,
          focus_next_month: form.focus,
          goals: form.goals,
          attention_required: form.attentionRequired,
          call_date: form.callDate || null,
          call_duration: form.callDuration || null,
          training_highlights: form.trainingHighlights || null,
          areas_for_improvement: form.areasForImprovement || null,
          football_goal: form.footballGoal || null,
          personal_goal: form.personalGoal || null,
          school_life_goal: form.schoolLifeGoal || null,
          parent_engagement_notes: form.parentEngagementNotes || null,
          follow_up_actions: form.followUpActions || null,
        } as any)
        .eq("athlete_id", athleteId)
        .eq("review_month", `${form.month}-01`);

      if (error) throw error;
      toast.success("Review saved");
      setEditing(false);
      onSaved();
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{review.month} Review</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={form.attentionRequired ? "destructive" : "default"}>
              {form.attentionRequired ? "Attention" : "On Track"}
            </Badge>
            {!editing ? (
              <Button size="sm" variant="outline" className="gap-1" onClick={() => setEditing(true)}>
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Button>
            ) : (
              <div className="flex gap-1">
                <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1">
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setForm({ ...review }); setEditing(false); }}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Wellbeing score */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Wellbeing:</span>
          {editing ? (
            <Select
              value={String(form.wellbeingScore)}
              onValueChange={(v) => setForm((f) => ({ ...f, wellbeingScore: Number(v) }))}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}/5</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span className="text-sm">{form.wellbeingScore}/5</span>
          )}
          {editing && (
            <div className="flex items-center gap-2 ml-4">
              <span className="text-xs text-muted-foreground">Attention Required</span>
              <Switch
                checked={form.attentionRequired}
                onCheckedChange={(v) => setForm((f) => ({ ...f, attentionRequired: v }))}
              />
            </div>
          )}
        </div>

        {/* Call info */}
        <div className="grid gap-3 md:grid-cols-2">
          {field("Call Date", "callDate")}
          {field("Call Duration", "callDuration")}
        </div>

        <Separator />

        {/* Main fields */}
        <div className="grid gap-3 md:grid-cols-2">
          {field("Performance", "performance", true)}
          {field("Training Highlights", "trainingHighlights", true)}
          {field("Areas for Improvement", "areasForImprovement", true)}
          {field("Lifestyle", "lifestyle", true)}
          {field("Personal", "personal", true)}
          {field("Education", "education", true)}
          {field("Brand", "brand", true)}
        </div>

        <Separator />

        {/* Goals */}
        <div className="grid gap-3 md:grid-cols-3">
          {field("Football Goal", "footballGoal", true)}
          {field("Personal Goal", "personalGoal", true)}
          {field("School/Life Goal", "schoolLifeGoal", true)}
        </div>

        <Separator />

        {field("Focus Next Month", "focus", true)}
        {field("Parent Engagement Notes", "parentEngagementNotes", true)}
        {field("Follow-Up Actions", "followUpActions", true)}
      </CardContent>
    </Card>
  );
}

// ─── New Review Form ────────────────────────────────────────────────────
function NewReviewForm({
  athleteId,
  onCreated,
}: {
  athleteId: string;
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));

  const handleCreate = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("monthly_reviews").insert({
        athlete_id: athleteId,
        review_month: `${month}-01`,
        wellbeing_score: 3,
        performance_notes: "",
        lifestyle_notes: "",
        personal_notes: "",
        education_notes: "",
        brand_notes: "",
        focus_next_month: "",
        goals: [],
        attention_required: false,
      });
      if (error) throw error;
      toast.success("Review created");
      setOpen(false);
      onCreated();
    } catch (e: any) {
      toast.error(e.message || "Failed to create review");
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <Button variant="outline" className="gap-2" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Add Monthly Review
      </Button>
    );
  }

  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <Input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="w-48"
        />
        <Button onClick={handleCreate} disabled={saving} className="gap-1">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Create
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </CardContent>
    </Card>
  );
}

// ─── Editable Goal Tracker ──────────────────────────────────────────────
function EditableGoalTracker({ athleteId }: { athleteId: string }) {
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [newGoal, setNewGoal] = useState(false);
  const [newForm, setNewForm] = useState({ goal_type: "Football", goal_description: "", month_set: "", status: "In progress", comments: "" });
  const [saving, setSaving] = useState(false);

  const fetchGoals = useCallback(async () => {
    const { data } = await supabase
      .from("goal_tracker")
      .select("*")
      .eq("athlete_id", athleteId)
      .order("created_at", { ascending: false });
    setGoals(data || []);
    setLoading(false);
  }, [athleteId]);

  useEffect(() => { fetchGoals(); }, [fetchGoals]);

  const startEdit = (goal: any) => {
    setEditingId(goal.id);
    setEditForm({ ...goal });
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("goal_tracker").update({
        goal_type: editForm.goal_type,
        goal_description: editForm.goal_description,
        month_set: editForm.month_set,
        status: editForm.status,
        comments: editForm.comments,
      }).eq("id", editForm.id);
      if (error) throw error;
      toast.success("Goal updated");
      setEditingId(null);
      fetchGoals();
    } catch (e: any) {
      toast.error(e.message || "Failed to update goal");
    } finally {
      setSaving(false);
    }
  };

  const deleteGoal = async (id: string) => {
    const { error } = await supabase.from("goal_tracker").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Goal deleted");
    fetchGoals();
  };

  const addGoal = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("goal_tracker").insert({
        athlete_id: athleteId,
        ...newForm,
      });
      if (error) throw error;
      toast.success("Goal added");
      setNewGoal(false);
      setNewForm({ goal_type: "Football", goal_description: "", month_set: "", status: "In progress", comments: "" });
      fetchGoals();
    } catch (e: any) {
      toast.error(e.message || "Failed to add goal");
    } finally {
      setSaving(false);
    }
  };

  const statusColor: Record<string, "default" | "secondary" | "destructive"> = {
    "In progress": "secondary",
    "Achieved": "default",
    "Dropped": "destructive",
  };

  if (loading) return <div className="flex justify-center p-4"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base">🎯 Goal Tracker</CardTitle>
        {!newGoal && (
          <Button size="sm" variant="outline" className="gap-1" onClick={() => setNewGoal(true)}>
            <Plus className="h-3.5 w-3.5" /> Add Goal
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {newGoal && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-4 space-y-3">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Type</label>
                  <Select value={newForm.goal_type} onValueChange={(v) => setNewForm((f) => ({ ...f, goal_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Football">Football</SelectItem>
                      <SelectItem value="Personal">Personal</SelectItem>
                      <SelectItem value="School/Life">School/Life</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Month Set</label>
                  <Input value={newForm.month_set} onChange={(e) => setNewForm((f) => ({ ...f, month_set: e.target.value }))} placeholder="e.g. Mar-26" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Status</label>
                  <Select value={newForm.status} onValueChange={(v) => setNewForm((f) => ({ ...f, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="In progress">In progress</SelectItem>
                      <SelectItem value="Achieved">Achieved</SelectItem>
                      <SelectItem value="Dropped">Dropped</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Goal Description</label>
                <Textarea value={newForm.goal_description} onChange={(e) => setNewForm((f) => ({ ...f, goal_description: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Comments</label>
                <Input value={newForm.comments} onChange={(e) => setNewForm((f) => ({ ...f, comments: e.target.value }))} />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={addGoal} disabled={saving || !newForm.goal_description}>
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null} Add
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setNewGoal(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {goals.length === 0 && !newGoal && <p className="text-sm text-muted-foreground">No goals recorded yet.</p>}

        {goals.map((g) =>
          editingId === g.id ? (
            <Card key={g.id} className="border-primary/30">
              <CardContent className="p-4 space-y-3">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Type</label>
                    <Select value={editForm.goal_type} onValueChange={(v) => setEditForm((f: any) => ({ ...f, goal_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Football">Football</SelectItem>
                        <SelectItem value="Personal">Personal</SelectItem>
                        <SelectItem value="School/Life">School/Life</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Month Set</label>
                    <Input value={editForm.month_set} onChange={(e) => setEditForm((f: any) => ({ ...f, month_set: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Status</label>
                    <Select value={editForm.status} onValueChange={(v) => setEditForm((f: any) => ({ ...f, status: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="In progress">In progress</SelectItem>
                        <SelectItem value="Achieved">Achieved</SelectItem>
                        <SelectItem value="Dropped">Dropped</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Goal Description</label>
                  <Textarea value={editForm.goal_description} onChange={(e) => setEditForm((f: any) => ({ ...f, goal_description: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Comments</label>
                  <Input value={editForm.comments || ""} onChange={(e) => setEditForm((f: any) => ({ ...f, comments: e.target.value }))} />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveEdit} disabled={saving} className="gap-1">
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div key={g.id} className="flex items-start justify-between rounded-lg border p-3">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{g.goal_type}</Badge>
                  <Badge variant={statusColor[g.status] ?? "secondary"}>{g.status}</Badge>
                  <span className="text-xs text-muted-foreground">{g.month_set}</span>
                </div>
                <div className="text-sm">{g.goal_description}</div>
                {g.comments && <div className="text-xs text-muted-foreground">{g.comments}</div>}
              </div>
              <div className="flex gap-1 shrink-0 ml-2">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(g)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteGoal(g.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Export ─────────────────────────────────────────────────────────
export default function EditableReviews({ athlete }: { athlete: Athlete }) {
  const queryClient = useQueryClient();
  const { data: reviews = [], isLoading } = useMonthlyReviews(athlete.id);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["monthly_reviews", athlete.id] });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Monthly Reviews — {athlete.name}</h2>
        <NewReviewForm athleteId={athlete.id} onCreated={refresh} />
      </div>

      {reviews.length === 0 && (
        <p className="text-sm text-muted-foreground">No reviews yet. Create one to get started.</p>
      )}

      {reviews.map((r) => (
        <EditableReviewCard key={r.month} review={r} athleteId={athlete.id} onSaved={refresh} />
      ))}

      <Separator />

      <EditableGoalTracker athleteId={athlete.id} />
    </div>
  );
}
