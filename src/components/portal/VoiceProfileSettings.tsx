import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Mic2 } from "lucide-react";

interface VoiceForm {
  how_i_write: string;
  formality: string;
  length: string;
  emoji: string;
  greeting_style: string;
  sign_off: string;
  sample_messages: string;
}

const DEFAULT: VoiceForm = {
  how_i_write: "",
  formality: "balanced",
  length: "brief",
  emoji: "rarely",
  greeting_style: "first name only",
  sign_off: "",
  sample_messages: "",
};

export default function VoiceProfileSettings() {
  const { user } = useAuth();
  const [form, setForm] = useState<VoiceForm>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("agent_voice_profiles" as any)
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        const d = data as any;
        setForm({
          how_i_write: d.how_i_write || "",
          formality: d.formality || "balanced",
          length: d.length || "brief",
          emoji: d.emoji || "rarely",
          greeting_style: d.greeting_style || "first name only",
          sign_off: d.sign_off || "",
          sample_messages: d.sample_messages || "",
        });
      } else {
        // sensible default sign-off
        setForm((f) => ({
          ...f,
          sign_off: (user as any)?.user_metadata?.display_name?.split(" ")[0] || "",
        }));
      }
      setLoading(false);
    })();
  }, [user?.id]);

  const save = async () => {
    if (!user?.id) return;
    setSaving(true);
    const { error } = await supabase
      .from("agent_voice_profiles" as any)
      .upsert({ user_id: user.id, ...form }, { onConflict: "user_id" });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Voice profile saved — future AI drafts will use this style");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading your voice profile…
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6 p-3 md:p-0">
      <div className="flex items-center gap-3">
        <Mic2 className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold">My Voice Profile</h1>
          <p className="text-sm text-muted-foreground">
            How AI-drafted messages to your athletes and their parents should sound.
            This shapes Quick Updates, Monthly Check-ins, Meeting Imports and Guided Notes — content stays the same, only the wording matches your voice.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>How I write</CardTitle>
          <CardDescription>
            Short free-text description of your tone — formality, sentence length, humour, things you'd never say.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            rows={5}
            placeholder={`e.g. "Warm but direct. Short sentences. Plain English, never corporate. I never use 'team' as a verb or hype-words like 'amazing'. I always end on something forward-looking."`}
            value={form.how_i_write}
            onChange={(e) => setForm({ ...form, how_i_write: e.target.value })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick settings</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Formality</Label>
            <Select value={form.formality} onValueChange={(v) => setForm({ ...form, formality: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="very casual">Very casual</SelectItem>
                <SelectItem value="casual">Casual</SelectItem>
                <SelectItem value="balanced">Balanced</SelectItem>
                <SelectItem value="formal">Formal</SelectItem>
                <SelectItem value="very formal">Very formal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Length</Label>
            <Select value={form.length} onValueChange={(v) => setForm({ ...form, length: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="very brief">Very brief (1–2 sentences)</SelectItem>
                <SelectItem value="brief">Brief</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="detailed">Detailed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Emoji use</Label>
            <Select value={form.emoji} onValueChange={(v) => setForm({ ...form, emoji: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="never">Never</SelectItem>
                <SelectItem value="rarely">Rarely (1 max, only if natural)</SelectItem>
                <SelectItem value="ok">OK to use</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Greeting style</Label>
            <Input
              placeholder={`e.g. "Hey Charlie", "Hi mate", "Hi {{first name}}"`}
              value={form.greeting_style}
              onChange={(e) => setForm({ ...form, greeting_style: e.target.value })}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Sign-off</Label>
            <Input
              placeholder={`e.g. "Chris" or "Cheers, Chris"`}
              value={form.sign_off}
              onChange={(e) => setForm({ ...form, sign_off: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sample messages</CardTitle>
          <CardDescription>
            Paste 5–10 real messages you've actually sent. The AI will use these as style examples (not as content).
            Separate each one with a blank line or a line like <code>---</code>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            rows={12}
            placeholder={`Hi Charlie, great session today — quick chat with the Sharks coach after, he was really positive about your effort in the contact drills. I'll lock in a follow-up next week.\n\n---\n\nHey Tom, just spoke to St Pat's about the trial. They want you down on the 22nd. I'll send through details tomorrow.`}
            value={form.sample_messages}
            onChange={(e) => setForm({ ...form, sample_messages: e.target.value })}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Save voice profile
        </Button>
      </div>
    </div>
  );
}
