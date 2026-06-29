import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Building2 } from "lucide-react";

interface Agency {
  id: string;
  name: string;
  slug: string;
  legal_name: string | null;
  trading_name: string | null;
  sport: string | null;
  region: string | null;
  created_at: string;
}

const SPORTS = ["AFL", "Cricket", "NRL", "Other"];

export default function AgencyManager() {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [legalName, setLegalName] = useState("");
  const [tradingName, setTradingName] = useState("");
  const [sport, setSport] = useState<string>("");
  const [region, setRegion] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("agencies")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Failed to load agencies", description: error.message, variant: "destructive" });
    } else {
      setAgencies((data ?? []) as Agency[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const reset = () => {
    setLegalName("");
    setTradingName("");
    setSport("");
    setRegion("");
    setShowForm(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!legalName.trim() || !tradingName.trim()) {
      toast({ title: "Legal name and trading name are required", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.rpc("create_agency", {
      _legal_name: legalName.trim(),
      _trading_name: tradingName.trim(),
      _sport: sport || null,
      _region: region.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Could not create agency", description: error.message, variant: "destructive" });
      return;
    }
    const created = Array.isArray(data) ? data[0] : data;
    toast({
      title: "Agency created",
      description: `${created?.trading_name ?? tradingName} is now on the platform.`,
    });
    reset();
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Building2 className="h-5 w-5" /> Agencies
          </h3>
          <p className="text-sm text-muted-foreground">
            Eleva Ops only. Create and review tenant agencies on the platform.
          </p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Create new agency
          </Button>
        )}
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Create new agency</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="legal_name">Legal entity name *</Label>
                <Input
                  id="legal_name"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  placeholder="e.g. TGI Sport Pty Ltd"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="trading_name">Trading / display name *</Label>
                <Input
                  id="trading_name"
                  value={tradingName}
                  onChange={(e) => setTradingName(e.target.value)}
                  placeholder="Shown inside the app, e.g. TGI Sport"
                  required
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="sport">Sport / code</Label>
                  <Select value={sport} onValueChange={setSport}>
                    <SelectTrigger id="sport">
                      <SelectValue placeholder="Select sport" />
                    </SelectTrigger>
                    <SelectContent>
                      {SPORTS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="region">State / region</Label>
                  <Input
                    id="region"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    placeholder="Optional, e.g. VIC"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  Create agency
                </Button>
                <Button type="button" variant="ghost" onClick={reset} disabled={submitting}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All agencies ({agencies.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : agencies.length === 0 ? (
            <p className="text-sm text-muted-foreground">No agencies yet.</p>
          ) : (
            <div className="divide-y">
              {agencies.map((a) => (
                <div key={a.id} className="py-3 flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <div className="font-medium">{a.trading_name ?? a.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {a.legal_name ?? a.name}
                      {a.sport ? ` · ${a.sport}` : ""}
                      {a.region ? ` · ${a.region}` : ""}
                      {" · "}slug: {a.slug}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(a.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
