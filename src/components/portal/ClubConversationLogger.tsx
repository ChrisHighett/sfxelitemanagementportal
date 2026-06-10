import React, { useState, useCallback, useRef } from "react";
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
import { Mic, Square, Loader2, CheckCircle2, Building2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { type Athlete } from "@/hooks/usePortalData";
import { saveCommsEmail } from "@/components/portal/CommsHistory";

const NRL_CLUBS = [
  "Brisbane Broncos", "Canberra Raiders", "Canterbury-Bankstown Bulldogs",
  "Cronulla-Sutherland Sharks", "Gold Coast Titans", "Manly-Warringah Sea Eagles",
  "Melbourne Storm", "New Zealand Warriors", "Newcastle Knights",
  "North Queensland Cowboys", "Parramatta Eels", "Penrith Panthers",
  "South Sydney Rabbitohs", "St George Illawarra Dragons",
  "Sydney Roosters", "Wests Tigers", "Dolphins",
];

const CONV_TYPES = [
  { value: "recruitment", label: "Recruitment / Pathways" },
  { value: "high_performance", label: "High Performance Staff" },
  { value: "coach", label: "Coach / Head Coach" },
  { value: "scout", label: "Scout / Talent ID" },
  { value: "contract", label: "Contract Discussion" },
  { value: "general", label: "General Update" },
];

interface Props {
  athlete: Athlete;
  onSaved?: () => void;
}

export default function ClubConversationLogger({ athlete, onSaved }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [clubName, setClubName] = useState("");
  const [customClub, setCustomClub] = useState("");
  const [convType, setConvType] = useState("recruitment");
  const [notes, setNotes] = useState("");
  const [outcome, setOutcome] = useState("");

  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);
  const isRecordingRef = useRef(false);
  const finalTranscriptRef = useRef("");

  const [saving, setSaving] = useState(false);
  const [generatingEmail, setGeneratingEmail] = useState(false);
  const [saved, setSaved] = useState(false);
  const [emailDraft, setEmailDraft] = useState<string | null>(null);
  const [emailSubject, setEmailSubject] = useState("");

  const effectiveClub = clubName === "__custom__" ? customClub : clubName;

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

  const handleSave = async () => {
    if (!effectiveClub.trim()) {
      toast.error("Please select or enter a club name.");
      return;
    }
    if (!notes.trim()) {
      toast.error("Please add a voice note or type some notes.");
      return;
    }

    setSaving(true);
    const convLabel = CONV_TYPES.find(t => t.value === convType)?.label || convType;
    const summaryText = `Club conversation — ${effectiveClub} (${convLabel})`;

    const { error } = await supabase.from("call_history").insert({
      athlete_id: athlete.id,
      call_type: "club_conversation" as any,
      summary: summaryText,
      detailed_notes: notes.trim(),
      outcome: outcome.trim() || null,
      conducted_by: user?.id ?? null,
      follow_up_required: false,
      parent_involved: false,
    });

    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Club conversation saved to athlete file.");
    qc.invalidateQueries({ queryKey: ["call_history", athlete.id] });
    setSaved(true);
    onSaved?.();
  };

  const handleGenerateEmail = async () => {
    if (!notes.trim()) {
      toast.error("Save the conversation first, then generate the email.");
      return;
    }

    setGeneratingEmail(true);
    const firstName = athlete.name.split(" ")[0];
    const convLabel = CONV_TYPES.find(t => t.value === convType)?.label || convType;

    try {
      const { data, error } = await supabase.functions.invoke("generate-email", {
        body: {
          type: "club_feedback",
          athleteFirstName: firstName,
          clubName: effectiveClub,
          conversationType: convLabel,
          agentNotes: notes.trim(),
          outcome: outcome.trim() || null,
          agentName: (user as any)?.user_metadata?.display_name || user?.email || "Your TGI Sport Manager",
        },
      });

      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      const subject = (data as any)?.email?.subject || `Club update — ${firstName}`;
      const body = (data as any)?.email?.body || (data as any)?.raw_text || "";

      setEmailSubject(subject);
      setEmailDraft(body);

      await saveCommsEmail({
        athleteId: athlete.id,
        emailType: "athlete",
        subject,
        body,
        generatedFrom: "club_conversation",
        createdBy: user?.id,
      });

      toast.success("Athlete email generated and saved to Comms History.");
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
    setClubName("");
    setCustomClub("");
    setConvType("recruitment");
    setNotes("");
    setOutcome("");
    setSaved(false);
    setEmailDraft(null);
    setEmailSubject("");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm">Log Club Conversation</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Club</Label>
          <Select value={clubName} onValueChange={setClubName}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Select club…" />
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
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Conversation type</Label>
          <Select value={convType} onValueChange={setConvType}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CONV_TYPES.map(t => (
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
          placeholder="What did the club say? What's their interest level? Any specific feedback?"
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

      {!saved ? (
        <Button
          className="w-full h-10 gap-2"
          onClick={handleSave}
          disabled={saving || !effectiveClub.trim() || !notes.trim()}
        >
          {saving ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
          ) : (
            <><Building2 className="h-4 w-4" /> Save to athlete file</>
          )}
        </Button>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
            <CheckCircle2 className="h-4 w-4" />
            Saved to {athlete.name}'s file
          </div>

          {!emailDraft ? (
            <Button
              variant="outline"
              className="w-full h-10 gap-2"
              onClick={handleGenerateEmail}
              disabled={generatingEmail}
            >
              {generatingEmail ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Generating email…</>
              ) : (
                "Generate athlete email from this conversation"
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
