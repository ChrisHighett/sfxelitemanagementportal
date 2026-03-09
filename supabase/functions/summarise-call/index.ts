import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { transcript, athleteName } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are an elite youth athlete development analyst for SFX Pathways. You will receive a call transcript between an agent and a young athlete (or their parent). Summarise it into the structured tracker format used by SFX Pathways.

Return a JSON object with exactly these fields:
- trainingHighlights (string): What's going well in training — attitude, effort, specific skills, selections
- areasForImprovement (string): Specific areas to work on — fitness, skills, mental, tactical
- footballGoal (string): Specific football goal for next month
- personalGoal (string): Personal development goal — confidence, leadership, habits
- schoolLifeGoal (string): School, education, or life balance goal
- educationTopic (string): Education topics discussed — standards, journaling, habits, routines
- parentEngagementNotes (string): Notes about the conversation flow, parent relationship, observations
- followUpActions (string): Specific follow-up actions for the agent before next call
- wellbeingScore (number 1-5): Overall wellbeing rating based on the conversation
- attentionRequired (boolean): true if any welfare concerns were flagged
- performance (string): Key performance insights (brief)
- lifestyle (string): Sleep, nutrition, recovery observations
- personal (string): Mental health, confidence, social observations
- education (string): School/study observations
- brand (string): Social media and personal brand observations
- focus (string): Primary focus area for next month
- goals (string[]): 2-4 specific actionable goals

Be concise but specific. Use the athlete's context. If a category wasn't discussed, write "Not discussed this call."`;

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
                  trainingHighlights: { type: "string" },
                  areasForImprovement: { type: "string" },
                  footballGoal: { type: "string" },
                  personalGoal: { type: "string" },
                  schoolLifeGoal: { type: "string" },
                  educationTopic: { type: "string" },
                  parentEngagementNotes: { type: "string" },
                  followUpActions: { type: "string" },
                  wellbeingScore: { type: "number" },
                  attentionRequired: { type: "boolean" },
                  performance: { type: "string" },
                  lifestyle: { type: "string" },
                  personal: { type: "string" },
                  education: { type: "string" },
                  brand: { type: "string" },
                  focus: { type: "string" },
                  goals: { type: "array", items: { type: "string" } },
                },
                required: [
                  "trainingHighlights", "areasForImprovement", "footballGoal", "personalGoal",
                  "schoolLifeGoal", "educationTopic", "parentEngagementNotes", "followUpActions",
                  "wellbeingScore", "attentionRequired", "performance", "lifestyle", "personal",
                  "education", "brand", "focus", "goals"
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
