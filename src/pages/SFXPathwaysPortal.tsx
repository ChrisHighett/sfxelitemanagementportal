import React, { useMemo, useState, useEffect } from "react";
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
import { Loader2, CalendarDays, ClipboardList, FileText, LayoutDashboard, Library, Mail, Phone, Shield, Sparkles, Users, ChevronDown } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useAthletes, useMonthlyReviews, useCommsLog, type Athlete, type MonthlyReview, type CommsLog } from "@/hooks/usePortalData";
import { useUserRole } from "@/hooks/useUserRole";

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
    { key: "reviews", label: "My Monthly Reviews", icon: ClipboardList },
    { key: "goals", label: "My Goals", icon: Sparkles },
    { key: "resources", label: "Resources", icon: Library },
    { key: "docs", label: "Documents", icon: FileText },
  ],
  parent: [
    { key: "dash", label: "Dashboard", icon: LayoutDashboard },
    { key: "updates", label: "Updates", icon: ClipboardList },
    { key: "resources", label: "Parent Resources", icon: Library },
    { key: "contact", label: "Contact Manager", icon: Phone },
    { key: "docs", label: "Documents", icon: FileText },
  ],
  agent: [
    { key: "roster", label: "Roster Dashboard", icon: Users },
    { key: "athlete", label: "Athlete Profile", icon: FileText },
    { key: "call", label: "Call Centre", icon: Phone },
    { key: "reviews", label: "Monthly Reviews", icon: ClipboardList },
    { key: "comms", label: "Parent Comms", icon: Mail },
    { key: "resources", label: "Resources", icon: Library },
  ],
  admin: [
    { key: "roster", label: "Roster Dashboard", icon: Users },
    { key: "athlete", label: "Athlete Profile", icon: FileText },
    { key: "call", label: "Call Centre", icon: Phone },
    { key: "reviews", label: "Monthly Reviews", icon: ClipboardList },
    { key: "comms", label: "Parent Comms", icon: Mail },
    { key: "resources", label: "Resources", icon: Library },
    { key: "admin", label: "Admin & Security", icon: Shield },
  ],
};

function Shell({ role, active, onNav, children }: { role: Role; active: string; onNav: (k: string) => void; children: React.ReactNode }) {
  const items = NAV[role] ?? [];
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card p-4">
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
          <Separator />
          <p className="text-xs text-muted-foreground">
            This Canvas prototype shows architecture & UX. Production build: Next.js + Supabase.
          </p>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}

function TopBar({ role, setRole, selectedAthleteId, setSelectedAthleteId }: {
  role: Role; setRole: (r: Role) => void;
  selectedAthleteId: string; setSelectedAthleteId: (id: string) => void;
}) {
  const { data: athletes = [] } = useAthletes();

  return (
    <div className="border-b border-border bg-card px-6 py-3">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Portal View</span>
          <Badge variant="secondary">{role.toUpperCase()}</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Role</span>
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="athlete">Athlete</SelectItem>
                <SelectItem value="parent">Parent</SelectItem>
                <SelectItem value="agent">Agent</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(role === "agent" || role === "admin") && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Athlete</span>
              <Select value={selectedAthleteId} onValueChange={setSelectedAthleteId}>
                <SelectTrigger className="w-44">
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
        </div>
      </div>
    </div>
  );
}

function AthleteDashboard({ athlete }: { athlete: Athlete }) {
  const { data: reviews = [] } = useMonthlyReviews(athlete.id);
  const review = reviews[0];
  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <CardTitle>Welcome, {athlete.name.split(" ")[0]}</CardTitle>
            {statusBadge(athlete.status)}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground">Next Check-in</div>
                <div className="mt-1 flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{athlete.nextCall}</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground">Wellbeing</div>
                <div className="mt-2">{scorePill(athlete.wellbeingScore)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground">Focus This Month</div>
                <div className="mt-1 font-medium">{review?.focus ?? "—"}</div>
              </CardContent>
            </Card>
          </div>
          <Separator />
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Your Goals</CardTitle></CardHeader>
              <CardContent>
                {(review?.goals ?? []).map((g, idx) => (
                  <div key={idx} className="flex items-start gap-2 py-1">
                    <div className="mt-1.5 h-2 w-2 rounded-full bg-primary" />
                    <span className="text-sm">{g}</span>
                  </div>
                ))}
                {!review?.goals?.length && <p className="text-sm text-muted-foreground">No goals set yet.</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Latest Review Summary</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div><span className="font-medium">Performance:</span> {review?.performance ?? "—"}</div>
                <div><span className="font-medium">Lifestyle:</span> {review?.lifestyle ?? "—"}</div>
                <div><span className="font-medium">Personal:</span> {review?.personal ?? "—"}</div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Your Profile</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          <div>Club: {athlete.club}</div>
          <div>Position: {athlete.position}</div>
          <div>Stage: {athlete.stage}</div>
          <div>Assigned Agent: {athlete.assignedAgent}</div>
          <Separator className="my-3" />
          <p className="text-muted-foreground">Need anything? Call your manager any time.</p>
          <Button variant="secondary" className="mt-2">Message My Manager</Button>
        </CardContent>
      </Card>
    </div>
  );
}

function ParentDashboard({ athlete }: { athlete: Athlete }) {
  const { data: reviews = [] } = useMonthlyReviews(athlete.id);
  const review = reviews[0];
  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <CardTitle>{athlete.name} — Parent View</CardTitle>
            {statusBadge(athlete.status)}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Next Check-in</div><div className="mt-1 flex items-center gap-2"><CalendarDays className="h-4 w-4 text-muted-foreground" /><span className="font-medium">{athlete.nextCall}</span></div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Wellbeing (high-level)</div><div className="mt-2">{scorePill(athlete.wellbeingScore)}</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Current Focus</div><div className="mt-1 font-medium">{review?.focus ?? "—"}</div></CardContent></Card>
          </div>
          <Separator />
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Latest Parent Update</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div><span className="font-medium">Performance:</span> {review?.performance ?? "—"}</div>
              <div><span className="font-medium">Lifestyle:</span> {review?.lifestyle ?? "—"}</div>
              <div><span className="font-medium">Personal:</span> {review?.personal ?? "—"}</div>
              <div><span className="font-medium">Next focus:</span> {review?.focus ?? "—"}</div>
              <p className="text-muted-foreground mt-2">If you have questions, contact the assigned manager anytime.</p>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Contact</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          <div>Manager: {athlete.assignedAgent}</div>
          <div>📧 info@sfx.com.au</div>
          <Separator className="my-3" />
          <Button variant="secondary">Send Message</Button>
        </CardContent>
      </Card>
    </div>
  );
}

function RosterDashboard({ athletes }: { athletes: Athlete[] }) {
  const [q, setQ] = useState("");
  const [onlyAttention, setOnlyAttention] = useState(false);

  const filtered = useMemo(() => {
    return athletes
      .filter((a) => a.name.toLowerCase().includes(q.toLowerCase()))
      .filter((a) => (onlyAttention ? (a.wellbeingScore <= 3 || a.status !== "Thriving") : true));
  }, [athletes, q, onlyAttention]);

  return (
    <div className="space-y-4 p-6">
      <Card>
        <CardHeader><CardTitle>Roster Dashboard</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <Input placeholder="Search athletes…" value={q} onChange={(e) => setQ(e.target.value)} className="w-72" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Show attention required</span>
            <Switch checked={onlyAttention} onCheckedChange={setOnlyAttention} />
          </div>
        </CardContent>
      </Card>
      <div className="space-y-3">
        {filtered.map((a) => (
          <Card key={a.id}>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{a.name}</span>
                    {statusBadge(a.status)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {a.club} • {a.position} • {a.stage} • Commercial: {a.commercialPotential}
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div><div className="text-xs text-muted-foreground">Wellbeing</div><div className="w-32">{scorePill(a.wellbeingScore)}</div></div>
                  <div><div className="text-xs text-muted-foreground">Last Call</div><div className="text-sm">{a.lastCall}</div></div>
                  <div><div className="text-xs text-muted-foreground">Next Due</div><div className="text-sm">{a.nextCall}</div></div>
                  <Button variant="secondary" size="sm">Open Profile</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function AthleteProfileAgentView({ athlete }: { athlete: Athlete }) {
  const { data: reviews = [] } = useMonthlyReviews(athlete.id);
  const { data: comms = [] } = useCommsLog(athlete.id);

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Athlete Profile</CardTitle>
            <div className="flex gap-2">
              <Badge variant="secondary">{athlete.stage}</Badge>
              {statusBadge(athlete.status)}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-[300px_1fr]">
            <div className="space-y-2 text-sm">
              <div className="text-xl font-bold">{athlete.name}</div>
              <div>Age: {athlete.age}</div>
              <div>Club: {athlete.club}</div>
              <div>School: {athlete.school}</div>
              <div>Position: {athlete.position}</div>
              <Separator className="my-3" />
              <div className="font-medium">Primary contact</div>
              <div>📧 {athlete.parentEmail}</div>
              <div>Parent: {athlete.parentName}</div>
            </div>
            <div>
              <Tabs defaultValue="reviews">
                <TabsList>
                  <TabsTrigger value="reviews">Reviews</TabsTrigger>
                  <TabsTrigger value="comms">Comms Log</TabsTrigger>
                  <TabsTrigger value="commercial">Commercial</TabsTrigger>
                </TabsList>
                <TabsContent value="reviews" className="space-y-4 mt-4">
                  {reviews.length === 0 && <p className="text-sm text-muted-foreground">No reviews yet.</p>}
                  {reviews.map((r) => (
                    <Card key={r.month}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{r.month} Review</CardTitle>
                          <div className="flex items-center gap-2">
                            <Badge variant={r.attentionRequired ? "destructive" : "default"}>
                              {r.attentionRequired ? "Attention" : "On Track"}
                            </Badge>
                            <span className="text-sm">Wellbeing {r.wellbeingScore}/5</span>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-1 text-sm">
                        <div><span className="font-medium">Performance:</span> {r.performance}</div>
                        <div><span className="font-medium">Lifestyle:</span> {r.lifestyle}</div>
                        <div><span className="font-medium">Personal:</span> {r.personal}</div>
                        <div><span className="font-medium">Education:</span> {r.education}</div>
                        <div><span className="font-medium">Brand:</span> {r.brand}</div>
                        <Separator className="my-2" />
                        <div><span className="font-medium">Focus:</span> {r.focus}</div>
                        <div className="space-y-1 mt-2">
                          {r.goals.map((g, idx) => (
                            <div key={idx} className="flex items-start gap-2">
                              <div className="mt-1.5 h-2 w-2 rounded-full bg-foreground/70" />
                              <span>{g}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
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
              </Tabs>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CallCentre({ athlete }: { athlete: Athlete }) {
  const [scriptChecked, setScriptChecked] = useState<Record<string, boolean>>({
    opener: true, performance: false, lifestyle: false, personal: false,
    education: false, brand: false, goals: false, close: false,
  });
  const [notes, setNotes] = useState("");
  const [aiSummary, setAiSummary] = useState<{
    performance: string; lifestyle: string; personal: string;
    education: string; brand: string; focus: string; goals: string[];
    attentionRequired: boolean;
  } | null>(null);

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

  function mockGenerateAI() {
    setAiSummary({
      performance: "Gym consistency trending up; add defensive video review.",
      lifestyle: "Sleep inconsistent; implement 10pm device cutoff.",
      personal: "Confidence solid; encourage leadership moments at training.",
      education: "Busy assessment period; create weekly plan Sunday night.",
      brand: "Training content performing best; post 2x/week.",
      focus: "Conditioning + defensive reads",
      goals: ["4 gym sessions/week", "10pm device cutoff", "2 IG posts/week"],
      attentionRequired: false,
    });
  }

  return (
    <div className="space-y-6 p-6">
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

      <Card>
        <CardHeader><CardTitle>Call Notes — {athlete.name}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Paste transcript here, or type notes live..."
            className="min-h-[140px]"
          />
          <div className="flex flex-wrap gap-2">
            <Button onClick={mockGenerateAI} className="gap-2">
              <Sparkles className="h-4 w-4" /> Generate AI Summary (Mock)
            </Button>
            <Button variant="secondary">Publish to Tracker</Button>
            <Button variant="secondary">Create Athlete Email</Button>
            <Button variant="secondary">Create Parent Email</Button>
          </div>
          {aiSummary && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Structured Summary</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div><span className="font-medium">Performance:</span> {aiSummary.performance}</div>
                <div><span className="font-medium">Lifestyle:</span> {aiSummary.lifestyle}</div>
                <div><span className="font-medium">Personal:</span> {aiSummary.personal}</div>
                <div><span className="font-medium">Education:</span> {aiSummary.education}</div>
                <div><span className="font-medium">Brand:</span> {aiSummary.brand}</div>
                <Separator />
                <div><span className="font-medium">Focus:</span> {aiSummary.focus}</div>
                <div className="grid gap-2 md:grid-cols-2">
                  {aiSummary.goals.map((g, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <div className="mt-1 h-2 w-2 rounded-full bg-foreground/70" />
                      <div>{g}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Resources() {
  return (
    <div className="grid gap-4 md:grid-cols-3 p-6">
      {["Nutrition", "Recovery", "Mindset", "Media Training", "Social Media", "Parent Playbook"].map((t) => (
        <Card key={t} className="hover:shadow-sm transition">
          <CardHeader className="pb-2"><CardTitle className="text-base">{t}</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Upload PDFs, videos, and checklists here. In production, store files in Supabase Storage with role permissions.
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AdminSecurity() {
  return (
    <div className="space-y-6 p-6">
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
      <Card>
        <CardHeader><CardTitle className="text-base">Production Build Notes</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <div>• Frontend: Next.js (App Router) + Tailwind + shadcn/ui</div>
          <div>• Backend: Supabase (Postgres + Auth + Storage + Row-Level Security)</div>
          <div>• AI: optional server function for transcription + structured summary</div>
          <div>• Hosting: Vercel</div>
        </CardContent>
      </Card>
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

function ManagerCommandCentre({ athletes }: { athletes: Athlete[] }) {
  const dueThisWeek = athletes.filter((a) => a.status !== "Thriving" || a.wellbeingScore <= 3);
  const thriving = athletes.filter((a) => a.status === "Thriving").length;
  const attention = athletes.filter((a) => a.wellbeingScore <= 3 || a.status !== "Thriving").length;
  const highCommercial = athletes.filter((a) => a.commercialPotential === "High").length;

  return (
    <div className="space-y-6 p-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total Athletes</div><div className="mt-1 text-2xl font-semibold">{athletes.length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Thriving</div><div className="mt-1 text-2xl font-semibold">{thriving}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Attention Required</div><div className="mt-1 text-2xl font-semibold">{attention}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">High Commercial Potential</div><div className="mt-1 text-2xl font-semibold">{highCommercial}</div></CardContent></Card>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader><CardTitle className="text-base">Priority Actions This Week</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {dueThisWeek.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-xl border border-border p-3">
                <div>
                  <div className="font-medium">{a.name}</div>
                  <div className="text-xs text-muted-foreground">{a.club} • Wellbeing {a.wellbeingScore}/5 • Next call {a.nextCall}</div>
                </div>
                <div className="flex items-center gap-2">
                  {statusBadge(a.status)}
                  <Button variant="secondary" size="sm">Open</Button>
                </div>
              </div>
            ))}
            {dueThisWeek.length === 0 && <div className="text-sm text-muted-foreground">No urgent athlete flags this week.</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Command Centre Filters</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>• Calls due in 7 days</div>
            <div>• Wellbeing ≤ 3</div>
            <div>• Parent follow-up needed</div>
            <div>• Injury / selection setback</div>
            <div>• Commercial watch list</div>
            <Separator />
            <div className="text-xs text-muted-foreground">Production version can auto-generate a weekly action list.</div>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Weekly Agent Workflow</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-5 text-sm">
          <div><div className="font-medium">Monday</div><div className="text-muted-foreground">Review dashboard + book calls</div></div>
          <div><div className="font-medium">Tuesday</div><div className="text-muted-foreground">Athlete calls + tracker updates</div></div>
          <div><div className="font-medium">Wednesday</div><div className="text-muted-foreground">Parent updates + follow-ups</div></div>
          <div><div className="font-medium">Thursday</div><div className="text-muted-foreground">Club/coach relationship touchpoints</div></div>
          <div><div className="font-medium">Friday</div><div className="text-muted-foreground">Commercial review + next-week planning</div></div>
        </CardContent>
      </Card>
    </div>
  );
}

function ParentTrustPortal({ athlete }: { athlete: Athlete }) {
  const { data: reviews = [] } = useMonthlyReviews(athlete.id);
  const review = reviews[0];
  return (
    <div className="space-y-6 p-6">
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
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
        <Card>
          <CardHeader><CardTitle className="text-base">Resources for Parents</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-xl border border-border p-3">Understanding pathways football</div>
            <div className="rounded-xl border border-border p-3">Supporting recovery and school balance</div>
            <div className="rounded-xl border border-border p-3">Social media and online reputation</div>
            <div className="rounded-xl border border-border p-3">Managing pressure and expectations</div>
            <Separator />
            <Button className="w-full" variant="secondary">Contact Assigned Manager</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function SFXPathwaysPortal() {
  const { data: userRoleData, isLoading: roleLoading } = useUserRole();
  const [role, setRole] = useState<Role | null>(null);
  const [active, setActive] = useState("roster");
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);

  const { data: athletes = [], isLoading: athletesLoading } = useAthletes();

  // Set role from database once loaded
  useEffect(() => {
    if (userRoleData?.role && !role) {
      setRole(userRoleData.role as Role);
      const firstTab = NAV[userRoleData.role as Role]?.[0]?.key ?? "dash";
      setActive(firstTab);
    }
  }, [userRoleData, role]);

  const currentAthleteId = selectedAthleteId || athletes[0]?.id;
  const athlete = useMemo(() => athletes.find((a) => a.id === currentAthleteId) ?? athletes[0], [athletes, currentAthleteId]);

  function handleRoleChange(nextRole: Role) {
    setRole(nextRole);
    const first = NAV[nextRole]?.[0]?.key ?? "dash";
    setActive(first);
  }

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
    <Shell role={role} active={active} onNav={setActive}>
      <TopBar 
        role={role} 
        setRole={handleRoleChange} 
        selectedAthleteId={currentAthleteId} 
        setSelectedAthleteId={setSelectedAthleteId} 
      />

      {role === "athlete" && active === "dash" && <AthleteDashboard athlete={athlete} />}
      {role === "athlete" && active === "goals" && <AthleteTimeline athlete={athlete} />}
      {role === "parent" && active === "dash" && <ParentDashboard athlete={athlete} />}
      {role === "parent" && active === "updates" && <ParentTrustPortal athlete={athlete} />}

      {(role === "agent" || role === "admin") && active === "roster" && <ManagerCommandCentre athletes={athletes} />}
      {(role === "agent" || role === "admin") && active === "athlete" && <AthleteProfileAgentView athlete={athlete} />}
      {(role === "agent" || role === "admin") && active === "call" && <CallCentre athlete={athlete} />}
      {(role === "agent" || role === "admin") && active === "reviews" && <AthleteTimeline athlete={athlete} />}
      {(role === "agent" || role === "admin") && active === "comms" && <ParentTrustPortal athlete={athlete} />}

      {active === "resources" && <Resources />}
      {role === "admin" && active === "admin" && <AdminSecurity />}

      {((role === "athlete" && !["dash", "goals", "resources"].includes(active)) ||
        (role === "parent" && !["dash", "updates", "resources"].includes(active)) ||
        ((role === "agent" || role === "admin") && !["roster", "athlete", "call", "reviews", "comms", "resources", "admin"].includes(active))) && (
        <div className="p-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Module Stub</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              This module is part of the architecture. Next we can build it out with live forms, templates, and database wiring.
            </CardContent>
          </Card>
        </div>
      )}
    </Shell>
  );
}
