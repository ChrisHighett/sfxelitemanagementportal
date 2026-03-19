import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Loader2, Plus, Trophy, Shield, Heart, FileText, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import { type Athlete } from "@/hooks/usePortalData";

const EVENT_TYPES = [
  { value: "milestone", label: "Milestone", icon: Trophy, color: "text-accent" },
  { value: "representative", label: "Representative Team", icon: Shield, color: "text-primary" },
  { value: "injury", label: "Injury", icon: Heart, color: "text-destructive" },
  { value: "contract", label: "Contract", icon: FileText, color: "text-foreground" },
  { value: "stage_change", label: "Stage Change", icon: ArrowUpRight, color: "text-accent" },
];

interface TimelineEvent {
  id: string;
  athlete_id: string;
  event_type: string;
  event_date: string;
  title: string;
  description: string | null;
  created_at: string;
}

export default function ExpandedTimeline({ athlete, canEdit }: { athlete: Athlete; canEdit: boolean }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [eventType, setEventType] = useState("milestone");
  const [eventDate, setEventDate] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["athlete_timeline", athlete.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("athlete_timeline_events")
        .select("*")
        .eq("athlete_id", athlete.id)
        .order("event_date", { ascending: false });
      if (error) throw error;
      return data as TimelineEvent[];
    },
  });

  const createEvent = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("athlete_timeline_events").insert({
        athlete_id: athlete.id,
        event_type: eventType,
        event_date: eventDate,
        title,
        description: description || null,
        created_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["athlete_timeline"] });
      setShowForm(false);
      setTitle("");
      setDescription("");
      setEventDate("");
      toast.success("Timeline event added");
    },
    onError: (e: any) => toast.error(e.message),
  });

  function getEventIcon(type: string) {
    const et = EVENT_TYPES.find((e) => e.value === type);
    if (!et) return null;
    const Icon = et.icon;
    return <Icon className={`h-4 w-4 ${et.color}`} />;
  }

  // Group by year
  const grouped: Record<string, TimelineEvent[]> = {};
  events.forEach((e) => {
    const year = e.event_date.slice(0, 4);
    if (!grouped[year]) grouped[year] = [];
    grouped[year].push(e);
  });

  // Add current stage info
  const stages = [
    { title: "Emerging Talent", age: "14–15", active: athlete.stage === "Emerging" },
    { title: "Elite Development", age: "16–17", active: athlete.stage === "Elite" },
    { title: "Pre-Professional", age: "18–19", active: athlete.stage === "Pre-Pro" },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Progression stages */}
      <Card>
        <CardHeader><CardTitle>Development Stage</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {stages.map((s, i) => (
              <div
                key={i}
                className={`flex-1 min-w-[140px] rounded-lg border p-3 text-center ${
                  s.active ? "border-primary bg-primary/5" : ""
                }`}
              >
                <div className="text-xs text-muted-foreground">{s.age}</div>
                <div className="text-sm font-medium mt-1">{s.title}</div>
                {s.active && <Badge className="mt-2">Current</Badge>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle>Athlete Timeline — {athlete.name}</CardTitle>
            {canEdit && (
              <Button size="sm" onClick={() => setShowForm(!showForm)} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Add Event
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showForm && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-4 space-y-3">
                <div className="flex flex-wrap gap-3">
                  <Select value={eventType} onValueChange={setEventType}>
                    <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {EVENT_TYPES.map((et) => (
                        <SelectItem key={et.value} value={et.value}>{et.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="w-44" />
                </div>
                <Input placeholder="Event title" value={title} onChange={(e) => setTitle(e.target.value)} />
                <Textarea placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[60px]" />
                <Button onClick={() => createEvent.mutate()} disabled={!title.trim() || !eventDate || createEvent.isPending} className="gap-1.5">
                  {createEvent.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  Add Event
                </Button>
              </CardContent>
            </Card>
          )}

          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : events.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No timeline events recorded yet.</p>
          ) : (
            Object.entries(grouped)
              .sort(([a], [b]) => Number(b) - Number(a))
              .map(([year, yearEvents]) => (
                <div key={year}>
                  <div className="text-sm font-semibold text-muted-foreground mb-2">{year}</div>
                  <div className="relative border-l-2 border-border pl-6 space-y-4">
                    {yearEvents.map((event) => (
                      <div key={event.id} className="relative">
                        <div className="absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 border-background bg-primary" />
                        <div className="rounded-lg border p-3 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {getEventIcon(event.event_type)}
                            <span className="font-medium text-sm">{event.title}</span>
                            <Badge variant="outline" className="text-xs">
                              {EVENT_TYPES.find((e) => e.value === event.event_type)?.label ?? event.event_type}
                            </Badge>
                            <span className="text-xs text-muted-foreground ml-auto">{event.event_date}</span>
                          </div>
                          {event.description && (
                            <p className="text-sm text-muted-foreground">{event.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <Separator className="mt-4" />
                </div>
              ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
