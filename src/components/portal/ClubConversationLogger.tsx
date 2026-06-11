import React, { useState, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Mic, Square, Loader2, CheckCircle2,
  MessageSquarePlus, Trophy, Briefcase, Mic as MicIcon, MessageCircle,
  Mail, MessageSquare, Copy,
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { type Athlete } from "@/hooks/usePortalData";
import { saveCommsEmail } from "@/components/portal/CommsHistory";
import { cn } from "@/lib/utils";

type Category = "club" | "commercial" | "media" | "general";
type Audience = "athlete" | "parent" | "skip";
type Format = "email" | "sms" | "whatsapp";

const FORMATS: Array<{ value: Format; label: string; Icon: any }> = [
  { value: "email",    label: "Email",    Icon: Mail },
  { value: "sms",      label: "SMS",      Icon: MessageSquare },
  { value: "whatsapp", label: "WhatsApp", Icon: MessageCircle },
];

const NRL_CLUBS = [
  "Brisbane Broncos", "Canberra Raiders", "Canterbury-Bankstown Bulldogs",
  "Cronulla-Sutherland Sharks", "Gold Coast Titans", "Manly-Warringah Sea Eagles",
  "Melbourne Storm", "New Zealand Warriors", "Newcastle Knights",
  "North Queensland Cowboys", "Parramatta Eels", "Penrith Panthers",
  "South Sydney Rabbitohs", "St George Illawarra Dragons",
  "Sydney Roosters", "Wests Tigers", "Dolphins",
];

const CATEGORIES: Array<{ value: Category; label: string; Icon: any }> = [
  { value: "club",       label: "Club / Recruitment", Icon: Trophy },
  { value: "commercial", label: "Commercial",         Icon: Briefcase },
  { value: "media",      label: "Media / PR",         Icon: MicIcon },
  { value: "general",    label: "General",            Icon: MessageCircle },
];

const CONV_TYPES_BY_CATEGORY: Record<Category, Array<{ value: string; label: string }>> = {
  club: [
    { value: "recruitment",   label: "Recruitment / Pathways" },
    { value: "trial",         label: "Trial" },
    { value: "contract",      label: "Contract talk" },
    { value: "welfare_check", label: "Welfare check" },
    { value: "general",       label: "General" },
  ],
  commercial: [
    { value: "new_opportunity", label: "New opportunity" },
    { value: "negotiation",     label: "Negotiation" },
    { value: "deal_signed",     label: "Deal signed" },
    { value: "renewal",         label: "Renewal" },
    { value: "activation",      label: "Activation / appearance" },
    { value: "declined",        label: "Declined" },
  ],
  media: [
    { value: "interview",  label: "Interview request" },
    { value: "feature",    label: "Feature" },
    { value: "podcast",    label: "Podcast" },
    { value: "social",     label: "Social / content" },
    { value: "crisis",     label: "Issue / crisis" },
    { value: "general",    label: "General" },
  ],
  general: [
    { value: "catch_up",  label: "Catch-up" },
    { value: "welfare",   label: "Welfare" },
    { value: "family",    label: "Family" },
    { value: "education", label: "Education" },
    { value: "admin",     label: "Admin" },
    { value: "other",     label: "Other" },
  ],
};

const COUNTERPARTY_CONFIG: Record<Category, { label: string; placeholder: string }> = {
  club:       { label: "Club",                 placeholder: "Select a club…" },
  commercial: { label: "Brand / company",      placeholder: "e.g. ASICS, Gatorade ANZ" },
  media:      { label: "Outlet / journalist",  placeholder: "e.g. Fox League — Lara Pitt" },
  general:    { label: "Who with (optional)",  placeholder: "e.g. Athlete's father, School coach" },
};

const NOTES_PLACEHOLDER: Record<Category, string> = {
  club:       "What did the club say? Interest level? Specific feedback?",
  commercial: "What's the deal? Numbers discussed, deliverables, timing?",
  media:      "What's the opportunity? Format, audience, date, any prep needed?",
  general:    "What was discussed? Anything to track or follow up?",
};

type FollowUpPreset = "none" | "2w" | "4w" | "8w" | "custom";

const FOLLOW_UP_PRESETS: Array<{ value: FollowUpPreset; label: string }> = [
  { value: "none",   label: "No reminder" },
  { value: "2w",     label: "2 weeks" },
  { value: "4w",     label: "4 weeks" },
  { value: "8w",     label: "8 weeks" },
  { value: "custom", label: "Custom date" },
];

function presetToDate(preset: FollowUpPreset, custom: string | null): string | null {
  if (preset === "none") return null;
  if (preset === "custom") return custom || null;
  const d = new Date();
  const days = preset === "2w" ? 14 : preset === "4w" ? 28 : 56;
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

interface Props {
  athlete: Athlete;
  onSaved?: () => void;
}

export default function ClubConversationLogger({ athlete, onSaved }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [category, setCategory] = useState<Category>("club");

  // Club selector state (kept exactly like before for the club category)
  const [clubName, setClubName] = useState("");
  const [customClub, setCustomClub] = useState("");
  // Free-text counterparty for commercial / media / general
  const [counterpartyText, setCounterpartyText] = useState("");

  const [convType, setConvType] = useState<string>("recruitment");
  const [notes, setNotes] = useState("");
  const [outcome, setOutcome] = useState("");

  // Follow-up reminder
  const [followUpPreset, setFollowUpPreset] = useState<FollowUpPreset>("8w");
  const [followUpCustom, setFollowUpCustom] = useState<string>("");

  // Audience for the AI update email
  const [audience, setAudience] = useState<Audience>("athlete");

  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);
  const isRecordingRef = useRef(false);
  const finalTranscriptRef = useRef("");

  const [saving, setSaving] = useState(false);
  const [generatingEmail, setGeneratingEmail] = useState(false);
  const [saved, setSaved] = useState(false);
  const [emailDraft, setEmailDraft] = useState<string | null>(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [savedRecord, setSavedRecord] = useState<{ counterparty: string } | null>(null);

  const convTypeOptions = CONV_TYPES_BY_CATEGORY[category];
  const counterpartyConfig = COUNTERPARTY_CONFIG[category];

  const effectiveClub = clubName === "__custom__" ? customClub : clubName;
  const counterpartyValue = category === "club" ? effectiveClub : counterpartyText;

  const handleCategoryChange = (next: Category) => {
    setCategory(next);
    // Reset conv type to first option of the new category
    const firstType = CONV_TYPES_BY_CATEGORY[next][0]?.value || "general";
    setConvType(firstType);
    // Sensible follow-up + audience defaults per category
    setFollowUpPreset(next === "club" ? "8w" : "none");
    setAudience(next === "club" ? "athlete" : "skip");
  };

  const startRecording = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast.error("Speech recognition not supported — try Chrome.");
      return;
    }

    const makeRecognition = () => {
      const r = new SR();
      r.continuous = true;
      r.interimResults = true;
      r.lang = "en-AU";
      r.maxAlternatives = 3;

      r.onresult = (e: any) => {
        let final = "";
        let interim = "";
        for (let i = 0; i < e.results.length; i++) {
          let best = "";
          let bestConf = 0;
          for (let j = 0; j < e.results[i].length; j++) {
            if (e.results[i][j].confidence > bestConf) {
              bestConf = e.results[i][j].confidence;
              best = e.results[i][j].transcript;
            }
          }
          if (e.results[i].isFinal) final += best + " ";
          else interim += best;
        }
        finalTranscriptRef.current = final;
        setNotes(final.trim() + (interim ? " " + interim : ""));
      };

      r.onerror = (e: any) => {
        if (["no-speech", "aborted", "network"].includes(e.error)) {
          if (isRecordingRef.current) {
            setTimeout(() => {
              if (isRecordingRef.current) {
                try { const nr = makeRecognition(); nr.start(); recognitionRef.current = nr; } catch {}
              }
            }, 300);
          }
          return;
        }
        toast.error(`Microphone error: ${e.error}`);
        isRecordingRef.current = false;
        setIsRecording(false);
      };

      r.onend = () => {
        if (isRecordingRef.current) {
          setTimeout(() => {
            if (isRecordingRef.current) {
              try { const nr = makeRecognition(); nr.start(); recognitionRef.current = nr; } catch {}
            }
          }, 100);
        }
      };
      return r;
    };

    finalTranscriptRef.current = "";
    const recognition = makeRecognition();
    recognition.start();
    recognitionRef.current = recognition;
    isRecordingRef.current = true;
    setIsRecording(true);
    toast.success("Recording — speak your summary now");
  }, []);

  const stopRecording = useCallback(() => {
    isRecordingRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (finalTranscriptRef.current.trim()) {
      setNotes(finalTranscriptRef.current.trim());
    }
    setIsRecording(false);
    finalTranscriptRef.current = "";
  }, []);

  const validate = (): string | null => {
    if (category === "club" && !effectiveClub.trim()) return "Please select or enter a club name.";
    if (!notes.trim()) return "Please add a voice note or type some notes.";
    if (followUpPreset === "custom" && !followUpCustom) return "Please pick a custom follow-up date.";
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) { toast.error(err); return; }

    setSaving(true);
    const convLabel = convTypeOptions.find(t => t.value === convType)?.label || convType;
    const categoryLabel = CATEGORIES.find(c => c.value === category)?.label || category;
    const cpDisplay = counterpartyValue.trim() || "(no name)";
    const summaryText = `${categoryLabel} — ${cpDisplay} (${convLabel})`;
    const followUpAt = presetToDate(followUpPreset, followUpCustom);

    const { error } = await supabase.from("call_history").insert({
      athlete_id: athlete.id,
      // Keep call_type='club_conversation' so existing alerts + filters still work.
      // Category column is what really drives behaviour going forward.
      call_type: "club_conversation" as any,
      summary: summaryText,
      detailed_notes: notes.trim(),
      outcome: outcome.trim() || null,
      conducted_by: user?.id ?? null,
      follow_up_required: !!followUpAt,
      parent_involved: audience === "parent",
      // new columns
      conversation_category: category,
      counterparty_name: counterpartyValue.trim() || null,
      follow_up_at: followUpAt,
      email_audience: audience,
    } as any);

    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setSavedRecord({ counterparty: counterpartyValue.trim() });
    qc.invalidateQueries({ queryKey: ["call_history", athlete.id] });
    setSaved(true);
    onSaved?.();

    if (audience === "skip") {
      toast.success("Conversation saved to athlete file.");
      return;
    }

    toast.success(`Saved — generating ${audience} email…`);
    await handleGenerateEmail();
    qc.invalidateQueries({ queryKey: ["comms_history", athlete.id] });
  };

  const handleGenerateEmail = async () => {
    if (!notes.trim()) {
      toast.error("Save the conversation first, then generate the email.");
      return;
    }
    if (audience === "skip") return;

    setGeneratingEmail(true);
    const firstName = athlete.name.split(" ")[0];
    const convLabel = convTypeOptions.find(t => t.value === convType)?.label || convType;
    let parentName: string | null = null;
    if (audience === "parent") {
      const { data: g } = await supabase
        .from("guardians")
        .select("parent_name")
        .eq("athlete_id", athlete.id)
        .maybeSingle();
      parentName = (g as any)?.parent_name || athlete.parentName || null;
    }

    try {
      const { data, error } = await supabase.functions.invoke("generate-email", {
        body: {
          type: "conversation_update",
          category,
          audience,
          athleteFirstName: firstName,
          parentName,
          counterparty: counterpartyValue.trim() || null,
          clubName: category === "club" ? effectiveClub : null,
          conversationType: convLabel,
          agentNotes: notes.trim(),
          outcome: outcome.trim() || null,
          agentName: (user as any)?.user_metadata?.display_name || user?.email || "Your TGI Sport Manager",
        },
      });

      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      const fallbackSubject =
        category === "club"       ? `Club update — ${firstName}` :
        category === "commercial" ? `Commercial update — ${firstName}` :
        category === "media"      ? `Media opportunity — ${firstName}` :
                                    `Quick update — ${firstName}`;
      const subject = (data as any)?.email?.subject || fallbackSubject;
      const body = (data as any)?.email?.body || (data as any)?.raw_text || "";

      setEmailSubject(subject);
      setEmailDraft(body);

      await saveCommsEmail({
        athleteId: athlete.id,
        emailType: audience === "parent" ? "parent" : "athlete",
        subject,
        body,
        generatedFrom: `conversation_${category}`,
        createdBy: user?.id,
      });

      toast.success(`${audience === "parent" ? "Parent" : "Athlete"} email generated and saved to Comms History.`);
    } catch (e: any) {
      toast.error(e.message || "Failed to generate email.");
    } finally {
      setGeneratingEmail(false);
    }
  };

  const handleCopyEmail = () => {
    if (!emailDraft) return;
    const text = `Subject: ${emailSubject}\n\n${emailDraft}`;
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard — paste into your email client.");
  };

  const handleReset = () => {
    setCategory("club");
    setClubName("");
    setCustomClub("");
    setCounterpartyText("");
    setConvType("recruitment");
    setNotes("");
    setOutcome("");
    setFollowUpPreset("8w");
    setFollowUpCustom("");
    setAudience("athlete");
    setSaved(false);
    setEmailDraft(null);
    setEmailSubject("");
    setSavedRecord(null);
  };

  const audienceOptions: Array<{ value: Audience; label: string }> = [
    { value: "athlete", label: "Athlete" },
    { value: "parent",  label: "Parent" },
    { value: "skip",    label: "Skip" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquarePlus className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm">Log Conversation</h3>
      </div>

      {/* Category pills */}
      <div>
        <Label className="text-xs mb-1.5 block">Category</Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {CATEGORIES.map(({ value, label, Icon }) => {
            const selected = category === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => handleCategoryChange(value)}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-md border px-2 py-2 text-xs font-medium transition",
                  selected
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-background hover:bg-muted text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="truncate">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">{counterpartyConfig.label}</Label>
          {category === "club" ? (
            <>
              <Select value={clubName} onValueChange={setClubName}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder={counterpartyConfig.placeholder} />
                </SelectTrigger>
                <SelectContent>
                  {NRL_CLUBS.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                  <SelectItem value="__custom__">Other / type club name…</SelectItem>
                </SelectContent>
              </Select>
              {clubName === "__custom__" && (
                <Input
                  className="h-9 text-sm mt-2"
                  placeholder="Type club name"
                  value={customClub}
                  onChange={e => setCustomClub(e.target.value)}
                />
              )}
            </>
          ) : (
            <Input
              className="h-9 text-sm"
              placeholder={counterpartyConfig.placeholder}
              value={counterpartyText}
              onChange={e => setCounterpartyText(e.target.value)}
            />
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Conversation type</Label>
          <Select value={convType} onValueChange={setConvType}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {convTypeOptions.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-xs">
            Voice note / notes
            <span className="text-muted-foreground ml-1 font-normal">(speak after hanging up, or type)</span>
          </Label>
          <Button
            type="button"
            size="sm"
            variant={isRecording ? "destructive" : "outline"}
            className="h-8 text-xs gap-1.5"
            onClick={isRecording ? stopRecording : startRecording}
          >
            {isRecording ? (
              <><Square className="h-3.5 w-3.5" /> Stop recording</>
            ) : (
              <><Mic className="h-3.5 w-3.5" /> Record voice note</>
            )}
          </Button>
        </div>
        {isRecording && (
          <div className="flex items-center gap-2 text-xs text-red-500">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            Recording — speak your summary of the conversation
          </div>
        )}
        <Textarea
          className="text-sm min-h-[120px]"
          placeholder={NOTES_PLACEHOLDER[category]}
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">
          Outcome / next steps
          <span className="text-muted-foreground ml-1 font-normal">(optional)</span>
        </Label>
        <Input
          className="h-9 text-sm"
          placeholder="e.g. Trial invitation in July, follow up in 4 weeks, contract offer coming"
          value={outcome}
          onChange={e => setOutcome(e.target.value)}
        />
      </div>

      {/* Follow-up reminder */}
      <div className="space-y-1.5">
        <Label className="text-xs">Follow-up reminder</Label>
        <div className="flex flex-wrap gap-2">
          {FOLLOW_UP_PRESETS.map(p => {
            const selected = followUpPreset === p.value;
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => setFollowUpPreset(p.value)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-xs font-medium transition",
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:bg-muted"
                )}
              >
                {p.label}
              </button>
            );
          })}
        </div>
        {followUpPreset === "custom" && (
          <Input
            type="date"
            className="h-9 text-sm mt-1 w-fit"
            value={followUpCustom}
            onChange={e => setFollowUpCustom(e.target.value)}
          />
        )}
      </div>

      {/* Audience toggle for AI update email */}
      <div className="space-y-1.5">
        <Label className="text-xs">
          Generate update email for
          <span className="text-muted-foreground ml-1 font-normal">(optional)</span>
        </Label>
        <div className="flex flex-wrap gap-2">
          {audienceOptions.map(a => {
            const selected = audience === a.value;
            return (
              <button
                key={a.value}
                type="button"
                onClick={() => setAudience(a.value)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-xs font-medium transition",
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:bg-muted"
                )}
              >
                {a.label}
              </button>
            );
          })}
        </div>
      </div>

      {!saved ? (
        <Button
          className="w-full h-10 gap-2"
          onClick={handleSave}
          disabled={
            saving ||
            !notes.trim() ||
            (category === "club" && !effectiveClub.trim())
          }
        >
          {saving ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
          ) : (
            <><MessageSquarePlus className="h-4 w-4" /> Save to athlete file</>
          )}
        </Button>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
            <CheckCircle2 className="h-4 w-4" />
            Saved to {athlete.name}'s file
          </div>

          {audience === "skip" ? (
            <Button variant="outline" className="w-full h-10" onClick={handleReset}>
              Log another conversation
            </Button>
          ) : !emailDraft ? (
            <Button
              variant="outline"
              className="w-full h-10 gap-2"
              onClick={handleGenerateEmail}
              disabled={generatingEmail}
            >
              {generatingEmail ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Generating email…</>
              ) : (
                `Generate ${audience} email from this conversation`
              )}
            </Button>
          ) : (
            <div className="space-y-2">
              <div className="rounded-lg border bg-muted/40 p-3 space-y-1.5">
                <div className="text-xs font-medium text-muted-foreground">
                  Subject: {emailSubject}
                </div>
                <div className="text-sm whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {emailDraft}
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="h-8 text-xs flex-1" onClick={handleCopyEmail}>
                  Copy email
                </Button>
                <Button size="sm" variant="outline" className="h-8 text-xs flex-1" onClick={handleReset}>
                  Log another conversation
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
