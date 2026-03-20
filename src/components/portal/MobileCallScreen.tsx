import React, { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Phone, PhoneOff, ChevronLeft, ChevronRight, Sparkles,
  Mail, ClipboardList, CheckSquare, Loader2, Clock, Mic, MicOff, Square
} from "lucide-react";
import { toast } from "sonner";
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
}

export default function MobileCallScreen({ athlete, onClose, onCreateEmail }: MobileCallScreenProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<"calling" | "saving" | "done">("calling");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [sectionNotes, setSectionNotes] = useState<Record<string, string>>(
    Object.fromEntries(SECTIONS.map((s) => [s.key, ""]))
  );
  const [callStart] = useState(() => new Date());
  const [isSaving, setIsSaving] = useState(false);
  const [savedCallId, setSavedCallId] = useState<string | null>(null);
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  const section = SECTIONS[currentIdx];
  const progress = ((currentIdx + 1) / SECTIONS.length) * 100;
  const filledSections = SECTIONS.filter((s) => sectionNotes[s.key].trim().length > 0).length;
  const elapsed = Math.floor((Date.now() - callStart.getTime()) / 60000);

  const updateNote = useCallback((key: string, value: string) => {
    setSectionNotes((prev) => ({ ...prev, [key]: value }));
  }, []);

  const goNext = () => {
    if (currentIdx < SECTIONS.length - 1) setCurrentIdx((i) => i + 1);
  };
  const goBack = () => {
    if (currentIdx > 0) setCurrentIdx((i) => i - 1);
  };

  const endCallAndSave = useCallback(async () => {
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
  }, [athlete.id, callStart, sectionNotes, user?.id]);

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

          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Next Actions</h3>

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

            <Button
              className="w-full h-14 text-base gap-3 justify-start"
              variant="secondary"
              onClick={() => {
                toast.info("Navigate to Monthly Reviews to create a review");
                onClose();
              }}
            >
              <ClipboardList className="h-5 w-5" /> Create Monthly Review
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
          <div>
            <h2 className="text-lg font-bold">{section.title}</h2>
            <p className="text-xs text-muted-foreground">Step {currentIdx + 1} of {SECTIONS.length}</p>
          </div>
        </div>

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
                // Focus textarea
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
          placeholder={`Notes for ${section.title.toLowerCase()}...`}
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
              onClick={() => setCurrentIdx(i)}
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
