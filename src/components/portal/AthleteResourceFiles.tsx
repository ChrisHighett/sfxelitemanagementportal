import React, { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Upload, Trash2, Download, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = [
  "Nutrition",
  "Recovery",
  "Mindset",
  "Media Training",
  "Social Media",
  "Parent Playbook",
  "Tracker",
  "Program",
  "Report",
  "School",
  "Management Contract",
  "Playing Contract",
  "Other",
];

interface AthleteResource {
  id: string;
  athlete_id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  title: string;
  description: string | null;
  category: string;
  created_at: string;
  uploaded_by: string | null;
}

interface Props {
  athleteId: string;
  canManage: boolean; // true for admin/agent, false for athlete/parent
}

export default function AthleteResourceFiles({ athleteId, canManage }: Props) {
  const { user } = useAuth();
  const [resources, setResources] = useState<AthleteResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Other");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Reset state completely when athleteId changes to prevent cross-athlete leakage
  useEffect(() => {
    setResources([]);
    setLoading(true);
    setDialogOpen(false);
    setTitle("");
    setDescription("");
    setCategory("Other");
    setSelectedFile(null);
    fetchResources();
  }, [athleteId]);

  async function fetchResources() {
    setLoading(true);
    const { data, error } = await supabase
      .from("athlete_resources")
      .select("*")
      .eq("athlete_id", athleteId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching athlete resources:", error);
    } else {
      setResources((data as AthleteResource[]) || []);
    }
    setLoading(false);
  }

  async function handleUpload() {
    if (!selectedFile || !title.trim()) {
      toast.error("Please provide a title and select a file.");
      return;
    }
    setUploading(true);
    const safeName = `${Date.now()}_${selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const storagePath = `athletes/${athleteId}/resources/${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("athlete-resources")
      .upload(storagePath, selectedFile);

    if (uploadError) {
      toast.error(`Upload failed: ${uploadError.message}`);
      setUploading(false);
      return;
    }

    const { error: dbError } = await supabase.from("athlete_resources").insert({
      athlete_id: athleteId,
      uploaded_by: user?.id || null,
      file_name: selectedFile.name,
      file_path: storagePath,
      file_size: selectedFile.size,
      title: title.trim(),
      description: description.trim() || null,
      category,
    });

    if (dbError) {
      toast.error(`Failed to save record: ${dbError.message}`);
    } else {
      toast.success(`"${title.trim()}" uploaded successfully`);
      setDialogOpen(false);
      setTitle("");
      setDescription("");
      setCategory("Other");
      setSelectedFile(null);
      fetchResources();
    }
    setUploading(false);
  }

  async function handleDelete(resource: AthleteResource) {
    const { error: storageError } = await supabase.storage
      .from("athlete-resources")
      .remove([resource.file_path]);
    if (storageError) {
      toast.error(`Delete failed: ${storageError.message}`);
      return;
    }
    const { error: dbError } = await supabase
      .from("athlete_resources")
      .delete()
      .eq("id", resource.id);
    if (dbError) {
      toast.error(`Failed to remove record: ${dbError.message}`);
    } else {
      toast.success("File deleted");
      fetchResources();
    }
  }

  async function handleDownload(resource: AthleteResource) {
    const { data, error } = await supabase.storage
      .from("athlete-resources")
      .createSignedUrl(resource.file_path, 60);

    if (error || !data?.signedUrl) {
      toast.error("Could not generate download link");
      return;
    }
    window.open(data.signedUrl, "_blank");
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-AU", { year: "numeric", month: "short", day: "numeric" });

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">Athlete Files</CardTitle>
        {canManage && (
          <Button size="sm" className="gap-1.5" onClick={() => setDialogOpen(true)}>
            <Upload className="h-3.5 w-3.5" />
            Upload File
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : resources.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No files uploaded for this athlete yet.</p>
        ) : (
          <div className="space-y-2">
            {resources.map((res) => (
              <div
                key={res.id}
                className="flex items-start justify-between gap-3 rounded-lg border p-3 bg-muted/30"
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <FileText className="h-5 w-5 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{res.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{res.file_name}</div>
                    {res.description && (
                      <div className="text-xs text-muted-foreground mt-1">{res.description}</div>
                    )}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <Badge variant="secondary" className="text-xs">{res.category}</Badge>
                      <span className="text-xs text-muted-foreground">{formatDate(res.created_at)}</span>
                      {res.file_size && (
                        <span className="text-xs text-muted-foreground">{formatSize(res.file_size)}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleDownload(res)}>
                    <Download className="h-4 w-4" />
                  </Button>
                  {canManage && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(res)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Upload Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload File for Athlete</DialogTitle>
            <DialogDescription>
              This file will only be visible to this athlete and their linked parent/guardian.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Title *</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. March Training Program"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description..."
                rows={2}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Category</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">File *</label>
              <Input
                type="file"
                ref={fileRef}
                accept=".xlsx,.xls,.pdf,.doc,.docx,.csv,.jpg,.jpeg,.png,.webp"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={uploading}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={uploading || !selectedFile || !title.trim()}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
