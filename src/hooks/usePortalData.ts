import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Athlete {
  id: string;
  athleteCode: string | null;
  name: string;
  age: number;
  dateOfBirth: string | null;
  club: string;
  school: string;
  position: string;
  stage: "Emerging" | "Elite" | "Pre-Pro";
  assignedAgent: string;
  parentName: string;
  parentEmail: string;
  wellbeingScore: number;
  status: "Thriving" | "Monitoring" | "Needs Support";
  lastCall: string;
  nextCall: string;
  commercialPotential: "Low" | "Medium" | "High";
  managementContractExpiry: string | null;
  clubContractExpiry: string | null;
}

export interface MonthlyReview {
  id: string;
  athleteId: string;
  month: string;
  wellbeingScore: number;
  performance: string;
  lifestyle: string;
  personal: string;
  education: string;
  brand: string;
  focus: string;
  goals: string[];
  attentionRequired: boolean;
  callDate: string | null;
  callDuration: string | null;
  trainingHighlights: string | null;
  areasForImprovement: string | null;
  footballGoal: string | null;
  personalGoal: string | null;
  schoolLifeGoal: string | null;
  educationTopic: string | null;
  parentEngagementNotes: string | null;
  followUpActions: string | null;
}

export interface CommsLog {
  athleteId: string;
  recipient: "athlete" | "parent";
  subject: string;
  body: string;
  sentAt: string;
}

export function useAthletes() {
  return useQuery({
    queryKey: ["athletes"],
    queryFn: async () => {
      const { data: athletesData, error: athletesError } = await supabase
        .from("athletes")
        .select("*")
        .order("first_name");

      if (athletesError) throw athletesError;

      const { data: guardiansData } = await supabase
        .from("guardians")
        .select("*");

      const { data: reviewsData } = await supabase
        .from("monthly_reviews")
        .select("*")
        .order("review_month", { ascending: false });

      const athletes: Athlete[] = (athletesData || []).map((athlete) => {
        const guardian = guardiansData?.find((g) => g.athlete_id === athlete.id);
        const latestReview = reviewsData?.find((r) => r.athlete_id === athlete.id);

        const wellbeingScore = latestReview?.wellbeing_score || 3;
        let status: "Thriving" | "Monitoring" | "Needs Support";
        if (wellbeingScore >= 4) status = "Thriving";
        else if (wellbeingScore === 3) status = "Monitoring";
        else status = "Needs Support";

        const dob = (athlete as any).date_of_birth;
        const age = dob
          ? Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
          : null;

        return {
          id: athlete.id,
          athleteCode: athlete.athlete_code || null,
          name: `${athlete.first_name} ${athlete.last_name}`,
          age: age ?? 0,
          dateOfBirth: dob || null,
          club: athlete.club || "—",
          school: athlete.school || "—",
          position: athlete.position || "—",
          stage: (athlete.stage as "Emerging" | "Elite" | "Pre-Pro") || "Elite",
          assignedAgent: (athlete as any).assigned_agent_name || "Unassigned",
          parentName: guardian?.parent_name || "Guardian",
          parentEmail: guardian?.parent_email || "guardian@example.com",
          wellbeingScore,
          status,
          lastCall: "2026-03-04", // Could come from comms_log
          nextCall: "2026-04-04", // Could be calculated
          commercialPotential: "Medium", // Could be a field in athletes table
          managementContractExpiry: (athlete as any).management_contract_expiry || null,
          clubContractExpiry: (athlete as any).club_contract_expiry || null,
        };
      });

      return athletes;
    },
  });
}

export function useMonthlyReviews(athleteId?: string) {
  return useQuery({
    queryKey: ["monthly_reviews", athleteId],
    queryFn: async () => {
      let query = supabase
        .from("monthly_reviews")
        .select("*")
        .order("review_month", { ascending: false });

      if (athleteId) {
        query = query.eq("athlete_id", athleteId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const reviews: MonthlyReview[] = (data || []).map((review: any) => ({
        athleteId: review.athlete_id,
        month: new Date(review.review_month).toISOString().slice(0, 7),
        wellbeingScore: review.wellbeing_score || 3,
        performance: review.performance_notes || "—",
        lifestyle: review.lifestyle_notes || "—",
        personal: review.personal_notes || "—",
        education: review.education_notes || "—",
        brand: review.brand_notes || "—",
        focus: review.focus_next_month || "—",
        goals: Array.isArray(review.goals) ? review.goals as string[] : [],
        attentionRequired: review.attention_required || false,
        callDate: review.call_date || null,
        callDuration: review.call_duration || null,
        trainingHighlights: review.training_highlights || null,
        areasForImprovement: review.areas_for_improvement || null,
        footballGoal: review.football_goal || null,
        personalGoal: review.personal_goal || null,
        schoolLifeGoal: review.school_life_goal || null,
        educationTopic: review.education_notes || null,
        parentEngagementNotes: review.parent_engagement_notes || null,
        followUpActions: review.follow_up_actions || null,
      }));

      return reviews;
    },
  });
}

export function useCommsLog(athleteId?: string) {
  return useQuery({
    queryKey: ["comms_log", athleteId],
    queryFn: async () => {
      let query = supabase
        .from("comms_log")
        .select("*")
        .order("sent_at", { ascending: false });

      if (athleteId) {
        query = query.eq("athlete_id", athleteId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const comms: CommsLog[] = (data || []).map((comm) => ({
        athleteId: comm.athlete_id,
        recipient: comm.recipient_type as "athlete" | "parent",
        subject: comm.subject,
        body: comm.body,
        sentAt: new Date(comm.sent_at).toLocaleString("en-AU", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }),
      }));

      return comms;
    },
  });
}
