import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload, FileText, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { cleanTranscript, readTranscriptFile } from "@/lib/transcript-parser";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Called when the user submits with cleaned transcript + metadata. */
  onSubmit: (args: { transcript: string; callType: string; meetingDate: string }) => void;
}

const MEETING_TYPES = [
  { value: "monthly_review", label: "Athlete check-in" },
  { value: "club_conversation", label: "Club" },
  { value: "commercial", label: "Commercial" },
  { value: "media", label: "Media" },
  { value: "general", label: "General" },
] as const;

export default function TranscriptImportDialog({ open, onOpenChange, onSubmit }: Props) {
  const [rawText, setRawText] = useState("");
  const [callType, setCallType] = useState<string>("monthly_review");
  const [meetingDate, setMeetingDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [consent, setConsent] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [preview, setPreview] = useState<{ lines: number; speakers: number } | null>(null);

  function reset() {
    setRawText(""); setCallType("monthly_review");
    setMeetingDate(new Date().toISOString().slice(0, 10));
    setConsent(false); setPreview(null);
  }

  async function onFileChosen(file: File | null) {
    if (!file) return;
    setParsing(true);
    try {
      const text = await readTranscriptFile(file);
      setRawText(text);
      const { lineCount, speakerCount } = cleanTranscript(text);
      setPreview({ lines: lineCount, speakers: speakerCount });
      toast.success(`Loaded transcript: ${lineCount} lines, ${speakerCount} speaker${speakerCount === 1 ? "" : "s"}`);
    } catch (e: any) {
      toast.error("Couldn't read file: " + (e?.message || "unknown"));
    } finally {
      setParsing(false);
    }
  }

  function recomputePreview(text: string) {
    setRawText(text);
    if (!text.trim()) { setPreview(null); return; }
    const { lineCount, speakerCount } = cleanTranscript(text);
    setPreview({ lines: lineCount, speakers: speakerCount });
  }

  function submit() {
    if (!rawText.trim()) { toast.error("Add or upload a transcript first"); return; }
    if (!consent) { toast.error("Please confirm all parties were informed"); return; }
    const { cleaned } = cleanTranscript(rawText);
    if (!cleaned.trim()) { toast.error("Transcript looks empty after parsing"); return; }
    onSubmit({ transcript: cleaned, callType, meetingDate });
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" /> Import meeting transcript
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Meeting type</Label>
              <Select value={callType} onValueChange={setCallType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MEETING_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Meeting date</Label>
              <Input type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Upload Teams / Zoom transcript file</Label>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept=".vtt,.txt,.docx,text/vtt,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(e) => onFileChosen(e.target.files?.[0] ?? null)}
              />
              {parsing && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>
            <p className="text-xs text-muted-foreground">
              Accepts <code>.vtt</code>, <code>.txt</code>, <code>.docx</code> — Teams and Zoom both export these.
            </p>
          </div>

          <div className="space-y-1">
            <Label>…or paste transcript text</Label>
            <Textarea
              value={rawText}
              onChange={(e) => recomputePreview(e.target.value)}
              placeholder="Paste the full transcript here..."
              className="min-h-[160px] font-mono text-xs"
            />
            {preview && (
              <p className="text-xs text-muted-foreground">
                Parsed: <span className="font-medium text-foreground">{preview.lines}</span> dialogue lines
                {preview.speakers > 0 ? <> from <span className="font-medium text-foreground">{preview.speakers}</span> speaker{preview.speakers === 1 ? "" : "s"}</> : null}.
              </p>
            )}
          </div>

          <div className="flex items-start gap-2 p-3 rounded-md bg-muted/50 border">
            <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <label className="text-xs flex items-start gap-2 cursor-pointer">
              <Checkbox checked={consent} onCheckedChange={(v) => setConsent(!!v)} className="mt-0.5" />
              <span>
                I confirm all parties were informed the meeting was recorded/transcribed in Teams/Zoom before importing.
              </span>
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => { reset(); onOpenChange(false); }}>Cancel</Button>
          <Button onClick={submit} disabled={!rawText.trim() || !consent}>
            <Upload className="h-4 w-4 mr-1" /> Import & generate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
