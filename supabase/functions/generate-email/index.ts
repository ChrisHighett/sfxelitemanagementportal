import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function buildAthleteSystemPrompt(agentName: string): string {
  return `You are writing a follow-up email from ${agentName} at TGI Sport to a young elite pathways athlete.

Your job is to write a short, supportive, personal athlete development follow-up email based on structured review notes.

The tone must feel:
- supportive
- personal
- encouraging
- mentor-like
- relaxed but structured

The email should sound like:
- a trusted older brother
- a mentor
- someone genuinely in the athlete's corner

Writing rules:
- use the athlete's first name only
- use "mate" naturally where appropriate, but do not overuse it
- keep sentences simple, warm and clear
- acknowledge effort and progress
- mention 1-2 strongest positives
- mention 2-3 focus areas for next month
- finish with reassurance and support
- keep the email concise
- do not sound corporate, robotic or overly formal
- do not use cliches or motivational fluff
- do not use bullet points unless clearly needed
- do not mention anything not contained in the input
- do not exaggerate concerns
- if a field is empty, omit it naturally

Output requirements:
- return valid JSON only
- include: subject, body
Do not wrap the JSON in markdown.`;
}

function buildParentSystemPrompt(agentName: string): string {
  return `You are writing a parent update email from ${agentName} at TGI Sport following a monthly athlete development check-in.

Your job is to write a short, warm, reassuring and professional email to a parent or guardian based on structured athlete review notes.

The tone must feel:
- warm
- reassuring
- professional
- friendly
- concise
- confidence-building

Writing rules:
- address the parent by name where available
- refer to the athlete by first name
- summarise progress positively
- briefly mention the key themes discussed
- mention the main focus area for next month
- thank the parent for their support
- invite them to reach out anytime
- keep the email concise
- do not sound too casual
- do not use slang
- do not sound too formal or legal
- do not use bullet points unless clearly necessary
- do not mention anything not contained in the input
- if a field is empty, omit it naturally

Output requirements:
- return valid JSON only
- include: subject, body
Do not wrap the JSON in markdown.`;
}

function buildConversationPrompt(
  category: string,
  audience: string,
  agentName: string,
  format: string,
): string {
  const recipient = audience === "parent"
    ? "the athlete's parent or guardian"
    : "the athlete";
  const toneForAudience = audience === "parent"
    ? "Warm, reassuring, professional. Address the guardian by name where available. Keep it clear and confidence-building."
    : "Supportive, personal, mentor-like — like a trusted older brother. Use the athlete's first name only.";

  const categoryGuidance: Record<string, string> = {
    club: `Frame this as athlete-facing feedback on where a club conversation landed. Mention the club by name, what the club said, the athlete's standing, and any next steps.`,
    commercial: `Frame this as a positive but measured commercial / sponsorship update. Mention the brand or company, what the opportunity is, what it could mean, and what happens next. Do NOT over-promise on numbers that aren't locked in. Keep it grounded.`,
    media: `Frame this as a media opportunity heads-up. Mention the outlet or journalist, the format (interview, podcast, feature etc.), why it's a good fit, any dates or prep required, and reassure them the agent will handle logistics.`,
    general: `Frame this as a brief, warm summary of a general / welfare conversation. Capture what was discussed and any agreed next steps. Keep it personal and human.`,
  };

  const formatRules: Record<string, string> = {
    email: `Format: EMAIL.
- Full professional update.
- Subject line + greeting + 1-2 short paragraphs + sign-off.
- No length cap, but stay concise (3 short paragraphs max).
- The "subject" field is a real email subject line.`,
    sms: `Format: SMS.
- Target under 160 characters, hard cap 300.
- Plain text only. No markdown, no emoji, no line breaks beyond a single sentence break.
- One sentence on the outcome + one sentence on the next step.
- First-name greeting at the start, agent first name at the end after an em dash.
- Example shape: "Hi Charlie — good chat with the Sharks today, they're keen and want to see you at a trial in July. I'll lock details and update you. — Chris"
- The "subject" field MUST be a short internal label (max 6 words, e.g. "Sharks trial heads-up") — it will NOT be sent, it is only used for the comms history list.
- The "body" field is the SMS text the agent will copy.`,
    whatsapp: `Format: WHATSAPP.
- Target 400-600 characters. A bit more detail than SMS, well short of the email.
- Warm and conversational. Line breaks are OK. Light emoji allowed (1-2 max, only if natural).
- Greeting + what happened + what's next + sign-off with the agent's first name.
- The "subject" field MUST be a short internal label (max 6 words) — it will NOT be sent, only used for the comms history list.
- The "body" field is the WhatsApp message the agent will copy.`,
  };

  return `You are writing a short update from ${agentName} at TGI Sport to ${recipient}, summarising a conversation the agent just had on behalf of the athlete.

Category: ${category}
${categoryGuidance[category] || categoryGuidance.general}

Tone: ${toneForAudience}

${formatRules[format] || formatRules.email}

Universal writing rules:
- Mention the counterparty by name if provided
- If there's a clear next step, state it plainly
- End on an encouraging or reassuring note
- Do not invent details that aren't in the notes
- Return valid JSON only with: subject, body
- Do not wrap JSON in markdown`;
}

async function callAIWithRetry(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<{ email?: { subject: string; body: string }; raw_text?: string }> {
  const makeRequest = async () => {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
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
              name: "email_draft",
              description: "Return a structured email draft with subject and body",
              parameters: {
                type: "object",
                properties: {
                  subject: { type: "string", description: "Email subject line" },
                  body: { type: "string", description: "Full email body text" },
                },
                required: ["subject", "body"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "email_draft" } },
      }),
    });
    return response;
  };

  const parseResponse = (data: any): { subject: string; body: string } => {
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall) {
      return JSON.parse(toolCall.function.arguments);
    }
    const content = data.choices?.[0]?.message?.content || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error("No parseable JSON in response");
  };

  const response1 = await makeRequest();
  if (!response1.ok) {
    if (response1.status === 429) throw { status: 429, message: "Rate limit exceeded. Please try again shortly." };
    if (response1.status === 402) throw { status: 402, message: "AI credits exhausted. Please top up in Settings." };
    throw { status: 500, message: "Email generation failed" };
  }

  const data1 = await response1.json();
  const raw1 = data1.choices?.[0]?.message?.content || data1.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments || "";

  try {
    return { email: parseResponse(data1) };
  } catch {
    console.warn("First parse failed, retrying...");
  }

  try {
    const response2 = await makeRequest();
    if (response2.ok) {
      const data2 = await response2.json();
      try {
        return { email: parseResponse(data2) };
      } catch {
        const raw2 = data2.choices?.[0]?.message?.content || data2.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments || "";
        console.warn("Second parse failed, returning raw text");
        return { raw_text: raw2 || raw1 || "AI returned an unparseable response." };
      }
    }
  } catch {
    // fall through
  }

  return { raw_text: raw1 || "AI returned an unparseable response." };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const {
      type,
      athleteFirstName,
      parentName,
      structuredReview,
      summaryPoints,
      agentName,
      clubName,
      conversationType,
      agentNotes,
      outcome,
      // multi-purpose conversation logger
      category,        // 'club' | 'commercial' | 'media' | 'general'
      counterparty,    // brand / outlet / person / club
      audience,        // 'athlete' | 'parent'
      format,          // 'email' | 'sms' | 'whatsapp'
      voiceProfile,    // optional per-agent voice profile (see buildVoiceBlock)
    } = await req.json();
    const senderName = (voiceProfile?.agent_name) || agentName || "Your TGI Sport Manager";
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let systemPrompt: string;
    let userPrompt: string;

    const reviewJson = typeof structuredReview === "string"
      ? structuredReview
      : JSON.stringify(structuredReview, null, 2);

    const pointsList = Array.isArray(summaryPoints)
      ? summaryPoints.filter(Boolean).map((p: string) => `- ${p}`).join("\n")
      : "";

    if (type === "conversation_update") {
      const cat = (category || "general").toLowerCase();
      const aud = (audience || "athlete").toLowerCase();
      const fmt = (format || "email").toLowerCase();
      systemPrompt = buildConversationPrompt(cat, aud, senderName, fmt);
      userPrompt = [
        `Please write the update message.`,
        ``,
        `Sender (agent): ${senderName}`,
        `Athlete first name: ${athleteFirstName || "Athlete"}`,
        aud === "parent" ? `Parent / guardian name: ${parentName || "there"}` : "",
        `Category: ${cat}`,
        `Format: ${fmt}`,
        `Counterparty: ${counterparty || clubName || "—"}`,
        `Conversation type: ${conversationType || "—"}`,
        ``,
        `Agent's notes from the conversation:`,
        agentNotes || "",
        ``,
        outcome ? `Outcome / next steps: ${outcome}` : "",
      ].filter(l => l !== undefined && l !== null && l !== "").join("\n");
    } else if (type === "club_feedback") {
      // Legacy compatibility — keep working exactly as before
      systemPrompt = `You are writing a short email from a sports agent to a young elite athlete summarising a conversation the agent just had with an NRL club about the athlete.

Tone: encouraging, warm, professional, forward-looking. Make the athlete feel valued and excited.

Rules:
- Use the athlete's first name
- Reference the specific club by name
- Mention the positive feedback specifically
- If there's a next step (trial, follow-up), mention it clearly
- Keep it concise — 3 short paragraphs maximum
- End with encouragement
- Return valid JSON only with: subject, body
- Do not wrap JSON in markdown`;

      userPrompt = [
        `Please write a club feedback email.`,
        ``,
        `Sender (agent): ${senderName}`,
        `Athlete first name: ${athleteFirstName || "Athlete"}`,
        `Club: ${clubName || "the club"}`,
        `Conversation type: ${conversationType || "recruitment"}`,
        ``,
        `Agent's notes from the conversation:`,
        agentNotes || "",
        ``,
        outcome ? `Outcome / next steps: ${outcome}` : "",
      ].filter(l => l !== undefined && l !== null).join("\n");
    } else if (type === "athlete") {
      systemPrompt = buildAthleteSystemPrompt(senderName);
      userPrompt = [
        "Please write the athlete follow-up email using the TGI Sport athlete tone.",
        "",
        "Sender name: " + senderName,
        "Athlete first name: " + (athleteFirstName || "Athlete"),
        "",
        "Structured review data:",
        reviewJson,
        "",
        "Use these summary points if helpful:",
        pointsList,
        "",
        "Requirements:",
        "- concise",
        "- warm",
        "- supportive",
        "- mentor-style",
        "- mention clear next focus areas",
        "- end with encouragement and support",
      ].join("\n");
    } else if (type === "parent") {
      systemPrompt = buildParentSystemPrompt(senderName);
      userPrompt = [
        "Please write the parent update email using the TGI Sport parent tone.",
        "",
        "Sender name: " + senderName,
        "Parent name: " + (parentName || "there"),
        "Athlete first name: " + (athleteFirstName || "Athlete"),
        "",
        "Structured review data:",
        reviewJson,
        "",
        "Use these summary points if helpful:",
        pointsList,
        "",
        "Requirements:",
        "- concise",
        "- warm",
        "- reassuring",
        "- professional",
        "- mention main development themes",
        "- mention next focus area",
        "- close with appreciation and invitation to reach out",
      ].join("\n");
    } else {
      return new Response(JSON.stringify({ error: "Invalid type. Use 'athlete', 'parent', 'club_feedback', or 'conversation_update'." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await callAIWithRetry(LOVABLE_API_KEY, systemPrompt, userPrompt);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    const status = e?.status || 500;
    const message = e?.message || (e instanceof Error ? e.message : "Unknown error");
    console.error("generate-email error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
