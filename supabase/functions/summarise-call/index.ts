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

    const systemPrompt = [
      "You are an athlete development assistant for TGI Sport.",
      "",
      "Your role is to convert raw athlete call transcripts into structured development notes for elite pathways athletes.",
      "",
      "You must organise the conversation into these 7 TGI Pathways call sections:",
      "1. Warm Opener",
      "2. Performance",
      "3. Lifestyle",
      "4. Personal",
      "5. Education",
      "6. Brand",
      "7. Goals",
      "",
      "Your output must be:",
      "- concise",
      "- practical",
      "- professional",
      "- easy to review quickly on mobile",
      "- written in clean Australian English",
      "",
      "Important rules:",
      "- Do not write long paragraphs",
      "- Do not repeat the transcript",
      "- Do not include filler or conversational fluff",
      "- Summarise only the meaningful points",
      "- If a section was not discussed, return an empty string for that section",
      "- Do not invent information that was not discussed",
      "- If goals are implied but not explicitly stated, infer only the most reasonable and obvious next focus",
      "- Keep each section to 1-3 short sentences maximum",
      "- Highlight issues clearly if the transcript suggests concern (sleep, confidence, school pressure, injury, behaviour, etc.)",
      "",
      "You must also produce:",
      "- suggested_focus_next_month",
      "- suggested_goals (max 3)",
      "- attention_required (true/false)",
      "- attention_reason",
      "- athlete_email_summary_points",
      "- parent_email_summary_points",
      "",
      "The athlete_email_summary_points should be short supportive bullet-ready points.",
      "The parent_email_summary_points should be short reassuring bullet-ready points.",
      "",
      "Return valid JSON only.",
      "Do not wrap the JSON in markdown.",
    ].join("\n");

    const athleteFirstName = (athleteName || "").split(" ")[0] || "Athlete";
    const athleteLastName = (athleteName || "").split(" ").slice(1).join(" ") || "";

    const userPrompt = [
      "Please convert the following athlete call transcript into the TGI Pathways structured development format.",
      "",
      "Athlete name: " + athleteFirstName + " " + athleteLastName,
      "Athlete stage: " + (athleteStage || "Unknown"),
      "Call type: " + (callType || "monthly_review"),
      "Call date: " + (callDate || new Date().toISOString().slice(0, 10)),
      "",
      "Transcript:",
      "",
      transcript || "",
      "",
      "Return output in the required JSON structure.",
    ].join("\n");

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
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "structured_summary",
              description: "Return a structured call summary matching the TGI Pathways Development Tracker format",
              parameters: {
                type: "object",
                properties: {
                  warm_opener: { type: "string", description: "Warm Opener section notes" },
                  performance: { type: "string", description: "Performance section notes" },
                  lifestyle: { type: "string", description: "Lifestyle section notes" },
                  personal: { type: "string", description: "Personal section notes" },
                  education: { type: "string", description: "Education section notes" },
                  brand: { type: "string", description: "Brand section notes" },
                  goals: { type: "string", description: "Goals section notes" },
                  suggested_focus_next_month: { type: "string" },
                  suggested_goals: { type: "array", items: { type: "string" }, description: "Max 3 goals" },
                  attention_required: { type: "boolean" },
                  attention_reason: { type: "string", description: "Reason attention is required, empty if not" },
                  athlete_email_summary_points: { type: "array", items: { type: "string" }, description: "Short supportive bullet-ready points for athlete email" },
                  parent_email_summary_points: { type: "array", items: { type: "string" }, description: "Short reassuring bullet-ready points for parent email" },
                },
                required: [
                  "warm_opener", "performance", "lifestyle", "personal", "education", "brand", "goals",
                  "suggested_focus_next_month", "suggested_goals",
                  "attention_required", "attention_reason",
                  "athlete_email_summary_points", "parent_email_summary_points"
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
    const raw1 = data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments || "";

    const parseData = (d: any) => {
      const tc = d.choices?.[0]?.message?.tool_calls?.[0];
      if (tc) return JSON.parse(tc.function.arguments);
      const c = d.choices?.[0]?.message?.content || "";
      const m = c.match(/\{[\s\S]*\}/);
      if (m) return JSON.parse(m[0]);
      throw new Error("No parseable JSON");
    };

    let summary;
    try {
      summary = parseData(data);
    } catch {
      console.warn("First parse failed, retrying summarise-call...");
      // Retry once
      try {
        const response2 = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "structured_summary",
                  description: "Return a structured call summary matching the TGI Pathways Development Tracker format",
                  parameters: {
                    type: "object",
                    properties: {
                      warm_opener: { type: "string" },
                      performance: { type: "string" },
                      lifestyle: { type: "string" },
                      personal: { type: "string" },
                      education: { type: "string" },
                      brand: { type: "string" },
                      goals: { type: "string" },
                      suggested_focus_next_month: { type: "string" },
                      suggested_goals: { type: "array", items: { type: "string" } },
                      attention_required: { type: "boolean" },
                      attention_reason: { type: "string" },
                      athlete_email_summary_points: { type: "array", items: { type: "string" } },
                      parent_email_summary_points: { type: "array", items: { type: "string" } },
                    },
                    required: [
                      "warm_opener", "performance", "lifestyle", "personal", "education", "brand", "goals",
                      "suggested_focus_next_month", "suggested_goals",
                      "attention_required", "attention_reason",
                      "athlete_email_summary_points", "parent_email_summary_points"
                    ],
                    additionalProperties: false,
                  },
                },
              },
            ],
            tool_choice: { type: "function", function: { name: "structured_summary" } },
          }),
        });
        if (response2.ok) {
          const data2 = await response2.json();
          try {
            summary = parseData(data2);
          } catch {
            const raw2 = data2.choices?.[0]?.message?.content || "";
            return new Response(JSON.stringify({ raw_text: raw2 || raw1 || "AI returned an unparseable response." }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        } else {
          return new Response(JSON.stringify({ raw_text: raw1 || "AI returned an unparseable response." }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch {
        return new Response(JSON.stringify({ raw_text: raw1 || "AI returned an unparseable response." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
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