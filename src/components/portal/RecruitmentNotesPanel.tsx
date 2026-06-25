import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

/* ------------------------------------------------------------------ */
/* Lightweight markdown renderer — bold, italics, headings, lists, br */
/* ------------------------------------------------------------------ */

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderInline(s: string) {
  let out = escapeHtml(s);
  // bold **text**
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>');
  // italics *text* (avoid matching ** already handled)
  out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  // inline code
  out = out.replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-muted text-[0.85em] font-mono">$1</code>');
  return out;
}

function stripTitleFromBody(title: string, body: string): string {
  if (!title.trim() || !body.trim()) return body;

  const clean = (s: string) =>
    s
      .trim()
      .replace(/^#{1,6}\s+/, "")          // heading markers
      .replace(/^\*\*|\*\*$/g, "")       // bold **
      .replace(/^\*|\*$/g, "")           // italics *
      .replace(/^_|_$/g, "")              // underline _
      .replace(/^`|`$/g, "")              // inline code `
      .trim();

  const normalizedTitle = clean(title).toLowerCase();
  const lines = body.replace(/\r\n/g, "\n").split("\n");

  // skip leading blank lines
  let firstIdx = 0;
  while (firstIdx < lines.length && !lines[firstIdx].trim()) firstIdx++;
  if (firstIdx >= lines.length) return body;

  const firstLine = clean(lines[firstIdx]);
  if (firstLine.toLowerCase() === normalizedTitle) {
    return lines.slice(firstIdx + 1).join("\n").trimStart();
  }
  return body;
}

function Markdown({ source }: { source: string }) {
  const html = useMemo(() => {
    const lines = source.replace(/\r\n/g, "\n").split("\n");
    const out: string[] = [];
    let inList: "ul" | "ol" | null = null;

    const closeList = () => {
      if (inList) { out.push(`</${inList}>`); inList = null; }
    };

    for (let raw of lines) {
      const line = raw.trimEnd();
      if (!line.trim()) { closeList(); continue; }

      // headings
      const h = /^(#{1,4})\s+(.*)$/.exec(line);
      if (h) {
        closeList();
        const level = Math.min(h[1].length + 1, 5); // h2..h5
        const size = level === 2 ? "text-base" : level === 3 ? "text-sm" : "text-sm";
        out.push(`<h${level} class="${size} font-semibold tracking-tight text-foreground mt-3 mb-1">${renderInline(h[2])}</h${level}>`);
        continue;
      }

      // unordered list
      const ul = /^\s*[-*•]\s+(.*)$/.exec(line);
      if (ul) {
        if (inList !== "ul") { closeList(); out.push('<ul class="list-disc pl-5 space-y-1 my-1">'); inList = "ul"; }
        out.push(`<li>${renderInline(ul[1])}</li>`);
        continue;
      }

      // ordered list
      const ol = /^\s*\d+[.)]\s+(.*)$/.exec(line);
      if (ol) {
        if (inList !== "ol") { closeList(); out.push('<ol class="list-decimal pl-5 space-y-1 my-1">'); inList = "ol"; }
        out.push(`<li>${renderInline(ol[1])}</li>`);
        continue;
      }

      closeList();
      out.push(`<p class="my-1 leading-relaxed">${renderInline(line)}</p>`);
    }
    closeList();
    return out.join("");
  }, [source]);

  return (
    <div
      className="text-sm text-foreground/85 [&_strong]:text-foreground"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/* ------------------------------------------------------------------ */

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
    <div className="space-y-4">
      {/* Capture card */}
      <Card
        className="border-border/60 shadow-sm"
        style={{ background: "var(--surface, hsl(var(--card)))" }}
      >
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold tracking-tight flex items-center gap-2">
            <span
              className="inline-flex h-7 w-7 items-center justify-center rounded-md"
              style={{ background: "var(--brand-base-soft, hsl(var(--muted)))", color: "var(--brand-spectrum-from, hsl(var(--primary)))" }}
            >
              <NotebookPen className="h-4 w-4" />
            </span>
            Capture a note
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Speak a recruitment or retention thought — AI structures it, your agency keeps it.
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
                  Recording · <span className="num font-mono">{mmss}</span>
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={cancel}>Cancel</Button>
                  <Button size="sm" onClick={stopAndStructure} className="gap-1.5">
                    <Square className="h-3.5 w-3.5" /> Stop & structure
                  </Button>
                </div>
              </div>
              {transcript && (
                <div className="text-xs text-muted-foreground rounded-md border border-border/60 bg-muted/30 p-2 max-h-32 overflow-y-auto whitespace-pre-wrap">
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
            <div className="space-y-3">
              <Input
                placeholder="Title (optional)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={10}
                className="font-mono text-sm leading-relaxed"
              />
              <div className="rounded-md border border-border/60 bg-muted/20 p-3">
                <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Preview</div>
                <Markdown source={stripTitleFromBody(title, body)} />
              </div>
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={cancel} disabled={saving}>Discard</Button>
                <Button size="sm" onClick={save} disabled={saving} className="gap-1.5">
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Save note
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Saved notes */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
            Agency notes
          </h2>
          <span className="text-[11px] text-muted-foreground">
            {notes.length} {notes.length === 1 ? "note" : "notes"}
          </span>
        </div>

        {isLoading ? (
          <div className="text-xs text-muted-foreground py-4 flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin" /> Loading…
          </div>
        ) : notes.length === 0 ? (
          <Card className="border-dashed border-border/60 bg-transparent">
            <CardContent className="py-8 text-center">
              <NotebookPen className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
              <div className="text-sm text-muted-foreground">No notes yet — record your first one above.</div>
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-3">
            {notes.map((n: any) => (
              <li key={n.id}>
                <Card className="border-border/60 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-baseline justify-between gap-3 mb-2">
                      <h3 className="text-sm font-semibold tracking-tight text-foreground">
                        {n.title || "Untitled note"}
                      </h3>
                      <div className="text-[11px] font-mono text-muted-foreground shrink-0">
                        {new Date(n.created_at).toLocaleDateString("en-AU", {
                          day: "numeric", month: "short", year: "numeric",
                        })}
                      </div>
                    </div>
                    <Markdown source={stripTitleFromBody(n.title || "", n.body || "")} />
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
