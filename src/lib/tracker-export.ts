/**
 * Tracker Export — generates an XLSX workbook matching the
 * Athlete Development Tracker structure with 5 sheets.
 */
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";

export async function exportTrackerWorkbook(athleteId: string) {
  // Fetch all required data in parallel
  const [athleteRes, guardianRes, reviewsRes, goalsRes, commsRes, callsRes] = await Promise.all([
    supabase.from("athletes").select("*").eq("id", athleteId).single(),
    supabase.from("guardians").select("*").eq("athlete_id", athleteId),
    supabase.from("monthly_reviews").select("*").eq("athlete_id", athleteId).order("review_month", { ascending: false }),
    supabase.from("goal_tracker").select("*").eq("athlete_id", athleteId).order("month_set", { ascending: false }),
    supabase.from("comms_log").select("*").eq("athlete_id", athleteId).order("sent_at", { ascending: false }),
    supabase.from("call_history").select("*").eq("athlete_id", athleteId).order("call_date", { ascending: false }),
  ]);

  const athlete = athleteRes.data;
  if (!athlete) throw new Error("Athlete not found");

  const guardians = guardianRes.data || [];
  const reviews = reviewsRes.data || [];
  const goals = goalsRes.data || [];
  const comms = commsRes.data || [];
  const calls = callsRes.data || [];

  const dob = athlete.date_of_birth;
  const age = dob ? Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : "";
  const fullName = `${athlete.first_name} ${athlete.last_name}`;

  // Sheet 1: Athlete Profile
  const profileData = [
    ["Athlete Development Tracker"],
    [],
    ["Field", "Value"],
    ["Athlete ID", athlete.id],
    ["Athlete Code", athlete.athlete_code || ""],
    ["Athlete Name", fullName],
    ["Age", age],
    ["Date of Birth", athlete.date_of_birth || ""],
    ["Position", athlete.position || ""],
    ["Club", athlete.club || ""],
    ["School", athlete.school || ""],
    ["Stage", athlete.stage || ""],
    ["Assigned Agent", athlete.assigned_agent_name || ""],
    ["Start Date with Agency", athlete.created_at ? new Date(athlete.created_at).toISOString().slice(0, 10) : ""],
    ["Management Contract Expiry", athlete.management_contract_expiry || ""],
    ["Club Contract Expiry", athlete.club_contract_expiry || ""],
    [],
    ["Parent / Guardian Details"],
    ["Name", "Email", "Phone", "Relationship"],
    ...guardians.map(g => [g.parent_name, g.parent_email || "", g.phone || "", g.relationship || ""]),
  ];

  // Sheet 2: Monthly Reviews
  const reviewHeaders = [
    "Month / Year", "Athlete ID", "Phone Call Date", "Call Duration",
    "Wellbeing Score", "Training Highlights", "Areas for Improvement",
    "Football Goal", "Personal Goal", "School / Life Goal",
    "Education Topic", "Performance Notes", "Lifestyle Notes",
    "Personal Notes", "Brand Notes",
    "Parent Engagement Notes", "Follow-Up Actions",
    "Main Focus Next Month", "Attention Required",
    "Completed By", "Review Source",
  ];

  const reviewRows = reviews.map(r => {
    // Find matching call for this review month
    const reviewDate = r.review_month;
    const matchingCall = calls.find(c =>
      new Date(c.call_date).toISOString().slice(0, 7) === new Date(reviewDate).toISOString().slice(0, 7)
    );

    return [
      new Date(r.review_month).toISOString().slice(0, 7),
      r.athlete_id,
      matchingCall ? new Date(matchingCall.call_date).toISOString().slice(0, 10) : (r.call_date || ""),
      matchingCall?.duration_minutes ? `${matchingCall.duration_minutes} min` : (r.call_duration || ""),
      r.wellbeing_score ?? "",
      r.training_highlights || r.performance_notes || "",
      r.areas_for_improvement || "",
      r.football_goal || "",
      r.personal_goal || "",
      r.school_life_goal || "",
      r.education_notes || "",
      r.performance_notes || "",
      r.lifestyle_notes || "",
      r.personal_notes || "",
      r.brand_notes || "",
      r.parent_engagement_notes || "",
      r.follow_up_actions || "",
      r.focus_next_month || "",
      r.attention_required ? "Yes" : "No",
      (r as any).completed_by || "",
      (r as any).review_source || "portal",
    ];
  });

  // Sheet 3: Goal Tracker
  const goalHeaders = ["Athlete ID", "Goal Type", "Goal Description", "Month Set", "Status", "Comments"];
  const goalRows = goals.map(g => [
    g.athlete_id, g.goal_type, g.goal_description, g.month_set, g.status, g.comments || "",
  ]);

  // Sheet 4: Parent Comms
  const commsHeaders = ["Athlete ID", "Parent Name", "Communication Type", "Date", "Summary", "Follow-Up Required"];
  const parentComms = comms.filter(c => c.recipient_type === "parent");
  const commsRows = parentComms.map(c => [
    c.athlete_id,
    guardians[0]?.parent_name || "Guardian",
    "Email Update",
    new Date(c.sent_at).toISOString().slice(0, 10),
    c.body?.slice(0, 500) || "",
    "No",
  ]);

  // Sheet 5: Dashboard
  const totalGoals = goals.length;
  const achievedGoals = goals.filter(g => g.status === "Achieved" || g.status === "Completed").length;
  const goalPct = totalGoals > 0 ? Math.round((achievedGoals / totalGoals) * 100) : 0;
  const latestReview = reviews[0];
  const latestWellbeing = latestReview?.wellbeing_score ?? "—";

  const dashboardData = [
    ["Dashboard — " + fullName],
    [],
    ["Metric", "Value"],
    ["% Goals Achieved", `${goalPct}% (${achievedGoals}/${totalGoals})`],
    ["Training Consistency", `${reviews.length} reviews recorded`],
    ["Latest Wellbeing Score", `${latestWellbeing}/5`],
    ["Parent Engagement", `${parentComms.length} parent communications sent`],
    ["Total Calls Logged", calls.length],
    ["Latest Review Month", latestReview ? new Date(latestReview.review_month).toISOString().slice(0, 7) : "—"],
    ["Attention Required", latestReview?.attention_required ? "Yes" : "No"],
  ];

  // Build workbook
  const wb = XLSX.utils.book_new();

  const wsProfile = XLSX.utils.aoa_to_sheet(profileData);
  wsProfile["!cols"] = [{ wch: 30 }, { wch: 40 }, { wch: 30 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsProfile, "Athlete Profile");

  const wsReviews = XLSX.utils.aoa_to_sheet([reviewHeaders, ...reviewRows]);
  wsReviews["!cols"] = reviewHeaders.map(() => ({ wch: 22 }));
  XLSX.utils.book_append_sheet(wb, wsReviews, "Monthly Reviews");

  const wsGoals = XLSX.utils.aoa_to_sheet([goalHeaders, ...goalRows]);
  wsGoals["!cols"] = goalHeaders.map(() => ({ wch: 20 }));
  XLSX.utils.book_append_sheet(wb, wsGoals, "Goal Tracker");

  const wsComms = XLSX.utils.aoa_to_sheet([commsHeaders, ...commsRows]);
  wsComms["!cols"] = commsHeaders.map(() => ({ wch: 22 }));
  XLSX.utils.book_append_sheet(wb, wsComms, "Parent Comms");

  const wsDash = XLSX.utils.aoa_to_sheet(dashboardData);
  wsDash["!cols"] = [{ wch: 25 }, { wch: 35 }];
  XLSX.utils.book_append_sheet(wb, wsDash, "Dashboard");

  // Download
  const fileName = `${fullName.replace(/\s+/g, "_")}_Development_Tracker.xlsx`;
  XLSX.writeFile(wb, fileName);

  return fileName;
}
