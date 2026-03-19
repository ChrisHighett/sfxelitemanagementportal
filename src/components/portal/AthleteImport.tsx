import { useState, useCallback } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface ParsedAthlete {
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  club?: string;
  school?: string;
  position?: string;
  stage?: string;
  email?: string;
  management_contract_expiry?: string;
  club_contract_expiry?: string;
  assigned_agent_name?: string;
  guardian_name?: string;
  guardian_email?: string;
  guardian_phone?: string;
  guardian_relationship?: string;
  // Optional baseline review fields
  wellbeing_score?: number;
  performance_notes?: string;
  lifestyle_notes?: string;
  personal_notes?: string;
  education_notes?: string;
  brand_notes?: string;
  focus_next_month?: string;
}

function normaliseHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
}

const HEADER_MAP: Record<string, keyof ParsedAthlete> = {
  first_name: "first_name",
  firstname: "first_name",
  first: "first_name",
  last_name: "last_name",
  lastname: "last_name",
  last: "last_name",
  surname: "last_name",
  dob: "date_of_birth",
  date_of_birth: "date_of_birth",
  dateofbirth: "date_of_birth",
  club: "club",
  school: "school",
  position: "position",
  stage: "stage",
  email: "email",
  athlete_email: "email",
  management_contract_expiry: "management_contract_expiry",
  mgmt_expiry: "management_contract_expiry",
  club_contract_expiry: "club_contract_expiry",
  assigned_agent: "assigned_agent_name",
  agent: "assigned_agent_name",
  assigned_agent_name: "assigned_agent_name",
  guardian_name: "guardian_name",
  parent_name: "guardian_name",
  guardian_email: "guardian_email",
  parent_email: "guardian_email",
  guardian_phone: "guardian_phone",
  parent_phone: "guardian_phone",
  phone: "guardian_phone",
  guardian_relationship: "guardian_relationship",
  relationship: "guardian_relationship",
  wellbeing_score: "wellbeing_score",
  wellbeing: "wellbeing_score",
  performance_notes: "performance_notes",
  performance: "performance_notes",
  lifestyle_notes: "lifestyle_notes",
  lifestyle: "lifestyle_notes",
  personal_notes: "personal_notes",
  personal: "personal_notes",
  education_notes: "education_notes",
  education: "education_notes",
  brand_notes: "brand_notes",
  brand: "brand_notes",
  focus_next_month: "focus_next_month",
  focus: "focus_next_month",
};

function parseDate(val: any): string | undefined {
  if (!val) return undefined;
  if (typeof val === "number") {
    // Excel serial date
    const d = new Date((val - 25569) * 86400 * 1000);
    return d.toISOString().slice(0, 10);
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
}

export default function AthleteImport() {
  const queryClient = useQueryClient();
  const [parsed, setParsed] = useState<ParsedAthlete[]>([]);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null);

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

        if (json.length === 0) {
          toast.error("Spreadsheet appears empty");
          return;
        }

        const athletes: ParsedAthlete[] = json.map((row) => {
          const mapped: any = {};
          Object.entries(row).forEach(([key, value]) => {
            const norm = normaliseHeader(key);
            const field = HEADER_MAP[norm];
            if (field) mapped[field] = value;
          });
          // Parse dates
          mapped.date_of_birth = parseDate(mapped.date_of_birth);
          mapped.management_contract_expiry = parseDate(mapped.management_contract_expiry);
          mapped.club_contract_expiry = parseDate(mapped.club_contract_expiry);
          if (mapped.wellbeing_score) mapped.wellbeing_score = Number(mapped.wellbeing_score) || undefined;
          return mapped as ParsedAthlete;
        }).filter((a) => a.first_name && a.last_name);

        setParsed(athletes);
        setResults(null);
        toast.success(`Parsed ${athletes.length} athlete(s) from spreadsheet`);
      } catch (err: any) {
        toast.error("Failed to parse spreadsheet: " + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleImport = useCallback(async () => {
    if (parsed.length === 0) return;
    setImporting(true);
    const errors: string[] = [];
    let success = 0;

    for (const athlete of parsed) {
      try {
        // Upsert athlete
        const { data: inserted, error: athleteError } = await supabase
          .from("athletes")
          .insert({
            first_name: athlete.first_name.trim(),
            last_name: athlete.last_name.trim(),
            date_of_birth: athlete.date_of_birth || null,
            club: athlete.club || null,
            school: athlete.school || null,
            position: athlete.position || null,
            stage: athlete.stage || null,
            email: athlete.email || null,
            management_contract_expiry: athlete.management_contract_expiry || null,
            club_contract_expiry: athlete.club_contract_expiry || null,
            assigned_agent_name: athlete.assigned_agent_name || null,
          })
          .select("id")
          .single();

        if (athleteError) throw athleteError;
        const athleteId = inserted.id;

        // Insert guardian if provided
        if (athlete.guardian_name) {
          const { error: guardianError } = await supabase
            .from("guardians")
            .insert({
              athlete_id: athleteId,
              parent_name: athlete.guardian_name,
              parent_email: athlete.guardian_email || null,
              phone: athlete.guardian_phone || null,
              relationship: athlete.guardian_relationship || "Parent",
            });
          if (guardianError) console.warn("Guardian insert error:", guardianError.message);
        }

        // Insert baseline review if wellbeing or performance fields provided
        if (athlete.wellbeing_score || athlete.performance_notes) {
          const reviewMonth = new Date().toISOString().slice(0, 7) + "-01";
          const { error: reviewError } = await supabase
            .from("monthly_reviews")
            .insert({
              athlete_id: athleteId,
              review_month: reviewMonth,
              wellbeing_score: athlete.wellbeing_score || 3,
              performance_notes: athlete.performance_notes || null,
              lifestyle_notes: athlete.lifestyle_notes || null,
              personal_notes: athlete.personal_notes || null,
              education_notes: athlete.education_notes || null,
              brand_notes: athlete.brand_notes || null,
              focus_next_month: athlete.focus_next_month || null,
              attention_required: (athlete.wellbeing_score ?? 3) <= 2,
            });
          if (reviewError) console.warn("Review insert error:", reviewError.message);
        }

        success++;
      } catch (err: any) {
        errors.push(`${athlete.first_name} ${athlete.last_name}: ${err.message}`);
      }
    }

    setResults({ success, failed: errors.length, errors });
    queryClient.invalidateQueries({ queryKey: ["athletes"] });
    setImporting(false);
    if (errors.length === 0) {
      toast.success(`${success} athlete(s) imported successfully`);
    } else {
      toast.error(`${errors.length} athlete(s) failed to import`);
    }
  }, [parsed, queryClient]);

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Import Athletes from Spreadsheet</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border-2 border-dashed border-border p-8 text-center">
            <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-3">
              Upload an Excel (.xlsx) or CSV file with athlete data.
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Expected columns: First Name, Last Name, DOB, Club, School, Position, Stage, Email, 
              Guardian Name, Guardian Email, Phone, Wellbeing Score, Performance, etc.
            </p>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = ".xlsx,.xls,.csv";
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) handleFile(file);
                };
                input.click();
              }}
            >
              <Upload className="h-4 w-4" /> Select File
            </Button>
          </div>

          {parsed.length > 0 && !results && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Preview — {parsed.length} athlete(s)</CardTitle>
                  <Button onClick={handleImport} disabled={importing} className="gap-2">
                    {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    {importing ? "Importing..." : "Import All"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {parsed.map((a, idx) => (
                    <div key={idx} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                      <div>
                        <span className="font-medium">{a.first_name} {a.last_name}</span>
                        <span className="text-muted-foreground ml-2">
                          {[a.club, a.position, a.stage].filter(Boolean).join(" • ")}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        {a.guardian_name && <Badge variant="outline" className="text-xs">Guardian: {a.guardian_name}</Badge>}
                        {a.wellbeing_score && <Badge variant="secondary" className="text-xs">WB: {a.wellbeing_score}/5</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {results && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  {results.failed === 0 ? (
                    <CheckCircle2 className="h-5 w-5 text-accent" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  )}
                  <span className="font-medium">
                    {results.success} imported, {results.failed} failed
                  </span>
                </div>
                {results.errors.length > 0 && (
                  <div className="space-y-1 text-sm text-destructive">
                    {results.errors.map((err, i) => (
                      <div key={i}>• {err}</div>
                    ))}
                  </div>
                )}
                <Button variant="outline" size="sm" onClick={() => { setParsed([]); setResults(null); }}>
                  Import More
                </Button>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
