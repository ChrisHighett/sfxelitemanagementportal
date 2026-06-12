// Lightweight transcript cleaner for Teams / Zoom / pasted text.
// Goals:
// - Strip cue numbers, timestamps, WEBVTT headers
// - Preserve speaker labels so the AI knows who said what
// - Collapse adjacent same-speaker lines

const TIMESTAMP_RE = /^\d{2}:\d{2}:\d{2}[.,]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[.,]\d{3}.*$/;
const SHORT_TIMESTAMP_RE = /^\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d{1,3})?\s*-->\s*\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d{1,3})?.*$/;
const CUE_NUMBER_RE = /^\d+$/;
const TEAMS_VOICE_TAG = /<v\s+([^>]+?)>([\s\S]*?)<\/v>/g;
const HTML_TAG_RE = /<[^>]+>/g;

export interface ParsedTranscript {
  cleaned: string;          // ready to feed the AI
  speakerCount: number;     // detected unique speakers (0 if none)
  lineCount: number;
}

export function cleanTranscript(raw: string): ParsedTranscript {
  if (!raw) return { cleaned: "", speakerCount: 0, lineCount: 0 };

  let text = raw.replace(/\r\n/g, "\n").trim();

  // Strip WEBVTT header & NOTE blocks
  text = text.replace(/^WEBVTT[^\n]*\n+/i, "");
  text = text.replace(/^NOTE[^\n]*(?:\n(?!\n).*)*/gm, "");

  // Convert Teams <v Speaker>text</v> into "Speaker: text"
  text = text.replace(TEAMS_VOICE_TAG, (_m, speaker, content) => {
    return `${String(speaker).trim()}: ${String(content).trim()}`;
  });

  // Drop remaining HTML/cue tags
  text = text.replace(HTML_TAG_RE, "");

  const rawLines = text.split("\n");
  const out: { speaker: string | null; text: string }[] = [];
  const speakers = new Set<string>();

  for (let i = 0; i < rawLines.length; i++) {
    let line = rawLines[i].trim();
    if (!line) continue;
    if (CUE_NUMBER_RE.test(line)) continue;
    if (TIMESTAMP_RE.test(line) || SHORT_TIMESTAMP_RE.test(line)) continue;
    // Zoom .txt often has a bare timestamp line like "00:00:12.345"
    if (/^\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d{1,3})?$/.test(line)) continue;

    // Detect "Speaker Name: text" on a single line
    const m = line.match(/^([A-Z][A-Za-z0-9 ._'-]{0,60}?):\s*(.+)$/);
    let speaker: string | null = null;
    let body = line;
    if (m) {
      speaker = m[1].trim();
      body = m[2].trim();
    } else if (
      // Pattern: speaker on its own line, next non-empty line is the speech (Zoom new format)
      /^[A-Z][A-Za-z0-9 ._'-]{0,60}$/.test(line) &&
      rawLines[i + 1] &&
      rawLines[i + 1].trim() &&
      !TIMESTAMP_RE.test(rawLines[i + 1].trim())
    ) {
      speaker = line;
      body = "";
    }

    if (speaker) speakers.add(speaker);

    // Coalesce with previous line if same speaker (or both speaker-less)
    const last = out[out.length - 1];
    if (last && last.speaker === speaker && body) {
      last.text = (last.text + " " + body).trim();
    } else if (body) {
      out.push({ speaker, text: body });
    } else if (speaker) {
      // bare speaker line: push it so the next text attaches
      out.push({ speaker, text: "" });
    }
  }

  // Render
  const lines = out
    .filter((l) => l.text.trim().length > 0)
    .map((l) => (l.speaker ? `${l.speaker}: ${l.text}` : l.text));

  return {
    cleaned: lines.join("\n"),
    speakerCount: speakers.size,
    lineCount: lines.length,
  };
}

export async function readTranscriptFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".docx")) {
    // Lazy-load mammoth so it isn't in the main bundle
    const mammoth = await import("mammoth/mammoth.browser");
    const buf = await file.arrayBuffer();
    const { value } = await mammoth.extractRawText({ arrayBuffer: buf });
    return value || "";
  }
  // .vtt, .txt, anything text-ish
  return await file.text();
}
