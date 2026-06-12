import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Activate() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") || "";

  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      if (!token) { setError("Missing activation token."); setLoading(false); return; }
      const { data, error } = await supabase.rpc("get_invite_by_token", { _token: token });
      if (error) { setError(error.message); setLoading(false); return; }
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) { setError("This activation link isn't valid."); setLoading(false); return; }
      if (row.status === "activated") { setError("This invite has already been used. Please sign in instead."); setLoading(false); return; }
      if (row.status !== "approved") { setError("This invite isn't ready yet — your admin hasn't approved it."); setLoading(false); return; }
      if (row.expired) { setError("This activation link has expired. Ask your admin to issue a new one."); setLoading(false); return; }
      setInvite(row);
      setLoading(false);
    })();
  }, [token]);

  async function activate(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (password !== confirmPassword) { toast.error("Passwords don't match"); return; }
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("activate-invite", {
      body: { token, password, displayName: displayName || null },
    });
    if (error || (data as any)?.error) {
      setSubmitting(false);
      toast.error((data as any)?.error || error?.message || "Activation failed");
      return;
    }
    // Sign them in immediately
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: (data as any).email,
      password,
    });
    setSubmitting(false);
    if (signInErr) {
      toast.success("Account created — please sign in");
      navigate("/login");
      return;
    }
    toast.success("Welcome to Eleva");
    navigate("/portal");
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--canvas)" }}>
        <Card className="max-w-md w-full">
          <CardContent className="p-6 space-y-4 text-center">
            <h1 className="text-xl font-semibold">Can't activate</h1>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button onClick={() => navigate("/login")} className="w-full">Go to sign in</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const roleLabel = invite.role === "parent" ? "parent / guardian" : invite.role;
  const childName = invite.athlete_first_name ? `${invite.athlete_first_name} ${invite.athlete_last_name ?? ""}`.trim() : null;

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--canvas)" }}>
      <Card className="max-w-md w-full">
        <CardContent className="p-6 space-y-5">
          <div className="space-y-1 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Activate your Eleva account</h1>
            <p className="text-sm text-muted-foreground">
              Setting up as <span className="font-medium text-foreground">{roleLabel}</span>
              {invite.role === "parent" && childName ? <> for <span className="font-medium text-foreground">{childName}</span></> : null}.
            </p>
            <p className="text-xs text-muted-foreground pt-1">{invite.email}</p>
          </div>

          <form onSubmit={activate} className="space-y-4">
            <div className="space-y-1">
              <Label>Your name</Label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Full name" />
            </div>
            <div className="space-y-1">
              <Label>Choose a password</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
            </div>
            <div className="space-y-1">
              <Label>Confirm password</Label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} minLength={8} required />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Activate & sign in
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
