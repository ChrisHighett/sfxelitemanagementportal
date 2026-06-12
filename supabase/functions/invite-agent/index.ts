import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller is an admin
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: portalUser } = await admin
      .from("portal_users")
      .select("role, approved")
      .eq("id", claims.claims.sub)
      .maybeSingle();

    if (!portalUser || portalUser.role !== "admin" || !portalUser.approved) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, displayName, role = "agent" } = await req.json();
    if (!email || !displayName) {
      return new Response(JSON.stringify({ error: "Email and name are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const safeRole = role === "scout" ? "scout" : "agent";

    const origin = req.headers.get("origin") || "https://sfxelitemanagementportal.lovable.app";

    // Generate an invite link WITHOUT sending an email. The admin copies the
    // returned action_link and shares it manually (Outlook, WhatsApp, etc.).
    const { data: linkData, error: linkError } = await (admin.auth.admin as any).generateLink({
      type: "invite",
      email,
      options: {
        data: { display_name: displayName, role: safeRole },
        redirectTo: `${origin}/reset-password`,
      },
    });
    if (linkError) throw linkError;

    const newUser = linkData?.user;
    const actionLink: string | undefined = linkData?.properties?.action_link;
    if (!newUser?.id || !actionLink) throw new Error("Failed to generate invite link");

    const { error: puError } = await admin
      .from("portal_users")
      .upsert(
        {
          id: newUser.id,
          role: safeRole,
          approved: true,
          display_name: displayName,
          email,
        },
        { onConflict: "id" },
      );
    if (puError) throw puError;

    return new Response(
      JSON.stringify({ ok: true, userId: newUser.id, actionLink, email, role: safeRole }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("invite-agent error:", e?.message || e);
    return new Response(JSON.stringify({ error: e?.message || "Failed to invite agent" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
