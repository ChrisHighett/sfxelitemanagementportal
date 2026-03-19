import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { type Athlete } from "@/hooks/usePortalData";

interface Task {
  id: string;
  athlete_id: string;
  assigned_to: string;
  title: string;
  description: string | null;
  status: string;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
}

export default function TaskFollowUpEngine({ athlete, athletes }: { athlete: Athlete; athletes: Athlete[] }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("agent");
  const [dueDate, setDueDate] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterAssigned, setFilterAssigned] = useState<string>("all");

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["follow_up_tasks", athlete.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("follow_up_tasks")
        .select("*")
        .eq("athlete_id", athlete.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Task[];
    },
  });

  const createTask = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("follow_up_tasks").insert({
        athlete_id: athlete.id,
        assigned_to: assignedTo,
        title,
        description: description || null,
        due_date: dueDate || null,
        created_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["follow_up_tasks"] });
      setShowForm(false);
      setTitle("");
      setDescription("");
      setDueDate("");
      toast.success("Task created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status };
      if (status === "completed") updates.completed_at = new Date().toISOString();
      const { error } = await supabase.from("follow_up_tasks").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["follow_up_tasks"] });
      toast.success("Task updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = tasks.filter((t) => {
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    if (filterAssigned !== "all" && t.assigned_to !== filterAssigned) return false;
    return true;
  });

  const statusColor: Record<string, "default" | "secondary" | "destructive"> = {
    pending: "secondary",
    in_progress: "default",
    completed: "default",
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle>Follow-Up Tasks — {athlete.name}</CardTitle>
            <Button size="sm" onClick={() => setShowForm(!showForm)} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> New Task
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterAssigned} onValueChange={setFilterAssigned}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Assigned To" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="agent">Agent</SelectItem>
                <SelectItem value="athlete">Athlete</SelectItem>
                <SelectItem value="parent">Parent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Create form */}
          {showForm && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-4 space-y-3">
                <Input placeholder="Task title" value={title} onChange={(e) => setTitle(e.target.value)} />
                <Textarea placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[60px]" />
                <div className="flex flex-wrap gap-3">
                  <Select value={assignedTo} onValueChange={setAssignedTo}>
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="agent">Agent</SelectItem>
                      <SelectItem value="athlete">Athlete</SelectItem>
                      <SelectItem value="parent">Parent</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-44" />
                  <Button onClick={() => createTask.mutate()} disabled={!title.trim() || createTask.isPending} className="gap-1.5">
                    {createTask.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    Create
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Task list */}
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No tasks found.</p>
          ) : (
            <div className="space-y-2">
              {filtered.map((task) => (
                <div key={task.id} className={`flex items-start justify-between gap-3 rounded-lg border p-3 ${task.status === "completed" ? "opacity-60" : ""}`}>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-medium text-sm ${task.status === "completed" ? "line-through" : ""}`}>{task.title}</span>
                      <Badge variant={statusColor[task.status] ?? "secondary"}>{task.status.replace("_", " ")}</Badge>
                      <Badge variant="outline" className="text-xs">→ {task.assigned_to}</Badge>
                    </div>
                    {task.description && <p className="text-xs text-muted-foreground">{task.description}</p>}
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      {task.due_date && <span>Due: {task.due_date}</span>}
                      <span>Created: {new Date(task.created_at).toLocaleDateString("en-AU")}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {task.status === "pending" && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: task.id, status: "in_progress" })}>
                        Start
                      </Button>
                    )}
                    {task.status !== "completed" && (
                      <Button size="sm" variant="secondary" onClick={() => updateStatus.mutate({ id: task.id, status: "completed" })} className="gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Done
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
