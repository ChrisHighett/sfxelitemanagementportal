import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Athlete {
  id: string;
  photoUrl: string | null;
  athleteCode: string | null;
  name: string;
  age: number;
  dateOfBirth: string | null;
  club: string;
  school: string;
  position: string;
  stage: "Emerging" | "Elite" | "Pre-Pro";
  assignedAgent: string;
  assignedAgentUserId: string | null;
  email: string | null;
  parentName: string;
  parentEmail: string;
  wellbeingScore: number;
  status: "Thriving" | "Monitoring" | "Needs Support";
  lastCall: string;
  nextCall: string;
  commercialPotential: "Low" | "Medium" | "High" | "Not Scored";
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
  developmentRead: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  createdBy: string | null;
}

export interface CommsLog {
  athleteId: string;
  recipient: "athlete" | "parent";
  subject: string;
  body: string;
  sentAt: string;
}

/**
 * Fetch athletes. If restrictToIds is provided, only those athletes are loaded
 * (used for athlete/parent roles with allocated access).
 */
export function useAthletes(restrictToIds?: string[]) {
  return useQuery({
    queryKey: ["athletes", restrictToIds],
    queryFn: async () => {
      let query = supabase
        .from("athletes")
        .select("*")
        .order("first_name");

      if (restrictToIds && restrictToIds.length > 0) {
        query = query.in("id", restrictToIds);
      }

      const { data: athletesData, error: athletesError } = await query;
      if (athletesError) throw athletesError;

      const athleteIds = (athletesData || []).map((a) => a.id);
      if (athleteIds.length === 0) return [];

      const { data: guardiansData } = await supabase
        .from("guardians")
        .select("*")
        .in("athlete_id", athleteIds);

      const { data: reviewsData } = await supabase
        .from("monthly_reviews")
        .select("*")
        .in("athlete_id", athleteIds)
        .order("review_month", { ascending: false });

      // Get latest call dates from call_history
      const { data: callData } = await supabase
        .from("call_history")
        .select("athlete_id, call_date")
        .in("athlete_id", athleteIds)
        .order("call_date", { ascending: false });

      const athletes: Athlete[] = (athletesData || []).map((athlete) => {
        const guardian = guardiansData?.find((g) => g.athlete_id === athlete.id);
        const latestReview = reviewsData?.find((r) => r.athlete_id === athlete.id);
        const latestCall = callData?.find((c) => c.athlete_id === athlete.id);

        const wellbeingScore = latestReview?.wellbeing_score || 3;
        let status: "Thriving" | "Monitoring" | "Needs Support";
        if (wellbeingScore >= 4) status = "Thriving";
        else if (wellbeingScore === 3) status = "Monitoring";
        else status = "Needs Support";

        const dob = athlete.date_of_birth;
        const age = dob
          ? Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
          : null;

        const lastCallDate = latestCall
          ? new Date(latestCall.call_date).toISOString().slice(0, 10)
          : "No calls";

        return {
          id: athlete.id,
          photoUrl: (athlete as any).avatar_url || null,
          athleteCode: athlete.athlete_code || null,
          name: `${athlete.first_name} ${athlete.last_name}`,
          age: (age ?? null) as number,
          dateOfBirth: dob || null,
          club: athlete.club || "—",
          school: athlete.school || "—",
          position: athlete.position || "—",
          stage: (athlete.stage as "Emerging" | "Elite" | "Pre-Pro") || "Elite",
          assignedAgent: athlete.assigned_agent_name || "Unassigned",
          assignedAgentUserId: (athlete as any).assigned_agent_user_id || null,
          email: (athlete as any).email || null,
          parentName: guardian?.parent_name || "Guardian",
          parentEmail: guardian?.parent_email || "",
          wellbeingScore,
          status,
          lastCall: lastCallDate,
          nextCall: (() => {
            if (!latestCall?.call_date) return "Not started";
            const nextDate = new Date(latestCall.call_date);
            nextDate.setDate(nextDate.getDate() + 30);
            const today = new Date();
            if (nextDate < today) return "Overdue";
            return nextDate.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
          })(),
          commercialPotential: ((athlete as any).commercial_potential as "Low" | "Medium" | "High" | "Not Scored") || "Not Scored",
          managementContractExpiry: athlete.management_contract_expiry || null,
          clubContractExpiry: athlete.club_contract_expiry || null,
        };
      });

      return athletes;
    },
  });
}

export function useMonthlyReviews(athleteId?: string) {
  return useQuery({
    queryKey: ["monthly_reviews", athleteId],
    refetchOnMount: "always",
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
        id: review.id,
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
        createdAt: review.created_at || null,
        updatedAt: review.updated_at || null,
        createdBy: review.created_by || null,
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
