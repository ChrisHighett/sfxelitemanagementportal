import React, { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { publishToTracker } from "@/lib/tracker-publish";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Phone, PhoneOff, ChevronLeft, ChevronRight, Sparkles,
  Mail, ClipboardList, CheckSquare, Loader2, Clock, Mic, MicOff, Square, BookOpen
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { type Athlete } from "@/hooks/usePortalData";

const SECTIONS = [
  {
    key: "opener",
    title: "Warm Opener",
    icon: "👋",
    prompt: "How's everything been going — footy, school, life?",
    tips: ["How has training been?", "How are you feeling physically?", "How's school?"],
  },
  {
    key: "performance",
    title: "Performance",
    icon: "⚽",
    prompt: "What have you been most happy with in your game recently?",
    tips: ["Biggest challenge at training?", "What feedback from coaches?", "One thing to improve?"],
  },
  {
    key: "lifestyle",
    title: "Lifestyle",
    icon: "🏠",
    prompt: "How has your sleep, recovery, and eating been?",
    tips: ["Sleep before 10:30pm?", "Hydration?", "Recovery routines?"],
  },
  {
    key: "personal",
    title: "Personal",
    icon: "💪",
    prompt: "How are you feeling confidence-wise? Enjoying the team?",
    tips: ["Speaking up more at training?", "Mindset and motivation?"],
  },
  {
    key: "education",
    title: "Education",
    icon: "📚",
    prompt: "How's school going? Any exams or assignments coming up?",
    tips: ["Managing workload OK?", "Support needed?"],
  },
  {
    key: "brand",
    title: "Brand",
    icon: "📱",
    prompt: "Posted anything recently? What kind of content do you share?",
    tips: ["Any negative experiences online?", "Building reputation?"],
  },
  {
    key: "goals",
    title: "Goals",
    icon: "🎯",
    prompt: "What are three things you'd like to improve before we talk next?",
    tips: ["Bronco time?", "Sleep routine?", "Be more vocal at training?"],
  },
] as const;

type SectionKey = (typeof SECTIONS)[number]["key"];

interface MobileCallScreenProps {
  athlete: Athlete;
  onClose: () => void;
  onCreateEmail: (type: "athlete" | "parent", notes: Record<SectionKey, string>) => void;
  onReviewPublished?: () => void;
}

export default function MobileCallScreen({ athlete, onClose, onCreateEmail, onReviewPublished }: MobileCallScreenProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<"calling" | "saving" | "done">("calling");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [sectionNotes, setSectionNotes] = useState<Record<string, string>>(
    Object.fromEntries(SECTIONS.map((s) => [s.key, ""]))
  );
  const [callStart] = useState(() => new Date());
  const [isSaving, setIsSaving] = useState(false);
  const [savedCallId, setSavedCallId] = useState<string | null>(null);
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  // Publish to monthly review state
  const [isPublishing, setIsPublishing] = useState(false);
  const [wellbeingScore, setWellbeingScore] = useState<number | null>(null);
  const [attentionRequired, setAttentionRequired] = useState(false);
  const [reviewPublished, setReviewPublished] = useState(false);

  // Voice recording state (per-section)
  const [recordingSection, setRecordingSection] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const isRecordingRef = useRef(false);
  const finalTranscriptRef = useRef("");
  const baseNotesRef = useRef(""); // snapshot of notes when recording started

  // AI auto-fill state
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const aiSummaryRef = useRef<any>(null); // stores the raw AI structured summary

  const section = SECTIONS[currentIdx];
  const progress = ((currentIdx + 1) / SECTIONS.length) * 100;
  const filledSections = SECTIONS.filter((s) => sectionNotes[s.key].trim().length > 0).length;
  const elapsed = Math.floor((Date.now() - callStart.getTime()) / 60000);

  const updateNote = useCallback((key: string, value: string) => {
    setSectionNotes((prev) => ({ ...prev, [key]: value }));
  }, []);

  const goNext = () => {
    stopSectionRecording();
    if (currentIdx < SECTIONS.length - 1) setCurrentIdx((i) => i + 1);
  };
  const goBack = () => {
    stopSectionRecording();
    if (currentIdx > 0) setCurrentIdx((i) => i - 1);
  };

  // ── Per-section voice recording ──
  const startSectionRecording = useCallback((sectionKey: string) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Speech recognition not supported. Try Chrome.");
      return;
    }

    // Stop any existing recording first
    if (isRecordingRef.current) {
      stopSectionRecording();
    }

    const createRecognition = () => {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-AU";
      recognition.maxAlternatives = 3;

      recognition.onresult = (event: any) => {
        let fullFinal = "";
        let interim = "";
        for (let i = 0; i < event.results.length; i++) {
          let best = ""; let bestConf = 0;
          for (let j = 0; j < event.results[i].length; j++) {
            if (event.results[i][j].confidence > bestConf) {
              bestConf = event.results[i][j].confidence;
              best = event.results[i][j].transcript;
            }
          }
          if (event.results[i].isFinal) {
            fullFinal += best + " ";
          } else {
            interim += best;
          }
        }
        finalTranscriptRef.current = fullFinal;
        // Replace section notes with: base (before recording) + final transcript + interim
        const base = baseNotesRef.current;
        const separator = base && !base.endsWith("\n") && !base.endsWith(" ") ? " " : "";
        const newValue = base + separator + (fullFinal.trim() + (interim ? " " + interim : "")).trim();
        setSectionNotes(prev => ({
          ...prev,
          [sectionKey]: newValue,
        }));
      };

      recognition.onerror = (event: any) => {
        if (event.error === "no-speech" || event.error === "aborted" || event.error === "network") {
          if (isRecordingRef.current) {
            setTimeout(() => {
              if (isRecordingRef.current) {
                try { const r = createRecognition(); r.start(); recognitionRef.current = r; } catch {}
              }
            }, 300);
          }
          return;
        }
        toast.error(`Microphone error: ${event.error}`);
        isRecordingRef.current = false;
        setRecordingSection(null);
      };

      recognition.onend = () => {
        if (isRecordingRef.current) {
          setTimeout(() => {
            if (isRecordingRef.current) {
              try { const r = createRecognition(); r.start(); recognitionRef.current = r; } catch {}
            }
          }, 100);
        }
      };
      return recognition;
    };

    finalTranscriptRef.current = "";
    baseNotesRef.current = sectionNotes[sectionKey] || "";
    const recognition = createRecognition();
    recognition.start();
    recognitionRef.current = recognition;
    isRecordingRef.current = true;
    setRecordingSection(sectionKey);
    toast.success("Recording — speak now");
  }, [sectionNotes]);

  const stopSectionRecording = useCallback(() => {
    if (!isRecordingRef.current) return;
    isRecordingRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    // Final state is already set by onresult — just set the clean final value
    if (finalTranscriptRef.current.trim() && recordingSection) {
      const base = baseNotesRef.current;
      const separator = base && !base.endsWith("\n") && !base.endsWith(" ") ? " " : "";
      setSectionNotes(prev => ({
        ...prev,
        [recordingSection]: (base + separator + finalTranscriptRef.current.trim()).trim(),
      }));
    }
    finalTranscriptRef.current = "";
    baseNotesRef.current = "";
    setRecordingSection(null);
  }, [recordingSection]);

  // ── AI Auto-Fill: send all notes through summarise-call ──
  const aiAutoFill = useCallback(async () => {
    const combinedNotes = SECTIONS
      .map(s => sectionNotes[s.key]?.trim() ? `${s.title}: ${sectionNotes[s.key].trim()}` : null)
      .filter(Boolean)
      .join("\n\n");

    if (!combinedNotes) {
      toast.error("Add some notes first — type or speak into at least one section");
      return;
    }

    setIsAutoFilling(true);
    try {
      const { data, error } = await supabase.functions.invoke("summarise-call", {
        body: {
          transcript: combinedNotes,
          athleteName: athlete.name,
          athleteStage: athlete.stage,
          callType: "monthly_review",
          callDate: new Date().toISOString().slice(0, 10),
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.raw_text) {
        toast.info("AI returned unstructured text — added to Performance notes");
        setSectionNotes(prev => ({ ...prev, performance: data.raw_text }));
      } else if (data?.summary) {
        const s = data.summary;
        aiSummaryRef.current = s; // preserve structured AI summary for publishing
        if (s.attention_required) setAttentionRequired(true);
        setSectionNotes(prev => ({
          ...prev,
          opener: s.warm_opener || prev.opener || "",
          performance: s.performance || prev.performance || "",
          lifestyle: s.lifestyle || prev.lifestyle || "",
          personal: s.personal || prev.personal || "",
          education: s.education || prev.education || "",
          brand: s.brand || prev.brand || "",
          goals: [
            s.goals || "",
            ...(s.suggested_goals || []),
            s.suggested_focus_next_month ? `Focus: ${s.suggested_focus_next_month}` : "",
          ].filter(Boolean).join("\n") || prev.goals || "",
        }));
        toast.success("AI auto-filled all sections");
      }
    } catch (e: any) {
      console.error("AI auto-fill error:", e);
      toast.error(e.message || "AI auto-fill failed");
    } finally {
      setIsAutoFilling(false);
    }
  }, [sectionNotes, athlete.name, athlete.stage]);

  const endCallAndSave = useCallback(async () => {
    stopSectionRecording();
    setStep("saving");
    setIsSaving(true);

    const durationMinutes = Math.max(1, Math.round((Date.now() - callStart.getTime()) / 60000));
    const allNotes = SECTIONS.map((s) =>
      sectionNotes[s.key].trim() ? `**${s.title}:** ${sectionNotes[s.key].trim()}` : null
    ).filter(Boolean).join("\n\n");

    const summary = allNotes || "Call completed — no notes recorded.";

    try {
      const { data, error } = await supabase
        .from("call_history")
        .insert({
          athlete_id: athlete.id,
          call_type: "monthly_review" as const,
          summary,
          detailed_notes: allNotes || null,
          duration_minutes: durationMinutes,
          conducted_by: user?.id ?? null,
          follow_up_required: false,
          parent_involved: false,
          ai_summary_json: aiSummaryRef.current || null,
        })
        .select("id")
        .single();

      if (error) throw error;
      setSavedCallId(data.id);
      setStep("done");
      toast.success("Call saved successfully");
    } catch (e: any) {
      console.error("Save call error:", e);
      toast.error(e.message || "Failed to save call");
      setStep("calling");
    } finally {
      setIsSaving(false);
    }
  }, [athlete.id, callStart, sectionNotes, user?.id, stopSectionRecording]);

  // ── Publish approved summary to monthly_reviews (upsert) ──
  const publishToMonthlyReview = useCallback(async () => {
    if (wellbeingScore === null) {
      toast.error("Please select a wellbeing score before publishing");
      return;
    }

    setIsPublishing(true);
    try {
      const reviewMonth = new Date().toISOString().slice(0, 7) + "-01"; // e.g. "2026-03-01"

      // Check if a review already exists for this athlete + month
      const { data: existing, error: fetchErr } = await supabase
        .from("monthly_reviews")
        .select("id")
        .eq("athlete_id", athlete.id)
        .eq("review_month", reviewMonth)
        .maybeSingle();

      if (fetchErr) throw fetchErr;

      const aiData = aiSummaryRef.current;
      const durationMinutes = Math.max(1, Math.round((Date.now() - callStart.getTime()) / 60000));

      // Build goals array from AI summary or section notes
      const goalsArray: string[] = [];
      if (aiData?.suggested_goals && Array.isArray(aiData.suggested_goals)) {
        goalsArray.push(...aiData.suggested_goals);
      }

      const reviewPayload = {
        athlete_id: athlete.id,
        review_month: reviewMonth,
        performance_notes: sectionNotes.performance || null,
        lifestyle_notes: sectionNotes.lifestyle || null,
        personal_notes: sectionNotes.personal || null,
        education_notes: sectionNotes.education || null,
        brand_notes: sectionNotes.brand || null,
        focus_next_month: aiData?.suggested_focus_next_month || sectionNotes.goals || null,
        goals: goalsArray.length > 0 ? goalsArray : [],
        attention_required: attentionRequired,
        wellbeing_score: wellbeingScore,
        call_date: new Date().toISOString().slice(0, 10),
        call_duration: `${durationMinutes} min`,
        training_highlights: aiData?.performance || sectionNotes.performance || null,
        areas_for_improvement: aiData?.attention_reason || null,
        football_goal: goalsArray[0] || null,
        personal_goal: goalsArray[1] || null,
        school_life_goal: goalsArray[2] || null,
        parent_engagement_notes: aiData?.parent_email_summary_points?.join("; ") || null,
        follow_up_actions: aiData?.suggested_focus_next_month || null,
        created_by: user?.id ?? null,
      };

      if (existing?.id) {
        // Update existing review
        const { error } = await supabase
          .from("monthly_reviews")
          .update(reviewPayload)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        // Create new review
        const { error } = await supabase
          .from("monthly_reviews")
          .insert(reviewPayload);
        if (error) throw error;
      }

      // Invalidate all relevant queries to refresh views
      queryClient.invalidateQueries({ queryKey: ["monthly_reviews"] });
      queryClient.invalidateQueries({ queryKey: ["athletes"] });
      queryClient.invalidateQueries({ queryKey: ["athlete_scorecards"] });
      queryClient.invalidateQueries({ queryKey: ["athlete_alerts"] });
      queryClient.invalidateQueries({ queryKey: ["v_athlete_score_trends"] });
      queryClient.invalidateQueries({ queryKey: ["v_athlete_wellbeing_trends"] });
      queryClient.invalidateQueries({ queryKey: ["call_history"] });

      setReviewPublished(true);
      onReviewPublished?.();
      toast.success("Monthly review published successfully");
    } catch (e: any) {
      console.error("Publish monthly review error:", e);
      toast.error(e.message || "Failed to publish monthly review — your summary is preserved, try again");
    } finally {
      setIsPublishing(false);
    }
  }, [athlete.id, sectionNotes, wellbeingScore, attentionRequired, user?.id, queryClient, onReviewPublished, callStart]);

  // POST-CALL ACTIONS screen
  if (step === "done") {
    return (
      <div className="flex flex-col min-h-[calc(100vh-120px)] md:min-h-0 p-3 md:p-6">
        <div className="flex-1 space-y-4 max-w-lg mx-auto w-full">
          <div className="text-center space-y-2 py-4">
            <div className="text-4xl">✅</div>
            <h2 className="text-xl font-bold">Call Complete</h2>
            <p className="text-sm text-muted-foreground">
              {athlete.name} — {elapsed} min • {filledSections}/{SECTIONS.length} sections noted
            </p>
          </div>

          {/* Publish to Development Tracker section */}
          <Card className={reviewPublished ? "border-green-500/50 bg-green-500/5" : "border-primary/30"}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Publish to Development Tracker
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {reviewPublished ? (
                <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                  ✅ Monthly review published successfully
                </div>
              ) : (
                <>
                  {/* Wellbeing score selector */}
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">Wellbeing Score:</span>
                    <Select
                      value={wellbeingScore !== null ? String(wellbeingScore) : ""}
                      onValueChange={(v) => setWellbeingScore(Number(v))}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <SelectItem key={n} value={String(n)}>{n}/5</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {wellbeingScore === null && (
                      <span className="text-xs text-destructive">Required</span>
                    )}
                  </div>

                  {/* Attention required toggle */}
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">Attention Required:</span>
                    <Switch
                      checked={attentionRequired}
                      onCheckedChange={setAttentionRequired}
                    />
                    <Badge variant={attentionRequired ? "destructive" : "secondary"}>
                      {attentionRequired ? "Yes" : "No"}
                    </Badge>
                  </div>

                  {/* Summary preview */}
                  <div className="rounded-md bg-muted/50 p-3 space-y-1 text-xs max-h-32 overflow-y-auto">
                    {SECTIONS.filter(s => sectionNotes[s.key]?.trim()).map(s => (
                      <div key={s.key}>
                        <span className="font-medium">{s.title}:</span>{" "}
                        <span className="text-muted-foreground">{sectionNotes[s.key].slice(0, 80)}...</span>
                      </div>
                    ))}
                  </div>

                  <Button
                    className="w-full h-12 text-base gap-2"
                    onClick={publishToMonthlyReview}
                    disabled={isPublishing}
                  >
                    {isPublishing ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <ClipboardList className="h-5 w-5" />
                    )}
                    {isPublishing ? "Publishing..." : "Publish to Monthly Review"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Other Actions</h3>

            <Button
              className="w-full h-14 text-base gap-3 justify-start"
              onClick={() => onCreateEmail("athlete", sectionNotes as Record<SectionKey, string>)}
            >
              <Mail className="h-5 w-5" /> Generate Athlete Email
            </Button>

            <Button
              className="w-full h-14 text-base gap-3 justify-start"
              variant="secondary"
              onClick={() => onCreateEmail("parent", sectionNotes as Record<SectionKey, string>)}
            >
              <Mail className="h-5 w-5" /> Generate Parent Email
            </Button>

            <Button
              className="w-full h-14 text-base gap-3 justify-start"
              variant="secondary"
              onClick={() => {
                toast.info("Navigate to Tasks to create a follow-up");
                onClose();
              }}
            >
              <CheckSquare className="h-5 w-5" /> Create Task
            </Button>
          </div>

          <Button
            variant="outline"
            className="w-full h-12 mt-4"
            onClick={onClose}
          >
            Done — Return to Athlete Comms
          </Button>
        </div>
      </div>
    );
  }

  // SAVING overlay
  if (step === "saving") {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-120px)] md:min-h-[400px]">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Saving call to history...</p>
        </div>
      </div>
    );
  }

  // ACTIVE CALL screen
  const isCurrentSectionRecording = recordingSection === section.key;

  return (
    <div className="flex flex-col min-h-[calc(100vh-120px)] md:min-h-0">
      {/* Header bar */}
      <div className="sticky top-0 z-10 bg-card border-b border-border px-3 py-2 md:px-6 md:py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-2 w-2 rounded-full bg-destructive animate-pulse flex-shrink-0" />
            <span className="text-sm font-medium truncate">{athlete.name}</span>
            <Badge variant="outline" className="text-xs flex-shrink-0 gap-1">
              <Clock className="h-3 w-3" /> {elapsed}m
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-9 flex-shrink-0"
              onClick={aiAutoFill}
              disabled={isAutoFilling}
            >
              {isAutoFilling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              <span className="hidden sm:inline">{isAutoFilling ? "Filling..." : "AI Auto-Fill"}</span>
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="gap-1.5 h-9 flex-shrink-0"
              onClick={endCallAndSave}
            >
              <PhoneOff className="h-4 w-4" />
              <span className="hidden sm:inline">End Call & Save</span>
              <span className="sm:hidden">End</span>
            </Button>
          </div>
        </div>
        <Progress value={progress} className="h-1.5 mt-2" />
        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] text-muted-foreground">
            {currentIdx + 1} of {SECTIONS.length}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {filledSections} noted
          </span>
        </div>
      </div>

      {/* Section content */}
      <div className="flex-1 p-3 md:p-6 space-y-3 md:space-y-4 max-w-lg mx-auto w-full">
        {/* Section header */}
        <div className="flex items-center gap-3">
          <span className="text-2xl">{section.icon}</span>
          <div className="flex-1">
            <h2 className="text-lg font-bold">{section.title}</h2>
            <p className="text-xs text-muted-foreground">Step {currentIdx + 1} of {SECTIONS.length}</p>
          </div>
          {/* Per-section mic button */}
          <Button
            variant={isCurrentSectionRecording ? "destructive" : "outline"}
            size="sm"
            className="gap-1.5 h-10 px-3"
            onClick={() => {
              if (isCurrentSectionRecording) {
                stopSectionRecording();
              } else {
                startSectionRecording(section.key);
              }
            }}
          >
            {isCurrentSectionRecording ? (
              <>
                <Square className="h-4 w-4" />
                <span className="text-xs">Stop</span>
              </>
            ) : (
              <>
                <Mic className="h-4 w-4" />
                <span className="text-xs">Speak</span>
              </>
            )}
          </Button>
        </div>

        {/* Recording indicator */}
        {isCurrentSectionRecording && (
          <div className="flex items-center gap-2 text-sm text-destructive px-1">
            <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
            Listening — speak your notes for {section.title.toLowerCase()}...
          </div>
        )}

        {/* Prompt card */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-3 md:p-4">
            <p className="text-sm font-medium italic">"{section.prompt}"</p>
          </CardContent>
        </Card>

        {/* Quick tips */}
        <div className="flex flex-wrap gap-1.5">
          {section.tips.map((tip, i) => (
            <button
              key={i}
              className="text-xs bg-secondary text-secondary-foreground px-2.5 py-1.5 rounded-full hover:bg-secondary/80 transition-colors active:scale-95"
              onClick={() => {
                const current = sectionNotes[section.key];
                const bullet = `• ${tip}`;
                updateNote(section.key, current ? `${current}\n${bullet}` : bullet);
                textareaRefs.current[section.key]?.focus();
              }}
            >
              + {tip}
            </button>
          ))}
        </div>

        {/* Notes input */}
        <Textarea
          ref={(el) => { textareaRefs.current[section.key] = el; }}
          value={sectionNotes[section.key]}
          onChange={(e) => updateNote(section.key, e.target.value)}
          placeholder={`Notes for ${section.title.toLowerCase()}... (type or tap Speak)`}
          className="min-h-[120px] md:min-h-[140px] text-base resize-none"
        />

        {/* Section dots - visual indicator */}
        <div className="flex items-center justify-center gap-1.5 py-1">
          {SECTIONS.map((s, i) => (
            <button
              key={s.key}
              className={`h-2.5 rounded-full transition-all ${
                i === currentIdx
                  ? "w-6 bg-primary"
                  : sectionNotes[s.key].trim()
                  ? "w-2.5 bg-primary/50"
                  : "w-2.5 bg-muted-foreground/20"
              }`}
              onClick={() => { stopSectionRecording(); setCurrentIdx(i); }}
            />
          ))}
        </div>
      </div>

      {/* Bottom navigation - sticky */}
      <div className="sticky bottom-0 bg-card border-t border-border px-3 py-3 md:px-6" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <Button
            variant="outline"
            className="h-12 flex-1 gap-2 text-base"
            onClick={goBack}
            disabled={currentIdx === 0}
          >
            <ChevronLeft className="h-5 w-5" /> Back
          </Button>
          {currentIdx < SECTIONS.length - 1 ? (
            <Button
              className="h-12 flex-1 gap-2 text-base"
              onClick={goNext}
            >
              Next <ChevronRight className="h-5 w-5" />
            </Button>
          ) : (
            <Button
              className="h-12 flex-1 gap-2 text-base"
              variant="destructive"
              onClick={endCallAndSave}
            >
              <PhoneOff className="h-5 w-5" /> End & Save
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
