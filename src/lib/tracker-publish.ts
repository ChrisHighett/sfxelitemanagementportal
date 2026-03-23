/**
 * Tracker Publish Utility
 * After an approved Athlete Comms session, this maps data into the full
 * tracker structure: Monthly Reviews → Goal Tracker → Parent Comms → Dashboard
 */
import { supabase } from "@/integrations/supabase/client";

interface PublishPayload {
  athleteId: string;
  reviewMonth: string; // "YYYY-MM-01"
  performanceNotes: string | null;
  lifestyleNotes: string | null;
  personalNotes: string | null;
  educationNotes: string | null;
  brandNotes: string | null;
  focusNextMonth: string | null;
  wellbeingScore: number;
  attentionRequired: boolean;
  callDate: string; // ISO date
  callDuration: string;
  trainingHighlights: string | null;
  areasForImprovement: string | null;
  footballGoal: string | null;
  personalGoal: string | null;
  schoolLifeGoal: string | null;
  parentEngagementNotes: string | null;
  followUpActions: string | null;
  goals: string[];
  userId: string | null;
  completedBy: string | null;
  reviewSource: string;
}

/**
 * Full tracker publish: saves monthly_reviews, goal_tracker rows, and logs parent comms.
 * Returns the created/updated review ID.
 */
export async function publishToTracker(payload: PublishPayload): Promise<string> {
  // 1. Upsert monthly_reviews
  const { data: existing } = await supabase
    .from("monthly_reviews")
    .select("id")
    .eq("athlete_id", payload.athleteId)
    .eq("review_month", payload.reviewMonth)
    .maybeSingle();

  const reviewData = {
    athlete_id: payload.athleteId,
    review_month: payload.reviewMonth,
    performance_notes: payload.performanceNotes,
    lifestyle_notes: payload.lifestyleNotes,
    personal_notes: payload.personalNotes,
    education_notes: payload.educationNotes,
    brand_notes: payload.brandNotes,
    focus_next_month: payload.focusNextMonth,
    goals: payload.goals,
    attention_required: payload.attentionRequired,
    wellbeing_score: payload.wellbeingScore,
    call_date: payload.callDate,
    call_duration: payload.callDuration,
    training_highlights: payload.trainingHighlights,
    areas_for_improvement: payload.areasForImprovement,
    football_goal: payload.footballGoal,
    personal_goal: payload.personalGoal,
    school_life_goal: payload.schoolLifeGoal,
    parent_engagement_notes: payload.parentEngagementNotes,
    follow_up_actions: payload.followUpActions,
    created_by: payload.userId,
    completed_by: payload.completedBy,
    review_source: payload.reviewSource,
  };

  let reviewId: string;

  if (existing?.id) {
    const { error } = await supabase
      .from("monthly_reviews")
      .update(reviewData)
      .eq("id", existing.id);
    if (error) throw error;
    reviewId = existing.id;
  } else {
    const { data, error } = await supabase
      .from("monthly_reviews")
      .insert(reviewData)
      .select("id")
      .single();
    if (error) throw error;
    reviewId = data.id;
  }

  // 2. Create goal_tracker entries for each goal
  const monthSet = payload.reviewMonth.slice(0, 7); // "YYYY-MM"
  const goalEntries: { goal: string; type: string }[] = [];

  if (payload.footballGoal?.trim()) {
    goalEntries.push({ goal: payload.footballGoal.trim(), type: "Football" });
  }
  if (payload.personalGoal?.trim()) {
    goalEntries.push({ goal: payload.personalGoal.trim(), type: "Personal" });
  }
  if (payload.schoolLifeGoal?.trim()) {
    goalEntries.push({ goal: payload.schoolLifeGoal.trim(), type: "School-Life" });
  }

  // Also add any remaining goals from the array that aren't already covered
  const coveredGoals = new Set(goalEntries.map(g => g.goal.toLowerCase()));
  for (const g of payload.goals) {
    if (g.trim() && !coveredGoals.has(g.trim().toLowerCase())) {
      goalEntries.push({ goal: g.trim(), type: "General" });
    }
  }

  if (goalEntries.length > 0) {
    // Delete existing goals for this athlete + month to avoid duplicates
    await supabase
      .from("goal_tracker")
      .delete()
      .eq("athlete_id", payload.athleteId)
      .eq("month_set", monthSet);

    const { error: goalErr } = await supabase.from("goal_tracker").insert(
      goalEntries.map((ge) => ({
        athlete_id: payload.athleteId,
        goal_type: ge.type,
        goal_description: ge.goal,
        month_set: monthSet,
        status: "In progress",
        comments: null,
      }))
    );
    if (goalErr) console.error("Goal tracker insert error:", goalErr);
  }

  // 3. Log parent comms entry if parent engagement notes exist
  if (payload.parentEngagementNotes?.trim()) {
    const { error: commsErr } = await supabase.from("comms_log").insert({
      athlete_id: payload.athleteId,
      recipient_type: "parent",
      subject: `Monthly Review — ${monthSet}`,
      body: payload.parentEngagementNotes.trim(),
      sent_by: payload.userId,
    });
    if (commsErr) console.error("Comms log insert error:", commsErr);
  }

  return reviewId;
}
