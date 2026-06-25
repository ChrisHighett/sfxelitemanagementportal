import React, { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Mic, Square, Loader2, Sparkles, Save, NotebookPen } from "lucide-react";
import { toast } from "sonner";

type Step = "idle" | "recording" | "structuring" | "review";

export default function RecruitmentNotesPanel() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [step, setStep] = useState<Step>("idle");
  const [transcript, setTranscript] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [saving, setSaving] = useState(false);

  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef("");
  const isRecordingRef = useRef(false);
  const startRef = useRef<number | null>(null);

  // Elapsed timer
  useEffect(() => {
    if (step !== "recording") return;
    const id = setInterval(() => {
      if (startRef.current) setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 500);
    return () => clearInterval(id);
  }, [step]);

  const startRecording = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Speech recognition not supported. Try Chrome.");
      return;
    }

    finalTranscriptRef.current = "";
    setTranscript("");
    setTitle("");
    setBody("");

    const create = () => {
      const r = new SpeechRecognition();
      r.continuous = true;
      r.interimResults = true;
      r.lang = "en-AU";
      r.maxAlternatives = 3;
      r.onresult = (event: any) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          let best = ""; let bestConf = 0;
          for (let j = 0; j < event.results[i].length; j++) {
            if (event.results[i][j].confidence > bestConf) {
              bestConf = event.results[i][j].confidence;
              best = event.results[i][j].transcript;
            }
          }
          if (event.results[i].isFinal) finalTranscriptRef.current += best + " ";
          else interim += best;
        }
        setTranscript(finalTranscriptRef.current + interim);
      };
      r.onerror = (event: any) => {
        if (["no-speech", "aborted", "network"].includes(event.error)) {
          if (isRecordingRef.current) {
            setTimeout(() => {
              if (isRecordingRef.current) {
                try { const n = create(); n.start(); recognitionRef.current = n; } catch {}
              }
            }, 300);
          }
          return;
        }
        toast.error(`Microphone error: ${event.error}`);
        isRecordingRef.current = false;
        setStep("idle");
      };
      r.onend = () => {
        if (isRecordingRef.current) {
          setTimeout(() => {
            if (isRecordingRef.current) {
              try { const n = create(); n.start(); recognitionRef.current = n; } catch {}
            }
          }, 100);
        }
      };
      return r;
    };

    const recognition = create();
    recognition.start();
    recognitionRef.current = recognition;
    isRecordingRef.current = true;
    startRef.current = Date.now();
    setElapsed(0);
    setStep("recording");
    toast.success("Recording — speak clearly");
  }, []);

  const stopAndStructure = useCallback(async () => {
    isRecordingRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    const finalT = finalTranscriptRef.current.trim();
    setTranscript(finalT);

    if (!finalT) {
      toast.error("No speech captured. Try again.");
      setStep("idle");
      return;
    }

    setStep("structuring");
    try {
      const { data, error } = await supabase.functions.invoke("structure-note", {
        body: { transcript: finalT, context: "Recruitment & Retention note" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setBody((data?.body || finalT).trim());
      setTitle((data?.title || "").trim());
      setStep("review");
    } catch (e: any) {
      console.error(e);
      toast.error("AI structuring failed — you can edit and save the raw transcript.");
      setBody(finalT);
      setStep("review");
    }
  }, []);

  const cancel = () => {
    isRecordingRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    setStep("idle");
    setTranscript("");
    setBody("");
    setTitle("");
  };

  const save = async () => {
    if (!body.trim()) {
      toast.error("Note body is empty");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("recruitment_notes" as any).insert({
        title: title.trim() || null,
        body: body.trim(),
        raw_transcript: transcript.trim() || null,
      });
      if (error) throw error;
      toast.success("Note saved");
      setStep("idle");
      setTranscript("");
      setBody("");
      setTitle("");
      qc.invalidateQueries({ queryKey: ["recruitment_notes"] });
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["recruitment_notes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recruitment_notes" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const mmss = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <NotebookPen className="h-4 w-4" />
          Recruitment & Retention notes
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Standalone voice notes — speak a thought, AI structures it, and it's saved for your agency.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {step === "idle" && (
          <Button onClick={startRecording} className="w-full gap-2" size="sm">
            <Mic className="h-4 w-4" /> Record a note
          </Button>
        )}

        {step === "recording" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-sm">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                Recording · <span className="num">{mmss}</span>
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={cancel}>Cancel</Button>
                <Button size="sm" onClick={stopAndStructure} className="gap-1.5">
                  <Square className="h-3.5 w-3.5" /> Stop & structure
                </Button>
              </div>
            </div>
            {transcript && (
              <div className="text-xs text-muted-foreground rounded border bg-muted/30 p-2 max-h-32 overflow-y-auto whitespace-pre-wrap">
                {transcript}
              </div>
            )}
          </div>
        )}

        {step === "structuring" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
            <Loader2 className="h-4 w-4 animate-spin" />
            <Sparkles className="h-4 w-4" />
            Structuring your note…
          </div>
        )}

        {step === "review" && (
          <div className="space-y-2">
            <Input
              placeholder="Title (optional)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              className="font-mono text-sm"
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={cancel} disabled={saving}>Discard</Button>
              <Button size="sm" onClick={save} disabled={saving} className="gap-1.5">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save note
              </Button>
            </div>
          </div>
        )}

        <div className="pt-3 border-t space-y-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Saved notes
          </div>
          {isLoading ? (
            <div className="text-xs text-muted-foreground py-2 flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading…
            </div>
          ) : notes.length === 0 ? (
            <div className="text-xs text-muted-foreground py-2">No notes yet.</div>
          ) : (
            <ul className="space-y-2">
              {notes.map((n: any) => (
                <li key={n.id} className="rounded-md border bg-card p-3">
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <div className="text-sm font-medium">
                      {n.title || "Untitled note"}
                    </div>
                    <div className="text-[11px] text-muted-foreground shrink-0">
                      {new Date(n.created_at).toLocaleDateString("en-AU", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </div>
                  </div>
                  <div className="text-xs whitespace-pre-wrap text-muted-foreground">
                    {n.body}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
