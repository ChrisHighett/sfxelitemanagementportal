import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { transcript, athleteName, athleteStage, callType, callDate } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are an athlete development assistant for SFX Sports.

Your role is to convert raw athlete call transcripts into structured development notes for elite pathways athletes.

You must organise the conversation into these 7 SFX call sections:
1. Warm Opener
2. Performance
3. Lifestyle
4. Personal
5. Education
6. Brand
7. Goals

Your output must be concise, practical, professional, easy to review quickly on mobile, and written in clean Australian English.

Important rules:
- Do not write long paragraphs
- Do not repeat the transcript
- Do not include filler or conversational fluff
- Summarise only the meaningful points
- If a section was not discussed, return an empty string for that section
- Do not invent information that was not discussed
- If goals are implied but not explicitly stated, infer only the most reasonable and obvious next focus
- Keep each section to 1-3 short sentences maximum
- Highlight issues clearly if the transcript suggests concern (sleep, confidence, school pressure, injury, behaviour, etc.)

You must also produce suggested_focus_next_month, suggested_goals (max 3), attention_required (true/false), attention_reason, athlete_email_summary_points, and parent_email_summary_points.

Return valid JSON only. Do not wrap the JSON in markdown.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Athlete: ${athleteName}\n\nCall Transcript:\n${transcript}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "structured_summary",
              description: "Return a structured call summary matching the SFX Development Tracker format",
              parameters: {
                type: "object",
                properties: {
                  warmOpener: { type: "string", description: "Warm Opener section notes" },
                  performance: { type: "string", description: "Performance section notes" },
                  lifestyle: { type: "string", description: "Lifestyle section notes" },
                  personal: { type: "string", description: "Personal section notes" },
                  education: { type: "string", description: "Education section notes" },
                  brand: { type: "string", description: "Brand section notes" },
                  goals: { type: "string", description: "Goals section notes" },
                  trainingHighlights: { type: "string" },
                  areasForImprovement: { type: "string" },
                  footballGoal: { type: "string" },
                  personalGoal: { type: "string" },
                  schoolLifeGoal: { type: "string" },
                  educationTopic: { type: "string" },
                  parentEngagementNotes: { type: "string" },
                  followUpActions: { type: "string" },
                  wellbeingScore: { type: "number", description: "1-5 wellbeing rating" },
                  attentionRequired: { type: "boolean" },
                  attentionReason: { type: "string", description: "Reason attention is required, empty if not" },
                  suggestedFocusNextMonth: { type: "string" },
                  suggestedGoals: { type: "array", items: { type: "string" }, description: "Max 3 goals" },
                  athleteEmailSummaryPoints: { type: "array", items: { type: "string" }, description: "Short supportive bullet-ready points for athlete email" },
                  parentEmailSummaryPoints: { type: "array", items: { type: "string" }, description: "Short reassuring bullet-ready points for parent email" },
                },
                required: [
                  "warmOpener", "performance", "lifestyle", "personal", "education", "brand", "goals",
                  "trainingHighlights", "areasForImprovement", "footballGoal", "personalGoal",
                  "schoolLifeGoal", "educationTopic", "parentEngagementNotes", "followUpActions",
                  "wellbeingScore", "attentionRequired", "attentionReason",
                  "suggestedFocusNextMonth", "suggestedGoals",
                  "athleteEmailSummaryPoints", "parentEmailSummaryPoints"
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "structured_summary" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please top up in Settings." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI summarisation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    let summary;
    if (toolCall) {
      summary = JSON.parse(toolCall.function.arguments);
    } else {
      const content = data.choices?.[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        summary = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Could not parse AI response");
      }
    }

    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("summarise-call error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
