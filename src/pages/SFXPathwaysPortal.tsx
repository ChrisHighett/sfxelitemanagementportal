import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Loader2, CalendarDays, ClipboardList, FileText, LayoutDashboard, Library, Mail, Phone, Shield, Sparkles, Users, AlertTriangle, Mic, Upload, Menu, WifiOff } from "lucide-react";
import WeeklyPlanner from "@/components/portal/WeeklyPlanner";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useAthletes, useMonthlyReviews, useCommsLog, type Athlete, type MonthlyReview, type CommsLog } from "@/hooks/usePortalData";
import { useUserRole } from "@/hooks/useUserRole";
import AdminAthleteManager from "@/components/AdminAthleteManager";
import EditableReviews from "@/components/EditableReviews";
import MobileCallScreen from "@/components/portal/MobileCallScreen";
import VoiceRecordingFlow from "@/components/portal/VoiceRecordingFlow";

import AthleteResourceFiles from "@/components/portal/AthleteResourceFiles";
import CommsHistory, { saveCommsEmail } from "@/components/portal/CommsHistory";
import { resolveSmartFields } from "@/lib/smart-review-fields";
import HeroBanner from "@/components/portal/ui/HeroBanner";
import StatCard from "@/components/portal/ui/StatCard";
import ImageCard from "@/components/portal/ui/ImageCard";
import ContentSection from "@/components/portal/ui/ContentSection";
import heroImage from "@/assets/hero-sport-dark.jpg";
type Role = "athlete" | "parent" | "agent" | "admin";

function statusBadge(status: string) {
  const map: Record<string, "default" | "secondary" | "destructive"> = {
    Thriving: "default",
    Monitoring: "secondary",
    "Needs Support": "destructive",
  };
  return <Badge variant={map[status] ?? "default"}>{status}</Badge>;
}

function scorePill(score: number) {
  const pct = Math.min(100, Math.max(0, (score / 5) * 100));
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <Progress value={pct} className="h-2" />
      </div>
      <span className="text-sm font-medium">{score}/5</span>
    </div>
  );
}

const NAV: Record<Role, { key: string; label: string; icon: React.ElementType }[]> = {
  athlete: [
    { key: "dash", label: "Dashboard", icon: LayoutDashboard },
    { key: "reviews", label: "My Reviews", icon: ClipboardList },
    { key: "resources", label: "Resources", icon: Library },
  ],
  parent: [
    { key: "dash", label: "Dashboard", icon: LayoutDashboard },
    { key: "updates", label: "Updates", icon: ClipboardList },
    { key: "resources", label: "Resources", icon: Library },
  ],
  agent: [
    { key: "roster", label: "Roster", icon: Users },
    { key: "athlete", label: "Athlete Profile", icon: FileText },
    { key: "call", label: "Athlete Comms", icon: Phone },
    { key: "reviews", label: "Development Tracker", icon: ClipboardList },
  ],
  admin: [
    { key: "roster", label: "Roster", icon: Users },
    { key: "athlete", label: "Athlete Profile", icon: FileText },
    { key: "call", label: "Athlete Comms", icon: Phone },
    { key: "reviews", label: "Development Tracker", icon: ClipboardList },
    { key: "admin", label: "Admin", icon: Shield },
  ],
};

function Shell({ role, active, onNav, children, hideBottomNav }: { role: Role; active: string; onNav: (k: string) => void; children: React.ReactNode; hideBottomNav?: boolean }) {
  const items = NAV[role] ?? [];
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isOnline, pendingCount } = useOfflineQueue();
  const mobileQuickNav = items.slice(0, 4);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card p-4 flex-shrink-0">
        <div className="space-y-6 flex-1">
          <div>
            <h2 className="text-lg font-bold" style={{ fontFamily: "var(--font-heading)" }}>SFX Pathways Hub</h2>
            <p className="text-xs text-muted-foreground">Role-based portal + CRM</p>
          </div>
          <nav className="space-y-1">
            {items.map((it) => {
              const Icon = it.icon;
              const isActive = active === it.key;
              return (
                <button
                  key={it.key}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
                  onClick={() => onNav(it.key)}
                >
                  <Icon className="h-4 w-4" />
                  {it.label}
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <div className="md:hidden flex items-center justify-between border-b border-border bg-card px-4 py-3 sticky top-0 z-30">
          <h2 className="text-base font-bold" style={{ fontFamily: "var(--font-heading)" }}>SFX Pathways</h2>
          <div className="flex items-center gap-2">
            {!isOnline && (
              <Badge variant="destructive" className="gap-1 text-xs">
                <WifiOff className="h-3 w-3" /> Offline
                {pendingCount > 0 && <span>({pendingCount})</span>}
              </Badge>
            )}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-4">
                <h2 className="text-lg font-bold mb-4" style={{ fontFamily: "var(--font-heading)" }}>SFX Pathways</h2>
                <nav className="space-y-1">
                  {items.map((it) => {
                    const Icon = it.icon;
                    const isAct = active === it.key;
                    return (
                      <button
                        key={it.key}
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors ${isAct ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
                        onClick={() => { onNav(it.key); setMobileOpen(false); }}
                      >
                        <Icon className="h-5 w-5" />
                        {it.label}
                      </button>
                    );
                  })}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <main className={`flex-1 overflow-auto ${hideBottomNav ? 'pb-0' : 'pb-20'} md:pb-0`}>{children}</main>

        {/* Mobile bottom navigation */}
        {!hideBottomNav && <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-border" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
          <div className="flex items-center justify-around py-1">
            {mobileQuickNav.map((it) => {
              const Icon = it.icon;
              const isAct = active === it.key;
              return (
                <button
                  key={it.key}
                  className={`flex flex-col items-center gap-0.5 px-2 py-2 rounded-lg min-w-[56px] transition-colors ${isAct ? "text-primary" : "text-muted-foreground"}`}
                  onClick={() => onNav(it.key)}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-[10px] leading-tight font-medium truncate max-w-[56px]">{it.label.split(" ")[0]}</span>
                </button>
              );
            })}
            <button
              className="flex flex-col items-center gap-0.5 px-2 py-2 rounded-lg min-w-[56px] text-muted-foreground"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
              <span className="text-[10px] leading-tight font-medium">More</span>
            </button>
          </div>
        </nav>}
      </div>
    </div>
  );
}

function TopBar({ role, selectedAthleteId, setSelectedAthleteId, athletes }: {
  role: Role;
  selectedAthleteId: string; setSelectedAthleteId: (id: string) => void;
  athletes: Athlete[];
}) {
  return (
    <div className="border-b border-border bg-card px-4 md:px-6 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium hidden md:inline">Portal View</span>
          <Badge variant="secondary" className="text-xs">{role.toUpperCase()}</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {athletes.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground hidden sm:inline">Athlete</span>
              <Select value={selectedAthleteId} onValueChange={setSelectedAthleteId}>
                <SelectTrigger className="w-36 md:w-44 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {athletes.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {athletes.length <= 1 && athletes.length > 0 && (
            <span className="text-sm font-medium">{athletes[0]?.name}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function AthleteDashboard({ athlete }: { athlete: Athlete }) {
  const { data: reviews = [] } = useMonthlyReviews(athlete.id);
  const review = reviews[0];
  const smart = review ? resolveSmartFields(review) : null;

  return (
    <div className="space-y-4 p-3 sm:p-4 md:p-6 max-w-2xl mx-auto">
      {/* Hero */}
      <HeroBanner
        title={`Welcome back, ${athlete.name.split(" ")[0]}`}
        subtitle={`${athlete.club} · ${athlete.position} · ${athlete.stage}`}
        imageUrl={heroImage}
        badge={statusBadge(athlete.status)}
        size="md"
      />

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
        <StatCard
          label="Check-in"
          icon={<CalendarDays className="h-4 w-4" />}
          value={athlete.nextCall}
        />
        <StatCard
          label="Wellbeing"
          icon={<Sparkles className="h-4 w-4" />}
          value={scorePill(athlete.wellbeingScore)}
        />
        <StatCard
          label="Focus"
          icon={<ClipboardList className="h-4 w-4" />}
          value={<span className="text-xs font-medium">{smart?.focus ?? "—"}</span>}
        />
      </div>

      {/* Goals */}
      {review?.goals && review.goals.length > 0 && (
        <ContentSection title="Your Goals">
          <div className="rounded-xl border border-border bg-card p-4 space-y-2">
            {review.goals.map((g, idx) => (
              <div key={idx} className="flex items-start gap-3 py-1">
                <div className="mt-1.5 h-2.5 w-2.5 rounded-full bg-primary shrink-0" />
                <span className="text-sm">{g}</span>
              </div>
            ))}
          </div>
        </ContentSection>
      )}

      {/* Review Summary */}
      {smart && (smart.performance !== "—" || smart.lifestyle !== "—" || smart.personal !== "—") && (
        <ContentSection title="Latest Review">
          <div className="rounded-xl border border-border bg-card divide-y divide-border">
            {smart.performance !== "—" && (
              <div className="p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Performance</p>
                <p className="text-sm">{smart.performance}</p>
              </div>
            )}
            {smart.lifestyle !== "—" && (
              <div className="p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Lifestyle</p>
                <p className="text-sm">{smart.lifestyle}</p>
              </div>
            )}
            {smart.personal !== "—" && (
              <div className="p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Personal</p>
                <p className="text-sm">{smart.personal}</p>
              </div>
            )}
            {smart.education !== "—" && (
              <div className="p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Education</p>
                <p className="text-sm">{smart.education}</p>
              </div>
            )}
          </div>
        </ContentSection>
      )}

      {/* Profile & Contact */}
      <ContentSection title="Your Profile">
        <ImageCard
          title={athlete.name}
          description={`${athlete.club} · ${athlete.position} · ${athlete.stage}`}
          icon={<Users className="h-4 w-4" />}
        >
          <div className="space-y-1 text-sm text-muted-foreground pt-1">
            <div>Agent: {athlete.assignedAgent}</div>
          </div>
          <Button variant="secondary" size="sm" className="mt-3 w-full">
            Message My Manager
          </Button>
        </ImageCard>
      </ContentSection>
    </div>
  );
}

function ParentDashboard({ athlete }: { athlete: Athlete }) {
  const { data: reviews = [] } = useMonthlyReviews(athlete.id);
  const review = reviews[0];
  const smart = review ? resolveSmartFields(review) : null;
  const hasUpdate = smart && (smart.performance !== "—" || smart.lifestyle !== "—" || smart.personal !== "—" || smart.education !== "—" || smart.focus !== "—");

  return (
    <div className="space-y-4 p-3 sm:p-4 md:p-6 max-w-2xl mx-auto">
      {/* Hero */}
      <HeroBanner
        title={`${athlete.name}`}
        subtitle="Parent Portal — Stay connected with your child's development"
        imageUrl={heroImage}
        badge={statusBadge(athlete.status)}
        size="md"
      />

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
        <StatCard
          label="Check-in"
          icon={<CalendarDays className="h-4 w-4" />}
          value={athlete.nextCall}
        />
        <StatCard
          label="Wellbeing"
          icon={<Sparkles className="h-4 w-4" />}
          value={scorePill(athlete.wellbeingScore)}
        />
        <StatCard
          label="Focus"
          icon={<ClipboardList className="h-4 w-4" />}
          value={<span className="text-xs font-medium">{smart?.focus ?? "—"}</span>}
        />
      </div>

      {/* Latest Update */}
      <ContentSection title="Latest Update">
        {hasUpdate ? (
          <div className="rounded-xl border border-border bg-card divide-y divide-border">
            {smart!.performance !== "—" && (
              <div className="p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Performance</p>
                <p className="text-sm">{smart!.performance}</p>
              </div>
            )}
            {smart!.lifestyle !== "—" && (
              <div className="p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Lifestyle</p>
                <p className="text-sm">{smart!.lifestyle}</p>
              </div>
            )}
            {smart!.personal !== "—" && (
              <div className="p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Personal</p>
                <p className="text-sm">{smart!.personal}</p>
              </div>
            )}
            {smart!.education !== "—" && (
              <div className="p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Education</p>
                <p className="text-sm">{smart!.education}</p>
              </div>
            )}
            {smart!.focus !== "—" && (
              <div className="p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Next Focus</p>
                <p className="text-sm">{smart!.focus}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            No update available yet.
          </div>
        )}
      </ContentSection>

      {/* Contact */}
      <ContentSection title="Contact">
        <ImageCard
          title={athlete.assignedAgent}
          description="Your child's assigned manager"
          icon={<Phone className="h-4 w-4" />}
        >
          <p className="text-xs text-muted-foreground mt-1">📧 info@sfx.com.au</p>
          <Button variant="secondary" size="sm" className="mt-3 w-full">
            Send Message
          </Button>
        </ImageCard>
      </ContentSection>
    </div>
  );
}

function RosterDashboard({ athletes, onOpenProfile }: { athletes: Athlete[]; onOpenProfile?: (id: string) => void }) {
  const [q, setQ] = useState("");
  const [onlyAttention, setOnlyAttention] = useState(false);

  const filtered = useMemo(() => {
    return athletes
      .filter((a) => a.name.toLowerCase().includes(q.toLowerCase()))
      .filter((a) => (onlyAttention ? (a.wellbeingScore <= 3 || a.status !== "Thriving") : true));
  }, [athletes, q, onlyAttention]);

  const contractAlerts = useMemo(() => {
    const now = new Date();
    const oneMonthOut = new Date(now);
    oneMonthOut.setMonth(oneMonthOut.getMonth() + 1);
    const alerts: { name: string; type: string; expiry: string }[] = [];
    athletes.forEach((a) => {
      if (a.managementContractExpiry) {
        const d = new Date(a.managementContractExpiry);
        if (d <= oneMonthOut && d >= now) {
          alerts.push({ name: a.name, type: "Management", expiry: a.managementContractExpiry });
        }
      }
      if (a.clubContractExpiry) {
        const d = new Date(a.clubContractExpiry);
        if (d <= oneMonthOut && d >= now) {
          alerts.push({ name: a.name, type: "Club", expiry: a.clubContractExpiry });
        }
      }
    });
    return alerts;
  }, [athletes]);

  const birthdayAlerts = useMemo(() => {
    const now = new Date();
    const oneMonthOut = new Date(now);
    oneMonthOut.setMonth(oneMonthOut.getMonth() + 1);
    const results: { name: string; turnsOn: string }[] = [];
    athletes.forEach((a) => {
      if (!a.dateOfBirth) return;
      const dob = new Date(a.dateOfBirth);
      // Find their 17th birthday
      const birthday17 = new Date(dob);
      birthday17.setFullYear(dob.getFullYear() + 17);
      if (birthday17 >= now && birthday17 <= oneMonthOut) {
        results.push({ name: a.name, turnsOn: birthday17.toISOString().slice(0, 10) });
      }
    });
    return results;
  }, [athletes]);

  return (
    <div className="space-y-4 p-3 sm:p-4 md:p-6 max-w-4xl mx-auto">
      {/* Hero */}
      <HeroBanner
        title="Athlete Roster"
        subtitle="Manage your athletes, track wellbeing, and plan your week"
        imageUrl={heroImage}
        size="md"
      />

      {contractAlerts.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Contract Expiry Alerts</AlertTitle>
          <AlertDescription>
            <ul className="mt-1 space-y-1 text-sm">
              {contractAlerts.map((alert, i) => (
                <li key={i}>
                  <span className="font-medium">{alert.name}</span> — {alert.type} contract expires <span className="font-medium">{alert.expiry}</span>
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
      {birthdayAlerts.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Turning 17 Soon</AlertTitle>
          <AlertDescription>
            <ul className="mt-1 space-y-1 text-sm">
              {birthdayAlerts.map((alert, i) => (
                <li key={i}>
                  <span className="font-medium">{alert.name}</span> turns 17 on <span className="font-medium">{alert.turnsOn}</span>
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
      <Card>
        <CardHeader><CardTitle>Roster Dashboard</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <Input placeholder="Search athletes…" value={q} onChange={(e) => setQ(e.target.value)} className="w-full sm:w-72" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Show attention required</span>
            <Switch checked={onlyAttention} onCheckedChange={setOnlyAttention} />
          </div>
        </CardContent>
      </Card>
      {q.trim().length > 0 && (
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground px-1">No athletes found matching "{q}"</p>
          ) : (
            filtered.map((a) => (
              <Card key={a.id}>
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{a.name}</span>
                        {statusBadge(a.status)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {a.club} • {a.position} • {a.stage}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                      <div><div className="text-xs text-muted-foreground">Wellbeing</div><div className="w-full max-w-[8rem]">{scorePill(a.wellbeingScore)}</div></div>
                      <div><div className="text-xs text-muted-foreground">Last Call</div><div className="text-sm">{a.lastCall}</div></div>
                      <div><div className="text-xs text-muted-foreground">Next Due</div><div className="text-sm">{a.nextCall}</div></div>
                      <div className="flex items-end"><Button variant="secondary" size="sm" className="w-full sm:w-auto" onClick={() => onOpenProfile?.(a.id)}>Open Profile</Button></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
      <WeeklyPlanner athletes={athletes} />
    </div>
  );
}

function AthleteProfileAgentView({ athlete }: { athlete: Athlete }) {
  const { data: reviews = [] } = useMonthlyReviews(athlete.id);
  const { data: comms = [] } = useCommsLog(athlete.id);
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <div className="space-y-6 p-6">
        <AdminAthleteManager initialAthleteId={athlete.id} onBack={() => setEditing(false)} />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-3 sm:p-4 md:p-6 max-w-4xl mx-auto">
      {/* Hero */}
      <HeroBanner
        title={athlete.name}
        subtitle={`${athlete.club} · ${athlete.position} · ${athlete.stage}`}
        imageUrl={heroImage}
        badge={statusBadge(athlete.status)}
        size="md"
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Athlete Profile</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                ✏️ Edit Athlete
              </Button>
              <Badge variant="secondary">{athlete.stage}</Badge>
              {statusBadge(athlete.status)}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-[280px_1fr]">
            <div className="space-y-2 text-sm">
              <div className="text-xl font-bold">{athlete.name}</div>
              <div>Age: {athlete.age}</div>
              <div>Club: {athlete.club}</div>
              <div>School: {athlete.school}</div>
              <div>Position: {athlete.position}</div>
              <Separator className="my-3" />
              <div className="font-medium">Contract Dates</div>
              <div>Management Expiry: {athlete.managementContractExpiry || "—"}</div>
              <div>Club Contract Expiry: {athlete.clubContractExpiry || "—"}</div>
              <Separator className="my-3" />
              <div className="font-medium">Primary contact</div>
              <div>📧 {athlete.parentEmail}</div>
              <div>Parent: {athlete.parentName}</div>
            </div>
            <div>
              <Tabs defaultValue="reviews">
                <TabsList className="flex flex-wrap h-auto gap-1">
                  <TabsTrigger value="reviews" className="text-xs sm:text-sm">Reviews</TabsTrigger>
                  <TabsTrigger value="comms" className="text-xs sm:text-sm">Comms</TabsTrigger>
                  <TabsTrigger value="commercial" className="text-xs sm:text-sm">Commercial</TabsTrigger>
                  <TabsTrigger value="files" className="text-xs sm:text-sm">Files</TabsTrigger>
                </TabsList>
                <TabsContent value="reviews" className="space-y-4 mt-4">
                  {reviews.length === 0 && <p className="text-sm text-muted-foreground">No reviews yet.</p>}
                  {reviews.map((r) => {
                    const reviewDate = new Date(r.month + "-01");
                    const displayMonth = reviewDate.toLocaleDateString("en-AU", { year: "numeric", month: "long" });
                    return (
                      <Card key={r.id}>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">{displayMonth} Review</CardTitle>
                            <div className="flex items-center gap-2">
                              <Badge variant={r.attentionRequired ? "destructive" : "default"}>
                                {r.attentionRequired ? "Attention" : "On Track"}
                              </Badge>
                              <span className="text-sm">Wellbeing {r.wellbeingScore}/5</span>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-1 text-sm">

                          <div><span className="font-medium">Performance:</span> {r.performance || "—"}</div>
                          {r.trainingHighlights && <div><span className="font-medium">Training Highlights:</span> {r.trainingHighlights}</div>}
                          {r.areasForImprovement && <div><span className="font-medium">Areas for Improvement:</span> {r.areasForImprovement}</div>}
                          <div><span className="font-medium">Lifestyle:</span> {r.lifestyle || "—"}</div>
                          <div><span className="font-medium">Personal:</span> {r.personal || "—"}</div>
                          <div><span className="font-medium">Education:</span> {r.education || "—"}</div>
                          <div><span className="font-medium">Brand:</span> {r.brand || "—"}</div>
                          <Separator className="my-2" />
                          <div><span className="font-medium">Focus Next Month:</span> {r.focus || "—"}</div>
                          {(r.footballGoal || r.personalGoal || r.schoolLifeGoal) && (
                            <>
                              <Separator className="my-2" />
                              <div className="font-medium">Goals</div>
                              {r.footballGoal && <div className="ml-2">⚽ Football: {r.footballGoal}</div>}
                              {r.personalGoal && <div className="ml-2">🧑 Personal: {r.personalGoal}</div>}
                              {r.schoolLifeGoal && <div className="ml-2">📚 School/Life: {r.schoolLifeGoal}</div>}
                            </>
                          )}
                          {r.goals.length > 0 && (
                            <div className="space-y-1 mt-2">
                              {r.goals.map((g, idx) => (
                                <div key={idx} className="flex items-start gap-2">
                                  <div className="mt-1.5 h-2 w-2 rounded-full bg-foreground/70" />
                                  <span>{g}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {r.parentEngagementNotes && (
                            <>
                              <Separator className="my-2" />
                              <div><span className="font-medium">Parent Engagement Notes:</span> {r.parentEngagementNotes}</div>
                            </>
                          )}
                          {r.followUpActions && (
                            <>
                              <Separator className="my-2" />
                              <div><span className="font-medium">Follow-Up Actions:</span> {r.followUpActions}</div>
                            </>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </TabsContent>
                <TabsContent value="comms" className="space-y-4 mt-4">
                  {comms.length === 0 && <p className="text-sm text-muted-foreground">No messages logged.</p>}
                  {comms.map((c, idx) => (
                    <Card key={idx}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{c.subject}</CardTitle>
                          <Badge variant="secondary">{c.recipient}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="text-sm space-y-1">
                        <div className="text-muted-foreground">Sent: {c.sentAt}</div>
                        <div>{c.body}</div>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>
                <TabsContent value="commercial" className="mt-4">
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-base">Commercial Snapshot</CardTitle></CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div><span className="text-muted-foreground">Potential:</span> <span className="font-medium">{athlete.commercialPotential}</span></div>
                      <div><span className="text-muted-foreground">Brand Pillars:</span> <span className="font-medium">Fitness • Community • Training</span></div>
                      <div><span className="text-muted-foreground">Next Action:</span> <span className="font-medium">Monitor content consistency</span></div>
                      <Separator />
                      <p className="text-muted-foreground text-xs">Note: Commercial valuation & outreach pipeline can be added in Phase 2.</p>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="files" className="mt-4">
                  <AthleteResourceFiles athleteId={athlete.id} canManage={true} />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AthleteComms({ athlete, onCallActive }: { athlete: Athlete; onCallActive?: (active: boolean) => void; }) {
  const { user } = useAuth();
  const [callSessionActive, setCallSessionActive] = useState(false);
  const [voiceRecordingActive, setVoiceRecordingActive] = useState(false);
  const [commsTab, setCommsTab] = useState<"tools" | "history">("tools");
  const [scriptChecked, setScriptChecked] = useState<Record<string, boolean>>({
    opener: true, performance: false, lifestyle: false, personal: false,
    education: false, brand: false, goals: false, close: false,
  });
  
  // Notify parent when call is active so bottom nav can be hidden
  useEffect(() => {
    onCallActive?.(callSessionActive || voiceRecordingActive);
  }, [callSessionActive, voiceRecordingActive, onCallActive]);

  const [athleteEmailDraft, setAthleteEmailDraft] = useState<string | null>(null);
  const [parentEmailDraft, setParentEmailDraft] = useState<string | null>(null);

  const scriptGuides = [
    {
      k: "opener",
      title: "Warm Opener + Rapport",
      duration: "2 minutes",
      purpose: "Create comfort and trust before discussing development.",
      script: `"Hey mate, good to catch up.\nHow's everything been going this week — footy, school, life?"`,
      prompts: [
        "How has training been since we last spoke?",
        "How are you feeling physically?",
        "How's school going at the moment?"
      ],
      responses: {
        positive: `"That's great to hear mate."`,
        challenge: `"That's pretty normal at this stage — we'll work through it."`
      }
    },
    {
      k: "performance",
      title: "Performance",
      duration: "4 minutes",
      purpose: "Understand training and football development.",
      questions: [
        "What have you been most happy with in your game recently?",
        "What's been the biggest challenge at training lately?",
        "What feedback have the coaches been giving you?"
      ],
      followUp: `"If you could improve one thing in the next month, what would it be?"`,
      focusAreas: ["conditioning", "defensive reads", "communication", "fitness levels", "consistency"],
      portalFields: ["Performance Notes", "Coach Feedback", "Performance Focus"]
    },
    {
      k: "lifestyle",
      title: "Lifestyle",
      duration: "3 minutes",
      purpose: "Build habits that support performance.",
      questions: [
        "How has your sleep been lately?",
        "Are you feeling recovered after training?",
        "What's your eating like during the week?"
      ],
      keyHabits: ["sleep before 10:30pm", "hydration", "recovery routines"],
      tone: `"At your age those little habits make a massive difference."`,
      portalFields: ["Sleep", "Recovery", "Nutrition", "Lifestyle Score"]
    },
    {
      k: "personal",
      title: "Personal Development",
      duration: "3 minutes",
      purpose: "Help the athlete grow as a person.",
      questions: [
        "How are you feeling confidence-wise at the moment?",
        "Are you enjoying being around the team?",
        "Do you feel like you're speaking up more at training?"
      ],
      leadershipPrompt: `"The best players are often the best communicators."`,
      portalFields: ["Confidence", "Leadership", "Mindset", "Personal Development Notes"]
    },
    {
      k: "education",
      title: "Education",
      duration: "2 minutes",
      purpose: "Ensure school remains stable.",
      questions: [
        "How's school going at the moment?",
        "Any exams or big assignments coming up?",
        "Are you managing the workload ok?"
      ],
      keyMessage: `"Footy is important but school still matters."`,
      portalFields: ["School Progress", "Upcoming Pressure", "Education Notes"]
    },
    {
      k: "brand",
      title: "Brand & Social Media",
      duration: "2 minutes",
      purpose: "Develop responsible social behaviour.",
      questions: [
        "Have you posted anything recently?",
        "What sort of content do you enjoy sharing?",
        "Any negative experiences online?"
      ],
      teachingMoment: `"Everything you post builds your reputation."`,
      brandPillars: ["training", "lifestyle", "personality", "community"],
      portalFields: ["Social Activity", "Brand Pillars", "Behaviour Notes"]
    },
    {
      k: "goals",
      title: "Set Next-Month Goals",
      duration: "3 minutes",
      purpose: "Create clear direction.",
      question: `"What are three things you'd like to improve before we talk next?"`,
      examples: ["improve Bronco time", "improve sleep routine", "be more vocal at training"],
      confirmation: `"Alright let's lock those in."`,
      portalFields: ["Next Month Goals", "Primary Focus"]
    },
    {
      k: "close",
      title: "Close (Support + Accountability)",
      duration: "1 minute",
      purpose: "End the call with support.",
      script: `"Mate you're doing well and you're on a really good path.\nKeep focusing on those goals and we'll check back in next month."`,
      finalReassurance: `"And remember — if anything comes up before then just give me a call."`
    }
  ];




  // Handle email creation from mobile call screen
  const handleMobileCallEmail = useCallback((type: "athlete" | "parent", sectionNotes: Record<string, string>) => {
    setCallSessionActive(false);

    // Use section notes directly to create emails without AI summary
    const firstName = athlete.name.split(" ")[0];
    const parentName = athlete.parentName || "there";

    if (type === "athlete") {
      const sections: string[] = [];
      if (sectionNotes.performance) sections.push(`**On the Pitch**\n${sectionNotes.performance}`);
      if (sectionNotes.lifestyle) sections.push(`**Off the Pitch**\n${sectionNotes.lifestyle}`);
      if (sectionNotes.personal) sections.push(`**Personal Development**\n${sectionNotes.personal}`);
      if (sectionNotes.education) sections.push(`**Education**\n${sectionNotes.education}`);
      if (sectionNotes.goals) sections.push(`**What We're Working on Next**\n${sectionNotes.goals}`);

      const draft = [
        `Hey ${firstName},`,
        ``,
        `Really enjoyed our catch up today mate. It's great to see the effort you're putting in — you should be proud of how far you've come.`,
        ``,
        ...(sections.length > 0 ? [`Here's a quick summary of what we covered:`, ``, ...sections.map(s => s + "\n")] : []),
        `Keep backing yourself ${firstName}. You're on the right track and I'm here whenever you need me. If anything comes up between now and our next chat, just give me a call mate.`,
        ``,
        `Speak soon,`,
        `SFX Pathways`,
      ].join("\n");
      setAthleteEmailDraft(draft);
      // Auto-save to comms history
      saveCommsEmail({ athleteId: athlete.id, emailType: "athlete", subject: `Follow-up — ${firstName}`, body: draft, generatedFrom: "call", createdBy: user?.id });
      toast.success("Athlete email draft created");
    } else {
      const points: string[] = [];
      if (sectionNotes.performance) points.push(`**Performance:** ${sectionNotes.performance}`);
      if (sectionNotes.education) points.push(`**Education:** ${sectionNotes.education}`);
      if (sectionNotes.personal) points.push(`**Wellbeing & Development:** ${sectionNotes.personal}`);
      if (sectionNotes.lifestyle) points.push(`**Lifestyle:** ${sectionNotes.lifestyle}`);

      const draft = [
        `Hi ${parentName},`,
        ``,
        `I had a really positive catch up with ${firstName} this month and wanted to share a brief update with you.`,
        ``,
        `${firstName} is tracking well and showing good progress. I'm really pleased with how things are going.`,
        ``,
        ...(points.length > 0 ? [`Here's a summary of the key areas we discussed:`, ``, ...points, ``] : []),
        ...(sectionNotes.goals ? [`**Next Focus**\n${sectionNotes.goals}`, ``] : []),
        `Please feel free to reach out anytime if you'd like to discuss anything further — I'm always happy to chat.`,
        ``,
        `Warm regards,`,
        `SFX Pathways`,
      ].join("\n");
      setParentEmailDraft(draft);
      // Auto-save to comms history
      saveCommsEmail({ athleteId: athlete.id, emailType: "parent", subject: `Update — ${firstName}`, body: draft, generatedFrom: "call", createdBy: user?.id });
      toast.success("Parent email draft created");
    }
  }, [athlete.name, athlete.parentName]);

  if (voiceRecordingActive) {
    return (
      <VoiceRecordingFlow
        athlete={athlete}
        onClose={() => setVoiceRecordingActive(false)}
      />
    );
  }

  if (callSessionActive) {
    return (
      <MobileCallScreen
        athlete={athlete}
        onClose={() => setCallSessionActive(false)}
        onCreateEmail={handleMobileCallEmail}
      />
    );
  }

  return (
    <div className="space-y-5 p-4 md:p-6 max-w-4xl mx-auto">
      {/* Hero */}
      <HeroBanner
        title={`Comms — ${athlete.name}`}
        subtitle="Record calls, generate summaries, and track follow-ups"
        imageUrl={heroImage}
        size="sm"
      />

      {/* Tabs: Call Tools | Comms History */}
      <Tabs value={commsTab} onValueChange={(v) => setCommsTab(v as "tools" | "history")}>
        <TabsList className="w-full">
          <TabsTrigger value="tools" className="flex-1">Call Tools</TabsTrigger>
          <TabsTrigger value="history" className="flex-1">Comms History</TabsTrigger>
        </TabsList>

        <TabsContent value="tools" className="mt-4 space-y-5">
          {/* Start Call Session button — prominent on mobile */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="font-bold text-base md:text-lg">Call Tools</h3>
              <p className="text-sm text-muted-foreground">
                Choose a workflow for your call with {athlete.name}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                className="h-14 text-base gap-3 justify-start"
                onClick={() => setVoiceRecordingActive(true)}
              >
                <Mic className="h-5 w-5" /> Voice Record + AI Auto-Fill
              </Button>
              <Button
                variant="secondary"
                className="h-14 text-base gap-3 justify-start"
                onClick={() => setCallSessionActive(true)}
              >
                <Phone className="h-5 w-5" /> Guided Note-Taking
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Call Script Guide</CardTitle>
          <p className="text-sm text-muted-foreground">Expand each section to view detailed scripts and prompts</p>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {scriptGuides.map((guide) => (
              <AccordionItem key={guide.k} value={guide.k}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center justify-between flex-1 pr-4">
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={scriptChecked[guide.k]}
                        onCheckedChange={(v) => {
                          setScriptChecked((s) => ({ ...s, [guide.k]: v }));
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="text-left">
                        <div className="font-medium">{guide.title}</div>
                        <div className="text-xs text-muted-foreground">{guide.duration}</div>
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-3 pt-3">
                  <div className="rounded-lg bg-muted p-4 space-y-3">
                    <div>
                      <div className="text-xs font-medium text-muted-foreground uppercase">Purpose</div>
                      <div className="text-sm mt-1">{guide.purpose}</div>
                    </div>

                    {guide.script && (
                      <div>
                        <div className="text-xs font-medium text-muted-foreground uppercase">Script</div>
                        <div className="text-sm mt-1 whitespace-pre-line italic border-l-2 border-primary pl-3">{guide.script}</div>
                      </div>
                    )}

                    {guide.prompts && (
                      <div>
                        <div className="text-xs font-medium text-muted-foreground uppercase">Follow-up Prompts</div>
                        <ul className="text-sm mt-1 space-y-1">
                          {guide.prompts.map((p, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-primary">•</span>
                              <span>{p}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {guide.responses && (
                      <div className="grid gap-2 md:grid-cols-2">
                        <div>
                          <div className="text-xs font-medium text-muted-foreground uppercase">If Positive</div>
                          <div className="text-sm mt-1 italic">{guide.responses.positive}</div>
                        </div>
                        <div>
                          <div className="text-xs font-medium text-muted-foreground uppercase">If Challenge</div>
                          <div className="text-sm mt-1 italic">{guide.responses.challenge}</div>
                        </div>
                      </div>
                    )}

                    {guide.questions && (
                      <div>
                        <div className="text-xs font-medium text-muted-foreground uppercase">Key Questions</div>
                        <ul className="text-sm mt-1 space-y-1">
                          {guide.questions.map((q, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-primary">•</span>
                              <span>{q}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {guide.followUp && (
                      <div>
                        <div className="text-xs font-medium text-muted-foreground uppercase">Follow Up</div>
                        <div className="text-sm mt-1 italic border-l-2 border-primary pl-3">{guide.followUp}</div>
                      </div>
                    )}

                    {guide.question && (
                      <div>
                        <div className="text-xs font-medium text-muted-foreground uppercase">Ask</div>
                        <div className="text-sm mt-1 italic border-l-2 border-primary pl-3">{guide.question}</div>
                      </div>
                    )}

                    {guide.focusAreas && (
                      <div>
                        <div className="text-xs font-medium text-muted-foreground uppercase">Example Focus Areas</div>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {guide.focusAreas.map((area, idx) => (
                            <Badge key={idx} variant="secondary">{area}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {guide.keyHabits && (
                      <div>
                        <div className="text-xs font-medium text-muted-foreground uppercase">Key Habits</div>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {guide.keyHabits.map((habit, idx) => (
                            <Badge key={idx} variant="secondary">{habit}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {guide.brandPillars && (
                      <div>
                        <div className="text-xs font-medium text-muted-foreground uppercase">Brand Pillars Examples</div>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {guide.brandPillars.map((pillar, idx) => (
                            <Badge key={idx} variant="secondary">{pillar}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {guide.examples && (
                      <div>
                        <div className="text-xs font-medium text-muted-foreground uppercase">Example Goals</div>
                        <ul className="text-sm mt-1 space-y-1">
                          {guide.examples.map((ex, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-primary">•</span>
                              <span>{ex}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {guide.tone && (
                      <div>
                        <div className="text-xs font-medium text-muted-foreground uppercase">Supportive Tone</div>
                        <div className="text-sm mt-1 italic">{guide.tone}</div>
                      </div>
                    )}

                    {guide.keyMessage && (
                      <div>
                        <div className="text-xs font-medium text-muted-foreground uppercase">Key Message</div>
                        <div className="text-sm mt-1 italic">{guide.keyMessage}</div>
                      </div>
                    )}

                    {guide.teachingMoment && (
                      <div>
                        <div className="text-xs font-medium text-muted-foreground uppercase">Teaching Moment</div>
                        <div className="text-sm mt-1 italic">{guide.teachingMoment}</div>
                      </div>
                    )}

                    {guide.leadershipPrompt && (
                      <div>
                        <div className="text-xs font-medium text-muted-foreground uppercase">Leadership Prompt</div>
                        <div className="text-sm mt-1 italic">{guide.leadershipPrompt}</div>
                      </div>
                    )}

                    {guide.confirmation && (
                      <div>
                        <div className="text-xs font-medium text-muted-foreground uppercase">Agent Confirmation</div>
                        <div className="text-sm mt-1 italic">{guide.confirmation}</div>
                      </div>
                    )}

                    {guide.finalReassurance && (
                      <div>
                        <div className="text-xs font-medium text-muted-foreground uppercase">Final Reassurance</div>
                        <div className="text-sm mt-1 italic border-l-2 border-primary pl-3">{guide.finalReassurance}</div>
                      </div>
                    )}

                    {guide.portalFields && (
                      <div>
                        <div className="text-xs font-medium text-muted-foreground uppercase">Portal Tracker Fields</div>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {guide.portalFields.map((field, idx) => (
                            <Badge key={idx} variant="outline">{field}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* Email Drafts (generated from Call Tools) */}
      {athleteEmailDraft && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">📧 Athlete Email Draft</CardTitle>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => {
                  navigator.clipboard.writeText(athleteEmailDraft);
                  toast.success("Copied to clipboard");
                }}
              >
                Copy
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="whitespace-pre-wrap text-sm bg-muted/50 p-4 rounded-lg">{athleteEmailDraft}</div>
          </CardContent>
        </Card>
      )}

      {parentEmailDraft && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">📧 Parent Email Draft</CardTitle>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => {
                  navigator.clipboard.writeText(parentEmailDraft);
                  toast.success("Copied to clipboard");
                }}
              >
                Copy
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="whitespace-pre-wrap text-sm bg-muted/50 p-4 rounded-lg">{parentEmailDraft}</div>
          </CardContent>
        </Card>
      )}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <CommsHistory athleteId={athlete.id} athleteName={athlete.name} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TrackerDownloadCard({ athlete, role }: { athlete: Athlete; role?: Role }) {
  const { data: reviews = [] } = useMonthlyReviews(athlete.id);
  const { data: commsData = [] } = useCommsLog(athlete.id);
  const [downloading, setDownloading] = useState(false);
  const [uploadingTracker, setUploadingTracker] = useState(false);
  const [importingTracker, setImportingTracker] = useState(false);
  const [goals, setGoals] = useState<any[]>([]);
  const [savedTrackerUrl, setSavedTrackerUrl] = useState<string | null>(null);
  const [savedTrackerName, setSavedTrackerName] = useState<string | null>(null);
  const trackerInputRef = useRef<HTMLInputElement | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const isAgentOrAdmin = role === "agent" || role === "admin";
  const trackerFilePath = `development-tracker/${athlete.id}/latest.xlsx`;

  const refreshSavedTracker = useCallback(async () => {
    const { data, error } = await supabase
      .from("resources")
      .select("id, file_name, file_path")
      .eq("category", "Development Tracker")
      .eq("file_path", trackerFilePath)
      .maybeSingle();

    if (error) {
      console.error("Saved tracker fetch error:", error);
      return;
    }

    if (!data) {
      setSavedTrackerName(null);
      setSavedTrackerUrl(null);
      return;
    }

    const { data: publicData } = supabase.storage.from("resources").getPublicUrl(data.file_path);
    setSavedTrackerName(data.file_name);
    setSavedTrackerUrl(publicData.publicUrl);
  }, [trackerFilePath]);

  useEffect(() => {
    supabase
      .from("goal_tracker")
      .select("*")
      .eq("athlete_id", athlete.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setGoals(data || []));
  }, [athlete.id]);

  useEffect(() => {
    refreshSavedTracker();
  }, [refreshSavedTracker]);

  async function handleTrackerUpload(file: File) {
    const lower = file.name.toLowerCase();
    if (!lower.endsWith(".xlsx") && !lower.endsWith(".xls")) {
      toast.error("Please upload an Excel file (.xlsx or .xls)");
      return;
    }

    setUploadingTracker(true);
    try {
      const { error: uploadError } = await supabase.storage
        .from("resources")
        .upload(trackerFilePath, file, {
          upsert: true,
          contentType: file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });

      if (uploadError) throw uploadError;

      const { data: existing, error: existingError } = await supabase
        .from("resources")
        .select("id")
        .eq("category", "Development Tracker")
        .eq("file_path", trackerFilePath)
        .maybeSingle();

      if (existingError) throw existingError;

      if (existing?.id) {
        const { error: updateError } = await supabase
          .from("resources")
          .update({ file_name: file.name, file_size: file.size })
          .eq("id", existing.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("resources")
          .insert({
            category: "Development Tracker",
            file_name: file.name,
            file_path: trackerFilePath,
            file_size: file.size,
          });

        if (insertError) throw insertError;
      }

      await refreshSavedTracker();
      toast.success("Updated tracker saved to portal");
    } catch (e: any) {
      console.error("Tracker upload error:", e);
      toast.error(e.message || "Failed to save updated tracker");
    } finally {
      setUploadingTracker(false);
    }
  }

  async function handleImportTracker(file: File) {
    const lower = file.name.toLowerCase();
    if (!lower.endsWith(".xlsx") && !lower.endsWith(".xls")) {
      toast.error("Please upload an Excel file (.xlsx or .xls)");
      return;
    }

    setImportingTracker(true);
    try {
      const { importTrackerWorkbook } = await import("@/lib/tracker-import");
      const result = await importTrackerWorkbook(athlete.id, file);

      const parts: string[] = [];
      if (result.reviewsImported > 0) parts.push(`${result.reviewsImported} reviews imported`);
      if (result.reviewsUpdated > 0) parts.push(`${result.reviewsUpdated} reviews updated`);
      if (result.goalsImported > 0) parts.push(`${result.goalsImported} goals imported`);
      if (result.commsImported > 0) parts.push(`${result.commsImported} comms imported`);

      if (parts.length > 0) {
        toast.success(parts.join(", "));
      } else if (result.errors.length === 0) {
        toast.info("No data found to import");
      }

      if (result.errors.length > 0) {
        toast.error(`${result.errors.length} error(s) during import`);
        console.error("Import errors:", result.errors);
      }


    } catch (e: any) {
      console.error("Import error:", e);
      toast.error(e.message || "Failed to import tracker data");
    } finally {
      setImportingTracker(false);
      // Force page reload to refresh all data
      window.location.reload();
    }
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      const { exportTrackerWorkbook } = await import("@/lib/tracker-export");
      const fileName = await exportTrackerWorkbook(athlete.id);
      toast.success(`Tracker downloaded as ${fileName}`);
    } catch (e: any) {
      console.error("Download error:", e);
      toast.error("Failed to generate tracker file");
    }
    setDownloading(false);
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-2 flex flex-row items-center justify-between flex-wrap gap-2">
        <CardTitle className="text-base">📊 Development Tracker — {athlete.name}</CardTitle>
        <div className="flex gap-2 flex-wrap">
          {isAgentOrAdmin && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => importInputRef.current?.click()}
              disabled={importingTracker}
              className="gap-1.5"
            >
              {importingTracker ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              Import Reviews
            </Button>
          )}
          <Button size="sm" onClick={handleDownload} disabled={downloading} className="gap-1.5">
            {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
            Download .xlsx
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Full 5-sheet tracker: Athlete Profile, Monthly Reviews, Goal Tracker, Parent Comms, and Dashboard KPIs ({reviews.length} review{reviews.length !== 1 ? "s" : ""}).
        </p>

        {isAgentOrAdmin && (
          <input
            ref={importInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImportTracker(file);
              e.currentTarget.value = "";
            }}
          />
        )}

        {(isAgentOrAdmin || savedTrackerUrl) && (
          <div className="rounded-md border bg-background p-3">
            <div className="flex flex-wrap items-center gap-2">
              {isAgentOrAdmin && (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    disabled={uploadingTracker}
                    onClick={() => trackerInputRef.current?.click()}
                  >
                    {uploadingTracker ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    Save edited .xlsx to portal
                  </Button>
                  <input
                    ref={trackerInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleTrackerUpload(file);
                      e.currentTarget.value = "";
                    }}
                  />
                </>
              )}

              {savedTrackerUrl && (
                <a
                  href={savedTrackerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  Open latest saved tracker{savedTrackerName ? `: ${savedTrackerName}` : ""}
                </a>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}




function Resources({ athlete, role }: { athlete?: Athlete; role?: Role }) {
  const BASE_CATEGORIES = ["Nutrition", "Recovery", "Mindset", "Media Training", "Social Media", "Parent Playbook"];
  const [resources, setResources] = useState<Record<string, { id: string; file_name: string; file_path: string; created_at: string; source?: "global" | "athlete" }[]>>({});
  const [allCategories, setAllCategories] = useState<string[]>(BASE_CATEGORIES);
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const isAgentOrAdmin = role === "agent" || role === "admin";

  useEffect(() => {
    fetchResources();
  }, [athlete?.id]);

  async function fetchResources() {
    // Fetch global resources
    const { data: globalData, error: globalError } = await supabase
      .from("resources")
      .select("*")
      .order("created_at", { ascending: false });
    if (globalError) {
      console.error("Error fetching resources:", globalError);
    }

    // Fetch athlete-specific resources if athlete is selected
    let athleteData: any[] = [];
    if (athlete?.id) {
      const { data, error } = await supabase
        .from("athlete_resources")
        .select("*")
        .eq("athlete_id", athlete.id)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Error fetching athlete resources:", error);
      } else {
        athleteData = data || [];
      }
    }

    const grouped: typeof resources = {};
    // Add global resources
    for (const r of globalData || []) {
      if (!grouped[r.category]) grouped[r.category] = [];
      grouped[r.category].push({ id: r.id, file_name: r.file_name, file_path: r.file_path, created_at: r.created_at, source: "global" });
    }
    // Merge ALL athlete-specific resources (no category filter)
    // Exclude contract categories as they have their own tab
    const contractCategories = ["Management Contract", "Playing Contract"];
    for (const r of athleteData) {
      if (contractCategories.includes(r.category)) continue;
      const cat = r.category || "Other";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push({ id: r.id, file_name: r.title || r.file_name, file_path: r.file_path, created_at: r.created_at, source: "athlete" });
    }
    // Build merged category list: base categories + any extra from data
    const extraCats = Object.keys(grouped).filter(c => !BASE_CATEGORIES.includes(c));
    setAllCategories([...BASE_CATEGORIES, ...extraCats]);
    setResources(grouped);
  }

  async function handleUpload(category: string, file: File) {
    setUploading(category);
    const filePath = `${category.toLowerCase().replace(/\s+/g, "-")}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("resources")
      .upload(filePath, file);

    if (uploadError) {
      toast.error(`Upload failed: ${uploadError.message}`);
      setUploading(null);
      return;
    }

    const { error: dbError } = await supabase
      .from("resources")
      .insert({ category, file_name: file.name, file_path: filePath, file_size: file.size });

    if (dbError) {
      toast.error(`Failed to save record: ${dbError.message}`);
    } else {
      toast.success(`"${file.name}" uploaded to ${category}`);
      fetchResources();
    }
    setUploading(null);
  }

  async function handleDelete(id: string, filePath: string, category: string, source?: "global" | "athlete") {
    const bucket = source === "athlete" ? "athlete-resources" : "resources";
    const table = source === "athlete" ? "athlete_resources" : "resources";
    const { error: storageError } = await supabase.storage.from(bucket).remove([filePath]);
    if (storageError) {
      toast.error(`Delete failed: ${storageError.message}`);
      return;
    }
    const { error: dbError } = await supabase.from(table).delete().eq("id", id);
    if (dbError) {
      toast.error(`Failed to remove record: ${dbError.message}`);
    } else {
      toast.success("File deleted");
      fetchResources();
    }
  }

  function getPublicUrl(filePath: string, source?: "global" | "athlete") {
    if (source === "athlete") {
      // athlete-resources bucket is private, use signed URL
      return null; // handled via click
    }
    const { data } = supabase.storage.from("resources").getPublicUrl(filePath);
    return data.publicUrl;
  }

  async function handleDownloadAthlete(filePath: string) {
    const { data, error } = await supabase.storage
      .from("athlete-resources")
      .createSignedUrl(filePath, 60);
    if (error || !data?.signedUrl) {
      toast.error("Could not generate download link");
      return;
    }
    window.open(data.signedUrl, "_blank");
  }

  const showContracts = role === "athlete" || role === "parent" || role === "agent";

  return (
    <div className="space-y-5 p-4 md:p-6 max-w-4xl mx-auto">
      {/* Hero */}
      <HeroBanner
        title="Resources"
        subtitle="Training materials, guides, and development resources"
        imageUrl={heroImage}
        size="sm"
      />
      <Tabs defaultValue="materials">
        <TabsList>
          <TabsTrigger value="materials">Resource Materials</TabsTrigger>
          {showContracts && <TabsTrigger value="contracts">Management &amp; Playing Contracts</TabsTrigger>}
        </TabsList>

        <TabsContent value="materials" className="mt-4 space-y-6">
          {/* Tracker download card (XLS export) */}
          {athlete && <TrackerDownloadCard athlete={athlete} role={role} />}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {allCategories.map((cat) => (
              <Card key={cat} className="hover:shadow-sm transition">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-base">{cat}</CardTitle>
                  {isAgentOrAdmin && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      disabled={uploading === cat}
                      onClick={() => fileInputRefs.current[cat]?.click()}
                    >
                      {uploading === cat ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <FileText className="h-3.5 w-3.5" />
                      )}
                      Upload
                    </Button>
                  )}
                  {isAgentOrAdmin && (
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.mp4,.mov,.jpg,.png,.webp"
                      className="hidden"
                      ref={(el) => { fileInputRefs.current[cat] = el; }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleUpload(cat, file);
                          e.target.value = "";
                        }
                      }}
                    />
                  )}
                </CardHeader>
                <CardContent className="space-y-2">
                  {(resources[cat] || []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No files yet.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                      {(resources[cat] || []).map((res) => (
                        <div key={`${res.source}-${res.id}`} className="flex items-center justify-between gap-2 text-sm p-2 rounded-md bg-muted/40">
                          {res.source === "athlete" ? (
                            <button
                              onClick={() => handleDownloadAthlete(res.file_path)}
                              className="truncate text-primary hover:underline flex-1 text-left"
                            >
                              {res.file_name}
                            </button>
                          ) : (
                            <a
                              href={getPublicUrl(res.file_path, res.source) || "#"}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="truncate text-primary hover:underline flex-1"
                            >
                              {res.file_name}
                            </a>
                          )}
                          {isAgentOrAdmin && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 shrink-0"
                              onClick={() => handleDelete(res.id, res.file_path, cat, res.source)}
                            >
                              <span className="text-xs text-destructive">✕</span>
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {showContracts && (
          <TabsContent value="contracts" className="mt-4">
            <ContractsTab athlete={athlete} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function ContractsTab({ athlete }: { athlete?: Athlete }) {
  const [mgmtFiles, setMgmtFiles] = useState<{ id: string; title: string; file_path: string }[]>([]);
  const [playFiles, setPlayFiles] = useState<{ id: string; title: string; file_path: string }[]>([]);

  useEffect(() => {
    if (!athlete?.id) return;
    async function load() {
      const { data } = await supabase
        .from("athlete_resources")
        .select("id, title, file_name, file_path, category")
        .eq("athlete_id", athlete!.id)
        .in("category", ["Management Contract", "Playing Contract"])
        .order("created_at", { ascending: false });
      setMgmtFiles((data || []).filter(r => r.category === "Management Contract").map(r => ({ id: r.id, title: r.title || r.file_name, file_path: r.file_path })));
      setPlayFiles((data || []).filter(r => r.category === "Playing Contract").map(r => ({ id: r.id, title: r.title || r.file_name, file_path: r.file_path })));
    }
    load();
  }, [athlete?.id]);

  if (!athlete) {
    return <p className="text-sm text-muted-foreground p-4">No athlete selected.</p>;
  }

  const formatDate = (d: string | null) => {
    if (!d) return "Not set";
    return new Date(d).toLocaleDateString("en-AU", { day: "2-digit", month: "long", year: "numeric" });
  };

  const isExpiringSoon = (d: string | null) => {
    if (!d) return false;
    const diff = new Date(d).getTime() - Date.now();
    return diff > 0 && diff < 90 * 24 * 60 * 60 * 1000;
  };

  const isExpired = (d: string | null) => {
    if (!d) return false;
    return new Date(d).getTime() < Date.now();
  };

  async function handleDownload(filePath: string) {
    const { data, error } = await supabase.storage
      .from("athlete-resources")
      .createSignedUrl(filePath, 60);
    if (error || !data?.signedUrl) {
      toast.error("Could not generate download link");
      return;
    }
    window.open(data.signedUrl, "_blank");
  }

  function ContractFileList({ files }: { files: { id: string; title: string; file_path: string }[] }) {
    if (files.length === 0) return <p className="text-xs text-muted-foreground">No documents uploaded.</p>;
    return (
      <div className="space-y-1.5">
        {files.map(f => (
          <button key={f.id} onClick={() => handleDownload(f.file_path)} className="flex items-center gap-2 text-sm text-primary hover:underline w-full text-left p-1.5 rounded-md bg-muted/40">
            <FileText className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{f.title}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            Management Contract
            {isExpired(athlete.managementContractExpiry) && (
              <Badge variant="destructive" className="text-xs">Expired</Badge>
            )}
            {!isExpired(athlete.managementContractExpiry) && isExpiringSoon(athlete.managementContractExpiry) && (
              <Badge variant="secondary" className="text-xs">Expiring Soon</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground">Athlete</p>
            <p className="text-sm font-medium">{athlete.name}</p>
          </div>
          <Separator />
          <div>
            <p className="text-xs text-muted-foreground">Contract Expiry Date</p>
            <p className={`text-sm font-medium ${isExpired(athlete.managementContractExpiry) ? "text-destructive" : isExpiringSoon(athlete.managementContractExpiry) ? "text-amber-600" : ""}`}>
              {formatDate(athlete.managementContractExpiry)}
            </p>
          </div>
          <Separator />
          <div>
            <p className="text-xs text-muted-foreground mb-1">Documents</p>
            <ContractFileList files={mgmtFiles} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            Playing Contract (Club)
            {isExpired(athlete.clubContractExpiry) && (
              <Badge variant="destructive" className="text-xs">Expired</Badge>
            )}
            {!isExpired(athlete.clubContractExpiry) && isExpiringSoon(athlete.clubContractExpiry) && (
              <Badge variant="secondary" className="text-xs">Expiring Soon</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground">Club</p>
            <p className="text-sm font-medium">{athlete.club}</p>
          </div>
          <Separator />
          <div>
            <p className="text-xs text-muted-foreground">Contract Expiry Date</p>
            <p className={`text-sm font-medium ${isExpired(athlete.clubContractExpiry) ? "text-destructive" : isExpiringSoon(athlete.clubContractExpiry) ? "text-amber-600" : ""}`}>
              {formatDate(athlete.clubContractExpiry)}
            </p>
          </div>
          <Separator />
          <div>
            <p className="text-xs text-muted-foreground mb-1">Documents</p>
            <ContractFileList files={playFiles} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AdminSecurity() {
  return (
    <div className="space-y-5 p-4 md:p-6 max-w-4xl mx-auto">
      {/* Hero */}
      <HeroBanner
        title="Admin Panel"
        subtitle="Manage athletes, guardians, security, and access controls"
        imageUrl={heroImage}
        size="sm"
      />
      <Tabs defaultValue="athletes" className="w-full">
        <TabsList>
          <TabsTrigger value="athletes">Athlete & Guardian Management</TabsTrigger>
          <TabsTrigger value="security">Security & Access</TabsTrigger>
        </TabsList>
        <TabsContent value="athletes" className="mt-4">
          <AdminAthleteManager />
        </TabsContent>
        <TabsContent value="security" className="mt-4 space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Admin & Security</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid gap-3 md:grid-cols-2">
                <Card><CardContent className="p-4 space-y-2"><div className="font-medium">Role-Based Access Control</div><div className="text-muted-foreground">Athletes/Parents only see their own records. Agents see assigned athletes. Admin sees all.</div></CardContent></Card>
                <Card><CardContent className="p-4 space-y-2"><div className="font-medium">Audit Log</div><div className="text-muted-foreground">Track edits to reviews, contact details, and documents with timestamps and user IDs.</div></CardContent></Card>
                <Card><CardContent className="p-4 space-y-2"><div className="font-medium">Consent & Permissions</div><div className="text-muted-foreground">Store guardian consent flags; control whether parents can view goals and brand notes.</div></CardContent></Card>
                <Card><CardContent className="p-4 space-y-2"><div className="font-medium">Data Retention</div><div className="text-muted-foreground">Policies for call audio retention, exports, and backups. Essential for C-suite and governance.</div></CardContent></Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AthleteTimeline({ athlete }: { athlete: Athlete }) {
  const stages = [
    { title: "Emerging Talent", age: "14–15", body: "Skill foundation, habits, family support, and early representative exposure.", active: athlete.stage === "Emerging" },
    { title: "Elite Development", age: "16–17", body: "Structured development tracker, monthly reviews, recovery discipline, and coach feedback loops.", active: athlete.stage === "Elite" },
    { title: "Pre-Professional", age: "18–19", body: "Contract readiness, media maturity, stronger personal systems, and commercial foundations.", active: athlete.stage === "Pre-Pro" },
    { title: "NRL Transition", age: "Debut +", body: "Professional athlete standards, financial planning, brand positioning, and long-term career management.", active: false },
  ];

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Athlete Development Timeline</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            {stages.map((s, idx) => (
              <Card key={idx} className={s.active ? "border-foreground shadow-sm" : ""}>
                <CardContent className="p-4 space-y-2">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">{s.age}</div>
                  <div className="text-base font-semibold">{s.title}</div>
                  <div className="text-sm text-muted-foreground">{s.body}</div>
                  {s.active && <Badge>Current Stage</Badge>}
                </CardContent>
              </Card>
            ))}
          </div>
          <Separator />
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Current Athlete Snapshot</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div><span className="text-muted-foreground">Athlete:</span> {athlete.name}</div>
                <div><span className="text-muted-foreground">Stage:</span> {athlete.stage}</div>
                <div><span className="text-muted-foreground">Club:</span> {athlete.club}</div>
                <div><span className="text-muted-foreground">Position:</span> {athlete.position}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Priority Themes</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>• Performance structure</div>
                <div>• Recovery and sleep discipline</div>
                <div>• Confidence and communication</div>
                <div>• Parent alignment</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Transition Readiness</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="text-muted-foreground">Production version can score readiness across:</div>
                <div>Performance</div>
                <div>Lifestyle</div>
                <div>Personal maturity</div>
                <div>Media and brand readiness</div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

type CommandFilter = "all" | "calls_due_7" | "wellbeing_low" | "parent_followup" | "injury_setback" | "commercial_watch";

function ManagerCommandCentre({ athletes }: { athletes: Athlete[] }) {
  const [activeFilter, setActiveFilter] = useState<CommandFilter>("all");
  const { data: allComms = [] } = useCommsLog();

  const thriving = athletes.filter((a) => a.status === "Thriving").length;

  const contractAlerts = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const thirtyFiveDaysOut = new Date(now.getTime() + 35 * 24 * 60 * 60 * 1000);
    const alerts: { name: string; type: string; expiry: string }[] = [];
    athletes.forEach((a) => {
      if (a.managementContractExpiry) {
        const d = new Date(a.managementContractExpiry);
        if (d >= now && d <= thirtyFiveDaysOut) {
          alerts.push({ name: a.name, type: "Management", expiry: a.managementContractExpiry });
        }
      }
      if (a.clubContractExpiry) {
        const d = new Date(a.clubContractExpiry);
        if (d >= now && d <= thirtyFiveDaysOut) {
          alerts.push({ name: a.name, type: "Club", expiry: a.clubContractExpiry });
        }
      }
    });
    return alerts;
  }, [athletes]);

  const birthdayAlerts = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const thirtyFiveDaysOut = new Date(now.getTime() + 35 * 24 * 60 * 60 * 1000);
    const results: { name: string; turnsOn: string }[] = [];
    athletes.forEach((a) => {
      if (!a.dateOfBirth) return;
      const dob = new Date(a.dateOfBirth);
      const birthday17 = new Date(dob);
      birthday17.setFullYear(dob.getFullYear() + 17);
      if (birthday17 >= now && birthday17 <= thirtyFiveDaysOut) {
        results.push({ name: a.name, turnsOn: birthday17.toISOString().slice(0, 10) });
      }
    });
    return results;
  }, [athletes]);
  const attention = athletes.filter((a) => a.wellbeingScore <= 3 || a.status !== "Thriving").length;
  const highCommercial = athletes.filter((a) => a.commercialPotential === "High").length;

  // Build last-contact map from comms_log
  const lastContactMap = useMemo(() => {
    const map: Record<string, Date> = {};
    allComms.forEach((c) => {
      const d = new Date(c.sentAt);
      if (!map[c.athleteId] || d > map[c.athleteId]) {
        map[c.athleteId] = d;
      }
    });
    return map;
  }, [allComms]);

  const filteredAthletes = useMemo(() => {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    let filtered: Athlete[];
    switch (activeFilter) {
      case "calls_due_7":
        // Athletes sorted by longest time since last contact (most overdue first)
        filtered = [...athletes].sort((a, b) => {
          const aLast = lastContactMap[a.id]?.getTime() ?? 0;
          const bLast = lastContactMap[b.id]?.getTime() ?? 0;
          return aLast - bLast; // oldest contact first
        });
        break;
      case "wellbeing_low":
        filtered = athletes.filter((a) => a.wellbeingScore <= 3);
        break;
      case "parent_followup":
        // Athletes where parent comms are older than 14 days or no comms at all
        filtered = athletes.filter((a) => {
          const parentComms = allComms.filter((c) => c.athleteId === a.id && c.recipient === "parent");
          if (parentComms.length === 0) return true;
          const lastParent = new Date(Math.max(...parentComms.map((c) => new Date(c.sentAt).getTime())));
          return (now.getTime() - lastParent.getTime()) > 14 * 24 * 60 * 60 * 1000;
        });
        break;
      case "injury_setback":
        filtered = athletes.filter((a) => a.status === "Needs Support");
        break;
      case "commercial_watch":
        filtered = athletes.filter((a) => a.commercialPotential === "High");
        break;
      default:
        filtered = athletes.filter((a) => a.status !== "Thriving" || a.wellbeingScore <= 3);
    }
    return filtered;
  }, [athletes, activeFilter, allComms, lastContactMap]);

  const filters: { key: CommandFilter; label: string }[] = [
    { key: "calls_due_7", label: "Calls due in 7 days" },
    { key: "wellbeing_low", label: "Wellbeing ≤ 3" },
    { key: "parent_followup", label: "Parent follow-up needed" },
    { key: "injury_setback", label: "Injury / selection setback" },
    { key: "commercial_watch", label: "Commercial watch list" },
  ];

  const filterTitle: Record<CommandFilter, string> = {
    all: "Priority Actions This Week",
    calls_due_7: "Calls Due in 7 Days",
    wellbeing_low: "Athletes — Wellbeing ≤ 3",
    parent_followup: "Parent Follow-up Needed",
    injury_setback: "Injury / Selection Setback",
    commercial_watch: "Commercial Watch List",
  };

  function daysSinceContact(athleteId: string) {
    const last = lastContactMap[athleteId];
    if (!last) return "No contact recorded";
    const days = Math.floor((Date.now() - last.getTime()) / (24 * 60 * 60 * 1000));
    return days === 0 ? "Today" : `${days} day${days !== 1 ? "s" : ""} ago`;
  }

  return (
    <div className="space-y-6 p-6">
      {contractAlerts.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Contract Expiry Alerts</AlertTitle>
          <AlertDescription>
            <ul className="mt-1 space-y-1 text-sm">
              {contractAlerts.map((alert, i) => (
                <li key={i}>
                  <span className="font-medium">{alert.name}</span> — {alert.type} contract expires <span className="font-medium">{alert.expiry}</span>
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
      {birthdayAlerts.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Turning 17 Soon</AlertTitle>
          <AlertDescription>
            <ul className="mt-1 space-y-1 text-sm">
              {birthdayAlerts.map((b, i) => (
                <li key={i}><span className="font-medium">{b.name}</span> turns 17 on <span className="font-medium">{b.turnsOn}</span></li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total Athletes</div><div className="mt-1 text-2xl font-semibold">{athletes.length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Thriving</div><div className="mt-1 text-2xl font-semibold">{thriving}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Attention Required</div><div className="mt-1 text-2xl font-semibold">{attention}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">High Commercial Potential</div><div className="mt-1 text-2xl font-semibold">{highCommercial}</div></CardContent></Card>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{filterTitle[activeFilter]}</CardTitle>
              {activeFilter !== "all" && (
                <Button variant="ghost" size="sm" onClick={() => setActiveFilter("all")} className="text-xs">
                  ← Back to overview
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {filteredAthletes.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-xl border border-border p-3">
                <div>
                  <div className="font-medium">{a.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {a.club} • Wellbeing {a.wellbeingScore}/5 • Last contact: {daysSinceContact(a.id)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {statusBadge(a.status)}
                  {activeFilter === "commercial_watch" && <Badge variant="secondary">{a.commercialPotential}</Badge>}
                  <Button variant="secondary" size="sm">Open</Button>
                </div>
              </div>
            ))}
            {filteredAthletes.length === 0 && <div className="text-sm text-muted-foreground">No athletes match this filter.</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Command Centre Filters</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                className={`w-full text-left rounded-lg px-3 py-2 transition-colors ${
                  activeFilter === f.key
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                • {f.label}
              </button>
            ))}
            <Separator className="my-2" />
            <div className="text-xs text-muted-foreground px-3">Click a filter to view priority actions.</div>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Weekly Agent Workflow</CardTitle></CardHeader>
        <CardContent className="space-y-0 text-sm">
          {(() => {
            // Derive priority actions from live data
            const lowWellbeing = athletes.filter((a) => a.wellbeingScore <= 3);
            const needsSupport = athletes.filter((a) => a.status === "Needs Support");
            const overdueCalls = [...athletes].sort((a, b) => {
              const aLast = lastContactMap[a.id]?.getTime() ?? 0;
              const bLast = lastContactMap[b.id]?.getTime() ?? 0;
              return aLast - bLast;
            }).slice(0, 5);
            const parentFollowups = athletes.filter((a) => {
              const parentComms = allComms.filter((c) => c.athleteId === a.id && c.recipient === "parent");
              if (parentComms.length === 0) return true;
              const lastParent = new Date(Math.max(...parentComms.map((c) => new Date(c.sentAt).getTime())));
              return (Date.now() - lastParent.getTime()) > 14 * 24 * 60 * 60 * 1000;
            });
            const highCommercialAthletes = athletes.filter((a) => a.commercialPotential === "High");

            const days = [
              {
                day: "Monday",
                focus: "Review dashboard + book calls",
                actions: overdueCalls.length > 0
                  ? overdueCalls.map((a) => `📞 ${a.name} — last contact: ${daysSinceContact(a.id)}`)
                  : ["✅ All athletes contacted recently"],
              },
              {
                day: "Tuesday",
                focus: "Athlete calls + tracker updates",
                actions: [
                  ...lowWellbeing.map((a) => `⚠️ ${a.name} — wellbeing ${a.wellbeingScore}/5`),
                  ...needsSupport.filter((a) => a.wellbeingScore > 3).map((a) => `🔴 ${a.name} — needs support`),
                  ...(lowWellbeing.length === 0 && needsSupport.length === 0 ? ["✅ No urgent athlete concerns"] : []),
                ],
              },
              {
                day: "Wednesday",
                focus: "Parent updates + follow-ups",
                actions: parentFollowups.length > 0
                  ? parentFollowups.map((a) => `📧 ${a.name}'s parent — follow-up overdue`)
                  : ["✅ All parent comms up to date"],
              },
              {
                day: "Thursday",
                focus: "Club/coach touchpoints",
                actions: [
                  ...contractAlerts.map((c) => `🔔 ${c.name} — ${c.type} contract expires ${c.expiry}`),
                  ...birthdayAlerts.map((b) => `🎂 ${b.name} turns 17 on ${b.turnsOn}`),
                  ...(contractAlerts.length === 0 && birthdayAlerts.length === 0 ? ["✅ No contract or milestone alerts"] : []),
                ],
              },
              {
                day: "Friday",
                focus: "Commercial review + planning",
                actions: highCommercialAthletes.length > 0
                  ? highCommercialAthletes.map((a) => `💎 ${a.name} — high commercial potential`)
                  : ["✅ No commercial watch items"],
              },
            ];

            return (
              <div className="grid gap-4 md:grid-cols-5">
                {days.map((d) => (
                  <div key={d.day} className="space-y-2">
                    <div className="font-medium">{d.day}</div>
                    <div className="text-muted-foreground text-xs">{d.focus}</div>
                    <div className="space-y-1 mt-1">
                      {d.actions.map((action, i) => (
                        <div key={i} className="text-xs rounded-md bg-muted/50 px-2 py-1.5 leading-snug">
                          {action}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  );
}

function ParentTrustPortal({ athlete }: { athlete: Athlete }) {
  const { data: reviews = [] } = useMonthlyReviews(athlete.id);
  const review = reviews[0];
  return (
    <div className="space-y-5 p-4 md:p-6 max-w-2xl mx-auto">
      {/* Hero */}
      <HeroBanner
        title={`${athlete.name}'s Development`}
        subtitle="Stay connected with your child's progress"
        imageUrl={heroImage}
        badge={statusBadge(athlete.status)}
        size="md"
      />
      <div className="space-y-5">
        <Card>
          <CardHeader><CardTitle className="text-base">Parent Trust Portal</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Athlete</div><div className="mt-1 font-medium">{athlete.name}</div></CardContent></Card>
              <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Current Status</div><div className="mt-1">{statusBadge(athlete.status)}</div></CardContent></Card>
              <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Next Review</div><div className="mt-1 font-medium">{athlete.nextCall}</div></CardContent></Card>
            </div>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Latest Manager Summary</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div><span className="font-medium">Performance:</span> {review?.performance ?? "—"}</div>
                <div><span className="font-medium">Lifestyle:</span> {review?.lifestyle ?? "—"}</div>
                <div><span className="font-medium">Personal Development:</span> {review?.personal ?? "—"}</div>
                <div><span className="font-medium">Focus Next Month:</span> {review?.focus ?? "—"}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">How SFX Supports Your Athlete</CardTitle></CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2 text-sm">
                <div>• Monthly athlete development calls</div>
                <div>• Structured tracker updates</div>
                <div>• Parent communication summaries</div>
                <div>• Guidance on performance and lifestyle habits</div>
                <div>• Support during setbacks and pressure periods</div>
                <div>• Long-term career and character development</div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function SFXPathwaysPortal() {
  const { data: userRoleData, isLoading: roleLoading } = useUserRole();
  const [searchParams, setSearchParams] = useSearchParams();
  const [role, setRole] = useState<Role | null>(null);
  const [active, setActive] = useState("roster");
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);
  const [roleOverride, setRoleOverride] = useState<Role | null>(null);
  const [callActive, setCallActive] = useState(false);

  const requestedRole = searchParams.get("view") as Role | null;
  const isAdmin = userRoleData?.role === "admin";
  const effectiveRole = roleOverride || role;

  // For athlete/parent: restrict to allocated athlete only (skip when admin is previewing)
  const allocatedAthleteId = userRoleData?.allocatedAthleteId ?? null;
  const isPreviewingOtherRole = isAdmin && roleOverride && roleOverride !== "admin";
  const restrictToIds = !isPreviewingOtherRole && (effectiveRole === "athlete" || effectiveRole === "parent") && allocatedAthleteId
    ? [allocatedAthleteId]
    : undefined;

  const { data: athletes = [], isLoading: athletesLoading } = useAthletes(restrictToIds);

  // Set role from database once loaded
  useEffect(() => {
    if (userRoleData?.role && !role) {
      setRole(userRoleData.role as Role);
      const initialRole = isAdmin && requestedRole && ["admin", "agent", "parent", "athlete"].includes(requestedRole)
        ? requestedRole
        : (userRoleData.role as Role);
      if (isAdmin && requestedRole && requestedRole !== userRoleData.role) {
        setRoleOverride(requestedRole);
      }
      const firstTab = NAV[initialRole]?.[0]?.key ?? "dash";
      setActive(firstTab);
    }
  }, [userRoleData, role, isAdmin, requestedRole]);

  // When admin switches role preview, reset to first tab of that role
  const handleRoleSwitch = (newRole: Role) => {
    if (newRole === userRoleData?.role) {
      setRoleOverride(null);
      setSearchParams({});
    } else {
      setRoleOverride(newRole);
      setSearchParams({ view: newRole });
    }
    const firstTab = NAV[newRole]?.[0]?.key ?? "dash";
    setActive(firstTab);
  };

  const currentAthleteId = selectedAthleteId || athletes[0]?.id;
  const athlete = useMemo(() => athletes.find((a) => a.id === currentAthleteId) ?? athletes[0], [athletes, currentAthleteId]);

  if (athletesLoading || roleLoading || !role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!userRoleData?.approved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Pending Approval</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            Your account is pending approval. Please contact an administrator.
          </CardContent>
        </Card>
      </div>
    );
  }

  // For athlete/parent with no allocated athlete (skip when admin is previewing)
  if (!isPreviewingOtherRole && (effectiveRole === "athlete" || effectiveRole === "parent") && !allocatedAthleteId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>No Athlete Allocated</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            Your account has been approved but no athlete has been allocated to you yet. Please contact your manager.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!athlete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>No Athletes Found</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            There are no athletes in the system yet. Please add athletes to get started.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Shell role={effectiveRole} active={active} onNav={setActive} hideBottomNav={callActive}>
      {/* Admin role preview switcher */}
      {isAdmin && (
        <div className="px-4 pt-3 pb-1 flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Preview as:</span>
          <Select value={effectiveRole} onValueChange={(v) => handleRoleSwitch(v as Role)}>
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="agent">Agent</SelectItem>
              <SelectItem value="parent">Parent</SelectItem>
              <SelectItem value="athlete">Athlete</SelectItem>
            </SelectContent>
          </Select>
          {roleOverride && (
            <Badge variant="secondary" className="text-xs gap-1">
              Previewing {roleOverride}
            </Badge>
          )}
        </div>
      )}

      <TopBar
        role={effectiveRole}
        selectedAthleteId={currentAthleteId}
        setSelectedAthleteId={setSelectedAthleteId}
        athletes={athletes}
      />

      {effectiveRole === "athlete" && active === "dash" && <AthleteDashboard key={athlete.id} athlete={athlete} />}
      {effectiveRole === "athlete" && active === "reviews" && <EditableReviews key={athlete.id} athlete={athlete} />}
      {effectiveRole === "parent" && active === "dash" && <ParentDashboard key={athlete.id} athlete={athlete} />}
      {effectiveRole === "parent" && active === "updates" && <ParentTrustPortal key={athlete.id} athlete={athlete} />}

      {(effectiveRole === "agent" || effectiveRole === "admin") && active === "roster" && <RosterDashboard athletes={athletes} onOpenProfile={(id) => { setSelectedAthleteId(id); setActive("athlete"); }} />}
      {(effectiveRole === "agent" || effectiveRole === "admin") && active === "athlete" && <AthleteProfileAgentView key={athlete.id} athlete={athlete} />}
      {(effectiveRole === "agent" || effectiveRole === "admin") && active === "call" && <AthleteComms key={athlete.id} athlete={athlete} onCallActive={setCallActive} />}
      {(effectiveRole === "agent" || effectiveRole === "admin") && active === "reviews" && (
        <div className="space-y-5 p-4 md:p-6 max-w-4xl mx-auto">
          <HeroBanner
            title={`Development Tracker — ${athlete.name}`}
            subtitle="Review history, export data, and track progress over time"
            imageUrl={heroImage}
            size="sm"
          />
          <TrackerDownloadCard key={`tracker-${athlete.id}`} athlete={athlete} role={effectiveRole} />
          <EditableReviews key={athlete.id} athlete={athlete} />
        </div>
      )}

      {active === "resources" && <Resources key={athlete.id} athlete={athlete} role={effectiveRole} />}
      {effectiveRole === "admin" && active === "admin" && <AdminSecurity />}
    </Shell>
  );
}