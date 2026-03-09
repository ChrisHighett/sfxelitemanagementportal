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

    const systemPrompt = `You are an elite youth athlete development analyst for SFX Pathways. You will receive a call transcript between an agent and a young athlete (or their parent). Summarise it into structured categories.

Return a JSON object with exactly these fields:
- performance (string): Key performance insights
- lifestyle (string): Sleep, nutrition, recovery observations  
- personal (string): Mental health, confidence, social observations
- education (string): School/study observations
- brand (string): Social media and personal brand observations
- focus (string): Primary focus area for next month
- goals (string[]): 2-4 specific actionable goals
- attentionRequired (boolean): true if any welfare concerns were flagged

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
              description: "Return a structured call summary",
              parameters: {
                type: "object",
                properties: {
                  performance: { type: "string" },
                  lifestyle: { type: "string" },
                  personal: { type: "string" },
                  education: { type: "string" },
                  brand: { type: "string" },
                  focus: { type: "string" },
                  goals: { type: "array", items: { type: "string" } },
                  attentionRequired: { type: "boolean" },
                },
                required: ["performance", "lifestyle", "personal", "education", "brand", "focus", "goals", "attentionRequired"],
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
      // Fallback: try to parse from content
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
