import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Mic, Square, Loader2, Sparkles, Save, NotebookPen, UserPlus, Check, Clock, Bell, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

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

  // Pending tags addressed to the current user — used to surface notes and
  // drive auto-acknowledge on open.
  const { data: myPendingTags = [] } = useQuery({
    queryKey: ["my_pending_recruitment_tags", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recruitment_note_tags" as any)
        .select("id, note_id")
        .eq("tagged_user_id", user!.id)
        .eq("status", "pending");
      if (error) throw error;
      return (data || []) as any[];
    },
  });
  const myPendingNoteIds = useMemo(
    () => new Set(myPendingTags.map((t: any) => t.note_id)),
    [myPendingTags]
  );

  // URL params for focus / pendingOnly surfacing
  const [searchParams, setSearchParams] = useSearchParams();
  const focusId = searchParams.get("focus");
  const pendingOnly = searchParams.get("pendingOnly") === "1";

  // Sort: focused note first, then notes where the current user has a pending
  // tag, then by created_at desc.
  const orderedNotes = useMemo(() => {
    const arr = [...notes];
    arr.sort((a: any, b: any) => {
      const aFocus = a.id === focusId ? 1 : 0;
      const bFocus = b.id === focusId ? 1 : 0;
      if (aFocus !== bFocus) return bFocus - aFocus;
      const aPending = myPendingNoteIds.has(a.id) ? 1 : 0;
      const bPending = myPendingNoteIds.has(b.id) ? 1 : 0;
      if (aPending !== bPending) return bPending - aPending;
      const at = new Date(a.created_at).getTime();
      const bt = new Date(b.created_at).getTime();
      return bt - at;
    });
    return arr;
  }, [notes, focusId, myPendingNoteIds]);

  // Scroll focused note into view once it renders.
  const focusRef = useRef<HTMLLIElement | null>(null);
  useEffect(() => {
    if (!focusId) return;
    const t = setTimeout(() => {
      focusRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
    return () => clearTimeout(t);
  }, [focusId, orderedNotes.length]);

  // Clear focus/pendingOnly params after first render so refreshes don't re-trigger.
  useEffect(() => {
    if (!focusId && !pendingOnly) return;
    const next = new URLSearchParams(searchParams);
    let changed = false;
    if (next.has("focus")) { next.delete("focus"); changed = true; }
    if (next.has("pendingOnly")) { next.delete("pendingOnly"); changed = true; }
    if (changed) setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


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
          <ul className="space-y-1.5">
            {(pendingOnly
              ? orderedNotes.filter((n: any) => myPendingNoteIds.has(n.id))
              : orderedNotes
            ).map((n: any) => {
              const isFocus = n.id === focusId;
              const isPendingForMe = myPendingNoteIds.has(n.id);
              return (
                <li key={n.id} ref={isFocus ? focusRef : undefined}>
                  <NoteCard
                    note={n}
                    currentUserId={user?.id}
                    highlight={isFocus}
                    defaultExpanded={isFocus || isPendingForMe}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Note card with tags                                                */
/* ------------------------------------------------------------------ */

function NoteCard({
  note,
  currentUserId,
  highlight,
  defaultExpanded,
}: {
  note: any;
  currentUserId?: string;
  highlight?: boolean;
  defaultExpanded?: boolean;
}) {
  const qc = useQueryClient();
  const isAuthor = !!currentUserId && note.author_id === currentUserId;
  const [expanded, setExpanded] = useState(!!defaultExpanded);

  const { data: tags = [] } = useQuery({
    queryKey: ["recruitment_note_tags", note.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recruitment_note_tags" as any)
        .select("id, tagged_user_id, status")
        .eq("note_id", note.id);
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const taggedUserIds = useMemo(() => tags.map((t: any) => t.tagged_user_id), [tags]);

  const { data: taggedUsers = [] } = useQuery({
    queryKey: ["portal_users_by_ids", taggedUserIds],
    enabled: taggedUserIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portal_users")
        .select("id, display_name, email, role")
        .in("id", taggedUserIds);
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const userMap = useMemo(() => {
    const m: Record<string, any> = {};
    for (const u of taggedUsers) m[u.id] = u;
    return m;
  }, [taggedUsers]);

  // Find current user's pending tag on this note (if any). Acknowledgement is
  // manual via the "Acknowledge" button below — do NOT auto-flip on view.
  const myPendingTag = useMemo(
    () => tags.find((t: any) => t.tagged_user_id === currentUserId && t.status === "pending"),
    [tags, currentUserId]
  );
  const [acking, setAcking] = useState(false);
  const acknowledgeMine = useCallback(async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!myPendingTag || acking) return;
    setAcking(true);
    const { error } = await supabase
      .from("recruitment_note_tags" as any)
      .update({ status: "acknowledged", acknowledged_at: new Date().toISOString() })
      .eq("id", myPendingTag.id);
    setAcking(false);
    if (error) {
      toast.error("Could not acknowledge");
      return;
    }
    qc.invalidateQueries({ queryKey: ["recruitment_note_tags", note.id] });
    qc.invalidateQueries({ queryKey: ["my_pending_recruitment_tags", currentUserId] });
  }, [myPendingTag, acking, qc, note.id, currentUserId]);

  const accent = highlight || !!myPendingTag;

  const tagChips = (
    <>
      {tags.map((t: any) => {
        const u = userMap[t.tagged_user_id];
        const name = u?.display_name || u?.email || "Unknown";
        const acknowledged = t.status === "acknowledged";
        return (
          <Badge
            key={t.id}
            variant="outline"
            className="gap-1 text-[10px] font-normal border-border/60 px-1.5 py-0"
            style={{
              background: acknowledged
                ? "var(--brand-base-soft, hsl(var(--muted)))"
                : "transparent",
              color: acknowledged ? "var(--bone)" : undefined,
            }}
          >
            {acknowledged ? (
              <Check className="h-2.5 w-2.5" style={{ color: "var(--bone)" }} />
            ) : (
              <Clock className="h-2.5 w-2.5 text-muted-foreground" />
            )}
            <span className={acknowledged ? "" : "text-foreground"}>{name}</span>
          </Badge>
        );
      })}
    </>
  );

  return (
    <div
      className="rounded-md border bg-card shadow-sm transition-all"
      style={{
        borderColor: accent
          ? "var(--brand-spectrum-from, hsl(var(--primary)))"
          : "hsl(var(--border) / 0.6)",
        boxShadow: accent
          ? "0 0 0 1px var(--brand-base-soft, hsl(var(--muted)))"
          : undefined,
      }}
    >
      {/* Summary row — click to toggle */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/30 rounded-md"
        aria-expanded={expanded}
      >
        <ChevronRight
          className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`}
        />
        <div className="min-w-0 flex-1 flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold tracking-tight text-foreground truncate">
            {note.title || "Untitled note"}
          </span>
          {myPendingTag && (
            <span
              className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded"
              style={{
                background: "var(--brand-base-soft, hsl(var(--muted)))",
                color: "var(--brand-spectrum-from, hsl(var(--primary)))",
              }}
            >
              <Bell className="h-3 w-3" /> Tagged for you
            </span>
          )}
          <span className="flex flex-wrap items-center gap-1">{tagChips}</span>
        </div>
        {myPendingTag && (
          <span
            role="button"
            tabIndex={0}
            onClick={acknowledgeMine}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") acknowledgeMine(e as any);
            }}
            className="inline-flex items-center gap-1 h-6 px-2 text-[11px] rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-60 shrink-0"
            aria-disabled={acking}
          >
            <Check className="h-3 w-3" />
            {acking ? "…" : "Acknowledge"}
          </span>
        )}
        <span className="text-[11px] font-mono text-muted-foreground shrink-0">
          {new Date(note.created_at).toLocaleDateString("en-AU", {
            day: "numeric", month: "short", year: "numeric",
          })}
        </span>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-border/60">
          <Markdown source={stripTitleFromBody(note.title || "", note.body || "")} />
          {isAuthor && (
            <div className="mt-3 pt-3 border-t border-border/60 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mr-1">
                Tag teammates
              </span>
              <TagPicker
                noteId={note.id}
                currentUserId={currentUserId!}
                existingTaggedIds={taggedUserIds}
                onTagged={() => {
                  qc.invalidateQueries({ queryKey: ["recruitment_note_tags", note.id] });
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tag picker                                                         */
/* ------------------------------------------------------------------ */

function TagPicker({
  noteId,
  currentUserId,
  existingTaggedIds,
  onTagged,
}: {
  noteId: string;
  currentUserId: string;
  existingTaggedIds: string[];
  onTagged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: agencyUsers = [], isLoading } = useQuery({
    queryKey: ["portal_users_agency_for_tag", currentUserId],
    enabled: open,
    queryFn: async () => {
      // 1) Load caller's own scoping fields
      const { data: me, error: meErr } = await supabase
        .from("portal_users")
        .select("id, agency_id, division_id, role")
        .eq("id", currentUserId)
        .maybeSingle();
      if (meErr) throw meErr;
      if (!me?.agency_id) return [];

      const isCrossDivision =
        me.role === "admin" || me.role === "gm" || me.role === "eleva_ops";

      // 2) Pull approved teammates in the same agency
      const { data: peers, error: peersErr } = await supabase
        .from("portal_users")
        .select("id, display_name, email, role, division_id, agency_id")
        .eq("approved", true)
        .eq("agency_id", me.agency_id)
        .order("display_name", { ascending: true });
      if (peersErr) throw peersErr;

      // 3) If cross-division roles, return everyone in agency
      if (isCrossDivision) return (peers || []) as any[];

      // 4) Otherwise: division-scope only if agency has >1 division
      const { count, error: cErr } = await supabase
        .from("agency_divisions" as any)
        .select("id", { count: "exact", head: true })
        .eq("agency_id", me.agency_id);
      if (cErr) throw cErr;

      if ((count ?? 0) <= 1) return (peers || []) as any[];

      return (peers || []).filter(
        (u: any) => u.division_id && u.division_id === me.division_id
      ) as any[];
    },
  });

  const selectable = useMemo(
    () => agencyUsers.filter((u: any) => u.id !== currentUserId),
    [agencyUsers, currentUserId]
  );


  const handleTag = async (userId: string, name: string) => {
    if (existingTaggedIds.includes(userId)) {
      toast.info(`${name} is already tagged`);
      return;
    }
    setBusyId(userId);
    try {
      const { error } = await supabase
        .from("recruitment_note_tags" as any)
        .insert({ note_id: noteId, tagged_user_id: userId });
      if (error) {
        if ((error as any).code === "23505") {
          toast.info(`${name} is already tagged`);
        } else {
          throw error;
        }
      } else {
        toast.success(`Tagged ${name}`);
      }
      onTagged();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to tag");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="h-6 px-2 text-[11px] gap-1 border-dashed border-border/60"
        >
          <UserPlus className="h-3 w-3" /> Tag
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <div className="px-3 py-2 border-b border-border/60">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            Tag a teammate
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto py-1">
          {isLoading ? (
            <div className="px-3 py-3 text-xs text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading…
            </div>
          ) : selectable.length === 0 ? (
            <div className="px-3 py-3 text-xs text-muted-foreground">
              No teammates available.
            </div>
          ) : (
            selectable.map((u: any) => {
              const already = existingTaggedIds.includes(u.id);
              const busy = busyId === u.id;
              return (
                <button
                  key={u.id}
                  onClick={() => handleTag(u.id, u.display_name || u.email || "User")}
                  disabled={busy || already}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-muted/60 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-foreground truncate">
                      {u.display_name || u.email || "Unnamed"}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {u.role}
                    </div>
                  </div>
                  {busy ? (
                    <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                  ) : already ? (
                    <Check className="h-3 w-3 shrink-0" style={{ color: "var(--brand-spectrum-from, hsl(var(--primary)))" }} />
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
