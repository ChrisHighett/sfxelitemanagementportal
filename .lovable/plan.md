# Onboarding & Admin: invite → approve → self-activate

Replaces ad-hoc signup with a structured invite flow. Existing users are untouched.

## Flow

```text
Agent invites athlete/parent ──► user_invites (status=pending)
                                          │
                              Admin Pending Approvals tab
                                          │
                              tap Approve  │  tap Decline
                                          ▼
                       activation token generated + link shown
                                          │
                           Admin copies link → sends via WhatsApp/SMS
                                          │
                       User opens link → sets password → in portal
                       (role + relationships already attached)
```

## What gets built

### 1. Database (one migration)

- New `user_invites` table: email, role (`athlete`|`parent`|`agent`|`scout`), invited_by, athlete_id (for parents = existing child; for athletes = newly created), relationship (parent only), status (`pending`|`approved`|`declined`|`activated`), activation_token (uuid, nullable until approved), token_expires_at, created_at.
- New `guardians` table: guardian_user_id, athlete_id, relationship. Unique (guardian_user_id, athlete_id).
- RPC `approve_invite(invite_id)` — admin only; for athlete invites, creates the `athletes` row now and stamps `assigned_agent_user_id` from `invited_by`; mints activation_token; returns the token.
- RPC `decline_invite(invite_id)` — admin only.
- RPC `activate_invite(token, password)` — public; creates auth user via service role inside SECURITY DEFINER edge function (see §3), then writes `portal_users` (approved=true, role from invite), and for parents inserts the `guardians` row. Marks invite `activated`.
- RLS: every new table locked; admin-only writes via `is_admin()`.
- Add **parent-scoped read policies** using `guardians` to athlete-readable tables: `athletes`, `monthly_reviews`, `goal_tracker`, `athlete_tasks`, `athlete_scorecards`, `athlete_timeline_events`, `athlete_resources`. Existing `user_athlete_access` policies stay — both paths grant access (OR), so live users are unaffected.
- `comms_history` already correctly scoped from last build — leave alone.

### 2. Edge functions

- `approve-invite` — wraps RPC, returns activation URL `${origin}/activate?token=…`.
- `activate-invite` — public; takes `{ token, password, displayName }`; uses service role to `auth.admin.createUser` with confirmed email, then runs activation RPC.

### 3. Frontend

- **Agent UI**: on athlete profile, add **Invite parent** button (opens dialog: email + relationship). New **Invite athlete** button on agent roster page (email only; child athlete row is created on approval, linked to this agent).
- **Admin Pending Approvals tab** (extend existing): new section "Pending invites" listing each invite with role, agent, athlete (for parents), email. Approve button → calls function → shows modal with copy-link + "Copy" + WhatsApp/SMS share buttons. Decline button.
- **New public route `/activate`**: reads `?token=`, validates (calls function in check-only mode), shows set-password form + display name; on submit, signs the user in and redirects to `/portal`.
- Agents/Scouts continue to be admin-invited only (existing AdminAthleteManager invite path).

### 4. Privacy verification (acceptance)

- Parent A logged in, direct query for Athlete B → returns zero rows at DB level.
- Athlete A direct query for Athlete B → zero rows.
- Parent invited from two different children's profiles → sees both, nothing else.
- Decline → no token, no auth user.

## Out of scope

- Email delivery (admin shares link manually, per your choice).
- Backfilling existing `user_athlete_access` rows into `guardians` (left alone).
- Auto-approve rules (manual approval only for v1).

## Files touched

- New: `supabase/migrations/<ts>_invites_guardians_rls.sql`
- New: `supabase/functions/approve-invite/index.ts`, `supabase/functions/activate-invite/index.ts`
- New: `src/pages/Activate.tsx` + route in `App.tsx`
- New: `src/components/portal/InviteAthleteDialog.tsx`, `src/components/portal/InviteParentDialog.tsx`, `src/components/portal/PendingInvitesList.tsx`
- Edited: admin Pending Approvals tab host, agent roster page, athlete profile header
