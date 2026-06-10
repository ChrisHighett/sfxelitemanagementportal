import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const payload = await req.json();
    const review = payload.record;
    if (!review) {
      return new Response(JSON.stringify({ ok: true, skipped: "no record" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: athlete } = await supabase
      .from("athletes")
      .select("first_name, last_name")
      .eq("id", review.athlete_id)
      .single();

    const { data: access } = await supabase
      .from("user_athlete_access")
      .select("user_id")
      .eq("athlete_id", review.athlete_id)
      .eq("relationship_type", "parent");

    if (!access?.length) {
      return new Response(JSON.stringify({ ok: true, skipped: "no parent found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const athleteName = athlete ? `${athlete.first_name} ${athlete.last_name}` : "your athlete";
    const monthLabel = new Date(review.review_month).toLocaleDateString("en-AU", {
      month: "long",
      year: "numeric",
    });

    for (const row of access) {
      const { data: authUser } = await supabase.auth.admin.getUserById(row.user_id);
      if (!authUser?.user?.email) continue;

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "TGI Pathways <noreply@tgisport.com.au>",
          to: [authUser.user.email],
          subject: `${monthLabel} development update — ${athleteName}`,
          html: `
            <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:auto;padding:24px;color:#111">
              <h2 style="margin:0 0 12px">Monthly development update</h2>
              <p style="font-size:14px;line-height:1.6">A new ${monthLabel} review for ${athleteName} is now available in your TGI Sport portal.</p>
              <p style="margin-top:20px">
                <a href="https://sfxelitemanagementportal.lovable.app/portal" style="display:inline-block;background:#111;color:#fff;padding:10px 16px;text-decoration:none;border-radius:6px">View update in portal →</a>
              </p>
              <p style="margin-top:16px;font-size:13px;color:#666">Reply to this email anytime if you have questions for your manager.</p>
              <p style="margin-top:24px;color:#999;font-size:12px">TGI Pathways — TGI Sport</p>
            </div>
          `,
        }),
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("notify-parent-review error:", e.message);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
