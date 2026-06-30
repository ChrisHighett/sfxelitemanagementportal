import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) {
      return json({ error: "Unauthorized" }, 401);
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: portalUser } = await admin
      .from("portal_users")
      .select("role, approved, agency_id")
      .eq("id", claims.claims.sub)
      .maybeSingle();

    const callerRole = portalUser?.role;
    const isElevaOps = callerRole === "eleva_ops";
    const isAdmin = callerRole === "admin";
    if (!portalUser || !portalUser.approved || (!isAdmin && !isElevaOps)) {
      return json({ error: "Admin or Eleva Ops access required", role: callerRole ?? null }, 403);
    }

    let body: any = {};
    try { body = await req.json(); } catch { body = {}; }
    const { email, displayName, role = "agent", divisionId = null, agencyId = null } = body;
    if (!email || !displayName) {
      return json({ error: "Email and name are required" }, 400);
    }
    const safeRole = role === "scout" ? "scout" : "agent";

    // Resolve the target agency:
    // - Eleva Ops MUST pick an agency (cross-tenant).
    // - Normal admin always uses their own agency, ignoring any client-supplied agencyId.
    let targetAgencyId: string | null = null;
    if (isElevaOps) {
      if (!agencyId) {
        return json({ error: "Agency is required" }, 400);
      }
      const { data: ag, error: agErr } = await admin
        .from("agencies")
        .select("id")
        .eq("id", agencyId)
        .maybeSingle();
      if (agErr) return json({ error: `Agency lookup failed: ${agErr.message}` }, 400);
      if (!ag) return json({ error: "Agency not found" }, 400);
      targetAgencyId = ag.id;
    } else {
      targetAgencyId = portalUser.agency_id ?? null;
      if (!targetAgencyId) {
        return json({ error: "Your account has no agency assigned" }, 400);
      }
    }

    // Validate division belongs to chosen agency (if provided)
    let validatedDivisionId: string | null = null;
    if (divisionId) {
      const { data: div, error: divErr } = await admin
        .from("agency_divisions")
        .select("id, agency_id")
        .eq("id", divisionId)
        .maybeSingle();
      if (divErr) return json({ error: `Division lookup failed: ${divErr.message}` }, 400);
      if (!div) return json({ error: "Division not found" }, 400);
      if (div.agency_id !== targetAgencyId) {
        return json({ error: "Division does not belong to the chosen agency" }, 403);
      }
      validatedDivisionId = div.id;
    }

    // Always send invitees to our portal's activation page, NEVER to the editor
    // origin (lovable.dev) or a preview subdomain. Allow override via PORTAL_URL env.
    const PORTAL_URL =
      Deno.env.get("PORTAL_URL") || "https://elevamanagement.lovable.app";
    const requestOrigin = req.headers.get("origin") || "";
    const isSafeOrigin =
      requestOrigin === PORTAL_URL ||
      /^https:\/\/[a-z0-9-]+--[a-z0-9-]+\.lovable\.app$/i.test(requestOrigin) === false &&
      /elevamanagement\.lovable\.app$/i.test(requestOrigin);
    const redirectBase = isSafeOrigin && requestOrigin ? requestOrigin : PORTAL_URL;

    const { data: linkData, error: linkError } = await (admin.auth.admin as any).generateLink({
      type: "invite",
      email,
      options: {
        data: { display_name: displayName, role: safeRole },
        redirectTo: `${redirectBase}/reset-password`,
      },
    });
    if (linkError) return json({ error: `Invite link failed: ${linkError.message}` }, 500);

    const newUser = linkData?.user;
    const actionLink: string | undefined = linkData?.properties?.action_link;
    if (!newUser?.id || !actionLink) {
      return json({ error: "Failed to generate invite link" }, 500);
    }

    const upsertRow: Record<string, unknown> = {
      id: newUser.id,
      role: safeRole,
      approved: true,
      display_name: displayName,
      email,
      agency_id: targetAgencyId,
    };
    if (validatedDivisionId) upsertRow.division_id = validatedDivisionId;

    const { error: puError } = await admin
      .from("portal_users")
      .upsert(upsertRow, { onConflict: "id" });
    if (puError) return json({ error: `Save portal_user failed: ${puError.message}` }, 500);

    return json({ ok: true, userId: newUser.id, actionLink, email, role: safeRole, agencyId: targetAgencyId });
  } catch (e: any) {
    console.error("invite-agent error:", e?.message || e);
    return json({ error: e?.message || "Failed to invite agent" }, 500);
  }
});
