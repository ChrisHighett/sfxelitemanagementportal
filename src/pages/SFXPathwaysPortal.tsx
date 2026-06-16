import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import { useSearchParams, useNavigate } from "react-router-dom";
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
import { Loader2, CalendarDays, ClipboardList, FileText, LayoutDashboard, Library, Mail, Phone, Plus, Shield, Sparkles, Users, AlertTriangle, Mic, Mic2, Upload, Menu, WifiOff, Pencil, UserPlus, Check, X, Binoculars, ChevronDown, BookOpen, MessageSquarePlus, CheckCircle2, XCircle } from "lucide-react";
import VoiceProfileSettings from "@/components/portal/VoiceProfileSettings";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import WeeklyPlanner from "@/components/portal/WeeklyPlanner";
import FamilyCorrespondence from "@/components/portal/FamilyCorrespondence";
import { BrandMark } from "@/components/brand/Brand";
import { CommandPalette, CommandHint, type PaletteCommand } from "@/components/brand/CommandPalette";
import { ThemeSwitcher } from "@/components/brand/ThemeSwitcher";
import { DashboardSkeleton } from "@/components/brand/Skeletons";
import { User } from "lucide-react";
import ScoutPipeline from "@/components/portal/ScoutPipeline";
import LostReasonModal from "@/components/portal/LostReasonModal";
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
import PendingInvitesList from "@/components/portal/PendingInvitesList";
import InviteDialog from "@/components/portal/InviteDialog";
import AddAthleteDialog from "@/components/portal/AddAthleteDialog";
import EditableReviews from "@/components/EditableReviews";
import MobileCallScreen from "@/components/portal/MobileCallScreen";
import AdminAnalytics from "@/components/portal/AdminAnalytics";
import VoiceRecordingFlow from "@/components/portal/VoiceRecordingFlow";
import TranscriptImportDialog from "@/components/portal/TranscriptImportDialog";

import AthleteResourceFiles from "@/components/portal/AthleteResourceFiles";
import AthleteContactsEditor from "@/components/portal/AthleteContactsEditor";
import CommsHistory, { saveCommsEmail } from "@/components/portal/CommsHistory";
import ClubConversationLogger from "@/components/portal/ClubConversationLogger";
import TrendTracking from "@/components/portal/TrendTracking";
import AthleteScorecard from "@/components/portal/AthleteScorecard";
import AthleteSparkDashboard from "@/components/portal/AthleteSparkDashboard";
import AthleteClimbDashboard from "@/components/portal/AthleteClimbDashboard";
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
    { key: "updates", label: "Updates", icon: Mail },
    { key: "resources", label: "Resources", icon: Library },
  ],
  parent: [
    { key: "dash", label: "Dashboard", icon: LayoutDashboard },
    { key: "updates", label: "Updates", icon: Mail },
    { key: "resources", label: "Resources", icon: Library },
  ],
  agent: [
    { key: "dash", label: "Dashboard", icon: LayoutDashboard },
    { key: "call", label: "Athlete Comms", icon: Phone },
    { key: "roster", label: "Roster", icon: Users },
    { key: "athlete", label: "Athlete Profile", icon: FileText },
    { key: "reviews", label: "Development Tracker", icon: ClipboardList },
    { key: "scout", label: "Scout", icon: Binoculars },
    { key: "voice", label: "My Voice", icon: Mic2 },
  ],
  admin: [
    { key: "roster", label: "Roster", icon: Users },
    { key: "scout", label: "Scout", icon: Binoculars },
    { key: "athlete", label: "Athlete Profile", icon: FileText },
    { key: "call", label: "Athlete Comms", icon: Phone },
    { key: "reviews", label: "Development Tracker", icon: ClipboardList },
    { key: "voice", label: "My Voice", icon: Mic2 },
    { key: "admin", label: "Admin", icon: Shield },
  ],
  scout: [
    { key: "leads", label: "My Leads", icon: Binoculars },
    { key: "signed", label: "Signed", icon: CheckCircle2 },
    { key: "lost", label: "Lost", icon: XCircle },
    { key: "add", label: "Add Lead", icon: Plus },
  ],
};

const PORTAL_ROLES: Role[] = ["athlete", "parent", "agent", "admin", "scout"];

function isPortalRole(value?: string | null): value is Role {
  return !!value && PORTAL_ROLES.includes(value as Role);
}

function firstNavKeyForRole(role?: Role | null) {
  return role ? NAV[role]?.[0]?.key ?? "dash" : "dash";
}

function isValidNavKeyForRole(role: Role | null | undefined, key?: string | null) {
  return !!role && !!key && (NAV[role] ?? []).some((item) => item.key === key);
}

function Shell({ role, active, onNav, children, hideBottomNav, isPreview, previewAgentName }: { role: Role; active: string; onNav: (k: string) => void; children: React.ReactNode; hideBottomNav?: boolean; isPreview?: boolean; previewAgentName?: string | null }) {
  const items = NAV[role] ?? [];
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isOnline, pendingCount } = useOfflineQueue();
  const { user } = useAuth();
  const mobileQuickNav = items.slice(0, 4);

  return (
    <div className="flex min-h-screen" style={{ background: "var(--canvas)" }}>
      {/* Desktop command rail — dark, sticky, brand-base */}
      <aside
        className="hidden md:flex flex-col flex-shrink-0 sticky top-0 self-start h-screen"
        style={{
          width: 248,
          background: "var(--brand-base)",
          borderRight: "1px solid var(--brand-base-line)",
          color: "#fff",
        }}
      >
        <div className="flex flex-col flex-1 p-5">
          <div className="mb-8 flex items-center gap-3">
            <BrandMark variant="wordmark" height={26} />
          </div>
          <nav className="space-y-1 flex-1">
            {items.map((it) => {
              const Icon = it.icon;
              const isActive = active === it.key;
              return (
                <button
                  key={it.key}
                  onClick={() => onNav(it.key)}
                  className="relative flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm transition-colors"
                  style={{
                    color: isActive ? "#fff" : "rgba(255,255,255,0.62)",
                    background: isActive ? "var(--brand-base-soft)" : "transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = "var(--brand-base-soft)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = "transparent";
                  }}
                >
                  {isActive && (
                    <span
                      aria-hidden
                      className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full"
                      style={{ background: "var(--brand-gradient)" }}
                    />
                  )}
                  <Icon
                    className="h-4 w-4"
                    style={{ color: isActive ? "var(--brand-spectrum-from)" : undefined }}
                  />
                  <span className="flex-1 text-left">{it.label}</span>
                  {it.key === "admin" && role === "admin" && <PendingApprovalsDot />}
                </button>
              );
            })}
          </nav>
          <div className="mt-6 space-y-2">
            <CommandHint />
            {role === "admin" && <ThemeSwitcher />}
            {(() => {
              // In preview mode (admin previewing another role), never expose the
              // logged-in admin's identity. For parent/athlete, optionally show the
              // athlete's assigned managing agent instead.
              if (isPreview) {
                if ((role === "parent" || role === "athlete") && previewAgentName) {
                  return (
                    <div
                      className="rounded-[12px] p-3 text-xs"
                      style={{
                        background: "var(--brand-base-soft)",
                        border: "1px solid var(--brand-base-line)",
                        color: "rgba(255,255,255,0.78)",
                      }}
                    >
                      <div className="font-mono text-[10px] uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.5)" }}>
                        Managing Agent
                      </div>
                      <div className="font-medium text-white truncate mt-0.5">
                        {previewAgentName}
                      </div>
                    </div>
                  );
                }
                return null;
              }
              return (
                <div
                  className="rounded-[12px] p-3 text-xs"
                  style={{
                    background: "var(--brand-base-soft)",
                    border: "1px solid var(--brand-base-line)",
                    color: "rgba(255,255,255,0.78)",
                  }}
                >
                  <div className="font-medium text-white truncate">
                    {user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Agent"}
                  </div>
                  <div className="font-mono mt-0.5 truncate" style={{ color: "rgba(255,255,255,0.5)" }}>
                    {role}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <div
          className="md:hidden flex items-center justify-between px-4 py-3 sticky top-0 z-30"
          style={{ background: "var(--brand-base)", color: "#fff", borderBottom: "1px solid var(--brand-base-line)" }}
        >
          <BrandMark variant="wordmark" height={22} />
          <div className="flex items-center gap-2">
            {!isOnline && (
              <Badge variant="destructive" className="gap-1 text-xs">
                <WifiOff className="h-3 w-3" /> Offline
                {pendingCount > 0 && <span>({pendingCount})</span>}
              </Badge>
            )}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-white hover:bg-white/10 hover:text-white">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-4" style={{ background: "var(--brand-base)", color: "#fff", borderRight: "1px solid var(--brand-base-line)" }}>
                <div className="mb-4">
                  <BrandMark variant="wordmark" height={24} />
                </div>
                <nav className="space-y-1">
                  {items.map((it) => {
                    const Icon = it.icon;
                    const isAct = active === it.key;
                    return (
                      <button
                        key={it.key}
                        onClick={() => { onNav(it.key); setMobileOpen(false); }}
                        className="relative flex w-full items-center gap-3 rounded-[10px] px-3 py-3 text-sm transition-colors"
                        style={{
                          color: isAct ? "#fff" : "rgba(255,255,255,0.62)",
                          background: isAct ? "var(--brand-base-soft)" : "transparent",
                        }}
                      >
                        {isAct && (
                          <span aria-hidden className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full" style={{ background: "var(--brand-gradient)" }} />
                        )}
                        <Icon className="h-5 w-5" style={{ color: isAct ? "var(--brand-spectrum-from)" : undefined }} />
                        <span className="flex-1 text-left">{it.label}</span>
                        {it.key === "admin" && role === "admin" && <PendingApprovalsDot />}
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

function TopBar({ role, selectedAthleteId, setSelectedAthleteId, athletes, onAddAthlete }: {
  role: Role;
  selectedAthleteId: string; setSelectedAthleteId: (id: string) => void;
  athletes: Athlete[];
  onAddAthlete?: () => void;
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
          {onAddAthlete && (role === "agent" || role === "admin") && (
            <Button size="sm" className="h-9 gap-1.5" onClick={onAddAthlete}>
              <Plus className="h-4 w-4" />
              Add athlete
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function AthleteDashboard({ athlete }: { athlete: Athlete }) {
  // Age 17+ → The Climb. Younger → The Spark.
  const age = athlete.age ?? 0;
  if (age >= 17) return <AthleteClimbDashboard athlete={athlete} />;
  return <AthleteSparkDashboard athlete={athlete} />;
}

function ParentDashboard({ athlete }: { athlete: Athlete }) {
  const { user } = useAuth();
  const { data: roleData } = useUserRole();
  const { data: reviews = [] } = useMonthlyReviews(athlete.id);
  const review = reviews[0];
  const smart = review ? resolveSmartFields(review) : null;

  // Derive the viewer's role label from data — never hardcoded.
  const viewerRoleLabel = (() => {
    switch (roleData?.role) {
      case "parent":   return "Parent / Guardian";
      case "athlete":  return "Athlete";
      case "agent":    return "Agent";
      case "admin":    return "Admin";
      default:         return "Viewer";
    }
  })();

  const firstName = athlete.name.split(" ")[0] || athlete.name;
  const parentDisplayName = user?.user_metadata?.display_name || athlete.parentName || "Parent";
  const parentInitials = parentDisplayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() || "")
    .join("") || "P";

  const statusVerb =
    athlete.status === "Thriving" ? "thriving" :
    athlete.status === "Monitoring" ? "tracking well" :
    "being closely supported";

  const pathwayLine = [
    [athlete.club, athlete.school].filter((x) => x && x !== "—").join(" / "),
    `${athlete.stage} Pathway`,
    `Managed by ${athlete.assignedAgent}`,
  ].filter(Boolean).join(" · ");

  const quote =
    (smart?.focus && smart.focus !== "—" && smart.focus) ||
    (review?.followUpActions && review.followUpActions) ||
    `Everything we're doing with ${firstName} right now is about consistency and steady development. We'll keep you in the loop every step of the way.`;

  // Latest parent-addressed update from comms_history
  const { data: parentUpdates = [] } = useQuery({
    queryKey: ["parent_updates_dash", athlete.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comms_history")
        .select("id, subject, body, created_at, channel")
        .eq("athlete_id", athlete.id)
        .eq("email_type", "parent")
        .eq("sent_status", "sent")
        .order("created_at", { ascending: false })
        .limit(4);
      if (error) throw error;
      return data || [];
    },
  });

  const formatShort = (d: string) =>
    new Date(d).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });

  const lastUpdateDate = parentUpdates[0]?.created_at
    ? new Date(parentUpdates[0].created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" })
    : review?.createdAt
      ? new Date(review.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "short" })
      : "—";

  const careStandard =
    athlete.status === "Thriving" ? "On track" :
    athlete.status === "Monitoring" ? "Monitoring" :
    "Extra support";

  const preview = (body: string) => {
    const joined = body.split("\n").filter((l) => l.trim()).join(" ");
    return joined.slice(0, 140) + (joined.length > 140 ? "…" : "");
  };

  const agentInitials = athlete.assignedAgent
    .split(/\s+/).filter(Boolean).slice(0, 2)
    .map((s) => s[0]?.toUpperCase() || "").join("") || "A";

  return (
    <div className="space-y-6 p-3 sm:p-4 md:p-6 max-w-4xl mx-auto">
      {/* Viewing header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Viewing</p>
          <h1
            className="text-xl sm:text-2xl font-semibold tracking-tight truncate"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {athlete.name}
          </h1>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
            {parentInitials}
          </div>
          <div className="text-right leading-tight">
            <p className="text-sm font-medium">{parentDisplayName}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{viewerRoleLabel}</p>
          </div>
        </div>
      </div>

      {/* Hero */}
      <section
        className="rounded-2xl border border-border bg-gradient-to-br from-card to-muted/40 p-5 sm:p-7 space-y-3"
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Your child's development
        </p>
        <h2
          className="text-2xl sm:text-3xl font-semibold tracking-tight"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {firstName} is {statusVerb}.
        </h2>
        <p className="text-sm text-muted-foreground">{pathwayLine}</p>
        <blockquote className="text-sm sm:text-base italic text-foreground/80 border-l-2 border-primary/60 pl-3 mt-2">
          “{quote}”
        </blockquote>
      </section>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-4 space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Wellbeing</p>
          <p className="text-2xl font-semibold" style={{ fontFamily: "var(--font-heading)" }}>
            {athlete.wellbeingScore}/5
          </p>
          <Progress value={(athlete.wellbeingScore / 5) * 100} className="h-1.5" />
        </div>
        <div className="rounded-xl border border-border bg-card p-4 space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Last update</p>
          <p className="text-2xl font-semibold" style={{ fontFamily: "var(--font-heading)" }}>
            {lastUpdateDate}
          </p>
          <p className="text-xs text-muted-foreground">Development update sent to you</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Care standard</p>
          <p className="text-2xl font-semibold" style={{ fontFamily: "var(--font-heading)" }}>
            {careStandard}
          </p>
          <p className="text-xs text-muted-foreground">Monthly reviews up to date</p>
        </div>
      </div>

      {/* Updates & agent */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Updates */}
        <div className="md:col-span-2 rounded-2xl border border-border bg-card p-5 space-y-4">
          <div>
            <h3 className="text-base font-semibold tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
              Updates about {firstName}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Professional development updates {athlete.assignedAgent.split(" ")[0]} has sent you.
            </p>
          </div>
          {parentUpdates.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-muted/20 p-5 text-center text-sm text-muted-foreground">
              No updates yet — your first development update will appear here.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {parentUpdates.map((u: any) => (
                <article key={u.id} className="py-3 first:pt-0 last:pb-0">
                  <h4 className="text-sm font-semibold">{u.subject || `Update — ${firstName}`}</h4>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{preview(u.body || "")}</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1.5">
                    {formatShort(u.created_at)} · {(u.channel || "Email").replace(/^./, (c: string) => c.toUpperCase())}
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>

        {/* Agent card */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <div>
            <h3 className="text-base font-semibold tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
              Your agent
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">Here whenever you need.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
              {agentInitials}
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold">{athlete.assignedAgent}</p>
              <p className="text-[11px] text-muted-foreground">
                Talent Agent{import.meta.env.VITE_AGENCY_NAME ? ` · ${import.meta.env.VITE_AGENCY_NAME}` : ""}
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Any questions about {firstName}'s development, schedule, or pathway — reach out any time. {athlete.assignedAgent.split(" ")[0]} will always come back to you.
          </p>
          <Button
            className="w-full"
            onClick={() => {
              const subject = encodeURIComponent(`Message re: ${athlete.name}`);
              const body = encodeURIComponent(`Hi ${athlete.assignedAgent.split(" ")[0]},\n\nI wanted to reach out regarding ${firstName}.\n\n`);
              window.location.href = `mailto:info@tgisport.com.au?subject=${subject}&body=${body}`;
            }}
          >
            Message {athlete.assignedAgent.split(" ")[0]}
          </Button>
        </div>
      </div>

      {/* Reassurance footer */}
      <section className="rounded-2xl border border-border bg-gradient-to-br from-primary/5 to-card p-5 sm:p-6 text-center space-y-2">
        <h3 className="text-lg font-semibold tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
          Your child is in good hands.
        </h3>
        <p className="text-sm text-muted-foreground max-w-xl mx-auto">
          {firstName}'s wellbeing, goals, and every conversation are tracked and looked after.
          You'll receive a professional update every month — and you can reach {athlete.assignedAgent.split(" ")[0]} any time in between.
        </p>
      </section>
    </div>
  );
}

function RosterDashboard({ athletes, onOpenProfile, onAddAthlete }: { athletes: Athlete[]; onOpenProfile?: (id: string) => void; onAddAthlete?: () => void }) {
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [onlyAttention, setOnlyAttention] = useState(false);
  const [invitingAthlete, setInvitingAthlete] = useState(false);
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
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 shrink-0"
                onClick={() => setInvitingAthlete(true)}
              >
                <Plus className="h-4 w-4" />
                Invite athlete
              </Button>
              <Button
                size="sm"
                className="gap-1.5 shrink-0"
                onClick={() => onAddAthlete?.()}
              >
                <Plus className="h-4 w-4" />
                Add athlete
              </Button>
            </div>
          </div>
          <InviteDialog
            open={invitingAthlete}
            onOpenChange={setInvitingAthlete}
            mode={{ kind: "athlete" }}
          />
        </CardHeader>
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
      
    </div>
  );
}

function AthleteProfileAgentView({ athlete }: { athlete: Athlete }) {
  const { data: reviews = [] } = useMonthlyReviews(athlete.id);
  const { data: comms = [] } = useCommsLog(athlete.id);
  const [editing, setEditing] = useState(false);
  const [invitingParent, setInvitingParent] = useState(false);
  const [invitingAthlete, setInvitingAthlete] = useState(false);

  const { data: athleteInvite, refetch: refetchInvite } = useQuery({
    queryKey: ["athlete-invite", athlete.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_invites")
        .select("status, created_at, activated_at")
        .eq("athlete_id", athlete.id)
        .eq("role", "athlete")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const { data: guardianCount = 0 } = useQuery({
    queryKey: ["guardian-count", athlete.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("guardians")
        .select("id", { count: "exact", head: true })
        .eq("athlete_id", athlete.id);
      return count || 0;
    },
  });

  const isMinor = (athlete.age ?? 18) < 18;
  const hasGuardian = guardianCount > 0;
  const noEmail = !athlete.email;

  const inviteStatusLabel =
    athleteInvite?.status === "activated"
      ? "Active"
      : athleteInvite
      ? `Invited ${new Date(athleteInvite.created_at as any).toLocaleDateString()}`
      : "Not invited";

  function handleAthleteInviteClick() {
    if (noEmail) { toast.error("Add an athlete email first."); return; }
    if (isMinor && !hasGuardian) {
      toast.error("Add a parent/guardian contact first");
      return;
    }
    setInvitingAthlete(true);
  }

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

      <InviteDialog
        open={invitingParent}
        onOpenChange={setInvitingParent}
        mode={{ kind: "parent", athleteId: athlete.id, athleteName: athlete.name }}
      />
      <InviteDialog
        open={invitingAthlete}
        onOpenChange={(v) => { setInvitingAthlete(v); if (!v) refetchInvite(); }}
        mode={{
          kind: "existing-athlete",
          athleteId: athlete.id,
          athleteName: athlete.name,
          email: athlete.email || "",
          isMinor,
        }}
        onCreated={() => refetchInvite()}
      />

      <Card className="border-0 shadow-none sm:border sm:shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-xl">{athlete.name}</CardTitle>
                <Badge variant="outline" className="text-[10px] h-5 font-normal text-muted-foreground">
                  {athlete.stage}
                </Badge>
                <Badge variant="outline" className="text-[10px] h-5 font-normal text-muted-foreground">
                  {athlete.status}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                Athlete login: {inviteStatusLabel}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="ghost" size="sm" onClick={() => setInvitingParent(true)} className="text-muted-foreground">
                Invite parent
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAthleteInviteClick}
                disabled={noEmail}
                title={noEmail ? "Add an athlete email first." : undefined}
                className="text-muted-foreground"
              >
                Invite athlete
              </Button>
              <Button size="sm" onClick={() => setEditing(true)}>
                Edit Athlete
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-2">
          <div className="grid gap-8 md:grid-cols-[260px_1fr]">
            <div className="space-y-1.5 text-sm">
              <div className="space-y-0.5">
                <div>Age: {athlete.age || <span className="text-muted-foreground">Not set</span>}</div>
                <div>Club: {athlete.club}</div>
                <div>School: {athlete.school}</div>
                <div>Position: {athlete.position}</div>
              </div>
              <div className="pt-4 space-y-0.5">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Contract Dates</div>
                <div>Management: {athlete.managementContractExpiry || "—"}</div>
                <div>Club: {athlete.clubContractExpiry || "—"}</div>
              </div>
              <div className="pt-4 space-y-0.5">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Primary contact</div>
                <div>{athlete.parentName || <span className="text-muted-foreground">No contact recorded</span>}</div>
                <div className="text-xs text-muted-foreground">
                  Agent: {athlete.assignedAgent !== "Unassigned" ? athlete.assignedAgent : "To be assigned"}
                </div>
              </div>
            </div>

            <div>
              <Tabs defaultValue="contacts">
                <TabsList className="flex flex-wrap h-auto gap-1">
                  <TabsTrigger value="contacts" className="text-xs sm:text-sm">Contacts</TabsTrigger>
                  <TabsTrigger value="reviews" className="text-xs sm:text-sm">Reviews</TabsTrigger>
                  <TabsTrigger value="comms" className="text-xs sm:text-sm">Comms</TabsTrigger>
                  <TabsTrigger value="scorecard" className="text-xs sm:text-sm">Scorecard</TabsTrigger>
                  {/* Trends tab hidden for now — re-enable by restoring this trigger */}
                  {/* <TabsTrigger value="trends" className="text-xs sm:text-sm">Trends</TabsTrigger> */}
                  <TabsTrigger value="timeline" className="text-xs sm:text-sm">Timeline</TabsTrigger>
                  <TabsTrigger value="commercial" className="text-xs sm:text-sm">Commercial</TabsTrigger>
                  <TabsTrigger value="files" className="text-xs sm:text-sm">Files</TabsTrigger>
                </TabsList>
                <TabsContent value="contacts" className="space-y-4 mt-4">
                  <AthleteContactsEditor mode="live" athleteId={athlete.id} athleteAge={athlete.age ?? null} />
                </TabsContent>
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
  const [transcriptImportOpen, setTranscriptImportOpen] = useState(false);
  const [importedTranscript, setImportedTranscript] = useState<{ text: string; callType: string; date: string } | null>(null);
  const [commsTab, setCommsTab] = useState<"capture" | "history">("capture");
  // Capture method: which form to show when the agent picks one.
  // null = method chooser visible; "quick" = inline Quick Update form.
  // The other three open full-screen takeovers (handled by the early-returns below)
  // and all four ultimately feed the same backend (AI write-up + athlete/parent
  // update + follow-up tasks + Comms History save).
  type CaptureMethod = null | "quick" | "monthly" | "import" | "guided";
  const [captureMethod, setCaptureMethod] = useState<CaptureMethod>(null);
  const [scriptChecked, setScriptChecked] = useState<Record<string, boolean>>({
    opener: false, performance: false, lifestyle: false, personal: false,
    education: false, brand: false, goals: false, close: false,
  });
  const [scriptGuideOpen, setScriptGuideOpen] = useState(false);
  
  // Notify parent when call is active so bottom nav can be hidden
  useEffect(() => {
    onCallActive?.(callSessionActive || voiceRecordingActive || !!importedTranscript);
  }, [callSessionActive, voiceRecordingActive, importedTranscript, onCallActive]);

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

  if (importedTranscript) {
    return (
      <VoiceRecordingFlow
        athlete={athlete}
        onClose={() => { setImportedTranscript(null); setCaptureMethod(null); }}
        initialTranscript={importedTranscript.text}
        initialCallType={importedTranscript.callType}
        initialMeetingDate={importedTranscript.date}
        source="transcript_import"
      />
    );
  }

  if (voiceRecordingActive) {
    return (
      <VoiceRecordingFlow
        athlete={athlete}
        onClose={() => { setVoiceRecordingActive(false); setCaptureMethod(null); }}
      />
    );
  }

  if (callSessionActive) {
    return (
      <MobileCallScreen
        athlete={athlete}
        onClose={() => { setCallSessionActive(false); setCaptureMethod(null); }}
        onCreateEmail={handleMobileCallEmail}
      />
    );
  }

  const athleteInitials = athlete.name
    .split(/\s+/).filter(Boolean).slice(0, 2)
    .map((s) => s[0]?.toUpperCase() || "").join("") || "A";

  // Total script-guide sections we report progress against ("X of N covered").
  const scriptTotal = scriptGuides.length;
  const scriptDone = scriptGuides.filter((g) => scriptChecked[g.k]).length;
  const resetScriptChecklist = () =>
    setScriptChecked({
      opener: false, performance: false, lifestyle: false, personal: false,
      education: false, brand: false, goals: false, close: false,
    });

  const captureMethods: Array<{
    key: Exclude<CaptureMethod, null>;
    title: string;
    blurb: string;
    Icon: React.ElementType;
  }> = [
    { key: "quick",   title: "Quick Update",     blurb: "Log a short conversation now — AI drafts the follow-up.", Icon: MessageSquarePlus },
    { key: "monthly", title: "Monthly Check-in", blurb: "Voice-record the catch-up — AI fills the full tracker.",    Icon: Mic },
    { key: "import",  title: "Meeting Import",   blurb: "Paste / upload a Teams or Zoom transcript.",                Icon: Upload },
    { key: "guided",  title: "Guided Notes",     blurb: "Structured prompts to capture as you talk.",                Icon: Phone },
  ];

  const pickMethod = (m: Exclude<CaptureMethod, null>) => {
    resetScriptChecklist(); // checklist is per-call
    setCaptureMethod(m);
    if (m === "monthly")     setVoiceRecordingActive(true);
    else if (m === "import") setTranscriptImportOpen(true);
    else if (m === "guided") setCallSessionActive(true);
    // "quick" is rendered inline below
  };

  const clearMethod = () => {
    setCaptureMethod(null);
    setTranscriptImportOpen(false);
  };

  return (
    <div className="space-y-5 p-4 md:p-6 max-w-4xl mx-auto">
      {/* Single header — page title + athlete chip */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1
            className="text-xl sm:text-2xl font-semibold tracking-tight"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Athlete Comms
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Capture conversations and track follow-ups.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-border bg-card pl-2 pr-3 py-1">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Athlete</span>
          <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-semibold">
            {athleteInitials}
          </div>
          <span className="text-sm font-medium">{athlete.name}</span>
        </div>
      </div>

      {/* Tabs: Capture | History */}
      <Tabs value={commsTab} onValueChange={(v) => setCommsTab(v as "capture" | "history")}>
        <TabsList className="w-full">
          <TabsTrigger value="capture" className="flex-1">Capture</TabsTrigger>
          <TabsTrigger value="history" className="flex-1">History</TabsTrigger>
        </TabsList>

        <TabsContent value="capture" className="mt-4 space-y-5">
          {/* Method chooser — picking one shows only that form. */}
          {captureMethod === null ? (
            <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <div>
                <h3 className="text-base font-semibold tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
                  How do you want to capture this?
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  All four methods feed the same engine — AI write-up, athlete &amp; parent update, follow-up tasks, Comms History.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {captureMethods.map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => pickMethod(m.key)}
                    className="text-left rounded-xl border border-border bg-background hover:border-primary/60 hover:bg-primary/[0.03] transition p-4 space-y-2"
                  >
                    <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <m.Icon className="h-4 w-4" />
                    </div>
                    <div className="font-semibold text-sm">{m.title}</div>
                    <p className="text-xs text-muted-foreground">{m.blurb}</p>
                  </button>
                ))}
              </div>
            </section>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm">
                <span className="text-muted-foreground">Method:</span>{" "}
                <span className="font-semibold">
                  {captureMethods.find((m) => m.key === captureMethod)?.title}
                </span>
              </div>
              <Button size="sm" variant="ghost" onClick={clearMethod}>
                ← Change method
              </Button>
            </div>
          )}

          {/* Transcript import dialog — triggered by "Meeting Import" */}
          <TranscriptImportDialog
            open={transcriptImportOpen}
            onOpenChange={(o) => {
              setTranscriptImportOpen(o);
              if (!o && !importedTranscript && captureMethod === "import") setCaptureMethod(null);
            }}
            onSubmit={({ transcript, callType, meetingDate }) => {
              setImportedTranscript({ text: transcript, callType, date: meetingDate });
            }}
          />

          {/* Call Script Guide — collapsed by default, "X of N covered" hint on the bar */}
          {captureMethod === "quick" || captureMethod === null ? (
            <Card>
        <Collapsible open={scriptGuideOpen} onOpenChange={setScriptGuideOpen}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors rounded-t-lg"
            >
              <div className="flex items-center gap-3 min-w-0">
                <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-medium leading-tight">Call Script Guide</div>
                  <div className="text-xs text-muted-foreground truncate">
                    Covered on this call — {scriptDone} of {scriptTotal}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {scriptDone > 0 && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); resetScriptChecklist(); }}
                    className="text-[11px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                  >
                    Reset
                  </button>
                )}
                <span className="text-xs font-mono tabular-nums text-muted-foreground">
                  {scriptDone} / {scriptTotal}
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform ${scriptGuideOpen ? "rotate-180" : ""}`}
                />
              </div>
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <Accordion type="single" collapsible className="w-full">
                {scriptGuides.map((guide) => {
                  const covered = !!scriptChecked[guide.k];
                  return (
                    <AccordionItem key={guide.k} value={guide.k}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center justify-between flex-1 pr-4">
                          <div className="flex items-center gap-3">
                            <span
                              role="checkbox"
                              aria-checked={covered}
                              tabIndex={0}
                              title={covered ? "Covered" : "Mark covered"}
                              onClick={(e) => {
                                e.stopPropagation();
                                setScriptChecked((s) => ({ ...s, [guide.k]: !covered }));
                              }}
                              onKeyDown={(e) => {
                                if (e.key === " " || e.key === "Enter") {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setScriptChecked((s) => ({ ...s, [guide.k]: !covered }));
                                }
                              }}
                              className={`inline-flex h-5 w-5 items-center justify-center rounded-full border transition-colors cursor-pointer shrink-0 ${
                                covered
                                  ? "bg-[var(--brand-accent)] border-[var(--brand-accent)] text-[var(--brand-base)]"
                                  : "border-border bg-background hover:border-[var(--brand-accent)]"
                              }`}
                            >
                              {covered && <Check className="h-3 w-3" strokeWidth={3} />}
                            </span>
                            <div className="text-left">
                              <div className="font-medium flex items-center gap-2">
                                {guide.title}
                                {covered && (
                                  <span className="text-[10px] uppercase tracking-wide font-medium text-[var(--brand-accent-deep)]">
                                    Covered
                                  </span>
                                )}
                              </div>
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
                  );
                })}
              </Accordion>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
          ) : null}

          {/* Email Drafts (generated by any of the four methods) */}
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

          {/* Quick Update — inline form, only when this method is chosen */}
          {captureMethod === "quick" && (
            <section id="log-conversation" className="rounded-2xl border border-border bg-card p-5 scroll-mt-20">
              <ClubConversationLogger
                athlete={athlete}
                onSaved={() => {
                  // Keep the agent on the form so they can review the draft + tasks,
                  // but expose the method picker again via the "Change method" button.
                }}
              />
            </section>
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
            <p className="text-sm font-medium" style={{ color: isExpired(athlete.managementContractExpiry) ? "hsl(var(--destructive))" : isExpiringSoon(athlete.managementContractExpiry) ? "var(--win-deep)" : undefined }}>
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
            <p className="text-sm font-medium" style={{ color: isExpired(athlete.clubContractExpiry) ? "hsl(var(--destructive))" : isExpiringSoon(athlete.clubContractExpiry) ? "var(--win-deep)" : undefined }}>
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

function usePendingApprovalsCount() {
  const { data = 0 } = useQuery({
    queryKey: ["pending_users_count"],
    queryFn: async () => {
      const [{ count: pu }, { count: inv }] = await Promise.all([
        supabase.from("portal_users").select("id", { count: "exact", head: true }).eq("approved", false),
        supabase.from("user_invites").select("id", { count: "exact", head: true }).eq("status", "pending"),
      ]);
      return (pu ?? 0) + (inv ?? 0);
    },
    refetchInterval: 30000,
  });
  return data;
}

function PendingApprovalsDot({ className = "" }: { className?: string }) {
  const count = usePendingApprovalsCount();
  if (!count) return null;
  return (
    <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold ${className}`}>
      {count}
    </span>
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
            <Badge variant="outline" style={{ borderColor: "var(--brand-base-line)", color: "var(--brand-accent)" }}>Scout</Badge>
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
  const [generatedLink, setGeneratedLink] = useState<{ url: string; email: string; role: string } | null>(null);
  const [copied, setCopied] = useState(false);

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
      const url = (data as any)?.actionLink as string;
      if (!url) throw new Error("No link returned");
      setGeneratedLink({ url, email: inviteEmail.trim(), role: inviteRole });
      setCopied(false);
      toast.success(`Invite link ready — copy and send to ${inviteEmail}`);
      refetch();
    } catch (e: any) {
      toast.error(e.message || "Failed to generate invite link");
    } finally {
      setInviting(false);
    }
  }

  async function copyLink() {
    if (!generatedLink) return;
    try {
      await navigator.clipboard.writeText(generatedLink.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Copy failed — select and copy manually");
    }
  }

  function resetInviteForm() {
    setInviteEmail(""); setInviteName(""); setInviteRole("agent");
    setGeneratedLink(null); setCopied(false); setShowInviteForm(false);
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
            Invite agents and scouts. The app generates a secure invite link — copy it and send it yourself (Outlook, WhatsApp, etc.). The recipient sets their own password and lands in their portal.
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
              <CardTitle className="text-base">
                Invite new staff member
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={resetInviteForm}>
                Cancel
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {!generatedLink ? (
              <>
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
                  No email is sent. The app generates a secure invite link — you copy it and send it from your own email. The recipient sets their password and joins as {inviteRole === "scout" ? "a scout" : "an agent"}.
                </p>
                <Button size="sm" disabled={inviting} onClick={handleInvite}>
                  {inviting ? (
                    <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> Generating link…</>
                  ) : (
                    "Generate invite link"
                  )}
                </Button>
              </>
            ) : (
              <div className="space-y-3">
                <div className="text-sm">
                  Invite link for <span className="font-semibold">{inviteName || generatedLink.email}</span> ({generatedLink.role}):
                </div>
                <div className="flex gap-2">
                  <Input readOnly value={generatedLink.url} className="h-9 font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
                  <Button size="sm" onClick={copyLink} className="shrink-0">
                    {copied ? "Copied ✓" : "Copy link"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Copy this link and send it to {inviteName || generatedLink.email} from your own email. It lets them set their password and join as {generatedLink.role === "scout" ? "a scout" : "an agent"}. Link expires per your auth settings (typically 24 hours – 7 days).
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={resetInviteForm}>Done</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setGeneratedLink(null); setInviteEmail(""); setInviteName(""); }}>
                    Invite another
                  </Button>
                </div>
              </div>
            )}
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

    </div>
  );
}


function ScoutLeadFormSimple({ editLead, onClose }: { editLead?: any; onClose: () => void }) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
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
    assigned_agent_id: editLead?.assigned_agent_id || "",
    assigned_agent_name: editLead?.assigned_agent_name || "",
  });
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const { data: agents = [] } = useQuery({
    queryKey: ["portal_users_agents_scoutform"],
    queryFn: async () => {
      const { data } = await supabase
        .from("portal_users")
        .select("id, display_name, email")
        .eq("role", "agent")
        .eq("approved", true);
      return data || [];
    },
  });

  async function handleSave() {
    if (!form.first_name.trim() || !form.last_name.trim()) {
      toast.error("First name and last name are required");
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        ...form,
        age: form.age ? Number(form.age) : null,
        assigned_agent_id: form.assigned_agent_id || null,
        assigned_agent_name: form.assigned_agent_name || null,
      };
      if (editLead?.id) {
        const { error } = await supabase.from("scout_leads" as any).update(payload).eq("id", editLead.id);
        if (error) throw error;
        toast.success("Lead updated");
      } else {
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

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label className="text-xs">First name *</Label><Input placeholder="Jake" value={form.first_name} onChange={(e) => set("first_name", e.target.value)} className="h-8" /></div>
        <div className="space-y-1"><Label className="text-xs">Last name *</Label><Input placeholder="Morrison" value={form.last_name} onChange={(e) => set("last_name", e.target.value)} className="h-8" /></div>
        <div className="space-y-1"><Label className="text-xs">Age</Label><Input type="number" placeholder="16" value={form.age} onChange={(e) => set("age", e.target.value)} className="h-8" /></div>
        <div className="space-y-1"><Label className="text-xs">Position</Label><Input placeholder="Halfback" value={form.position} onChange={(e) => set("position", e.target.value)} className="h-8" /></div>
        <div className="space-y-1"><Label className="text-xs">School / Club</Label><Input placeholder="Penrith Panthers" value={form.school_club} onChange={(e) => set("school_club", e.target.value)} className="h-8" /></div>
        <div className="space-y-1"><Label className="text-xs">Region</Label>
          <Select value={form.region} onValueChange={(v) => set("region", v)}>
            <SelectTrigger className="h-8"><SelectValue placeholder="Region" /></SelectTrigger>
            <SelectContent>{["QLD", "NSW", "VIC", "SA", "WA", "TAS", "ACT", "NZ", "Other"].map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1"><Label className="text-xs">Key attributes</Label><Textarea placeholder="What made you take notice…" value={form.key_attributes} onChange={(e) => set("key_attributes", e.target.value)} rows={2} /></div>
      <div className="space-y-1"><Label className="text-xs">Competitor interest</Label><Textarea placeholder="Other agents circling? Who?" value={form.competitor_interest} onChange={(e) => set("competitor_interest", e.target.value)} rows={1} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label className="text-xs">Scout rating</Label>
          <Select value={form.scout_rating} onValueChange={(v) => set("scout_rating", v)}>
            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="A">A — Elite prospect</SelectItem><SelectItem value="B">B — Strong watch</SelectItem><SelectItem value="C">C — Monitor</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="space-y-1"><Label className="text-xs">Decision</Label>
          <Select value={form.triage_decision} onValueChange={(v) => set("triage_decision", v)}>
            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="Pursue">Pursue</SelectItem><SelectItem value="Watch">Watch</SelectItem><SelectItem value="Pass">Pass</SelectItem><SelectItem value="Undecided">Undecided</SelectItem></SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Assign to agent</Label>
        <Select
          value={form.assigned_agent_id || undefined}
          onValueChange={(v) => {
            const a = (agents as any[]).find((x) => x.id === v);
            setForm((f) => ({
              ...f,
              assigned_agent_id: v,
              assigned_agent_name: a ? (a.display_name || a.email) : "",
            }));
          }}
        >
          <SelectTrigger className="h-8"><SelectValue placeholder="Select agent" /></SelectTrigger>
          <SelectContent>
            {(agents as any[]).map((a) => (
              <SelectItem key={a.id} value={a.id}>{a.display_name || a.email}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1"><Label className="text-xs">Notes</Label><Textarea placeholder="Any additional context…" value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} /></div>
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
  const ratingStyle: React.CSSProperties =
    lead.scout_rating === "A" ? { background: "var(--success-soft)", color: "var(--success-deep)" }
    : lead.scout_rating === "B" ? { background: "var(--win-soft)", color: "var(--win-deep)" }
    : { background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" };
  const triageStyle: React.CSSProperties =
    lead.triage_decision === "Pursue" ? { background: "var(--brand-base-soft)", color: "var(--brand-accent)", borderColor: "var(--brand-base-line)" }
    : lead.triage_decision === "Watch" ? { background: "var(--win-soft)", color: "var(--win-deep)", borderColor: "var(--win-soft)" }
    : lead.triage_decision === "Signed" ? { background: "var(--success-soft)", color: "var(--success-deep)", borderColor: "var(--success-soft)" }
    : lead.triage_decision === "Lost" ? { background: "var(--danger-soft)", color: "var(--danger-deep)", borderColor: "var(--danger-soft)" }
    : { background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))", borderColor: "hsl(var(--border))" };
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold">{lead.first_name} {lead.last_name}</span>
              {lead.lead_id && <Badge variant="outline" className="text-xs font-mono">{lead.lead_id}</Badge>}
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={ratingStyle}>{lead.scout_rating}</span>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full border" style={triageStyle}>{lead.triage_decision}</span>
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
          {stages.map((stage) => {
            const active = lead.onboarding_stage === stage;
            const activeStyle: React.CSSProperties = stage === "Signed"
              ? { background: "var(--success)", color: "#fff", borderColor: "var(--success)" }
              : stage === "Lost"
              ? { background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))", borderColor: "transparent" }
              : { background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", borderColor: "hsl(var(--primary))" };
            return (
              <button
                key={stage}
                onClick={() => onStageChange(lead.id, stage)}
                className="text-xs px-2.5 py-1 rounded-full border transition-colors"
                style={active ? activeStyle : { background: "hsl(var(--background))", color: "hsl(var(--muted-foreground))", borderColor: "hsl(var(--border))" }}
              >
                {stage}
              </button>
            );
          })}
        </div>
        {lead.assigned_agent_name && (
          <div className="text-xs text-muted-foreground">Assigned to: <span className="font-medium text-foreground">{lead.assigned_agent_name}</span></div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Stage derivation matching AddAthleteDialog options.
 * <16 = Emerging, 16-17 = Elite, 18+ = Pre-Pro.
 */
function deriveStageFromAge(age: number | null): "Emerging" | "Elite" | "Pre-Pro" {
  if (age == null) return "Emerging";
  if (age >= 18) return "Pre-Pro";
  if (age >= 16) return "Elite";
  return "Emerging";
}

/**
 * Convert a scout lead into a fully-linked athlete record on the assigned
 * agent's roster. Idempotent — reuses an existing converted athlete if found
 * (either via scout_leads.converted_athlete_id or athletes.source_lead_id).
 * Returns the athlete id.
 *
 * Requires lead.assigned_agent_id (the agent USER UUID) — the roster query
 * filters by athletes.assigned_agent_user_id.
 */
async function convertScoutLeadToAthlete(lead: any): Promise<string> {
  if (!lead?.assigned_agent_id) {
    throw new Error("Assign an agent to this lead before adding to a roster.");
  }

  // 1) Reuse via stored link
  if (lead.converted_athlete_id) {
    const { data } = await (supabase as any)
      .from("athletes").select("id").eq("id", lead.converted_athlete_id).maybeSingle();
    if (data?.id) return data.id as string;
  }
  // 2) Reuse via source_lead_id on athletes
  const { data: bySource } = await (supabase as any)
    .from("athletes").select("id").eq("source_lead_id", lead.id).maybeSingle();
  if (bySource?.id) {
    await (supabase as any).from("scout_leads")
      .update({ converted_athlete_id: bySource.id }).eq("id", lead.id);
    return bySource.id as string;
  }

  // Derive DOB from age if no DOB available (Jan 1 of birth year)
  let dob: string | null = null;
  const ageNum = typeof lead.age === "number" ? lead.age : (lead.age ? parseInt(lead.age, 10) : null);
  if (ageNum && ageNum > 0 && ageNum < 100) {
    dob = `${new Date().getFullYear() - ageNum}-01-01`;
  }
  const stage = deriveStageFromAge(ageNum);
  const todayISO = new Date().toISOString().slice(0, 10);

  const { data: athlete, error } = await (supabase as any)
    .from("athletes")
    .insert({
      first_name: lead.first_name,
      last_name: lead.last_name,
      position: lead.position || null,
      school: lead.school_club || null,
      region: lead.region || null,
      date_of_birth: dob,
      stage,
      footage_url: lead.footage_url || null,
      key_attributes: lead.key_attributes || null,
      scout_rating: lead.scout_rating || null,
      scout_notes: lead.notes || null,
      scout_credited: !!lead.scout_credited,
      date_signed: lead.date_signed || todayISO,
      assigned_agent_name: lead.assigned_agent_name || null,
      assigned_agent_user_id: lead.assigned_agent_id, // CRITICAL: matches roster filter
      source_lead_id: lead.id,
      source: "scout-converted",
    })
    .select("id")
    .single();
  if (error) throw error;

  await (supabase as any).from("scout_leads")
    .update({
      converted_athlete_id: athlete.id,
      onboarding_stage: "Signed",
      triage_decision: "Signed",
      date_signed: lead.date_signed || todayISO,
    })
    .eq("id", lead.id);

  return athlete.id as string;
}


function ScoutPortal({ autoOpenForm = false, view = "active" }: { autoOpenForm?: boolean; view?: "active" | "signed" | "lost" }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(autoOpenForm);
  const [editingLead, setEditingLead] = useState<any>(null);
  const [reviewingLead, setReviewingLead] = useState<any>(null);
  const [lostModalLead, setLostModalLead] = useState<any>(null);

  useEffect(() => { if (autoOpenForm) { setEditingLead(null); setShowForm(true); } }, [autoOpenForm]);

  function openAthleteProfile(id: string) {
    navigate(`/portal?view=agent&tab=athlete&athleteId=${id}`);
  }
  async function handleConvert(lead: any) {
    try {
      const athleteId = await convertScoutLeadToAthlete(lead);
      qc.invalidateQueries({ queryKey: ["athletes"] });
      toast.success(`${lead.first_name} ${lead.last_name} added to ${lead.assigned_agent_name || "agent"}'s roster`);
      openAthleteProfile(athleteId);
    } catch (e: any) {
      toast.error(e.message || "Could not add athlete to roster");
    }
  }


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

  const pursue = leads.filter((l: any) =>
    l.triage_decision === "Pursue" &&
    !["Signed", "Lost"].includes(l.onboarding_stage)
  );
  const watch = leads.filter((l: any) =>
    l.triage_decision === "Watch" &&
    !["Signed", "Lost"].includes(l.onboarding_stage)
  );
  const signed = leads.filter((l: any) => l.onboarding_stage === "Signed");
  const lost = leads.filter((l: any) => l.onboarding_stage === "Lost");

  async function handleStageChange(id: string, stage: string) {
    if (stage === "Lost") {
      const lead = leads.find((l: any) => l.id === id);
      setLostModalLead(lead || { id });
      return;
    }
    if (stage === "Signed") {
      const lead = leads.find((l: any) => l.id === id);
      if (!lead) return;
      if (!lead.assigned_agent_id) {
        toast.error("Assign an agent first");
        return;
      }
      try {
        // convertScoutLeadToAthlete is idempotent (reuses converted_athlete_id
        // or source_lead_id) and also writes onboarding_stage=Signed on success.
        await convertScoutLeadToAthlete(lead);
        qc.invalidateQueries({ queryKey: ["athletes"] });
        refetch();
        toast.success("Signed — added to agent's roster");
      } catch (e: any) {
        toast.error(e?.message || "Could not add athlete to roster — lead not marked Signed");
      }
      return;
    }
    const updates: any = { onboarding_stage: stage };
    if (stage === "Contacted") {
      updates.first_agent_action_at = new Date().toISOString();
    }
    const { error } = await supabase.from("scout_leads" as any).update(updates).eq("id", id);
    if (error) { toast.error(error.message); return; }
    refetch();
    toast.success("Stage updated");
  }

  async function confirmLost(reason: string) {
    if (!lostModalLead?.id) return;
    const today = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from("scout_leads" as any).update({
      onboarding_stage: "Lost",
      triage_decision: "Lost",
      lost_reason: reason || null,
      date_lost: today,
    }).eq("id", lostModalLead.id);
    if (error) { toast.error(error.message); return; }
    refetch();
    toast.success("Marked as lost");
  }
  async function handleTriageChange(id: string, triage: string) {
    const { error } = await supabase.from("scout_leads" as any).update({ triage_decision: triage }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    refetch();
  }

  const visibleLeads =
    view === "signed" ? signed
    : view === "lost" ? lost
    : leads.filter((l: any) => !["Signed", "Lost"].includes(l.onboarding_stage));

  const viewTitle =
    view === "signed" ? "Signed leads"
    : view === "lost" ? "Lost leads"
    : "My Scout Leads";
  const viewSubtitle =
    view === "signed" ? "Prospects you've converted into signed athletes."
    : view === "lost" ? "Prospects that didn't progress — kept for reference."
    : "Active prospects. Signed and Lost leads move to their own folders.";
  const emptyMessage =
    view === "signed" ? "No signed leads yet."
    : view === "lost" ? "No lost leads."
    : "No active leads. Tap \"Add lead\" to log your first prospect.";

  return (
    <div className="space-y-5 p-4 md:p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{viewTitle}</h1>
          <p className="text-sm text-muted-foreground">{viewSubtitle}</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => { setEditingLead(null); setShowForm(true); }}>
          <Plus className="h-4 w-4" />Add lead
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Pursue", value: pursue.length, color: "hsl(var(--primary))" },
          { label: "Watch", value: watch.length, color: "var(--win-deep)" },
          { label: "Signed", value: signed.length, color: "var(--success-deep)" },
          { label: "Lost", value: lost.length, color: "hsl(var(--muted-foreground))" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-lg border bg-card p-3 text-center">
            <div className="text-2xl font-semibold num" style={{ color }}>{value}</div>
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
      ) : visibleLeads.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">{emptyMessage}</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {visibleLeads.map((lead: any) => (
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
          onConvert={handleConvert}
          onOpenAthlete={openAthleteProfile}
        />
      )}

      {lostModalLead && (
        <LostReasonModal
          lead={lostModalLead}
          onClose={() => setLostModalLead(null)}
          onConfirm={confirmLost}
        />
      )}
    </div>
  );
}

function ScoutLeadReviewPanel({ lead, onClose, onEdit, onStageChange, onConvert, onOpenAthlete }: {
  lead: any;
  onClose: () => void;
  onEdit: () => void;
  onStageChange: (id: string, stage: string) => void;
  onConvert: (lead: any) => void;
  onOpenAthlete?: (athleteId: string) => void;
}) {
  const ratingStyle: React.CSSProperties =
    lead.scout_rating === "A" ? { background: "var(--success-soft)", color: "var(--success-deep)", borderColor: "var(--success-soft)" }
    : lead.scout_rating === "B" ? { background: "var(--win-soft)", color: "var(--win-deep)", borderColor: "var(--win-soft)" }
    : { background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))", borderColor: "hsl(var(--border))" };

  const triageStyle: React.CSSProperties =
    lead.triage_decision === "Pursue" ? { background: "var(--brand-base-soft)", color: "var(--brand-accent)", borderColor: "var(--brand-base-line)" }
    : lead.triage_decision === "Watch" ? { background: "var(--win-soft)", color: "var(--win-deep)", borderColor: "var(--win-soft)" }
    : lead.triage_decision === "Signed" ? { background: "var(--success-soft)", color: "var(--success-deep)", borderColor: "var(--success-soft)" }
    : lead.triage_decision === "Lost" ? { background: "var(--danger-soft)", color: "var(--danger-deep)", borderColor: "var(--danger-soft)" }
    : { background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))", borderColor: "hsl(var(--border))" };

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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: "rgba(0,0,0,0.4)" }} onClick={onClose}>
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
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full border" style={ratingStyle}>
                {lead.scout_rating} — {lead.scout_rating === "A" ? "Elite prospect" : lead.scout_rating === "B" ? "Strong watch" : "Monitor"}
              </span>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full border" style={triageStyle}>
                {lead.triage_decision}
              </span>
              {isStalled && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full border" style={{ background: "var(--win-soft)", color: "var(--win-deep)", borderColor: "var(--win-soft)" }}>
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

          {lead.onboarding_stage === "Lost" && (() => {
            const raw = (lead.lost_reason || "").trim();
            const [category, ...rest] = raw.split(" — ");
            const note = rest.join(" — ").trim();
            const dateStr = lead.lost_at || lead.date_lost;
            const parsedDate = dateStr ? new Date(dateStr) : null;
            const formatted = parsedDate && !isNaN(parsedDate.getTime())
              ? parsedDate.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
              : null;
            if (!raw && !formatted) return null;
            return (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-2">
                <div className="text-xs font-semibold text-destructive uppercase tracking-wide flex items-center gap-1.5">
                  <span>⚠</span> Why this was lost
                </div>
                {category && <p className="text-sm font-medium text-foreground">{category}</p>}
                {note && <p className="text-sm text-foreground/80 italic">"{note}"</p>}
                {formatted && (
                  <p className="text-xs text-muted-foreground">Marked lost: {formatted}</p>
                )}
              </div>
            );
          })()}

          <Section title="Pipeline status">
            <div className="flex flex-wrap gap-1.5">
              {stages.map((stage) => {
                const active = lead.onboarding_stage === stage;
                const activeStyle: React.CSSProperties = stage === "Signed"
                  ? { background: "var(--success)", color: "#fff", borderColor: "var(--success)" }
                  : stage === "Lost"
                  ? { background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))", borderColor: "transparent" }
                  : { background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", borderColor: "hsl(var(--primary))" };
                return (
                  <button
                    key={stage}
                    onClick={() => onStageChange(lead.id, stage)}
                    className="text-xs px-3 py-1.5 rounded-full border transition-colors"
                    style={active ? activeStyle : { background: "hsl(var(--background))", color: "hsl(var(--muted-foreground))", borderColor: "hsl(var(--border))" }}
                  >
                    {stage}
                  </button>
                );
              })}
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
                  <div className="text-sm font-medium num" style={{ color: Number(lead.response_hours) <= 24 ? "var(--success-deep)" : Number(lead.response_hours) <= 72 ? "var(--win-deep)" : "var(--danger-deep)" }}>
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

        <div className="p-4 pt-3 border-t flex gap-2 flex-wrap">
          {lead.onboarding_stage === "Signed" ? (
            lead.converted_athlete_id ? (
              <Button
                className="flex-1 gap-1.5"
                style={{ background: "var(--success)", color: "#fff" }}
                onClick={() => { onOpenAthlete?.(lead.converted_athlete_id); onClose(); }}
              >
                <UserPlus className="h-4 w-4" />
                View athlete on roster
              </Button>
            ) : lead.assigned_agent_id ? (
              <Button
                className="flex-1 gap-1.5"
                style={{ background: "var(--success)", color: "#fff" }}
                onClick={() => { onConvert(lead); onClose(); }}
              >
                <UserPlus className="h-4 w-4" />
                Add to {lead.assigned_agent_name || "agent"}'s roster
              </Button>
            ) : (
              <Button className="flex-1 gap-1.5" variant="outline" disabled>
                <UserPlus className="h-4 w-4" />
                Assign an agent first
              </Button>
            )
          ) : null}

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
  const [lostModalLead, setLostModalLead] = useState<any>(null);
  const [filter, setFilter] = useState<"All" | "Pursue" | "Watch" | "Stalled" | "Mine">("All");
  const [stageFilter, setStageFilter] = useState("All");
  const [signedOpen, setSignedOpen] = useState(false);

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

  const watching = leads.filter((l: any) => l.triage_decision === "Watch" && !["Signed", "Lost"].includes(l.onboarding_stage));
  const pursue = leads.filter((l: any) => l.triage_decision === "Pursue" && !["Signed", "Lost"].includes(l.onboarding_stage));
  const stalled = leads.filter((l: any) => {
    const days = Math.floor((Date.now() - new Date(l.last_stage_change_at || l.created_at).getTime()) / (1000 * 60 * 60 * 24));
    return days >= 7 && l.triage_decision === "Pursue" && !["Signed", "Lost"].includes(l.onboarding_stage);
  });
  const competition = leads.filter((l: any) => l.competitor_interest?.trim() && !["Signed", "Lost"].includes(l.onboarding_stage));
  const signed = leads.filter((l: any) => l.onboarding_stage === "Signed" && new Date(l.last_stage_change_at || l.created_at).getFullYear() === new Date().getFullYear());
  const lost = leads.filter((l: any) => l.onboarding_stage === "Lost");

  async function handleStageChange(id: string, stage: string) {
    if (stage === "Lost") {
      const lead = leads.find((l: any) => l.id === id);
      setLostModalLead(lead || { id });
      return;
    }
    if (stage === "Signed") {
      const lead = leads.find((l: any) => l.id === id);
      if (!lead) return;
      if (!lead.assigned_agent_id) {
        toast.error("Assign an agent first");
        return;
      }
      try {
        // convertScoutLeadToAthlete is idempotent and writes onboarding_stage=Signed
        // on success — only marks the lead Signed after the athlete record exists.
        await convertScoutLeadToAthlete(lead);
        qc.invalidateQueries({ queryKey: ["athletes"] });
        refetch();
        toast.success("Signed — added to agent's roster");
      } catch (e: any) {
        toast.error(e?.message || "Could not add athlete to roster — lead not marked Signed");
      }
      return;
    }
    const updates: any = { onboarding_stage: stage };
    if (stage === "Contacted") {
      updates.first_agent_action_at = new Date().toISOString();
    }
    const { error } = await supabase.from("scout_leads" as any).update(updates).eq("id", id);
    if (error) { toast.error(error.message); return; }
    refetch();
    toast.success("Stage updated");
  }

  async function confirmLost(reason: string) {
    if (!lostModalLead?.id) return;
    const today = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from("scout_leads" as any).update({
      onboarding_stage: "Lost",
      triage_decision: "Lost",
      lost_reason: reason || null,
      lost_at: today,
      date_lost: today,
    }).eq("id", lostModalLead.id);
    if (error) { toast.error(error.message); return; }
    refetch();
    toast.success("Marked as lost");
  }


  const navigate = useNavigate();
  const qc = useQueryClient();

  function openAthleteProfile(athleteId: string) {
    navigate(`/portal?view=agent&tab=athlete&athleteId=${athleteId}`);
  }

  async function handleConvert(lead: any) {
    try {
      const athleteId = await convertScoutLeadToAthlete(lead);
      qc.invalidateQueries({ queryKey: ["athletes"] });
      refetch();
      toast.success(`${lead.first_name} ${lead.last_name} added to ${lead.assigned_agent_name || "agent"}'s roster`, {
        action: { label: "Open profile", onClick: () => openAthleteProfile(athleteId) },
      });
      openAthleteProfile(athleteId);
    } catch (e: any) {
      toast.error(e.message || "Could not add athlete to roster");
    }
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
          { key: "pursue", label: "Pursue", value: pursue.length, color: "hsl(var(--primary))", border: "" },
          { key: "competition", label: "Competition active", value: competition.length, color: competition.length > 0 ? "hsl(var(--destructive))" : "hsl(var(--muted-foreground))", border: competition.length > 0 ? "border-destructive/30" : "" },
          { key: "stalled", label: "Stalled", value: stalled.length, color: stalled.length > 0 ? "var(--win-deep)" : "hsl(var(--muted-foreground))", border: "" },
          { key: "signed", label: `Signed ${new Date().getFullYear()}`, value: signed.length, color: signed.length > 0 ? "var(--success-deep)" : "hsl(var(--muted-foreground))", border: "" },
        ].map(({ key, label, value, color, border }) => {
          const isSigned = key === "signed";
          const expandable = isSigned && signed.length > 0;
          return (
            <div
              key={label}
              className={`rounded-lg border bg-card p-3 text-center ${border} ${expandable ? "cursor-pointer hover:bg-muted/40 transition-colors" : ""}`}
              onClick={expandable ? () => setSignedOpen((v) => !v) : undefined}
              role={expandable ? "button" : undefined}
              aria-expanded={expandable ? signedOpen : undefined}
            >
              <div className="text-2xl font-semibold num" style={{ color }}>{value}</div>
              <div className="text-xs text-muted-foreground mt-0.5 leading-tight inline-flex items-center gap-1 justify-center">
                {label}
                {expandable && (
                  <ChevronDown className={`h-3 w-3 transition-transform ${signedOpen ? "rotate-180" : ""}`} />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {signedOpen && signed.length > 0 && (
        <div className="rounded-lg border bg-card p-3 space-y-1.5">
          {signed.map((lead: any) => (
            <button
              key={lead.id}
              onClick={() => lead.converted_athlete_id && openAthleteProfile(lead.converted_athlete_id)}
              disabled={!lead.converted_athlete_id}
              className="w-full flex items-center justify-between text-sm py-1 px-1 rounded hover:bg-muted/40 transition-colors disabled:cursor-default disabled:hover:bg-transparent text-left"
            >
              <span className="font-medium">{lead.first_name} {lead.last_name}</span>
              <span className="text-xs text-muted-foreground">
                {lead.date_signed ? new Date(lead.date_signed).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Signed'}
              </span>
            </button>
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
              <Card key={lead.id} style={isStalled ? { borderColor: "var(--win)" } : undefined}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{lead.first_name} {lead.last_name}</span>
                        {lead.lead_id && <Badge variant="outline" className="text-xs font-mono">{lead.lead_id}</Badge>}
                        <Badge variant={lead.scout_rating === "A" ? "default" : "secondary"} className="text-xs">{lead.scout_rating}</Badge>
                        <Badge variant="outline" className={`text-xs ${lead.triage_decision === "Pursue" ? "border-primary text-primary" : ""}`}>{lead.triage_decision}</Badge>
                        {isStalled && <Badge variant="outline" className="text-xs" style={{ borderColor: "var(--win)", color: "var(--win-deep)" }}>Stalled {days}d</Badge>}
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
                    {["New", "Contacted", "Pack Sent", "Welcome Sent", "Signed", "Lost"].map((stage) => {
                      const active = lead.onboarding_stage === stage;
                      const activeStyle: React.CSSProperties = stage === "Signed"
                        ? { background: "var(--success)", color: "#fff", borderColor: "var(--success)" }
                        : stage === "Lost"
                        ? { background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))", borderColor: "transparent" }
                        : { background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", borderColor: "hsl(var(--primary))" };
                      return (
                        <button key={stage} onClick={() => handleStageChange(lead.id, stage)}
                          className="text-xs px-2.5 py-1 rounded-full border transition-colors"
                          style={active ? activeStyle : { background: "hsl(var(--background))", color: "hsl(var(--muted-foreground))", borderColor: "hsl(var(--border))" }}>
                          {stage}
                        </button>
                      );
                    })}
                  </div>

                  {lead.onboarding_stage === "Signed" && (
                    lead.converted_athlete_id ? (
                      <Button size="sm" variant="outline" className="w-full gap-1.5"
                        style={{ borderColor: "var(--success)", color: "var(--success-deep)" }}
                        onClick={() => openAthleteProfile(lead.converted_athlete_id)}>
                        <UserPlus className="h-3.5 w-3.5" />
                        View athlete on roster
                      </Button>
                    ) : lead.assigned_agent_id ? (
                      <Button size="sm" className="w-full gap-1.5"
                        style={{ background: "var(--success)", color: "#fff" }}
                        onClick={() => handleConvert(lead)}>
                        <UserPlus className="h-3.5 w-3.5" />
                        Add to {lead.assigned_agent_name || "agent"}'s roster
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" className="w-full gap-1.5" disabled>
                        <UserPlus className="h-3.5 w-3.5" />
                        Assign an agent first
                      </Button>
                    )
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
          onOpenAthlete={openAthleteProfile}
        />
      )}
      {lostModalLead && (
        <LostReasonModal
          lead={lostModalLead}
          onClose={() => setLostModalLead(null)}
          onConfirm={confirmLost}
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
          <TabsTrigger value="approvals" className="relative">
            Pending Approvals
            <PendingApprovalsDot className="ml-2" />
          </TabsTrigger>
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
        <TabsContent value="approvals" className="mt-4 space-y-6">
          <PendingInvitesList />
          <PendingApprovals />
        </TabsContent>
        <TabsContent value="security" className="mt-4 space-y-6">
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
            <div className="rounded-lg border p-3" style={{ borderColor: "var(--win)" }}>
              <div className="text-2xl font-semibold num">{stalledLeads.length}</div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Stalled</div>
            </div>
            <div className="rounded-lg border p-3" style={{ borderColor: "var(--success)" }}>
              <div className="text-2xl font-semibold num">{signedThisYear.length}</div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Signed {new Date().getFullYear()}</div>
            </div>
          </div>
          {stalledLeads.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs font-semibold" style={{ color: "var(--win-deep)" }}>Stalled — action needed</div>
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
      <WeeklyPlanner athletes={athletes} />
      {(() => {
        const counts: Record<Exclude<CommandFilter, "all">, number> = {
          calls_due_7: athletes.filter((a) => {
            const last = lastContactMap[a.id];
            if (!last) return true;
            const days = Math.floor((Date.now() - last.getTime()) / (24 * 60 * 60 * 1000));
            return days >= 14;
          }).length,
          wellbeing_low: athletes.filter((a) => a.wellbeingScore <= 3).length,
          parent_followup: athletes.filter((a) => {
            const parentComms = allComms.filter((c) => c.athleteId === a.id && c.recipient === "parent");
            if (parentComms.length === 0) return true;
            const lastParent = new Date(Math.max(...parentComms.map((c) => new Date(c.sentAt).getTime())));
            return (Date.now() - lastParent.getTime()) > 14 * 24 * 60 * 60 * 1000;
          }).length,
          injury_setback: athletes.filter((a) => a.status === "Needs Support").length,
          commercial_watch: athletes.filter((a) => a.commercialPotential === "High").length,
        };
        const total = Object.values(counts).reduce((s, n) => s + n, 0);
        if (total === 0) return null;

        const chipTone: Record<Exclude<CommandFilter, "all">, string> = {
          calls_due_7: "border-destructive/40 text-destructive",
          wellbeing_low: "border-destructive/40 text-destructive",
          parent_followup: "",
          injury_setback: "border-destructive/40 text-destructive",
          commercial_watch: "",
        };
        const chipToneStyle: Partial<Record<Exclude<CommandFilter, "all">, React.CSSProperties>> = {
          parent_followup: { borderColor: "var(--win)", color: "var(--win-deep)" },
          commercial_watch: { borderColor: "var(--success)", color: "var(--success-deep)" },
        };

        return (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" style={{ color: "var(--win)" }} />
                Needs Attention
                <Badge variant="secondary" className="ml-1 text-[10px]">{total}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {filters.map((f) => {
                  const n = counts[f.key as Exclude<CommandFilter, "all">];
                  if (n === 0) return null;
                  const active = activeFilter === f.key;
                  return (
                    <button
                      key={f.key}
                      onClick={() => setActiveFilter(active ? "all" : f.key)}
                      className={`text-xs rounded-full border px-2.5 py-1 transition-colors ${chipTone[f.key as Exclude<CommandFilter, "all">]} ${active ? "bg-secondary" : "hover:bg-secondary/60"}`}
                      style={chipToneStyle[f.key as Exclude<CommandFilter, "all">]}
                    >
                      {f.label} · {n}
                    </button>
                  );
                })}
              </div>
              {activeFilter !== "all" && (
                <div className="space-y-1.5 pt-1 border-t border-border">
                  {filteredAthletes.slice(0, 5).map((a) => (
                    <div key={a.id} className="flex items-center justify-between rounded-md border border-border px-2.5 py-1.5 text-xs">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{a.name}</div>
                        <div className="text-muted-foreground text-[11px]">
                          {a.club} · Wellbeing {a.wellbeingScore}/5 · Last contact {daysSinceContact(a.id)}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onOpenProfile?.(a.id)}>Open</Button>
                    </div>
                  ))}
                  {filteredAthletes.length > 5 && (
                    <div className="text-[11px] text-muted-foreground px-1">+{filteredAthletes.length - 5} more</div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })()}

    </div>
  );
}

export default function SFXPathwaysPortal() {
  const { data: userRoleData, isLoading: roleLoading } = useUserRole();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedRole = searchParams.get("view");
  const requestedTab = searchParams.get("tab");
  const initialRequestedRole = isPortalRole(requestedRole) ? requestedRole : null;
  const initialRequestedTab = requestedTab || null;
  const [role, setRole] = useState<Role | null>(null);
  const [active, setActive] = useState(initialRequestedTab || firstNavKeyForRole(initialRequestedRole) || "roster");
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);
  const [roleOverride, setRoleOverride] = useState<Role | null>(null);
  const [callActive, setCallActive] = useState(false);
  const [addAthleteOpen, setAddAthleteOpen] = useState(false);

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
      const initialRole = isAdmin && initialRequestedRole
        ? initialRequestedRole
        : (userRoleData.role as Role);
      if (isAdmin && initialRequestedRole && initialRequestedRole !== userRoleData.role) {
        setRoleOverride(initialRequestedRole);
      }
      const safeTab = isValidNavKeyForRole(initialRole, initialRequestedTab) ? initialRequestedTab! : firstNavKeyForRole(initialRole);
      setActive(safeTab);
    }
  }, [userRoleData, role, isAdmin, initialRequestedRole, requestedRole, initialRequestedTab]);

  useEffect(() => {
    if (!effectiveRole || roleLoading) return;
    if (!isValidNavKeyForRole(effectiveRole, active)) {
      setActive(firstNavKeyForRole(effectiveRole));
    }
  }, [effectiveRole, active, roleLoading]);

  // Honor ?athleteId=… deep link (used after Scout → Signed conversion)
  useEffect(() => {
    const aId = searchParams.get("athleteId");
    if (!aId || !athletes.length) return;
    if (athletes.some((a) => a.id === aId)) {
      setSelectedAthleteId(aId);
      if (isValidNavKeyForRole(effectiveRole || "agent", "athlete")) {
        setActive("athlete");
      }
    }
    const next = new URLSearchParams(searchParams);
    next.delete("athleteId");
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [athletes.length, searchParams.get("athleteId")]);

  // When admin switches role preview, reset to first tab of that role
  const handleRoleSwitch = (newRole: Role) => {
    if (newRole === userRoleData?.role) {
      setRoleOverride(null);
      setSearchParams({ tab: firstNavKeyForRole(newRole) });
    } else {
      setRoleOverride(newRole);
      setSearchParams({ view: newRole, tab: firstNavKeyForRole(newRole) });
    }
    const firstTab = NAV[newRole]?.[0]?.key ?? "dash";
    setActive(firstTab);
  };

  const handleNav = (key: string) => {
    if (!effectiveRole || !isValidNavKeyForRole(effectiveRole, key)) return;
    setActive(key);
    const nextParams: Record<string, string> = { tab: key };
    if (roleOverride && roleOverride !== userRoleData?.role) nextParams.view = roleOverride;
    setSearchParams(nextParams);
  };

  const currentAthleteId = selectedAthleteId || athletes[0]?.id;
  const athlete = useMemo(() => athletes.find((a) => a.id === currentAthleteId) ?? athletes[0], [athletes, currentAthleteId]);

  if (athletesLoading || roleLoading || !role) {
    return (
      <div className="min-h-screen p-6 md:p-10" style={{ background: "var(--canvas)" }}>
        <div className="max-w-5xl mx-auto">
          <DashboardSkeleton />
        </div>
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

  // Build ⌘K palette commands from current role's nav + athlete jump-list
  const paletteCommands: PaletteCommand[] = [
    ...((effectiveRole ? NAV[effectiveRole] : []) ?? []).map((it) => ({
      id: `nav-${it.key}`,
      label: it.label,
      group: "Navigate",
      icon: it.icon,
      run: () => handleNav(it.key),
    })),
    ...((effectiveRole === "agent" || effectiveRole === "admin")
      ? athletes.slice(0, 50).map((a) => ({
          id: `athlete-${a.id}`,
          label: a.name,
          hint: "Open profile",
          group: "Athletes",
          icon: User,
          keywords: a.position ?? "",
          run: () => { setSelectedAthleteId(a.id); handleNav("athlete"); },
        }))
      : []),
  ];

  // Scout role: dedicated portal, no athlete data required
  if (effectiveRole === "scout") {
    return (
      <Shell role={effectiveRole} active={active} onNav={handleNav}>
        <CommandPalette commands={paletteCommands} />
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
        <ScoutPortal autoOpenForm={active === "add"} view={active === "signed" ? "signed" : active === "lost" ? "lost" : "active"} />
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
    <Shell
      role={effectiveRole}
      active={active}
      onNav={handleNav}
      hideBottomNav={callActive}
      isPreview={isAdmin && !!roleOverride && effectiveRole !== "admin"}
      previewAgentName={
        athlete && athlete.assignedAgent && athlete.assignedAgent !== "Unassigned"
          ? athlete.assignedAgent
          : null
      }
    >
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
        onAddAthlete={() => setAddAthleteOpen(true)}
      />

      <AddAthleteDialog
        open={addAthleteOpen}
        onOpenChange={setAddAthleteOpen}
        onCreated={(id) => {
          setSelectedAthleteId(id);
          setActive("athlete");
        }}
      />

      {effectiveRole === "athlete" && active === "dash" && <AthleteDashboard key={athlete.id} athlete={athlete} />}
      {effectiveRole === "athlete" && active === "reviews" && <EditableReviews key={athlete.id} athlete={athlete} />}
      {effectiveRole === "athlete" && active === "updates" && <FamilyCorrespondence key={athlete.id} athleteId={athlete.id} audience="athlete" athleteName={athlete.name} />}
      {effectiveRole === "parent" && active === "dash" && <ParentDashboard key={athlete.id} athlete={athlete} />}
      {effectiveRole === "parent" && active === "updates" && <FamilyCorrespondence key={athlete.id} athleteId={athlete.id} audience="parent" athleteName={athlete.name} />}


      {(effectiveRole === "agent" || effectiveRole === "admin") && active === "dash" && (
        <ManagerCommandCentre
          athletes={athletes}
          onOpenProfile={(id) => { setSelectedAthleteId(id); setActive("athlete"); }}
        />
      )}
      {(effectiveRole === "agent" || effectiveRole === "admin") && active === "roster" && <RosterDashboard athletes={athletes} onOpenProfile={(id) => { setSelectedAthleteId(id); setActive("athlete"); }} onAddAthlete={() => setAddAthleteOpen(true)} />}
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
      {(effectiveRole === "agent" || effectiveRole === "admin") && active === "voice" && (
        <div className="p-4 md:p-6"><VoiceProfileSettings /></div>
      )}
      {effectiveRole === "admin" && active === "admin" && <AdminSecurity />}
      <CommandPalette commands={paletteCommands} />
    </Shell>
  );
}