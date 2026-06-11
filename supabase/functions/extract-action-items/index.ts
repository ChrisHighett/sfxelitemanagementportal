import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

interface ExtractedItem {
  task: string;
  due_date: string | null;
  relative_phrase: string | null;
  needs_date: boolean;
  priority: "high" | "medium" | "low";
}

function stripFences(s: string): string {
  return s
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
}

function parseAnchor(dateStr?: string): Date {
  if (dateStr) {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
}

function isoAdd(anchor: Date, days: number): string {
  const d = new Date(anchor);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// Recompute date in code for simple "in N days/weeks/months" phrases.
function hardenDate(item: ExtractedItem, anchor: Date): ExtractedItem {
  const phrase = (item.relative_phrase || "").toLowerCase();
  const m = phrase.match(/in\s+(\d+)\s+(day|week|month)s?/);
  if (m) {
    const n = parseInt(m[1], 10);
    const unit = m[2];
    const days = unit === "day" ? n : unit === "week" ? n * 7 : n * 30;
    return { ...item, due_date: isoAdd(anchor, days), needs_date: false };
  }
  if (/tomorrow/.test(phrase)) {
    return { ...item, due_date: isoAdd(anchor, 1), needs_date: false };
  }
  if (/today/.test(phrase)) {
    return { ...item, due_date: isoAdd(anchor, 0), needs_date: false };
  }
  return item;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { note, conversationDate, category, athleteFirstName, counterparty } = await req.json();

    if (!note || typeof note !== "string" || !note.trim()) {
      return new Response(JSON.stringify({ items: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anchor = parseAnchor(conversationDate);
    const anchorISO = anchor.toISOString().slice(0, 10);

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You extract follow-up ACTION ITEMS from a talent agent's conversation note.
Today's anchor date is ${anchorISO} (YYYY-MM-DD). Resolve ALL relative timing ("in 2 weeks",
"next Friday", "before the trial in July") into absolute ISO dates relative to that anchor.

Rules:
- Only extract genuine actions the AGENT needs to do. Ignore background/context.
- If timing is stated, set due_date (ISO YYYY-MM-DD). If timing is vague or absent, set
  due_date to null and needs_date = true.
- Infer a sensible priority: "high" (time-sensitive or a strong commercial/club opportunity),
  "medium" (normal follow-up), "low" (nice-to-have).
- Keep each task title short and action-led, starting with a verb (max ~12 words).
- relative_phrase = the exact phrase from the note that implied timing, or null.
- Return ONLY a JSON array. No prose, no markdown, no code fences.

Output shape:
[{"task":"...","due_date":"YYYY-MM-DD"|null,"relative_phrase":"..."|null,"needs_date":false,"priority":"high"|"medium"|"low"}]`;

    const userPrompt = `Conversation context:
- Category: ${category || "general"}
- Athlete: ${athleteFirstName || "(unknown)"}
- Counterparty: ${counterparty || "(unknown)"}
- Anchor date: ${anchorISO}

Note:
"""
${note.trim()}
"""

Return the JSON array now.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (aiRes.status === 429) {
      return new Response(JSON.stringify({ items: [], error: "rate_limited" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiRes.status === 402) {
      return new Response(JSON.stringify({ items: [], error: "credits_exhausted" }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, t);
      return new Response(JSON.stringify({ items: [], error: "ai_failed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiRes.json();
    const content: string = aiJson?.choices?.[0]?.message?.content ?? "";

    let items: ExtractedItem[] = [];
    try {
      const cleaned = stripFences(content);
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        items = parsed
          .filter((x: any) => x && typeof x.task === "string" && x.task.trim())
          .map((x: any) => ({
            task: String(x.task).trim(),
            due_date: x.due_date && /^\d{4}-\d{2}-\d{2}$/.test(x.due_date) ? x.due_date : null,
            relative_phrase: x.relative_phrase ? String(x.relative_phrase) : null,
            needs_date: !!x.needs_date || !x.due_date,
            priority: ["high", "medium", "low"].includes(x.priority) ? x.priority : "medium",
          }))
          .map((x: ExtractedItem) => hardenDate(x, anchor));
      }
    } catch (e) {
      console.warn("Failed to parse AI JSON:", e, content);
      items = [];
    }

    return new Response(JSON.stringify({ items }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("extract-action-items error:", e);
    return new Response(JSON.stringify({ items: [], error: e?.message || "unknown" }), {
      status: 200, // never block the conversation save
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
