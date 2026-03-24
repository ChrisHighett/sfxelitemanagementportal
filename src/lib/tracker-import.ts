/**
 * Tracker Import — parses an uploaded .xlsx workbook matching the
 * Athlete Development Tracker structure and upserts data into Supabase.
 */
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";

interface ImportResult {
  reviewsImported: number;
  reviewsUpdated: number;
  goalsImported: number;
  commsImported: number;
  errors: string[];
}

function normalise(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
}

function cellStr(row: Record<string, any>, keys: string[]): string | null {
  for (const k of Object.keys(row)) {
    if (keys.includes(normalise(k))) {
      const v = row[k];
      return v != null && String(v).trim() !== "" ? String(v).trim() : null;
    }
  }
  return null;
}

function cellNum(row: Record<string, any>, keys: string[]): number | null {
  const s = cellStr(row, keys);
  if (!s) return null;
  const n = Number(s);
  return isNaN(n) ? null : n;
}

function parseReviewMonth(row: Record<string, any>): string | null {
  const raw = cellStr(row, ["month_year", "month", "review_month", "month_year"]);
  if (!raw) return null;
  // "YYYY-MM" or "YYYY-MM-DD"
  const m = raw.match(/^(\d{4})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-01`;
  // "MM/YYYY" or "Month YYYY"
  const d = new Date(raw);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 7) + "-01";
  return null;
}

async function importReviews(
  athleteId: string,
  rows: Record<string, any>[],
  errors: string[]
): Promise<{ imported: number; updated: number }> {
  let imported = 0, updated = 0;

  for (const row of rows) {
    const reviewMonth = parseReviewMonth(row);
    if (!reviewMonth) continue;

    const data: Record<string, any> = {
      athlete_id: athleteId,
      review_month: reviewMonth,
      wellbeing_score: cellNum(row, ["wellbeing_score", "wellbeing"]),
      performance_notes: cellStr(row, ["performance_notes", "performance", "training_highlights"]),
      training_highlights: cellStr(row, ["training_highlights", "training"]),
      areas_for_improvement: cellStr(row, ["areas_for_improvement", "areas", "improvement"]),
      lifestyle_notes: cellStr(row, ["lifestyle_notes", "lifestyle"]),
      personal_notes: cellStr(row, ["personal_notes", "personal"]),
      education_notes: cellStr(row, ["education_notes", "education_topic", "education"]),
      brand_notes: cellStr(row, ["brand_notes", "brand"]),
      focus_next_month: cellStr(row, ["focus_next_month", "main_focus_next_month", "focus"]),
      football_goal: cellStr(row, ["football_goal"]),
      personal_goal: cellStr(row, ["personal_goal"]),
      school_life_goal: cellStr(row, ["school_life_goal", "school_goal"]),
      parent_engagement_notes: cellStr(row, ["parent_engagement_notes", "parent_notes"]),
      follow_up_actions: cellStr(row, ["follow_up_actions", "follow_up"]),
      completed_by: cellStr(row, ["completed_by"]),
      review_source: cellStr(row, ["review_source"]) || "import",
      call_date: cellStr(row, ["phone_call_date", "call_date"]),
      call_duration: cellStr(row, ["call_duration", "duration"]),
      attention_required: cellStr(row, ["attention_required"])?.toLowerCase() === "yes",
    };

    try {
      const { data: existing } = await supabase
        .from("monthly_reviews")
        .select("id")
        .eq("athlete_id", athleteId)
        .eq("review_month", reviewMonth)
        .maybeSingle();

      if (existing?.id) {
        const { error } = await supabase.from("monthly_reviews").update(data as any).eq("id", existing.id);
        if (error) throw error;
        updated++;
      } else {
        const { error } = await supabase.from("monthly_reviews").insert(data as any);
        if (error) throw error;
        imported++;
      }
    } catch (e: any) {
      errors.push(`Review ${reviewMonth}: ${e.message}`);
    }
  }

  return { imported, updated };
}

async function importGoals(
  athleteId: string,
  rows: Record<string, any>[],
  errors: string[]
): Promise<number> {
  let count = 0;
  for (const row of rows) {
    const goalType = cellStr(row, ["goal_type", "type"]);
    const goalDesc = cellStr(row, ["goal_description", "description", "goal"]);
    const monthSet = cellStr(row, ["month_set", "month"]);
    if (!goalDesc || !monthSet) continue;

    try {
      const { error } = await supabase.from("goal_tracker").insert({
        athlete_id: athleteId,
        goal_type: goalType || "General",
        goal_description: goalDesc,
        month_set: monthSet,
        status: cellStr(row, ["status"]) || "In progress",
        comments: cellStr(row, ["comments"]),
      });
      if (error) throw error;
      count++;
    } catch (e: any) {
      errors.push(`Goal "${goalDesc?.slice(0, 30)}": ${e.message}`);
    }
  }
  return count;
}

async function importComms(
  athleteId: string,
  rows: Record<string, any>[],
  errors: string[]
): Promise<number> {
  let count = 0;
  for (const row of rows) {
    const summary = cellStr(row, ["summary", "body"]);
    const dateStr = cellStr(row, ["date", "sent_at"]);
    if (!summary) continue;

    try {
      const { error } = await supabase.from("comms_log").insert({
        athlete_id: athleteId,
        recipient_type: "parent",
        subject: cellStr(row, ["communication_type", "type"]) || "Imported Update",
        body: summary,
        sent_at: dateStr ? new Date(dateStr).toISOString() : new Date().toISOString(),
      });
      if (error) throw error;
      count++;
    } catch (e: any) {
      errors.push(`Comms: ${e.message}`);
    }
  }
  return count;
}

function findSheet(wb: XLSX.WorkBook, names: string[]): XLSX.WorkSheet | null {
  for (const n of names) {
    const match = wb.SheetNames.find(s => normalise(s) === normalise(n));
    if (match) return wb.Sheets[match];
  }
  return null;
}

export async function importTrackerWorkbook(
  athleteId: string,
  file: File
): Promise<ImportResult> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(new Uint8Array(buf), { type: "array" });
  const errors: string[] = [];

  // Monthly Reviews
  const reviewSheet = findSheet(wb, ["Monthly Reviews", "Reviews"]);
  let reviewsImported = 0, reviewsUpdated = 0;
  if (reviewSheet) {
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(reviewSheet);
    const res = await importReviews(athleteId, rows, errors);
    reviewsImported = res.imported;
    reviewsUpdated = res.updated;
  }

  // Goal Tracker
  const goalSheet = findSheet(wb, ["Goal Tracker", "Goals"]);
  let goalsImported = 0;
  if (goalSheet) {
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(goalSheet);
    goalsImported = await importGoals(athleteId, rows, errors);
  }

  // Parent Comms
  const commsSheet = findSheet(wb, ["Parent Comms", "Comms"]);
  let commsImported = 0;
  if (commsSheet) {
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(commsSheet);
    commsImported = await importComms(athleteId, rows, errors);
  }

  return { reviewsImported, reviewsUpdated, goalsImported, commsImported, errors };
}
