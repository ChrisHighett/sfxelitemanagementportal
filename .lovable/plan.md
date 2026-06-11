# TGI White-Label Design System — Implementation Plan

This is a large, cross-cutting change. I'll sequence it in phases so each part is reviewable and the app stays working between phases. The architecture goal is **one swappable token file + logo = full re-skin, zero code changes**.

## Scope check before I start

A few things to confirm so I build the right thing:

1. **Logo file**: You uploaded `tgi-sport-logo.png` (a PNG, full "TGI SPORT" wordmark on black). The brief asks for `/brand/tgi-logo.svg` referenced via CSS `var(--brand-logo)`. Two options:
   - **(a)** Keep the PNG, move it to `public/brand/tgi-logo.png`, reference as `url("/brand/tgi-logo.png")`. Works today, slightly less crisp at large sizes.
   - **(b)** I generate a clean SVG version (the arc + "TGI SPORT" wordmark) and use that. Crisper, properly white-on-black, scales perfectly.
   Default: **(b)** unless you say otherwise.

2. **Product name**: Brief says `--brand-name: "TGI Pathways"` but logo says "TGI SPORT". I'll set the token to "TGI Pathways" (matches existing copy) and use the SPORT logo as the visual mark — those don't conflict.

3. **`⌘K` command palette + keyboard shortcuts (`N`, arrow nav, `Enter`)**: this is a real feature, not just styling. Big lift. I'll scaffold `⌘K` (jump to athlete / common actions) in this pass; deep per-screen keyboard nav (arrow through planner rows) I'll mark as a follow-up if time-boxed — call out if you want it in this pass.

4. **Optimistic updates everywhere**: planner already has them (task complete/reschedule/dismiss). I'll audit and add to conversation logging + any other write surfaces I find. Full audit of every mutation in the app is a separate sweep; flag if you want it exhaustive.

5. **Dense test at 100 athletes**: I can't seed 100 real athletes, but I'll verify the planner cap/overflow logic holds with a synthetic stress test in dev. Visual QA at that scale is on you in preview.

---

## Phase 1 — Theme token layer (foundation)

The whole rest of the system depends on this. Do this first, alone, verify nothing visually breaks.

- Rewrite `src/index.css` `:root` to the exact token set in Part 1 (brand, neutrals, semantic, shape, type). Add `.dark` overrides only where strictly needed; the app is light-canvas + dark-rail by design, so dark mode is a separate concern.
- Map shadcn HSL tokens (`--background`, `--foreground`, `--primary`, etc.) to the new brand tokens so existing shadcn components inherit the theme without rewrites.
- Update `tailwind.config.ts` to expose `brand`, `canvas`, `surface`, `win`, etc. as semantic Tailwind colors that read from the CSS vars, plus `--r`, `--r-lg`, shadow tokens.
- Add font links to `index.html` (Bricolage Grotesque, Geist, Geist Mono) and set `--font-display` / `--font-body` / `--font-mono`.
- Set `<title>` and favicon from the logo.

**Acceptance:** app still renders; colors shift toward the new palette but nothing is broken. No component code changed yet.

## Phase 2 — Logo & identity surfaces

- Place logo SVG (or PNG fallback) at `public/brand/tgi-logo.svg`. Replace the temporary `public/tgi-sport-logo.png` references added in the previous turn with `var(--brand-logo)` via a small `<BrandMark />` component (so callers never hard-code a path).
- Sidebar (command rail), mobile header, mobile sheet → use `<BrandMark />`.
- Login screen: full `--brand-base` background, centred logo, faint cyan→blue arc behind. Replace the current login visuals.
- Favicon + `<title>` driven from `--brand-name`.

## Phase 3 — The arc signature (the "unmistakably TGI" piece)

- New primitives:
  - `<ArcProgress value pct />` — SVG ring with `linearGradient` id `brandArc` from `--brand-spectrum-from` → `--brand-spectrum-to`, rounded cap, top gap.
  - `<ArcBar value />` — completion bar filled with `--brand-gradient`.
  - `<ArcLoader />` — the conic-gradient rotating arc; replace `Loader2` spinners app-wide.
- Add `.arc-load` and `<svg><defs><linearGradient id="brandArc">…</linearGradient></defs></svg>` (mounted once at app root) so any SVG ring can reference `url(#brandArc)`.
- Active nav item in the rail: 3px left bar painted with `--brand-gradient`, white text, cyan icon.

## Phase 4 — Core component refresh (token-only)

Sweep these in one pass — each is a small edit, but together they're what the user actually sees:

- **Command rail** (`SFXPathwaysPortal.tsx` sidebar): 248px, sticky, `--brand-base`, hover `--brand-base-soft`, active = gradient bar + cyan icon + white text. Agent identity chip pinned bottom.
- **Canvas**: bg `--canvas`, padding 34–40px, max-w ~1180px.
- **Dashboard hero**: eyebrow (mono date), display headline ("Three things need your call today"), one-line context, primary CTA (`--brand-base`). Three readiness stats (overdue / due this week / completion%) with mono numbers + an `ArcProgress` ring for completion.
- **Cards**: `--surface`, 1px `--border`, `--r-lg`, `--shadow`, hover lift + `--border-strong`.
- **Priority pills**: Urgent / High / Normal / Done mapped to soft+deep semantic tokens. Overdue → left `--danger` border. AI-extracted → left `--brand-spectrum-to` border + small "AI" mark.
- **Athlete tier chips** (A/B/C): small mono squares.
- **Mono everywhere for numbers**: stat counters, dates, percentages, IDs. I'll do a targeted sweep of `WeeklyPlanner`, `AgentTaskScorecard`, `AdminAnalytics`, dashboard stat cards.

## Phase 5 — Speed & interaction polish

- Audit mutations; ensure all writes are optimistic with rollback on failure (planner already is; check conversation logging, task creation, athlete updates).
- Replace `Loader2` / generic spinners with `<ArcLoader />` for in-place waits; replace initial-load spinners with skeletons matching layout.
- Add `⌘K` command palette using shadcn `Command` — jump to any athlete, navigate to tabs, "New conversation", "New task". Press `N` from anywhere → opens new conversation logger.
- Tab transitions ≤150ms ease-out; button `active:scale-[0.98]`; focus rings in `--brand-accent`; respect `prefers-reduced-motion`.
- Prefetch roster + planner on app mount (React Query `prefetchQuery`).

## Phase 6 — State design (loading / empty / error / dense)

- Skeleton components for: dashboard, planner, roster, scorecard.
- Empty states rewritten in voice — examples: "All caught up — no tasks due this week" (planner), "Add your first athlete" with CTA (roster), "No conversations yet — log the first one" (history).
- Error states: surface what failed + a Retry button, no raw errors, no apologies.
- Dense check: synthetic stress test the planner with mocked 100-athlete payload to confirm cap + overflow hold.

## Phase 7 — QA + white-label proof

Run the Part 8 checklist. To prove the white-label claim:
- Add a `theme-alt.css` example (e.g. forest-green + amber) loaded by setting `<html data-theme="alt">`. Toggle it; the app re-skins; commit no other changes. (Dev-only; not user-facing.)
- `rg` for hard-coded hex / font-family in `src/components/**` and `src/pages/**` → zero hits, or moved into tokens.

---

## Technical notes

- **shadcn token bridge**: shadcn expects HSL components (`--primary: 222 47% 11%`). I'll keep those, but compute them to match the brand tokens, and also expose the brand tokens directly as `--brand-*` for non-shadcn use. This is the cleanest way to avoid rewriting every shadcn variant.
- **No business-logic changes**: this is a presentation / DX pass. No DB migrations, no RLS changes, no schema edits.
- **Files touched (rough)**: `src/index.css`, `tailwind.config.ts`, `index.html`, `src/main.tsx` (mount brand gradient defs + HelmetProvider if needed), `src/pages/SFXPathwaysPortal.tsx` (rail, hero, mobile), `src/pages/Login.tsx`, `src/components/portal/WeeklyPlanner.tsx`, `src/components/portal/AgentTaskScorecard.tsx`, `src/components/portal/AdminAnalytics.tsx`, plus new files under `src/components/brand/` (`BrandMark`, `ArcProgress`, `ArcBar`, `ArcLoader`, `CommandPalette`, skeletons, empty-state components).
- **Estimated size**: ~25-35 file edits + ~8 new components across all phases. Big but tractable.

---

## How I'd like to proceed

Pick one:

- **A — Ship it all in one go**, phases 1→7 in sequence in this turn. Highest risk of one phase regressing another before you can preview.
- **B (recommended) — Ship phase-by-phase**, starting with Phase 1 (tokens) + Phase 2 (logo) + Phase 3 (arc) in this turn. You preview; we iterate; I do Phase 4 next turn, etc. Lower risk, you steer.
- **C — Different slice**: tell me which 2-3 parts matter most (e.g. "just the rail + login + arc loader for the demo tomorrow") and I'll do exactly those.

Also confirm the four scope questions at the top (logo format, command-palette depth, optimistic-update audit breadth, dense-test approach).
