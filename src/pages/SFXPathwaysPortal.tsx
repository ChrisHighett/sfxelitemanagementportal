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
import { Loader2, CalendarDays, ClipboardList, FileText, LayoutDashboard, Library, Mail, Phone, Plus, Shield, Sparkles, Users, AlertTriangle, Mic, Upload, Menu, WifiOff, Pencil, UserPlus, Check, X, Binoculars } from "lucide-react";
import WeeklyPlanner from "@/components/portal/WeeklyPlanner";
import ScoutPipeline from "@/components/portal/ScoutPipeline";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useAthletes, useMonthlyReviews, useCommsLog, type Athlete, type MonthlyReview, type CommsLog } from "@/hooks/usePortalData";
import { useUserRole } from "@/hooks/useUserRole";
import AdminAthleteManager from "@/components/AdminAthleteManager";
import EditableReviews from "@/components/EditableReviews";
import MobileCallScreen from "@/components/portal/MobileCallScreen";
import AdminAnalytics from "@/components/portal/AdminAnalytics";
import VoiceRecordingFlow from "@/components/portal/VoiceRecordingFlow";

import AthleteResourceFiles from "@/components/portal/AthleteResourceFiles";
import CommsHistory, { saveCommsEmail } from "@/components/portal/CommsHistory";
import ClubConversationLogger from "@/components/portal/ClubConversationLogger";
import TrendTracking from "@/components/portal/TrendTracking";
import AthleteScorecard from "@/components/portal/AthleteScorecard";
import ExpandedTimeline from "@/components/portal/ExpandedTimeline";
import { resolveSmartFields } from "@/lib/smart-review-fields";
import HeroBanner from "@/components/portal/ui/HeroBanner";
import StatCard from "@/components/portal/ui/StatCard";
import ImageCard from "@/components/portal/ui/ImageCard";
import ContentSection from "@/components/portal/ui/ContentSection";
type Role = "athlete" | "parent" | "agent" | "admin" | "scout";

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
    { key: "resources", label: "Resources", icon: Library },
  ],
  agent: [
    { key: "dash", label: "Dashboard", icon: LayoutDashboard },
    { key: "roster", label: "Roster", icon: Users },
    { key: "scout", label: "Scout", icon: Binoculars },
    { key: "athlete", label: "Athlete Profile", icon: FileText },
    { key: "call", label: "Athlete Comms", icon: Phone },
    { key: "reviews", label: "Development Tracker", icon: ClipboardList },
  ],
  admin: [
    { key: "dash", label: "Dashboard", icon: LayoutDashboard },
    { key: "roster", label: "Roster", icon: Users },
    { key: "scout", label: "Scout", icon: Binoculars },
    { key: "athlete", label: "Athlete Profile", icon: FileText },
    { key: "call", label: "Athlete Comms", icon: Phone },
    { key: "reviews", label: "Development Tracker", icon: ClipboardList },
    { key: "admin", label: "Admin", icon: Shield },
  ],
  scout: [
    { key: "leads", label: "My Leads", icon: Binoculars },
    { key: "add", label: "Add Lead", icon: Plus },
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
            <h2 className="text-lg font-bold" style={{ fontFamily: "var(--font-heading)" }}>TGI Pathways</h2>
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
          <h2 className="text-base font-bold" style={{ fontFamily: "var(--font-heading)" }}>TGI Pathways</h2>
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
                <h2 className="text-lg font-bold mb-4" style={{ fontFamily: "var(--font-heading)" }}>TGI Pathways</h2>
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
        imageUrl={athlete.photoUrl}
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
          value={<span className="text-xs font-medium">{smart?.focus && smart.focus !== "—" ? smart.focus : "Set after first review"}</span>}
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
            <div>Agent: {athlete.assignedAgent !== "Unassigned" ? athlete.assignedAgent : <span className="text-muted-foreground">To be assigned</span>}</div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="mt-3 w-full"
            onClick={() => {
              const subject = encodeURIComponent(`Message from ${athlete.name}`);
              const body = encodeURIComponent(`Hi ${athlete.assignedAgent},\n\n`);
              window.location.href = `mailto:info@tgisport.com.au?subject=${subject}&body=${body}`;
            }}
          >
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
          value={<span className="text-xs font-medium">{smart?.focus && smart.focus !== "—" ? smart.focus : "Set after first review"}</span>}
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
          <p className="text-xs text-muted-foreground mt-1">📧 info@tgisport.com.au</p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-3 w-full"
            onClick={() => {
              const subject = encodeURIComponent(`Message re: ${athlete.name}`);
              const body = encodeURIComponent(`Hi,\n\nI wanted to reach out regarding ${athlete.name}.\n\n`);
              window.location.href = `mailto:info@tgisport.com.au?subject=${subject}&body=${body}`;
            }}
          >
            Send Message
          </Button>
        </ImageCard>
      </ContentSection>

      {/* How TGI Sport Supports Your Athlete */}
      <ContentSection title="How TGI Sport Supports Your Athlete">
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            "Monthly athlete development calls",
            "Structured development tracker updates",
            "Professional parent communication summaries",
            "Guidance on performance and lifestyle habits",
            "Support during setbacks and pressure periods",
            "Long-term career and character development",
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-2 rounded-xl border border-border bg-card p-3">
              <div className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
              <span className="text-sm">{item}</span>
            </div>
          ))}
        </div>
      </ContentSection>
    </div>
  );
}

function RosterDashboard({ athletes, onOpenProfile }: { athletes: Athlete[]; onOpenProfile?: (id: string) => void }) {
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [onlyAttention, setOnlyAttention] = useState(false);
  const [addingAthlete, setAddingAthlete] = useState(false);
  const agentDisplayName = user?.user_metadata?.display_name || user?.email || "";

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
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle>Roster Dashboard</CardTitle>
            <Button
              size="sm"
              className="gap-1.5 shrink-0"
              onClick={() => setAddingAthlete((v) => !v)}
            >
              <Plus className="h-4 w-4" />
              Add athlete
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {addingAthlete && (
            <Card className="border-dashed border-primary/40 bg-primary/5">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">New athlete</CardTitle>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setAddingAthlete(false)}>
                    Cancel
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <AdminAthleteManager
                  lockedAgentName={agentDisplayName}
                  lockedAgentId={user?.id}
                  onBack={() => setAddingAthlete(false)}
                />
              </CardContent>
            </Card>
          )}
          <div className="flex flex-wrap items-center gap-4">
            <Input placeholder="Search athletes…" value={q} onChange={(e) => setQ(e.target.value)} className="w-full sm:w-72" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Show attention required</span>
            <Switch checked={onlyAttention} onCheckedChange={setOnlyAttention} />
          </div>
        </CardContent>
      </Card>
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground px-1">
            {q.trim().length > 0 ? `No athletes found matching "${q}"` : "No athletes in roster yet."}
          </p>
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
                    <div><div className="text-xs text-muted-foreground">Next Due</div><div className={`text-sm ${a.nextCall === "Overdue" ? "text-destructive font-semibold" : ""}`}>{a.nextCall}</div></div>
                    <div className="flex items-end"><Button variant="secondary" size="sm" className="w-full sm:w-auto" onClick={() => onOpenProfile?.(a.id)}>Open Profile</Button></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
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
        imageUrl={athlete.photoUrl}
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
              <div>Age: {athlete.age || <span className="text-muted-foreground">Not set</span>}</div>
              <div>Club: {athlete.club}</div>
              <div>School: {athlete.school}</div>
              <div>Position: {athlete.position}</div>
              <Separator className="my-3" />
              <div className="font-medium">Contract Dates</div>
              <div>Management Expiry: {athlete.managementContractExpiry || "—"}</div>
              <div>Club Contract Expiry: {athlete.clubContractExpiry || "—"}</div>
              <Separator className="my-3" />
              <div className="font-medium">Primary contact</div>
              <div>📧 {athlete.parentEmail || <span className="text-muted-foreground">No parent email recorded</span>}</div>
              <div>Parent: {athlete.parentName}</div>
              <div>Agent: {athlete.assignedAgent !== "Unassigned" ? athlete.assignedAgent : <span className="text-muted-foreground">To be assigned</span>}</div>
            </div>
            <div>
              <Tabs defaultValue="reviews">
                <TabsList className="flex flex-wrap h-auto gap-1">
                  <TabsTrigger value="reviews" className="text-xs sm:text-sm">Reviews</TabsTrigger>
                  <TabsTrigger value="comms" className="text-xs sm:text-sm">Comms</TabsTrigger>
                  <TabsTrigger value="scorecard" className="text-xs sm:text-sm">Scorecard</TabsTrigger>
                  <TabsTrigger value="trends" className="text-xs sm:text-sm">Trends</TabsTrigger>
                  <TabsTrigger value="timeline" className="text-xs sm:text-sm">Timeline</TabsTrigger>
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
                  <CommsHistory athleteId={athlete.id} athleteName={athlete.name} />
                </TabsContent>
                <TabsContent value="scorecard" className="mt-4">
                  <AthleteScorecard athlete={athlete} />
                </TabsContent>
                <TabsContent value="trends" className="mt-4">
                  <TrendTracking athlete={athlete} />
                </TabsContent>
                <TabsContent value="timeline" className="mt-4">
                  <ExpandedTimeline athlete={athlete} canEdit={true} />
                </TabsContent>
                <TabsContent value="commercial" className="mt-4">
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-base">Commercial Snapshot</CardTitle></CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Commercial Potential:</span>{" "}
                        <span className="font-medium">
                          {athlete.commercialPotential !== "Not Scored" ? athlete.commercialPotential : "Not yet assessed"}
                        </span>
                      </div>
                      <Separator />
                      <p className="text-muted-foreground text-xs">
                        Use this section to track brand partnerships, social media milestones, and commercial opportunities.
                        Log notes in the athlete's monthly review under Brand & Social.
                      </p>
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
        user?.user_metadata?.display_name || "Your TGI Sport Manager",
        `TGI Sport`,
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
        user?.user_metadata?.display_name || "Your TGI Sport Manager",
        `TGI Sport`,
      ].join("\n");
      setParentEmailDraft(draft);
      // Auto-save to comms history
      saveCommsEmail({ athleteId: athlete.id, emailType: "parent", subject: `Update — ${firstName}`, body: draft, generatedFrom: "call", createdBy: user?.id });
      toast.success("Parent email draft created");
    }
  }, [athlete.name, athlete.parentName, athlete.id, user?.id, user?.user_metadata?.display_name]);

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
      <div className="border-t border-border pt-4 mt-4">
            <ClubConversationLogger athlete={athlete} />
          </div>
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

  async function openPrivateResource(filePath: string, fileName: string) {
    const { data, error } = await supabase.storage
      .from("athlete-resources")
      .download(filePath);

    if (error || !data) {
      toast.error("Could not open file");
      return;
    }

    const objectUrl = URL.createObjectURL(data);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  }

  async function handleDownloadAthlete(filePath: string) {
    const fileName = filePath.split("/").pop() || "resource";
    await openPrivateResource(filePath, fileName);
  }

  const showContracts = role === "athlete" || role === "parent" || role === "agent";

  return (
    <div className="space-y-5 p-4 md:p-6 max-w-4xl mx-auto">
      {/* Hero */}
      <HeroBanner
        title="Resources"
        subtitle="Training materials, guides, and development resources"
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
    const fileName = filePath.split("/").pop() || "contract";
    const { data, error } = await supabase.storage
      .from("athlete-resources")
      .download(filePath);
    if (error || !data) {
      toast.error("Could not open file");
      return;
    }
    const objectUrl = URL.createObjectURL(data);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
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

function PendingApprovals() {
  const qc = useQueryClient();
  const { data: pending, isLoading } = useQuery({
    queryKey: ["pending_users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portal_users")
        .select("id, role, approved, created_at, display_name, email")
        .eq("approved", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000,
  });

  const { data: athletes } = useQuery({
    queryKey: ["athletes_for_allocation"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("athletes")
        .select("id, first_name, last_name")
        .order("last_name");
      if (error) throw error;
      return data || [];
    },
  });

  const [allocations, setAllocations] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  async function approveUser(userId: string, role: string) {
    setBusyId(userId);
    const { error } = await supabase
      .from("portal_users")
      .update({ approved: true })
      .eq("id", userId);
    if (error) { setBusyId(null); toast.error(error.message); return; }

    if ((role === "parent" || role === "athlete") && allocations[userId]) {
      const { error: accessError } = await supabase
        .from("user_athlete_access")
        .insert({
          user_id: userId,
          athlete_id: allocations[userId],
          relationship_type: role,
          approved_at: new Date().toISOString(),
        });
      if (accessError) {
        toast.error("Approved but allocation failed: " + accessError.message);
      }
    }

    toast.success("User approved");
    setBusyId(null);
    qc.invalidateQueries({ queryKey: ["pending_users"] });
  }

  async function rejectUser(userId: string) {
    setBusyId(userId);
    const { error } = await supabase.from("portal_users").delete().eq("id", userId);
    setBusyId(null);
    if (error) { toast.error(error.message); return; }
    toast.success("User removed");
    qc.invalidateQueries({ queryKey: ["pending_users"] });
  }

  if (isLoading) {
    return (
      <Card><CardContent className="p-4 text-sm text-muted-foreground flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading pending users…
      </CardContent></Card>
    );
  }
  if (!pending?.length) {
    return (
      <Card><CardContent className="p-4 text-sm text-muted-foreground">
        No pending approvals. All users are approved.
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-3">
      {pending.map((u) => (
        <Card key={u.id}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium truncate">{u.display_name || "No name set"}</div>
                <div className="text-xs text-muted-foreground truncate">{u.email || u.id}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Role: {u.role} · Signed up {new Date(u.created_at).toLocaleDateString("en-AU")}
                </div>
              </div>
              <Badge variant="outline">{u.role}</Badge>
            </div>

            {(u.role === "parent" || u.role === "athlete") && (
              <div className="space-y-1">
                <Label className="text-xs">Allocate to athlete</Label>
                <Select
                  value={allocations[u.id] || ""}
                  onValueChange={(v) => setAllocations((a) => ({ ...a, [u.id]: v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Select athlete…" /></SelectTrigger>
                  <SelectContent>
                    {(athletes || []).map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.first_name} {a.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button
                size="sm"
                onClick={() => approveUser(u.id, u.role)}
                disabled={
                  busyId === u.id ||
                  ((u.role === "parent" || u.role === "athlete") && !allocations[u.id])
                }
              >
                {busyId === u.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Approve"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => rejectUser(u.id)} disabled={busyId === u.id}>
                Reject
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AgentRow({ agent, onToggleApproved, onUpdateName }: {
  agent: { id: string; display_name: string | null; email: string | null; approved: boolean; created_at: string; role?: string };
  onToggleApproved: (id: string, current: boolean) => void;
  onUpdateName: (id: string, name: string) => void;
}) {
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(agent.display_name || "");

  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold shrink-0">
          {(agent.display_name || agent.email || "?")[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          {editingName ? (
            <div className="flex items-center gap-2">
              <Input
                value={nameVal}
                onChange={(e) => setNameVal(e.target.value)}
                autoFocus
                className="h-8"
                onKeyDown={(e) => {
                  if (e.key === "Enter") { onUpdateName(agent.id, nameVal); setEditingName(false); }
                  if (e.key === "Escape") { setEditingName(false); setNameVal(agent.display_name || ""); }
                }}
              />
              <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => { onUpdateName(agent.id, nameVal); setEditingName(false); }}>
                <Check className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="font-medium truncate">{agent.display_name || "Name not set"}</div>
              <button onClick={() => setEditingName(true)} className="text-muted-foreground hover:text-foreground">
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <div className="text-xs text-muted-foreground truncate">{agent.email || "No email"}</div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {agent.role === "scout" && (
            <Badge variant="outline" className="border-blue-500/40 text-blue-600 dark:text-blue-400">Scout</Badge>
          )}
          <Badge variant={agent.approved ? "default" : "secondary"}>
            {agent.approved ? "Active" : "Inactive"}
          </Badge>
          <Button size="sm" variant="outline" onClick={() => onToggleApproved(agent.id, agent.approved)}>
            {agent.approved ? "Deactivate" : "Reactivate"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AgentManager() {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState("agent");
  const [inviting, setInviting] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);

  const { data: agents = [], isLoading, refetch } = useQuery({
    queryKey: ["portal_agents_and_scouts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portal_users" as any)
        .select("id, role, approved, display_name, email, created_at")
        .in("role", ["agent", "scout"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const { data: scoutResponses = [] } = useQuery({
    queryKey: ["scout_response_times"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scout_leads" as any)
        .select("assigned_agent_id, assigned_agent_name, triage_decision, response_hours, first_agent_action_at, created_at, onboarding_stage")
        .eq("triage_decision", "Pursue")
        .not("assigned_agent_id", "is", null);
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const agentResponseStats = useMemo(() => {
    const byAgent: Record<string, { name: string; leads: number; responded: number; totalHours: number; overdue: number }> = {};
    for (const lead of scoutResponses) {
      const key = lead.assigned_agent_id;
      if (!key) continue;
      if (!byAgent[key]) byAgent[key] = { name: lead.assigned_agent_name || "Unknown", leads: 0, responded: 0, totalHours: 0, overdue: 0 };
      byAgent[key].leads++;
      if (lead.response_hours != null) {
        byAgent[key].responded++;
        byAgent[key].totalHours += Number(lead.response_hours);
      } else if (lead.onboarding_stage === "New") {
        const daysPending = Math.floor((Date.now() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24));
        if (daysPending > 1) byAgent[key].overdue++;
      }
    }
    return Object.values(byAgent).map((a) => ({
      ...a,
      avgHours: a.responded > 0 ? a.totalHours / a.responded : null,
      responseRate: a.leads > 0 ? Math.round((a.responded / a.leads) * 100) : 0,
    })).sort((a, b) => (a.avgHours ?? 999) - (b.avgHours ?? 999));
  }, [scoutResponses]);



  async function handleInvite() {
    if (!inviteEmail.trim() || !inviteName.trim()) {
      toast.error("Name and email are both required");
      return;
    }
    setInviting(true);
    try {
      const { data, error } = await supabase.functions.invoke("invite-agent", {
        body: { email: inviteEmail.trim(), displayName: inviteName.trim(), role: inviteRole },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success(`${inviteRole === "scout" ? "Scout" : "Agent"} invite sent to ${inviteEmail}`);
      setInviteEmail("");
      setInviteName("");
      setShowInviteForm(false);
      refetch();
    } catch (e: any) {
      toast.error(e.message || "Failed to send invite");
    } finally {
      setInviting(false);
    }
  }

  async function handleToggleApproved(agentId: string, currentApproved: boolean) {
    const { error } = await supabase
      .from("portal_users" as any)
      .update({ approved: !currentApproved })
      .eq("id", agentId);
    if (error) { toast.error(error.message); return; }
    toast.success(currentApproved ? "Agent deactivated" : "Agent reactivated");
    refetch();
  }

  async function handleUpdateName(agentId: string, newName: string) {
    const { error } = await supabase
      .from("portal_users" as any)
      .update({ display_name: newName })
      .eq("id", agentId);
    if (error) { toast.error(error.message); return; }
    toast.success("Name updated");
    refetch();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">Agent Accounts</h3>
          <p className="text-sm text-muted-foreground">
            Invite agents and scouts. They receive an email to set their password and access their portal immediately.
          </p>
        </div>
        <Button size="sm" className="gap-1.5 shrink-0" onClick={() => setShowInviteForm((v) => !v)}>
          <UserPlus className="h-4 w-4" />
          Invite member
        </Button>
      </div>

      {showInviteForm && (
        <Card className="border-dashed border-primary/40 bg-primary/5">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Invite new agent</CardTitle>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowInviteForm(false)}>
                Cancel
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Full name *</Label>
                <Input
                  placeholder="Jane Smith"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Work email address *</Label>
                <Input
                  type="email"
                  placeholder="jane@tgisport.com.au"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Role *</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agent">Agent</SelectItem>
                    <SelectItem value="scout">Scout</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              An invite email will be sent to this address. The agent clicks the link, sets their password, and their account is ready — already approved and set to agent role.
            </p>
            <Button size="sm" disabled={inviting} onClick={handleInvite}>
              {inviting ? (
                <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> Sending invite…</>
              ) : (
                "Send invite email"
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading agents…
        </div>
      ) : agents.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground text-center">
            No agent accounts yet. Use the Invite button to add your first agent.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {agents.map((agent: any) => (
            <AgentRow
              key={agent.id}
              agent={agent}
              onToggleApproved={handleToggleApproved}
              onUpdateName={handleUpdateName}
            />
          ))}
        </div>
      )}

      {agentResponseStats.length > 0 && (
        <div className="space-y-3 pt-4 border-t">
          <div>
            <h3 className="text-base font-semibold">Scout lead response times</h3>
            <p className="text-sm text-muted-foreground">How quickly each agent acts on Pursue leads assigned to them. Target: under 24 hours.</p>
          </div>
          <div className="space-y-2">
            {agentResponseStats.map((agent, i) => {
              const isGood = agent.avgHours != null && agent.avgHours <= 24;
              const isWarn = agent.avgHours != null && agent.avgHours > 24 && agent.avgHours <= 72;
              const statusColor = isGood ? "text-green-600" : isWarn ? "text-amber-600" : "text-destructive";
              const bgColor = isGood ? "bg-green-50 border-green-200" : isWarn ? "bg-amber-50 border-amber-200" : "bg-destructive/5 border-destructive/20";
              const rankColors = ["bg-amber-400", "bg-muted", "bg-orange-300"];
              return (
                <div key={agent.name + i} className={`rounded-lg border p-3 ${bgColor}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white ${rankColors[i] || "bg-muted"}`}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{agent.name}</span>
                        {agent.overdue > 0 && (
                          <Badge variant="destructive" className="text-xs">{agent.overdue} not actioned</Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {agent.leads} Pursue {agent.leads === 1 ? "lead" : "leads"} · {agent.responded} actioned · {agent.responseRate}% response rate
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`text-base font-semibold ${statusColor}`}>
                        {agent.avgHours != null ? `${Math.round(agent.avgHours)}h` : "—"}
                      </div>
                      <div className="text-xs text-muted-foreground">avg response</div>
                    </div>
                  </div>
                  {agent.avgHours != null && (
                    <div className="mt-2">
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${isGood ? "bg-green-500" : isWarn ? "bg-amber-500" : "bg-destructive"}`}
                          style={{ width: `${Math.min(100, (agent.avgHours / 72) * 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground mt-0.5">
                        <span>0h</span>
                        <span>Target: 24h</span>
                        <span>72h+</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
            <div><span className="text-green-600 font-medium">Green (under 24h)</span> — excellent. Lead actioned same day.</div>
            <div><span className="text-amber-600 font-medium">Amber (24–72h)</span> — acceptable. Consider reviewing workload.</div>
            <div><span className="text-destructive font-medium">Red (72h+)</span> — action needed. Scout leads going cold.</div>
            <div className="pt-1">Response time is measured from when a lead is assigned as Pursue to when the agent first moves it out of New stage.</div>
          </div>
        </div>
      )}
    </div>
  );
}

function ScoutLeadFormSimple({ editLead, onClose }: { editLead?: any; onClose: () => void }) {
  const { user } = useAuth();
  const { isOnline, enqueue } = useOfflineQueue();
  const [saving, setSaving] = useState(false);
  const [quickMode, setQuickMode] = useState(!editLead);
  const [form, setForm] = useState({
    first_name: editLead?.first_name || "",
    last_name: editLead?.last_name || "",
    age: editLead?.age || "",
    position: editLead?.position || "",
    school_club: editLead?.school_club || "",
    region: editLead?.region || "",
    comp_grade: editLead?.comp_grade || "",
    key_attributes: editLead?.key_attributes || "",
    competitor_interest: editLead?.competitor_interest || "",
    scout_rating: editLead?.scout_rating || "B",
    triage_decision: editLead?.triage_decision || "Watch",
    notes: editLead?.notes || "",
    assigned_agent_name: editLead?.assigned_agent_name || "",
    assigned_agent_id: editLead?.assigned_agent_id || "",
  });
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const { data: agentList = [] } = useQuery({
    queryKey: ["agent_list_scout_form"],
    queryFn: async () => {
      const { data } = await supabase
        .from("portal_users" as any)
        .select("id, display_name, email")
        .eq("role", "agent")
        .eq("approved", true);
      return (data as any[]) || [];
    },
  });

  async function handleSave() {
    if (!form.first_name.trim() || !form.last_name.trim()) {
      toast.error("First name and last name are required");
      return;
    }
    setSaving(true);
    try {
      const payload: any = { ...form, age: form.age ? Number(form.age) : null };
      if (editLead?.id) {
        const { error } = await supabase.from("scout_leads" as any).update(payload).eq("id", editLead.id);
        if (error) throw error;
        toast.success("Lead updated");
      } else {
        if (!isOnline) {
          enqueue("scout_leads", {
            ...payload,
            created_by: user?.id,
            onboarding_stage: "New",
          });
          toast.success(`${form.first_name} ${form.last_name} saved offline — will sync when connected`);
          onClose();
          return;
        }
        const { error } = await supabase.from("scout_leads" as any).insert({
          ...payload,
          created_by: user?.id,
          onboarding_stage: "New",
        });
        if (error) throw error;
        toast.success(`${form.first_name} ${form.last_name} added`);
      }
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const ratingButtons = (
    <div className="space-y-1.5">
      <Label className="text-xs">Scout rating</Label>
      <div className="flex gap-2">
        {["A", "B", "C"].map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => set("scout_rating", r)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border transition-colors ${
              form.scout_rating === r
                ? r === "A"
                  ? "bg-green-600 text-white border-green-600"
                  : r === "B"
                    ? "bg-amber-500 text-white border-amber-500"
                    : "bg-muted text-muted-foreground border-muted-foreground/30"
                : "bg-background border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {quickMode ? r : r === "A" ? "A — Elite" : r === "B" ? "B — Strong" : "C — Monitor"}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      {!editLead && (
        <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
          <span className="text-xs text-muted-foreground">
            {quickMode ? "Quick mode — essentials only" : "Full details mode"}
          </span>
          <button
            type="button"
            onClick={() => setQuickMode((v) => !v)}
            className="text-xs text-primary underline underline-offset-2"
          >
            {quickMode ? "Add full details" : "Quick mode"}
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label className="text-xs">First name *</Label><Input placeholder="Jake" value={form.first_name} onChange={(e) => set("first_name", e.target.value)} className="h-8" /></div>
        <div className="space-y-1"><Label className="text-xs">Last name *</Label><Input placeholder="Morrison" value={form.last_name} onChange={(e) => set("last_name", e.target.value)} className="h-8" /></div>
        <div className="space-y-1"><Label className="text-xs">Age</Label><Input type="number" placeholder="16" value={form.age} onChange={(e) => set("age", e.target.value)} className="h-8" /></div>
        <div className="space-y-1"><Label className="text-xs">Position</Label><Input placeholder="Halfback" value={form.position} onChange={(e) => set("position", e.target.value)} className="h-8" /></div>
      </div>

      {quickMode ? (
        <>
          {ratingButtons}
          <div className="space-y-1"><Label className="text-xs">Quick notes</Label><Textarea placeholder="What made you take notice…" value={form.key_attributes} onChange={(e) => set("key_attributes", e.target.value)} rows={2} /></div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">School / Club</Label><Input placeholder="Penrith Panthers" value={form.school_club} onChange={(e) => set("school_club", e.target.value)} className="h-8" /></div>
            <div className="space-y-1"><Label className="text-xs">Region</Label>
              <Select value={form.region} onValueChange={(v) => set("region", v)}>
                <SelectTrigger className="h-8"><SelectValue placeholder="Region" /></SelectTrigger>
                <SelectContent>{["QLD", "NSW", "VIC", "SA", "WA", "TAS", "ACT", "NZ", "Other"].map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          {ratingButtons}
          <div className="space-y-1"><Label className="text-xs">Key attributes</Label><Textarea placeholder="What made you take notice…" value={form.key_attributes} onChange={(e) => set("key_attributes", e.target.value)} rows={2} /></div>
          <div className="space-y-1"><Label className="text-xs">Competitor interest</Label><Textarea placeholder="Other agents circling? Who?" value={form.competitor_interest} onChange={(e) => set("competitor_interest", e.target.value)} rows={1} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">Decision</Label>
              <Select value={form.triage_decision} onValueChange={(v) => set("triage_decision", v)}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Pursue">Pursue</SelectItem><SelectItem value="Watch">Watch</SelectItem><SelectItem value="Pass">Pass</SelectItem><SelectItem value="Undecided">Undecided</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label className="text-xs">Comp / Grade</Label><Input placeholder="Yr 10 Rep" value={form.comp_grade} onChange={(e) => set("comp_grade", e.target.value)} className="h-8" /></div>
          </div>
          <div className="space-y-1"><Label className="text-xs">Notes</Label><Textarea placeholder="Any additional context…" value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} /></div>
        </>
      )}

      <Button className="w-full" onClick={handleSave} disabled={saving}>
        {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving…</> : editLead ? "Update lead" : "Add lead"}
      </Button>
    </div>
  );
}

function ScoutLeadCardSimple({ lead, onEdit, onReview, onStageChange, onTriageChange }: {
  lead: any;
  onEdit: () => void;
  onReview: () => void;
  onStageChange: (id: string, stage: string) => void;
  onTriageChange: (id: string, triage: string) => void;
}) {
  const stages = ["New", "Contacted", "Pack Sent", "Welcome Sent", "Signed", "Lost"];
  const ratingColor = lead.scout_rating === "A" ? "bg-green-100 text-green-800" : lead.scout_rating === "B" ? "bg-amber-100 text-amber-800" : "bg-muted text-muted-foreground";
  const triageColor = lead.triage_decision === "Pursue" ? "bg-primary/10 text-primary" : lead.triage_decision === "Watch" ? "bg-amber-100 text-amber-800" : "bg-muted text-muted-foreground";
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold">{lead.first_name} {lead.last_name}</span>
              {lead.lead_id && <Badge variant="outline" className="text-xs font-mono">{lead.lead_id}</Badge>}
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ratingColor}`}>{lead.scout_rating}</span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${triageColor}`}>{lead.triage_decision}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {[lead.position, lead.school_club, lead.region].filter(Boolean).join(" · ")}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-7 shrink-0 gap-1 text-xs"
            onClick={onReview}
          >
            <ClipboardList className="h-3.5 w-3.5" />
            View
          </Button>
        </div>
        {lead.competitor_interest && (
          <div className="text-xs text-destructive font-medium bg-destructive/10 rounded-md px-3 py-1.5">⚠️ {lead.competitor_interest}</div>
        )}
        {lead.key_attributes && <p className="text-xs text-muted-foreground line-clamp-2">{lead.key_attributes}</p>}
        <div className="flex flex-wrap gap-1.5">
          {stages.map((stage) => (
            <button
              key={stage}
              onClick={() => onStageChange(lead.id, stage)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                lead.onboarding_stage === stage
                  ? stage === "Signed" ? "bg-green-600 text-white border-green-600"
                    : stage === "Lost" ? "bg-muted text-muted-foreground border-muted-foreground/30"
                    : "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:bg-muted"
              }`}
            >
              {stage}
            </button>
          ))}
        </div>
        {lead.assigned_agent_name && (
          <div className="text-xs text-muted-foreground">Assigned to: <span className="font-medium text-foreground">{lead.assigned_agent_name}</span></div>
        )}
      </CardContent>
    </Card>
  );
}

function ScoutPortal({ autoOpenForm = false }: { autoOpenForm?: boolean }) {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(autoOpenForm);
  const [editingLead, setEditingLead] = useState<any>(null);
  const [reviewingLead, setReviewingLead] = useState<any>(null);

  useEffect(() => { if (autoOpenForm) { setEditingLead(null); setShowForm(true); } }, [autoOpenForm]);

  const { data: leads = [], refetch, isLoading } = useQuery({
    queryKey: ["scout_my_leads", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scout_leads" as any)
        .select("*")
        .eq("created_by", user?.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!user?.id,
  });

  const pursue = leads.filter((l: any) => l.triage_decision === "Pursue");
  const watch = leads.filter((l: any) => l.triage_decision === "Watch");
  const signed = leads.filter((l: any) => l.onboarding_stage === "Signed");

  async function handleStageChange(id: string, stage: string) {
    const { error } = await supabase.from("scout_leads" as any).update({ onboarding_stage: stage }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    refetch();
    toast.success("Stage updated");
  }
  async function handleTriageChange(id: string, triage: string) {
    const { error } = await supabase.from("scout_leads" as any).update({ triage_decision: triage }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    refetch();
  }

  return (
    <div className="space-y-5 p-4 md:p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">My Scout Leads</h1>
          <p className="text-sm text-muted-foreground">Log prospects, update stages, track your pipeline.</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => { setEditingLead(null); setShowForm(true); }}>
          <Plus className="h-4 w-4" />Add lead
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Pursue", value: pursue.length, color: "text-primary" },
          { label: "Watch", value: watch.length, color: "text-amber-600" },
          { label: "Signed", value: signed.length, color: "text-green-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-lg border bg-card p-3 text-center">
            <div className={`text-2xl font-semibold ${color}`}>{value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {showForm && (
        <Card className="border-dashed border-primary/40 bg-primary/5">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{editingLead ? "Edit lead" : "New lead"}</CardTitle>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScoutLeadFormSimple
              editLead={editingLead}
              onClose={() => { setShowForm(false); setEditingLead(null); refetch(); }}
            />
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading your leads…
        </div>
      ) : leads.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No leads yet. Tap "Add lead" to log your first prospect.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {leads.map((lead: any) => (
            <ScoutLeadCardSimple
              key={lead.id}
              lead={lead}
              onEdit={() => { setEditingLead(lead); setShowForm(true); }}
              onReview={() => setReviewingLead(lead)}
              onStageChange={handleStageChange}
              onTriageChange={handleTriageChange}
            />
          ))}
        </div>
      )}

      {reviewingLead && (
        <ScoutLeadReviewPanel
          lead={reviewingLead}
          onClose={() => setReviewingLead(null)}
          onEdit={() => {
            setEditingLead(reviewingLead);
            setShowForm(true);
            setReviewingLead(null);
          }}
          onStageChange={(id, stage) => {
            handleStageChange(id, stage);
            setReviewingLead((prev: any) => prev ? { ...prev, onboarding_stage: stage } : null);
          }}
          onConvert={() => {}}
        />
      )}
    </div>
  );
}

function ScoutLeadReviewPanel({ lead, onClose, onEdit, onStageChange, onConvert }: {
  lead: any;
  onClose: () => void;
  onEdit: () => void;
  onStageChange: (id: string, stage: string) => void;
  onConvert: (lead: any) => void;
}) {
  const ratingColor = lead.scout_rating === "A"
    ? "bg-green-100 text-green-800 border-green-300"
    : lead.scout_rating === "B"
    ? "bg-amber-100 text-amber-800 border-amber-300"
    : "bg-muted text-muted-foreground border-border";

  const triageColor = lead.triage_decision === "Pursue"
    ? "bg-primary/10 text-primary border-primary/30"
    : lead.triage_decision === "Watch"
    ? "bg-amber-100 text-amber-800 border-amber-300"
    : "bg-muted text-muted-foreground border-border";

  const stages = ["New", "Contacted", "Pack Sent", "Welcome Sent", "Signed", "Lost"];

  const InfoRow = ({ label, value, highlight }: { label: string; value?: string | null; highlight?: boolean }) => {
    if (!value) return null;
    return (
      <div className="space-y-0.5">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</div>
        <div className={`text-sm ${highlight ? "font-medium text-destructive" : "text-foreground"}`}>{value}</div>
      </div>
    );
  };

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="space-y-3">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b pb-1">{title}</div>
      {children}
    </div>
  );

  const daysSinceAdded = lead.created_at
    ? Math.floor((Date.now() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const daysSinceStageChange = lead.last_stage_change_at
    ? Math.floor((Date.now() - new Date(lead.last_stage_change_at).getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const isStalled = daysSinceStageChange != null
    && daysSinceStageChange >= 7
    && lead.triage_decision === "Pursue"
    && !["Signed", "Lost"].includes(lead.onboarding_stage);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40" onClick={onClose}>
      <div
        className="bg-background w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 p-5 pb-3 border-b">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {lead.lead_id && (
                <span className="text-xs font-mono text-muted-foreground border rounded px-1.5 py-0.5">{lead.lead_id}</span>
              )}
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${ratingColor}`}>
                {lead.scout_rating} — {lead.scout_rating === "A" ? "Elite prospect" : lead.scout_rating === "B" ? "Strong watch" : "Monitor"}
              </span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${triageColor}`}>
                {lead.triage_decision}
              </span>
              {isStalled && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                  Stalled {daysSinceStageChange}d
                </span>
              )}
            </div>
            <h2 className="text-xl font-semibold mt-1.5">{lead.first_name} {lead.last_name}</h2>
            <p className="text-sm text-muted-foreground">
              {[lead.age ? `${lead.age}y` : null, lead.position, lead.region].filter(Boolean).join(" · ")}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted transition-colors shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          <Section title="Scout intelligence">
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              <InfoRow label="School / Club" value={lead.school_club} />
              <InfoRow label="Competition / Grade" value={lead.comp_grade} />
              <InfoRow label="Region" value={lead.region} />
              <InfoRow label="Age" value={lead.age ? `${lead.age} years old` : null} />
              <InfoRow label="Logged by" value={lead.scout_name} />
              <InfoRow label="Source / Referral" value={lead.source_contact} />
            </div>
            {lead.key_attributes && (
              <div className="space-y-0.5">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Key attributes</div>
                <div className="text-sm text-foreground bg-muted/50 rounded-lg p-3 leading-relaxed">{lead.key_attributes}</div>
              </div>
            )}
          </Section>

          {lead.competitor_interest && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-1">
              <div className="text-xs font-semibold text-destructive uppercase tracking-wide flex items-center gap-1.5">
                <span>⚠</span> Competition active
              </div>
              <p className="text-sm text-foreground">{lead.competitor_interest}</p>
            </div>
          )}

          <Section title="Pipeline status">
            <div className="flex flex-wrap gap-1.5">
              {stages.map((stage) => (
                <button
                  key={stage}
                  onClick={() => onStageChange(lead.id, stage)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    lead.onboarding_stage === stage
                      ? stage === "Signed" ? "bg-green-600 text-white border-green-600"
                        : stage === "Lost" ? "bg-muted-foreground/20 text-muted-foreground border-transparent"
                        : "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:bg-muted"
                  }`}
                >
                  {stage}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <InfoRow label="Date contacted" value={lead.date_contacted} />
              <InfoRow label="Pack sent" value={lead.date_pack_sent} />
              <InfoRow label="Welcome sent" value={lead.date_welcome_sent} />
              <InfoRow label="Date signed" value={lead.date_signed} />
            </div>
          </Section>

          {(lead.action_required || lead.action_due_date || lead.next_step) && (
            <Section title="Action required">
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                <InfoRow label="Action" value={lead.action_required} />
                <InfoRow label="Due date" value={lead.action_due_date} />
                <InfoRow label="Status" value={lead.action_status} />
                <InfoRow label="Outcome" value={lead.action_outcome} />
              </div>
              {lead.next_step && (
                <div className="rounded-lg bg-primary/5 border border-primary/20 px-3 py-2">
                  <div className="text-xs font-medium text-primary uppercase tracking-wide mb-0.5">Next step</div>
                  <div className="text-sm">{lead.next_step}</div>
                </div>
              )}
            </Section>
          )}

          <Section title="Assignment">
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <InfoRow label="Assigned agent" value={lead.assigned_agent_name} />
              <InfoRow label="Scout credited" value={lead.scout_credited ? "Yes" : lead.scout_credited === false ? "No" : null} />
            </div>
          </Section>

          <Section title="Timeline">
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <div className="space-y-0.5">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Added</div>
                <div className="text-sm">{lead.created_at ? new Date(lead.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : "—"}{daysSinceAdded != null ? ` (${daysSinceAdded}d ago)` : ""}</div>
              </div>
              <div className="space-y-0.5">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Last updated</div>
                <div className="text-sm">{lead.updated_at ? new Date(lead.updated_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : "—"}</div>
              </div>
              {lead.response_hours != null && (
                <div className="space-y-0.5">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Agent response time</div>
                  <div className={`text-sm font-medium ${Number(lead.response_hours) <= 24 ? "text-green-600" : Number(lead.response_hours) <= 72 ? "text-amber-600" : "text-destructive"}`}>
                    {Math.round(Number(lead.response_hours))}h
                    {Number(lead.response_hours) <= 24 ? " — excellent" : Number(lead.response_hours) <= 72 ? " — within target" : " — slow"}
                  </div>
                </div>
              )}
            </div>
          </Section>

          {lead.notes && (
            <Section title="Notes">
              <div className="text-sm text-foreground bg-muted/50 rounded-lg p-3 leading-relaxed whitespace-pre-wrap">{lead.notes}</div>
            </Section>
          )}
        </div>

        <div className="p-4 pt-3 border-t flex gap-2">
          {lead.onboarding_stage === "Welcome Sent" && (
            <Button
              className="flex-1 gap-1.5 bg-green-600 hover:bg-green-700 text-white"
              onClick={() => { onConvert(lead); onClose(); }}
            >
              <UserPlus className="h-4 w-4" />
              Convert to athlete
            </Button>
          )}
          <Button variant="outline" className="flex-1 gap-1.5" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
            Edit lead
          </Button>
          <Button variant="ghost" onClick={onClose} className="shrink-0">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

function AgentScoutView() {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingLead, setEditingLead] = useState<any>(null);
  const [reviewingLead, setReviewingLead] = useState<any>(null);
  const [filter, setFilter] = useState<"All" | "Pursue" | "Watch" | "Stalled" | "Mine">("All");
  const [stageFilter, setStageFilter] = useState("All");

  const { data: leads = [], refetch, isLoading } = useQuery({
    queryKey: ["agent_scout_leads", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scout_leads" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const filtered = leads.filter((l: any) => {
    const days = Math.floor((Date.now() - new Date(l.last_stage_change_at || l.created_at).getTime()) / (1000 * 60 * 60 * 24));
    if (filter === "Pursue" && l.triage_decision !== "Pursue") return false;
    if (filter === "Watch" && l.triage_decision !== "Watch") return false;
    if (filter === "Mine" && l.assigned_agent_id !== user?.id) return false;
    if (filter === "Stalled" && !(days >= 7 && l.triage_decision === "Pursue" && !["Signed", "Lost"].includes(l.onboarding_stage))) return false;
    if (stageFilter !== "All" && l.onboarding_stage !== stageFilter) return false;
    return true;
  });

  const pursue = leads.filter((l: any) => l.triage_decision === "Pursue" && !["Signed", "Lost"].includes(l.onboarding_stage));
  const stalled = leads.filter((l: any) => {
    const days = Math.floor((Date.now() - new Date(l.last_stage_change_at || l.created_at).getTime()) / (1000 * 60 * 60 * 24));
    return days >= 7 && l.triage_decision === "Pursue" && !["Signed", "Lost"].includes(l.onboarding_stage);
  });
  const competition = leads.filter((l: any) => l.competitor_interest?.trim() && !["Signed", "Lost"].includes(l.onboarding_stage));
  const signed = leads.filter((l: any) => l.onboarding_stage === "Signed" && new Date(l.last_stage_change_at || l.created_at).getFullYear() === new Date().getFullYear());

  async function handleStageChange(id: string, stage: string) {
    const updates: any = { onboarding_stage: stage };
    if (stage === "Signed") updates.date_signed = new Date().toISOString().slice(0, 10);
    if (stage === "Lost") updates.date_lost = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from("scout_leads" as any).update(updates).eq("id", id);
    if (error) { toast.error(error.message); return; }
    refetch();
    toast.success("Stage updated");
  }

  async function handleConvert(lead: any) {
    const { data: newAthlete, error } = await supabase
      .from("athletes")
      .insert({
        first_name: lead.first_name,
        last_name: lead.last_name,
        position: lead.position || null,
        school: lead.school_club || null,
        assigned_agent_name: lead.assigned_agent_name || null,
        assigned_agent_user_id: lead.assigned_agent_id || null,
        stage: "Emerging",
      } as any)
      .select("id")
      .single();
    if (error) { toast.error("Could not create athlete profile: " + error.message + " — " + ((error as any).details || "")); return; }
    await supabase.from("scout_leads" as any).update({
      onboarding_stage: "Signed",
      date_signed: new Date().toISOString().slice(0, 10),
      converted_athlete_id: (newAthlete as any).id,
    }).eq("id", lead.id);
    toast.success(`${lead.first_name} ${lead.last_name} — athlete profile created`);
    refetch();
  }

  return (
    <div className="space-y-4 p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Scout pipeline</h1>
          <p className="text-sm text-muted-foreground">Prospects logged by your scouts — triage, track, and convert.</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => { setEditingLead(null); setShowForm(true); }}>
          <Plus className="h-4 w-4" />Add lead
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Pursue", value: pursue.length, color: "text-primary", border: "" },
          { label: "Competition active", value: competition.length, color: competition.length > 0 ? "text-destructive" : "text-muted-foreground", border: competition.length > 0 ? "border-destructive/30" : "" },
          { label: "Stalled", value: stalled.length, color: stalled.length > 0 ? "text-amber-600" : "text-muted-foreground", border: stalled.length > 0 ? "border-amber-300" : "" },
          { label: `Signed ${new Date().getFullYear()}`, value: signed.length, color: signed.length > 0 ? "text-green-600" : "text-muted-foreground", border: signed.length > 0 ? "border-green-300" : "" },
        ].map(({ label, value, color, border }) => (
          <div key={label} className={`rounded-lg border bg-card p-3 text-center ${border}`}>
            <div className={`text-2xl font-semibold ${color}`}>{value}</div>
            <div className="text-xs text-muted-foreground mt-0.5 leading-tight">{label}</div>
          </div>
        ))}
      </div>

      {signed.length > 0 && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 space-y-2">
          <div className="text-xs font-semibold text-green-700 uppercase tracking-wide">Signed this year</div>
          {signed.map((lead: any) => (
            <div key={lead.id} className="flex items-center justify-between text-sm">
              <span className="font-medium text-green-900">{lead.first_name} {lead.last_name}</span>
              <span className="text-xs text-green-600">
                {lead.date_signed ? new Date(lead.date_signed).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : 'Signed'}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {(["All", "Pursue", "Watch", "Mine", "Stalled"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${filter === f ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground hover:bg-muted"}`}>
              {f}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {["All", "New", "Contacted", "Pack Sent", "Welcome Sent", "Signed", "Lost"].map((f) => (
            <button key={f} onClick={() => setStageFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${stageFilter === f ? "bg-secondary text-secondary-foreground border-secondary" : "bg-background border-border text-muted-foreground hover:bg-muted"}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {showForm && (
        <Card className="border-dashed border-primary/40 bg-primary/5">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{editingLead ? "Edit lead" : "New lead"}</CardTitle>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScoutLeadFormSimple editLead={editingLead} onClose={() => { setShowForm(false); setEditingLead(null); refetch(); }} />
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" />Loading leads…
        </div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No leads match this filter.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((lead: any) => {
            const days = Math.floor((Date.now() - new Date(lead.last_stage_change_at || lead.created_at).getTime()) / (1000 * 60 * 60 * 24));
            const isStalled = days >= 7 && lead.triage_decision === "Pursue" && !["Signed", "Lost"].includes(lead.onboarding_stage);
            return (
              <Card key={lead.id} className={isStalled ? "border-amber-300" : ""}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{lead.first_name} {lead.last_name}</span>
                        {lead.lead_id && <Badge variant="outline" className="text-xs font-mono">{lead.lead_id}</Badge>}
                        <Badge variant={lead.scout_rating === "A" ? "default" : "secondary"} className="text-xs">{lead.scout_rating}</Badge>
                        <Badge variant="outline" className={`text-xs ${lead.triage_decision === "Pursue" ? "border-primary text-primary" : ""}`}>{lead.triage_decision}</Badge>
                        {isStalled && <Badge variant="outline" className="text-xs border-amber-400 text-amber-700">Stalled {days}d</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {[lead.position, lead.school_club, lead.region].filter(Boolean).join(" · ")}
                        {lead.assigned_agent_name && ` · Agent: ${lead.assigned_agent_name}`}
                        {lead.scout_name && ` · Scout: ${lead.scout_name}`}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 shrink-0 gap-1 text-xs font-medium"
                      onClick={() => setReviewingLead(lead)}
                    >
                      <ClipboardList className="h-3.5 w-3.5" />
                      Review
                    </Button>
                  </div>

                  {lead.competitor_interest && (
                    <div className="text-xs text-destructive bg-destructive/10 rounded px-3 py-1.5">⚠️ Competition: {lead.competitor_interest}</div>
                  )}
                  {lead.key_attributes && <p className="text-xs text-muted-foreground">{lead.key_attributes}</p>}

                  <div className="flex flex-wrap gap-1.5">
                    {["New", "Contacted", "Pack Sent", "Welcome Sent", "Signed", "Lost"].map((stage) => (
                      <button key={stage} onClick={() => handleStageChange(lead.id, stage)}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                          lead.onboarding_stage === stage
                            ? stage === "Signed" ? "bg-green-600 text-white border-green-600"
                              : stage === "Lost" ? "bg-muted-foreground/20 text-muted-foreground border-transparent"
                              : "bg-primary text-primary-foreground border-primary"
                            : "bg-background text-muted-foreground border-border hover:bg-muted"
                        }`}>
                        {stage}
                      </button>
                    ))}
                  </div>

                  {lead.onboarding_stage === "Welcome Sent" && (
                    <Button size="sm" variant="outline" className="w-full gap-1.5 border-green-500 text-green-700 hover:bg-green-50" onClick={() => handleConvert(lead)}>
                      <UserPlus className="h-3.5 w-3.5" />
                      Convert to athlete profile →
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {reviewingLead && (
        <ScoutLeadReviewPanel
          lead={reviewingLead}
          onClose={() => setReviewingLead(null)}
          onEdit={() => {
            setEditingLead(reviewingLead);
            setShowForm(true);
            setReviewingLead(null);
          }}
          onStageChange={(id, stage) => {
            handleStageChange(id, stage);
            setReviewingLead((prev: any) => prev ? { ...prev, onboarding_stage: stage } : null);
          }}
          onConvert={handleConvert}
        />
      )}
    </div>
  );
}

function AdminSecurity() {
  return (
    <div className="space-y-5 p-4 md:p-6 max-w-4xl mx-auto">
      {/* Hero */}
      <HeroBanner
        title="Admin Panel"
        subtitle="Manage athletes, guardians, agents, security, and access controls"
        size="sm"
      />
      <Tabs defaultValue="analytics" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="analytics">Agent Analytics</TabsTrigger>
          <TabsTrigger value="athletes">Athlete & Guardian Management</TabsTrigger>
          <TabsTrigger value="agents">Agent Accounts</TabsTrigger>
          <TabsTrigger value="security">Security & Access</TabsTrigger>
        </TabsList>
        <TabsContent value="analytics" className="mt-4">
          <AdminAnalytics />
        </TabsContent>
        <TabsContent value="athletes" className="mt-4">
          <AdminAthleteManager />
        </TabsContent>
        <TabsContent value="agents" className="mt-4">
          <AgentManager />
        </TabsContent>
        <TabsContent value="security" className="mt-4 space-y-6">
          <PendingApprovals />
          <Card>
            <CardHeader><CardTitle className="text-base">Access Control Overview</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid gap-3 md:grid-cols-2">
                <Card><CardContent className="p-4 space-y-2"><div className="font-medium">Role-Based Access</div><div className="text-muted-foreground">Athletes/Parents only see their own records. Agents see assigned athletes. Admin sees all.</div></CardContent></Card>
                <Card><CardContent className="p-4 space-y-2"><div className="font-medium">Activity Logging</div><div className="text-muted-foreground">All logins, calls, reviews, and emails are tracked per agent in the Analytics tab.</div></CardContent></Card>
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

function ManagerCommandCentre({ athletes, onOpenProfile }: { athletes: Athlete[]; onOpenProfile?: (id: string) => void }) {
  const [activeFilter, setActiveFilter] = useState<CommandFilter>("all");
  const { data: allComms = [] } = useCommsLog();

  const { data: scoutLeads = [] } = useQuery({
    queryKey: ["scout_leads_summary"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("scout_leads")
        .select("id, first_name, last_name, triage_decision, onboarding_stage, scout_rating, assigned_agent_name, competitor_interest, last_stage_change_at")
        .neq("onboarding_stage", "Lost");
      return data || [];
    },
  });

  const pursuePipeline = scoutLeads.filter((l: any) => l.triage_decision === "Pursue" && !["Signed", "Lost"].includes(l.onboarding_stage));
  const highCompetition = scoutLeads.filter((l: any) => l.competitor_interest && l.competitor_interest.trim() !== "" && !["Signed", "Lost"].includes(l.onboarding_stage));
  const signedThisYear = scoutLeads.filter((l: any) => l.onboarding_stage === "Signed" && new Date(l.last_stage_change_at).getFullYear() === new Date().getFullYear());
  const stalledLeads = pursuePipeline.filter((l: any) => {
    const days = Math.floor((Date.now() - new Date(l.last_stage_change_at).getTime()) / (1000 * 60 * 60 * 24));
    return days >= 7 && l.onboarding_stage !== "Signed";
  });


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
      if (!c.sentAt) return;
      const d = new Date(c.sentAt);
      if (isNaN(d.getTime())) return;
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
    const ms = Date.now() - last.getTime();
    if (!isFinite(ms) || isNaN(ms) || ms < 0) return "No contact recorded";
    const days = Math.floor(ms / (24 * 60 * 60 * 1000));
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
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Binoculars className="h-4 w-4 text-primary" /> Scout pipeline
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg border border-primary/30 p-3">
              <div className="text-2xl font-semibold">{pursuePipeline.length}</div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Pursue</div>
            </div>
            <div className="rounded-lg border border-destructive/30 p-3">
              <div className="text-2xl font-semibold">{highCompetition.length}</div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Competition active</div>
            </div>
            <div className="rounded-lg border border-amber-500/30 p-3">
              <div className="text-2xl font-semibold">{stalledLeads.length}</div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Stalled</div>
            </div>
            <div className="rounded-lg border border-emerald-500/30 p-3">
              <div className="text-2xl font-semibold">{signedThisYear.length}</div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Signed {new Date().getFullYear()}</div>
            </div>
          </div>
          {stalledLeads.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs font-semibold text-amber-600 dark:text-amber-400">Stalled — action needed</div>
              {stalledLeads.slice(0, 3).map((lead: any) => {
                const days = Math.floor((Date.now() - new Date(lead.last_stage_change_at).getTime()) / (1000 * 60 * 60 * 24));
                return (
                  <div key={lead.id} className="flex items-center justify-between text-xs rounded-md border border-border px-2 py-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium truncate">{lead.first_name} {lead.last_name}</span>
                      <span className="text-muted-foreground">{lead.onboarding_stage} · {days}d</span>
                    </div>
                    {lead.scout_rating && <Badge variant="secondary" className="text-[10px]">{lead.scout_rating}</Badge>}
                  </div>
                );
              })}
            </div>
          )}
          {highCompetition.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs font-semibold text-destructive">Competition active</div>
              {highCompetition.slice(0, 3).map((lead: any) => (
                <div key={lead.id} className="text-xs rounded-md border border-border px-2 py-1.5">
                  <span className="font-medium">{lead.first_name} {lead.last_name}</span>
                  <span className="text-muted-foreground"> — {lead.competitor_interest}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
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
                  <Button variant="secondary" size="sm" onClick={() => onOpenProfile?.(a.id)}>Open</Button>
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
      const initialRole = isAdmin && requestedRole && ["admin", "agent", "parent", "athlete", "scout"].includes(requestedRole)
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

  // Scout role: dedicated portal, no athlete data required
  if (effectiveRole === "scout") {
    return (
      <Shell role={effectiveRole} active={active} onNav={setActive}>
        <ScoutPortal autoOpenForm={active === "add"} />
      </Shell>
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
              <SelectItem value="scout">Scout</SelectItem>
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

      {(effectiveRole === "agent" || effectiveRole === "admin") && active === "dash" && (
        <ManagerCommandCentre
          athletes={athletes}
          onOpenProfile={(id) => { setSelectedAthleteId(id); setActive("athlete"); }}
        />
      )}
      {(effectiveRole === "agent" || effectiveRole === "admin") && active === "roster" && <RosterDashboard athletes={athletes} onOpenProfile={(id) => { setSelectedAthleteId(id); setActive("athlete"); }} />}
      {(effectiveRole === "agent" || effectiveRole === "admin") && active === "scout" && <AgentScoutView />}
      {(effectiveRole === "agent" || effectiveRole === "admin") && active === "athlete" && <AthleteProfileAgentView key={athlete.id} athlete={athlete} />}
      {(effectiveRole === "agent" || effectiveRole === "admin") && active === "call" && <AthleteComms key={athlete.id} athlete={athlete} onCallActive={setCallActive} />}
      {(effectiveRole === "agent" || effectiveRole === "admin") && active === "reviews" && (
        <div className="space-y-5 p-4 md:p-6 max-w-4xl mx-auto">
          <HeroBanner
            title={`Development Tracker — ${athlete.name}`}
            subtitle="Review history, export data, and track progress over time"
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