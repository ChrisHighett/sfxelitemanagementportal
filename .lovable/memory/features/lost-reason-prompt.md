---
name: Lost reason prompt
description: Every Scout pipeline view must open LostReasonModal when a lead is moved to "Lost" and persist the reason to scout_leads.lost_reason
type: feature
---
Whenever any view changes a scout lead's onboarding_stage to "Lost", it MUST route through `LostReasonModal` (src/components/portal/LostReasonModal.tsx) and save the captured reason to `scout_leads.lost_reason` (plus `date_lost`). Never write `onboarding_stage = 'Lost'` directly from a stage button without prompting — losing this reason removes critical "why we missed talent" insight.

Known stage-change handlers that must keep this behavior:
- `src/components/portal/ScoutPipeline.tsx` → `handleStageChange` / `handleConfirmLost`
- `src/pages/SFXPathwaysPortal.tsx` → `ScoutPortal.handleStageChange` / `confirmLost`
- `src/pages/SFXPathwaysPortal.tsx` → `AgentScoutView.handleStageChange` / `confirmLost`

When adding a new scout pipeline surface, reuse `LostReasonModal` — do not bypass it.
