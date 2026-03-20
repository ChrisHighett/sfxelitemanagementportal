import React, { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Mic, Square, Loader2, Sparkles, Clock, Upload,
  CheckCircle2, ChevronRight, Phone, PhoneOff,
  Mail, ClipboardList, CheckSquare, Edit3, Save,
  AlertTriangle, Calendar
} from "lucide-react";
import { toast } from "sonner";
import { type Athlete } from "@/hooks/usePortalData";

type FlowStep = "ready" | "recording" | "processing" | "review" | "done";

interface AISummary {
  warm_opener: string;
  performance: string;
  lifestyle: string;
  personal: string;
  education: string;
  brand: string;
  goals: string;
  suggested_focus_next_month: string;
  suggested_goals: string[];
  attention_required: boolean;
  attention_reason: string;
  athlete_email_summary_points: string[];
  parent_email_summary_points: string[];
}

interface VoiceRecordingFlowProps {
  athlete: Athlete;
  onClose: () => void;
}

const REVIEW_SECTIONS = [
  { key: "performance", label: "Performance", icon: "⚽" },
  { key: "lifestyle", label: "Lifestyle", icon: "🏠" },
  { key: "personal", label: "Personal", icon: "💪" },
  { key: "education", label: "Education", icon: "📚" },
  { key: "brand", label: "Brand", icon: "📱" },
  { key: "focus", label: "Focus & Goals", icon: "🎯" },
] as const;

export default function VoiceRecordingFlow({ athlete, onClose }: VoiceRecordingFlowProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<FlowStep>("ready");
  const [callHistoryId, setCallHistoryId] = useState<string | null>(null);
  const [audioFileUrl, setAudioFileUrl] = useState<string | null>(null);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [callStart, setCallStart] = useState<Date | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef("");
  const isRecordingRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Processing state
  const [processingStatus, setProcessingStatus] = useState("");

  // Review state
  const [aiSummary, setAiSummary] = useState<AISummary | null>(null);
  const [editedSummary, setEditedSummary] = useState<Record<string, string>>({});
  const [editedGoals, setEditedGoals] = useState<string[]>([]);
  const [wellbeingScore, setWellbeingScore] = useState(4);
  const [attentionRequired, setAttentionRequired] = useState(false);
  const [followUpRequired, setFollowUpRequired] = useState(false);
  const [outcome, setOutcome] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Post-save state
  const [creatingReview, setCreatingReview] = useState(false);
  const [reviewCreated, setReviewCreated] = useState(false);
  const [athleteEmailDraft, setAthleteEmailDraft] = useState<string | null>(null);
  const [parentEmailDraft, setParentEmailDraft] = useState<string | null>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: "", description: "", owner_type: "agent" as string,
    priority: 3, due_date: "", status: "open" as string,
  });
  const [savingTask, setSavingTask] = useState(false);

  // Timer
  useEffect(() => {
    if (!callStart || step !== "recording") return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - callStart.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [callStart, step]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // ── STEP 1: START RECORDING ──
  const startRecording = useCallback(async () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Speech recognition not supported. Try Chrome.");
      return;
    }

    // Create pending call_history record
    try {
      const { data, error } = await supabase.from("call_history").insert({
        athlete_id: athlete.id,
        call_type: "monthly_review" as const,
        summary: "Recording in progress...",
        conducted_by: user?.id ?? null,
        parent_involved: false,
        follow_up_required: false,
      }).select("id").single();
      if (error) throw error;
      setCallHistoryId(data.id);
    } catch (e: any) {
      toast.error("Failed to create call record: " + (e.message || "Unknown error"));
      return;
    }

    // Speech recognition setup
    const createRecognition = () => {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-AU";
      recognition.maxAlternatives = 3;

      recognition.onresult = (event: any) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          let best = ""; let bestConf = 0;
          for (let j = 0; j < event.results[i].length; j++) {
            if (event.results[i][j].confidence > bestConf) {
              bestConf = event.results[i][j].confidence;
              best = event.results[i][j].transcript;
            }
          }
          if (event.results[i].isFinal) {
            finalTranscriptRef.current += best + " ";
          } else {
            interim += best;
          }
        }
        setTranscript(finalTranscriptRef.current + interim);
      };

      recognition.onerror = (event: any) => {
        if (event.error === "no-speech" || event.error === "aborted" || event.error === "network") {
          if (isRecordingRef.current) {
            setTimeout(() => {
              if (isRecordingRef.current) {
                try {
                  const r = createRecognition(); r.start();
                  recognitionRef.current = r;
                } catch {}
              }
            }, 300);
          }
          return;
        }
        toast.error(`Microphone error: ${event.error}`);
        isRecordingRef.current = false;
        setIsRecording(false);
      };

      recognition.onend = () => {
        if (isRecordingRef.current) {
          setTimeout(() => {
            if (isRecordingRef.current) {
              try {
                const r = createRecognition(); r.start();
                recognitionRef.current = r;
              } catch {}
            }
          }, 100);
        }
      };
      return recognition;
    };

    finalTranscriptRef.current = "";
    const recognition = createRecognition();
    recognition.start();
    recognitionRef.current = recognition;
    isRecordingRef.current = true;
    setIsRecording(true);
    setCallStart(new Date());
    setStep("recording");

    // MediaRecorder for audio capture
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      streamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus" : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.start(1000);
      mediaRecorderRef.current = recorder;
    } catch (err) {
      console.warn("MediaRecorder unavailable:", err);
    }

    toast.success("Recording started — speak clearly");
  }, [athlete.id, user?.id]);

  // ── STEP 2: STOP + PROCESS ──
  const stopAndProcess = useCallback(async () => {
    // Stop recognition
    isRecordingRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsRecording(false);
    const finalTranscript = finalTranscriptRef.current.trim();
    setTranscript(finalTranscript);
    setStep("processing");

    const durationMinutes = callStart
      ? Math.max(1, Math.round((Date.now() - callStart.getTime()) / 60000))
      : 1;

    // Upload audio
    setProcessingStatus("Uploading audio...");
    let storedAudioUrl: string | null = null;
    if (audioChunksRef.current.length > 0) {
      try {
        // Wait a tick for MediaRecorder onstop to fire
        await new Promise(r => setTimeout(r, 500));
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const fileName = `${athlete.id}/${Date.now()}-call.webm`;
        const { error } = await supabase.storage.from("call-audio").upload(fileName, blob, { contentType: "audio/webm" });
        if (error) throw error;
        storedAudioUrl = fileName;
        setAudioFileUrl(fileName);
      } catch (e: any) {
        console.error("Audio upload error:", e);
        toast.error("Audio upload failed — continuing with transcript");
      }
    }

    // Update call_history with audio + transcript + duration
    if (callHistoryId) {
      setProcessingStatus("Saving transcript...");
      try {
        await supabase.from("call_history").update({
          audio_file_url: storedAudioUrl,
          transcript_text: finalTranscript || null,
          duration_minutes: durationMinutes,
        }).eq("id", callHistoryId);
      } catch (e: any) {
        console.error("Failed to update call record:", e);
      }
    }

    // AI structuring
    if (finalTranscript) {
      setProcessingStatus("AI structuring your notes...");
      try {
        const { data, error } = await supabase.functions.invoke("summarise-call", {
          body: {
            transcript: finalTranscript,
            athleteName: athlete.name,
            athleteStage: athlete.stage,
            callType: "monthly_review",
            callDate: new Date().toISOString().slice(0, 10),
          },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        const s = data.summary as AISummary;
        setAiSummary(s);
        setEditedSummary({
          performance: s.performance || "",
          lifestyle: s.lifestyle || "",
          personal: s.personal || "",
          education: s.education || "",
          brand: s.brand || "",
          focus: s.suggested_focus_next_month || "",
        });
        setEditedGoals(s.suggested_goals || []);
        setWellbeingScore(4);
        setAttentionRequired(s.attention_required || false);
        setStep("review");
        toast.success("AI review draft ready");
      } catch (e: any) {
        console.error("AI summary error:", e);
        toast.error(e.message || "AI structuring failed");
        // Fall back to review with empty sections
        setEditedSummary({
          performance: "", lifestyle: "", personal: "",
          education: "", brand: "", focus: "",
        });
        setEditedGoals([]);
        setStep("review");
      }
    } else {
      toast.info("No transcript captured — add notes manually");
      setEditedSummary({
        performance: "", lifestyle: "", personal: "",
        education: "", brand: "", focus: "",
      });
      setEditedGoals([]);
      setStep("review");
    }
  }, [callStart, callHistoryId, athlete.id, athlete.name]);

  // ── STEP 3: SAVE APPROVED REVIEW ──
  const saveApprovedReview = useCallback(async () => {
    if (!callHistoryId) return;
    setIsSaving(true);

    const allNotes = REVIEW_SECTIONS
      .map(s => editedSummary[s.key]?.trim() ? `**${s.label}:** ${editedSummary[s.key].trim()}` : null)
      .filter(Boolean).join("\n\n");

    const goalsSummary = editedGoals.filter(g => g.trim()).map(g => `• ${g}`).join("\n");
    const summary = allNotes || "Call completed.";
    const detailedNotes = [allNotes, goalsSummary ? `**Goals:**\n${goalsSummary}` : ""].filter(Boolean).join("\n\n");

    try {
      const { error } = await supabase.from("call_history").update({
        summary,
        detailed_notes: detailedNotes,
        ai_summary_json: {
          ...editedSummary,
          goals: editedGoals.filter(g => g.trim()),
          wellbeingScore,
          attentionRequired,
        },
        outcome: outcome || null,
        follow_up_required: followUpRequired,
      }).eq("id", callHistoryId);
      if (error) throw error;
      setStep("done");
      toast.success("Call record saved successfully");
    } catch (e: any) {
      console.error("Save error:", e);
      toast.error(e.message || "Failed to save");
    } finally {
      setIsSaving(false);
    }
  }, [callHistoryId, editedSummary, editedGoals, wellbeingScore, attentionRequired, followUpRequired, outcome]);

  // ── POST-SAVE: Create Monthly Review ──
  const createMonthlyReview = useCallback(async () => {
    setCreatingReview(true);
    try {
      const reviewMonth = new Date().toISOString().slice(0, 7) + "-01";
      const durationStr = callStart
        ? `${Math.round((Date.now() - callStart.getTime()) / 60000)}min`
        : "—";

      const { error } = await supabase.from("monthly_reviews").upsert({
        athlete_id: athlete.id,
        review_month: reviewMonth,
        performance_notes: editedSummary.performance || null,
        lifestyle_notes: editedSummary.lifestyle || null,
        personal_notes: editedSummary.personal || null,
        education_notes: editedSummary.education || null,
        brand_notes: editedSummary.brand || null,
        focus_next_month: editedSummary.focus || null,
        goals: editedGoals.filter(g => g.trim()),
        wellbeing_score: wellbeingScore,
        attention_required: attentionRequired,
        created_by: user?.id ?? null,
        call_date: new Date().toISOString().slice(0, 10),
        call_duration: durationStr,
        training_highlights: editedSummary.performance || null,
        areas_for_improvement: null,
        football_goal: null,
        personal_goal: null,
        school_life_goal: null,
        parent_engagement_notes: null,
        follow_up_actions: null,
      } as any, { onConflict: "athlete_id,review_month" });
      if (error) throw error;
      setReviewCreated(true);
      toast.success("Monthly review created");
    } catch (e: any) {
      toast.error(e.message || "Failed to create review");
    } finally {
      setCreatingReview(false);
    }
  }, [athlete.id, editedSummary, editedGoals, wellbeingScore, attentionRequired, user?.id, callStart, aiSummary]);

  // ── POST-SAVE: Generate emails ──
  const generateAthleteEmail = useCallback(() => {
    const firstName = athlete.name.split(" ")[0];
    const sections: string[] = [];
    if (editedSummary.performance) sections.push(`**On the Pitch**\n${editedSummary.performance}`);
    if (editedSummary.lifestyle) sections.push(`**Off the Pitch**\n${editedSummary.lifestyle}`);
    if (editedSummary.personal) sections.push(`**Personal Development**\n${editedSummary.personal}`);
    if (editedSummary.education) sections.push(`**Education**\n${editedSummary.education}`);

    const focusLines: string[] = [];
    if (editedSummary.focus) focusLines.push(editedSummary.focus);
    if (editedGoals.length > 0) focusLines.push(editedGoals.filter(g => g.trim()).map(g => `• ${g}`).join("\n"));

    const positives = [editedSummary.performance, editedSummary.lifestyle, editedSummary.personal].filter(Boolean);

    setAthleteEmailDraft([
      `Hey ${firstName},`,
      ``,
      `Really enjoyed our catch up today mate. It's great to see the effort you're putting in — you should be proud of how far you've come.`,
      ``,
      ...(positives.length > 0 ? [`A couple of things that stood out — ${positives.slice(0, 2).map(p => p.replace(/\.$/, "").toLowerCase()).join(", and ")}. That's all really positive mate.`] : []),
      ``,
      ...(sections.length > 0 ? [`Here's a quick summary of what we covered:`, ``, ...sections.map(s => s + "\n")] : []),
      ...(focusLines.length > 0 ? [`**What We're Working on Next**`, ...focusLines, ``] : []),
      `Keep backing yourself ${firstName}. You're on the right track and I'm here whenever you need me. If anything comes up between now and our next chat, just give me a call mate.`,
      ``,
      `Speak soon,`,
      `SFX Pathways`,
    ].join("\n"));
    toast.success("Athlete email draft created");
  }, [athlete.name, editedSummary, editedGoals]);

  const generateParentEmail = useCallback(() => {
    const firstName = athlete.name.split(" ")[0];
    const parentName = athlete.parentName || "there";

    const points: string[] = [];
    if (editedSummary.performance) points.push(`**Performance:** ${editedSummary.performance}`);
    if (editedSummary.education) points.push(`**Education:** ${editedSummary.education}`);
    if (editedSummary.personal) points.push(`**Wellbeing & Development:** ${editedSummary.personal}`);
    if (editedSummary.lifestyle) points.push(`**Lifestyle:** ${editedSummary.lifestyle}`);

    setParentEmailDraft([
      `Hi ${parentName},`,
      ``,
      `I had a really positive catch up with ${firstName} this month and wanted to share a brief update with you.`,
      ``,
      `${firstName} is tracking well and showing good progress. ${attentionRequired ? "There are a couple of areas we're keeping an eye on, but nothing to be concerned about — just part of the development process." : "I'm really pleased with how things are going."}`,
      ``,
      ...(points.length > 0 ? [`Here's a summary of the key areas we discussed:`, ``, ...points, ``] : []),
      ...(editedSummary.focus ? [`**Next Focus**\n${editedSummary.focus}`, ``] : []),
      `Please feel free to reach out anytime if you'd like to discuss anything further — I'm always happy to chat.`,
      ``,
      `Warm regards,`,
      `SFX Pathways`,
    ].join("\n"));
    toast.success("Parent email draft created");
  }, [athlete.name, athlete.parentName, editedSummary, attentionRequired]);

  // ── POST-SAVE: Create Task ──
  const saveTask = useCallback(async () => {
    if (!taskForm.title.trim()) { toast.error("Task title required"); return; }
    setSavingTask(true);
    try {
      const { error } = await supabase.from("athlete_tasks").insert({
        athlete_id: athlete.id,
        title: taskForm.title,
        description: taskForm.description || null,
        owner_type: taskForm.owner_type as any,
        assigned_to_user_id: user?.id ?? null,
        status: taskForm.status as any,
        priority: taskForm.priority,
        due_date: taskForm.due_date || null,
        related_call_id: callHistoryId,
        created_by: user?.id ?? null,
      });
      if (error) throw error;
      toast.success("Task created");
      setShowTaskForm(false);
      setTaskForm({ title: "", description: "", owner_type: "agent", priority: 3, due_date: "", status: "open" });
    } catch (e: any) {
      toast.error(e.message || "Failed to create task");
    } finally {
      setSavingTask(false);
    }
  }, [athlete.id, taskForm, user?.id, callHistoryId]);

  // ═══════════════════════════════════════════════
  // RENDER: READY
  // ═══════════════════════════════════════════════
  if (step === "ready") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 space-y-6">
        <div className="text-center space-y-3">
          <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Mic className="h-10 w-10 text-primary" />
          </div>
          <h2 className="text-xl font-bold">Voice Recording</h2>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Record your conversation with {athlete.name}. Audio, transcript and AI-structured notes will be saved automatically.
          </p>
        </div>

        <Button className="h-14 px-8 text-lg gap-3" onClick={startRecording}>
          <Mic className="h-6 w-6" /> Start Recording
        </Button>

        <Button variant="ghost" onClick={onClose} className="text-muted-foreground">
          Cancel
        </Button>
      </div>
    );
  }

  // ═══════════════════════════════════════════════
  // RENDER: RECORDING
  // ═══════════════════════════════════════════════
  if (step === "recording") {
    return (
      <div className="flex flex-col min-h-[calc(100vh-120px)] md:min-h-0">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-destructive animate-pulse" />
              <span className="font-medium">{athlete.name}</span>
              <Badge variant="destructive" className="gap-1">
                <Clock className="h-3 w-3" /> {formatTime(elapsed)}
              </Badge>
            </div>
            <Button variant="destructive" className="gap-2 h-11" onClick={stopAndProcess}>
              <Square className="h-4 w-4" />
              <span className="hidden sm:inline">End & Process</span>
              <span className="sm:hidden">End</span>
            </Button>
          </div>
        </div>

        {/* Live transcript */}
        <div className="flex-1 p-4 space-y-4 max-w-lg mx-auto w-full">
          <div className="text-center py-8 space-y-2">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <Mic className="h-8 w-8 text-destructive animate-pulse" />
            </div>
            <p className="text-sm text-muted-foreground">Recording in progress...</p>
          </div>

          {transcript && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Live Transcript</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm max-h-[300px] overflow-y-auto whitespace-pre-wrap text-muted-foreground">
                  {transcript}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Bottom bar */}
        <div className="sticky bottom-0 bg-card border-t border-border p-4" style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}>
          <Button variant="destructive" className="w-full h-14 text-base gap-3" onClick={stopAndProcess}>
            <PhoneOff className="h-5 w-5" /> End Call & Process
          </Button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════
  // RENDER: PROCESSING
  // ═══════════════════════════════════════════════
  if (step === "processing") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">{processingStatus}</p>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="h-3 w-3" /> Audio uploading
            <ChevronRight className="h-3 w-3" />
            <span className="font-medium">AI structuring</span>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════
  // RENDER: REVIEW (editable AI draft)
  // ═══════════════════════════════════════════════
  if (step === "review") {
    return (
      <div className="flex flex-col min-h-[calc(100vh-120px)] md:min-h-0">
        <div className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Edit3 className="h-4 w-4 text-primary" />
              <h2 className="font-bold text-base">Review AI Draft</h2>
            </div>
            <Badge variant="secondary" className="text-xs">{athlete.name}</Badge>
          </div>
        </div>

        <div className="flex-1 p-3 md:p-6 space-y-4 max-w-2xl mx-auto w-full overflow-auto">
          {/* Wellbeing + Flags */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <div>
                <label className="text-sm font-medium">Wellbeing Score</label>
                <div className="flex items-center gap-3 mt-1">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      className={`h-10 w-10 rounded-full text-sm font-bold transition-all ${wellbeingScore === n
                        ? "bg-primary text-primary-foreground scale-110"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                      }`}
                      onClick={() => setWellbeingScore(n)}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <span className="text-sm">Attention Required</span>
                </div>
                <Switch checked={attentionRequired} onCheckedChange={setAttentionRequired} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Follow-up Required</span>
                <Switch checked={followUpRequired} onCheckedChange={setFollowUpRequired} />
              </div>
            </CardContent>
          </Card>

          {/* Editable sections */}
          {REVIEW_SECTIONS.map(s => (
            <Card key={s.key}>
              <CardHeader className="pb-2 px-4 pt-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{s.icon}</span>
                  <CardTitle className="text-sm">{s.label}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <Textarea
                  value={editedSummary[s.key] || ""}
                  onChange={e => setEditedSummary(prev => ({ ...prev, [s.key]: e.target.value }))}
                  placeholder={`${s.label} notes...`}
                  className="min-h-[80px] text-sm resize-none"
                />
              </CardContent>
            </Card>
          ))}

          {/* Goals */}
          <Card>
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-sm">🎯 Goals</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              {editedGoals.map((goal, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                  <Input
                    value={goal}
                    onChange={e => {
                      const next = [...editedGoals];
                      next[i] = e.target.value;
                      setEditedGoals(next);
                    }}
                    className="text-sm h-9"
                  />
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditedGoals(prev => [...prev, ""])}
                className="text-xs"
              >
                + Add Goal
              </Button>
            </CardContent>
          </Card>

          {/* Outcome */}
          <Card>
            <CardContent className="p-4">
              <label className="text-sm font-medium">Call Outcome (optional)</label>
              <Input
                value={outcome}
                onChange={e => setOutcome(e.target.value)}
                placeholder="e.g. Good session, athlete engaged..."
                className="mt-1 text-sm"
              />
            </CardContent>
          </Card>
        </div>

        {/* Bottom save bar */}
        <div className="sticky bottom-0 bg-card border-t border-border p-4" style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}>
          <div className="flex gap-3 max-w-2xl mx-auto">
            <Button variant="outline" className="flex-1 h-12" onClick={onClose}>
              Discard
            </Button>
            <Button className="flex-1 h-12 gap-2 text-base" onClick={saveApprovedReview} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
              Approve & Save
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════
  // RENDER: DONE (post-save actions)
  // ═══════════════════════════════════════════════
  return (
    <div className="flex flex-col min-h-[calc(100vh-120px)] md:min-h-0 p-4 md:p-6">
      <div className="flex-1 space-y-4 max-w-lg mx-auto w-full">
        <div className="text-center space-y-2 py-4">
          <div className="text-4xl">✅</div>
          <h2 className="text-xl font-bold">Call Saved</h2>
          <p className="text-sm text-muted-foreground">
            {athlete.name} — {callStart ? Math.round((Date.now() - callStart.getTime()) / 60000) : 0} min
          </p>
        </div>

        {/* One-tap actions */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Next Actions</h3>

          <Button
            className="w-full h-14 text-base gap-3 justify-start"
            onClick={createMonthlyReview}
            disabled={creatingReview || reviewCreated}
          >
            {creatingReview ? <Loader2 className="h-5 w-5 animate-spin" /> : <ClipboardList className="h-5 w-5" />}
            {reviewCreated ? "Monthly Review Created ✓" : "Create Monthly Review"}
          </Button>

          <Button
            className="w-full h-14 text-base gap-3 justify-start"
            variant="secondary"
            onClick={generateAthleteEmail}
          >
            <Mail className="h-5 w-5" /> Generate Athlete Email
          </Button>

          <Button
            className="w-full h-14 text-base gap-3 justify-start"
            variant="secondary"
            onClick={generateParentEmail}
          >
            <Mail className="h-5 w-5" /> Generate Parent Email
          </Button>

          <Button
            className="w-full h-14 text-base gap-3 justify-start"
            variant="secondary"
            onClick={() => setShowTaskForm(true)}
          >
            <CheckSquare className="h-5 w-5" /> Create Task
          </Button>
        </div>

        {/* Task form */}
        {showTaskForm && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">New Task</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Task title *"
                value={taskForm.title}
                onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))}
              />
              <Textarea
                placeholder="Description (optional)"
                value={taskForm.description}
                onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))}
                className="min-h-[60px]"
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Owner</label>
                  <Select value={taskForm.owner_type} onValueChange={v => setTaskForm(f => ({ ...f, owner_type: v }))}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="agent">Agent</SelectItem>
                      <SelectItem value="athlete">Athlete</SelectItem>
                      <SelectItem value="parent">Parent</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Priority</label>
                  <Select value={String(taskForm.priority)} onValueChange={v => setTaskForm(f => ({ ...f, priority: Number(v) }))}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 — Urgent</SelectItem>
                      <SelectItem value="2">2 — High</SelectItem>
                      <SelectItem value="3">3 — Normal</SelectItem>
                      <SelectItem value="4">4 — Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Due Date</label>
                <Input
                  type="date"
                  value={taskForm.due_date}
                  onChange={e => setTaskForm(f => ({ ...f, due_date: e.target.value }))}
                  className="h-9"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowTaskForm(false)}>Cancel</Button>
                <Button className="flex-1 gap-2" onClick={saveTask} disabled={savingTask}>
                  {savingTask ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckSquare className="h-4 w-4" />}
                  Save Task
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Email drafts */}
        {athleteEmailDraft && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">📧 Athlete Email</CardTitle>
                <Button size="sm" variant="outline" onClick={() => {
                  navigator.clipboard.writeText(athleteEmailDraft);
                  toast.success("Copied");
                }}>Copy</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="whitespace-pre-wrap text-sm bg-muted/50 p-3 rounded-lg max-h-[200px] overflow-y-auto">
                {athleteEmailDraft}
              </div>
            </CardContent>
          </Card>
        )}

        {parentEmailDraft && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">📧 Parent Email</CardTitle>
                <Button size="sm" variant="outline" onClick={() => {
                  navigator.clipboard.writeText(parentEmailDraft);
                  toast.success("Copied");
                }}>Copy</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="whitespace-pre-wrap text-sm bg-muted/50 p-3 rounded-lg max-h-[200px] overflow-y-auto">
                {parentEmailDraft}
              </div>
            </CardContent>
          </Card>
        )}

        <Button variant="outline" className="w-full h-12 mt-4" onClick={onClose}>
          Done — Return to Athlete Comms
        </Button>
      </div>
    </div>
  );
}
