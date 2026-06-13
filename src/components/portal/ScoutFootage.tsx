import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Play, ExternalLink, Upload, Link as LinkIcon, Film } from "lucide-react";
import { toast } from "sonner";

type Footage = {
  id: string;
  scout_lead_id: string;
  kind: "link" | "file";
  url: string;
  label: string | null;
  source: string | null;
  captured_on: string | null;
  added_by: string | null;
  created_at: string;
};

const MAX_FILE_BYTES = 200 * 1024 * 1024; // 200 MB

type Platform = "youtube" | "vimeo" | "veo" | "hudl" | "drive" | "other";

function detectPlatform(url: string): Platform {
  const u = url.toLowerCase();
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
  if (u.includes("vimeo.com")) return "vimeo";
  if (u.includes("veo.co")) return "veo";
  if (u.includes("hudl.com")) return "hudl";
  if (u.includes("drive.google.com")) return "drive";
  return "other";
}

function youtubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1) || null;
    if (u.searchParams.get("v")) return u.searchParams.get("v");
    const parts = u.pathname.split("/");
    const i = parts.indexOf("embed");
    if (i >= 0 && parts[i + 1]) return parts[i + 1];
    return null;
  } catch {
    return null;
  }
}

function vimeoId(url: string): string | null {
  try {
    const u = new URL(url);
    const m = u.pathname.match(/\/(\d+)/);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
}

function platformLabel(p: Platform) {
  return { youtube: "YouTube", vimeo: "Vimeo", veo: "Veo", hudl: "Hudl", drive: "Google Drive", other: "Link" }[p];
}

function FootagePlayer({ item }: { item: Footage }) {
  const [loaded, setLoaded] = useState(false);

  if (item.kind === "file") {
    const { data } = supabase.storage.from("scout-footage").getPublicUrl(item.url);
    // Private bucket → need signed URL
    const [signed, setSigned] = useState<string | null>(null);
    if (!signed) {
      supabase.storage.from("scout-footage").createSignedUrl(item.url, 3600).then(({ data: d }) => {
        if (d?.signedUrl) setSigned(d.signedUrl);
      });
    }
    return signed ? (
      <video src={signed} controls preload="metadata" className="w-full rounded-md bg-black aspect-video" />
    ) : (
      <div className="aspect-video rounded-md bg-muted flex items-center justify-center text-xs text-muted-foreground">
        Loading clip…
      </div>
    );
  }

  const platform = detectPlatform(item.url);

  if (platform === "youtube") {
    const id = youtubeId(item.url);
    if (id) {
      return loaded ? (
        <iframe
          src={`https://www.youtube.com/embed/${id}?autoplay=1`}
          title={item.label || "YouTube clip"}
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full aspect-video rounded-md bg-black"
        />
      ) : (
        <button
          onClick={() => setLoaded(true)}
          className="relative w-full aspect-video rounded-md overflow-hidden bg-black group"
        >
          <img
            src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
            alt={item.label || "YouTube thumbnail"}
            className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition"
            loading="lazy"
          />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="h-12 w-12 rounded-full bg-black/70 flex items-center justify-center">
              <Play className="h-6 w-6 text-white fill-white ml-0.5" />
            </span>
          </span>
        </button>
      );
    }
  }

  if (platform === "vimeo") {
    const id = vimeoId(item.url);
    if (id) {
      return loaded ? (
        <iframe
          src={`https://player.vimeo.com/video/${id}?autoplay=1`}
          title={item.label || "Vimeo clip"}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          className="w-full aspect-video rounded-md bg-black"
        />
      ) : (
        <button
          onClick={() => setLoaded(true)}
          className="relative w-full aspect-video rounded-md bg-black flex items-center justify-center group"
        >
          <span className="h-12 w-12 rounded-full bg-white/15 group-hover:bg-white/25 flex items-center justify-center">
            <Play className="h-6 w-6 text-white fill-white ml-0.5" />
          </span>
          <span className="absolute bottom-2 left-2 text-[11px] text-white/80">Vimeo</span>
        </button>
      );
    }
  }

  // Veo / Hudl / Drive / Other → labelled card opens in new tab
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-md border border-border bg-secondary/40 hover:bg-secondary p-3 transition"
    >
      <div className="h-10 w-10 rounded bg-primary/15 text-primary flex items-center justify-center">
        <Film className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{item.label || `${platformLabel(platform)} clip`}</div>
        <div className="text-[11px] text-muted-foreground truncate">{item.url}</div>
      </div>
      <ExternalLink className="h-4 w-4 text-muted-foreground" />
    </a>
  );
}

export function FootageChip({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border"
      style={{ background: "hsl(var(--primary) / 0.15)", color: "hsl(var(--primary))", borderColor: "hsl(var(--primary) / 0.3)" }}
      title={`${count} footage clip${count === 1 ? "" : "s"}`}
    >
      <Play className="h-2.5 w-2.5 fill-current" />
      Footage{count > 1 ? ` · ${count}` : ""}
    </span>
  );
}

export function useFootageCount(scoutLeadId: string) {
  return useQuery({
    queryKey: ["scout_footage_count", scoutLeadId],
    queryFn: async () => {
      const { count, error } = await (supabase as any)
        .from("scout_footage")
        .select("id", { count: "exact", head: true })
        .eq("scout_lead_id", scoutLeadId);
      if (error) return 0;
      return count || 0;
    },
    enabled: !!scoutLeadId,
  });
}

export default function ScoutFootage({ scoutLeadId }: { scoutLeadId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [link, setLink] = useState("");
  const [label, setLabel] = useState("");
  const [source, setSource] = useState("");
  const [capturedOn, setCapturedOn] = useState("");
  const [consent, setConsent] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["scout_footage", scoutLeadId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("scout_footage")
        .select("*")
        .eq("scout_lead_id", scoutLeadId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Footage[];
    },
    enabled: !!scoutLeadId,
  });

  function reset() {
    setLink(""); setLabel(""); setSource(""); setCapturedOn("");
    setConsent(false); setFile(null); setUploadPct(null);
  }

  async function handleSave() {
    if (!user) return toast.error("Sign in first");
    if (!consent) return toast.error("Please confirm appropriate use");
    if (!link.trim() && !file) return toast.error("Paste a link or choose a file");

    setSaving(true);
    try {
      let kind: "link" | "file" = "link";
      let url = link.trim();

      if (file) {
        if (file.size > MAX_FILE_BYTES) {
          throw new Error("File is over 200 MB. Use a hosted link (Veo, YouTube, Drive) instead.");
        }
        const ext = file.name.split(".").pop() || "mp4";
        const path = `${scoutLeadId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        setUploadPct(10);
        const { error: upErr } = await supabase.storage
          .from("scout-footage")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (upErr) throw upErr;
        setUploadPct(100);
        kind = "file";
        url = path;
      } else {
        try { new URL(url); } catch { throw new Error("That doesn't look like a valid URL"); }
      }

      const { error } = await (supabase as any).from("scout_footage").insert({
        scout_lead_id: scoutLeadId,
        kind,
        url,
        label: label.trim() || null,
        source: source.trim() || null,
        captured_on: capturedOn || null,
        consent_acknowledged: true,
        added_by: user.id,
      });
      if (error) throw error;

      toast.success("Footage added");
      reset();
      setAdding(false);
      qc.invalidateQueries({ queryKey: ["scout_footage", scoutLeadId] });
      qc.invalidateQueries({ queryKey: ["scout_footage_count", scoutLeadId] });
    } catch (e: any) {
      toast.error(e.message || "Could not save footage");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: Footage) {
    if (!confirm("Remove this footage?")) return;
    if (item.kind === "file") {
      await supabase.storage.from("scout-footage").remove([item.url]);
    }
    const { error } = await (supabase as any).from("scout_footage").delete().eq("id", item.id);
    if (error) return toast.error(error.message);
    toast.success("Removed");
    qc.invalidateQueries({ queryKey: ["scout_footage", scoutLeadId] });
    qc.invalidateQueries({ queryKey: ["scout_footage_count", scoutLeadId] });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Film className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-semibold">Footage</h4>
          {items.length > 0 && (
            <span className="text-[11px] text-muted-foreground">{items.length}</span>
          )}
        </div>
        {!adding && (
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setAdding(true)}>
            <Plus className="h-3 w-3 mr-1" /> Add footage
          </Button>
        )}
      </div>

      {adding && (
        <div className="rounded-md border border-border bg-secondary/30 p-3 space-y-3">
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1">
              <LinkIcon className="h-3 w-3" /> Footage link
            </Label>
            <Input
              placeholder="Paste a YouTube, Veo, Hudl, Vimeo or Drive link"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Label (optional)</Label>
              <Input
                placeholder='e.g. "CHS Carnival — 2nd half"'
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Source</Label>
                <Input
                  placeholder="Veo, Hudl…"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Date</Label>
                <Input
                  type="date"
                  value={capturedOn}
                  onChange={(e) => setCapturedOn(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            </div>
          </div>

          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground flex items-center gap-1">
              <Upload className="h-3 w-3" /> Or upload a file (secondary — large clips need wifi)
            </summary>
            <div className="pt-2 space-y-1">
              <Input
                type="file"
                accept="video/mp4,video/quicktime,video/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="h-8 text-xs"
              />
              {file && (
                <div className="text-[11px] text-muted-foreground">
                  {file.name} · {(file.size / (1024 * 1024)).toFixed(1)} MB
                </div>
              )}
              {uploadPct !== null && (
                <div className="h-1.5 bg-muted rounded overflow-hidden">
                  <div className="h-full bg-primary transition-all" style={{ width: `${uploadPct}%` }} />
                </div>
              )}
              <p className="text-[11px] text-muted-foreground">Max 200 MB. Link-paste is faster for most footage.</p>
            </div>
          </details>

          <label className="flex items-start gap-2 text-xs cursor-pointer">
            <Checkbox
              checked={consent}
              onCheckedChange={(v) => setConsent(!!v)}
              className="mt-0.5"
            />
            <span className="text-muted-foreground leading-snug">
              I confirm this footage was obtained appropriately (public game/carnival or with permission)
              and is used solely for talent assessment.
            </span>
          </label>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => { reset(); setAdding(false); }} disabled={saving}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving || !consent}>
              {saving ? "Saving…" : "Add footage"}
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-xs text-muted-foreground">Loading footage…</div>
      ) : items.length === 0 && !adding ? (
        <div className="text-xs text-muted-foreground italic">
          No footage yet — add a link or clip so agents can see this prospect play.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="space-y-1.5">
              <FootagePlayer item={item} />
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{item.label || (item.kind === "file" ? "Uploaded clip" : platformLabel(detectPlatform(item.url)) + " clip")}</div>
                  <div className="text-muted-foreground truncate">
                    {[item.source, item.captured_on].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(item)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
