import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { token, password, displayName } = await req.json();
    if (!token || !password) return json({ error: "token and password required" }, 400);
    if (typeof password !== "string" || password.length < 8) {
      return json({ error: "Password must be at least 8 characters" }, 400);
    }

    // 1. Lookup invite
    const { data: invRows, error: invErr } = await admin.rpc("get_invite_by_token", { _token: token });
    if (invErr) return json({ error: invErr.message }, 400);
    const invite = Array.isArray(invRows) ? invRows[0] : invRows;
    if (!invite) return json({ error: "Invalid token" }, 404);
    if (invite.status !== "approved") return json({ error: "Invite is not approved" }, 400);
    if (invite.expired) return json({ error: "Token expired" }, 400);

    // 2. Create or reuse auth user (email-confirmed so they can sign in immediately).
    let userId: string | null = null;
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: invite.email,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: displayName || null,
        role: invite.role,
      },
    });

    if (createErr) {
      const msg = (createErr.message || "").toLowerCase();
      if (msg.includes("registered") || msg.includes("exist")) {
        // User already exists — look them up, then reset their password.
        const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
        const found = list?.users?.find((u) => u.email?.toLowerCase() === invite.email.toLowerCase());
        if (!found) return json({ error: "Email already in use but user lookup failed" }, 500);
        userId = found.id;
        await admin.auth.admin.updateUserById(userId, { password, email_confirm: true });
      } else {
        return json({ error: createErr.message }, 400);
      }
    } else {
      userId = created.user?.id ?? null;
    }

    if (!userId) return json({ error: "Could not create user" }, 500);

    // 3. Finalise: write portal_users, guardians (if parent), user_athlete_access (if athlete)
    const { error: finErr } = await admin.rpc("finalize_invite_activation", {
      _token: token,
      _new_user_id: userId,
      _display_name: displayName || null,
    });
    if (finErr) return json({ error: finErr.message }, 400);

    return json({ ok: true, email: invite.email });
  } catch (e: any) {
    return json({ error: e?.message || "Failed" }, 500);
  }
});
