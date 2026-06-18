import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Loader2, ShieldCheck } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Athlete } from "@/hooks/usePortalData";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  athletes: Athlete[];
  /** Lock to a specific athlete (athlete profile use) */
  athleteId?: string;
  onCreated?: () => void;
}

const PRIORITY_OPTIONS: { value: string; label: string }[] = [
  { value: "3", label: "Normal" },
  { value: "2", label: "High" },
  { value: "1", label: "Urgent" },
];

export default function AddTaskDialog({ open, onOpenChange, athletes, athleteId, onCreated }: Props) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedAthlete, setSelectedAthlete] = useState<string>(athleteId || "");
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [priority, setPriority] = useState("3");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle("");
      setDescription("");
      setSelectedAthlete(athleteId || "");
      setDueDate(undefined);
      setPriority("3");
    }
  }, [open, athleteId]);

  async function handleCreate() {
    if (!title.trim()) { toast.error("Add a task title"); return; }
    if (!selectedAthlete) { toast.error("Pick a talent"); return; }
    if (!dueDate) { toast.error("Pick a due date"); return; }

    setSaving(true);
    try {
      const yyyy = dueDate.getFullYear();
      const mm = String(dueDate.getMonth() + 1).padStart(2, "0");
      const dd = String(dueDate.getDate()).padStart(2, "0");
      const dateISO = `${yyyy}-${mm}-${dd}`;
      const idx = (dueDate.getDay() + 6) % 7;
      const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
      const suggestedDay = idx < 5 ? dayNames[idx] : "Friday";

      const { error } = await supabase.from("athlete_tasks").insert({
        athlete_id: selectedAthlete,
        title: title.trim(),
        description: description.trim() || null,
        owner_type: "agent" as any,
        priority: Number(priority),
        due_date: dateISO,
        suggested_day: suggestedDay,
        status: "open" as any,
        source: "manual" as any,
        assigned_to_user_id: user?.id ?? null,
        created_by: user?.id ?? null,
      });
      if (error) throw error;

      toast.success("Internal task added — no SMS/email sent");
      window.dispatchEvent(new CustomEvent("athlete-tasks-changed"));
      onCreated?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to create task");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add internal task</DialogTitle>
          <DialogDescription className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            Reminder for your weekly planner. No SMS or email is sent.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="task-title">Task</Label>
            <Input
              id="task-title"
              placeholder="e.g. Send updated training plan"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="task-desc">Notes (optional)</Label>
            <Textarea
              id="task-desc"
              placeholder=""
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[60px]"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Talent</Label>
            <Select value={selectedAthlete} onValueChange={setSelectedAthlete} disabled={!!athleteId}>
              <SelectTrigger><SelectValue placeholder="Pick a talent" /></SelectTrigger>
              <SelectContent className="max-h-72">
                {athletes.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Due date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !dueDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="h-3.5 w-3.5 mr-2" />
                    {dueDate ? format(dueDate, "EEE d MMM") : "Pick a day"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleCreate} disabled={saving} className="gap-1.5">
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Add task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
