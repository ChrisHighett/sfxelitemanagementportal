import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const payload = await req.json();
    const record = payload.record;

    if (!record) {
      return new Response(JSON.stringify({ ok: true, skipped: "no record" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const roleLabel =
      record.role === "parent"
        ? "Parent / Guardian"
        : record.role === "athlete"
          ? "Athlete"
          : record.role === "agent"
            ? "Agent"
            : record.role;

    const emailBody = {
      from: "TGI Pathways <noreply@tgisport.com.au>",
      to: ["chighett@tgisport.com.au"],
      subject: `New portal signup pending approval — ${roleLabel}`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:auto;padding:24px;color:#111">
          <h2 style="margin:0 0 16px">New account pending approval</h2>
          <table style="font-size:14px;line-height:1.6">
            <tr><td style="padding-right:12px;color:#666">Name</td><td>${record.display_name || "(not provided)"}</td></tr>
            <tr><td style="padding-right:12px;color:#666">Email</td><td>${record.email || "(not provided)"}</td></tr>
            <tr><td style="padding-right:12px;color:#666">Role</td><td>${roleLabel}</td></tr>
            <tr><td style="padding-right:12px;color:#666">Signed up</td><td>${new Date(record.created_at).toLocaleString("en-AU")}</td></tr>
          </table>
          <p style="margin-top:20px">
            <a href="https://sfxelitemanagementportal.lovable.app/portal" style="display:inline-block;background:#111;color:#fff;padding:10px 16px;text-decoration:none;border-radius:6px">Review in admin panel →</a>
          </p>
          <p style="margin-top:24px;color:#999;font-size:12px">TGI Pathways — Admin Notification</p>
        </div>
      `,
    };

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailBody),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error("Resend error: " + err);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("notify-admin error:", e.message);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
