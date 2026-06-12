import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });

    const { inviteId } = await req.json();
    if (!inviteId) return json({ error: "inviteId required" }, 400);

    const { data, error } = await userClient.rpc("approve_invite", {
      _invite_id: inviteId,
    });
    if (error) return json({ error: error.message }, 400);

    const token = Array.isArray(data) ? data[0]?.activation_token : (data as any)?.activation_token;
    const origin = req.headers.get("origin") || "https://sfxelitemanagementportal.lovable.app";
    return json({
      ok: true,
      token,
      activationUrl: `${origin}/activate?token=${token}`,
    });
  } catch (e: any) {
    return json({ error: e?.message || "Failed" }, 500);
  }

  function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
