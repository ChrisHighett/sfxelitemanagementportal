---
name: Agent voice profile
description: Per-agent writing voice applied to all AI-drafted athlete/parent messages
type: feature
---
Table `agent_voice_profiles` (PK user_id). Fields: how_i_write, formality, length, emoji, greeting_style, sign_off, sample_messages. Auth users can SELECT any; only owner/admin can write.

UI: `src/components/portal/VoiceProfileSettings.tsx`, exposed via "My Voice" nav item for agent + admin.

Use: helpers in `src/lib/voice-profile.ts` — `getVoiceProfileForAthlete(athleteId, fallbackUserId)` resolves the athlete's `assigned_agent_user_id` voice profile (falls back to composer). Pass `voiceProfile` in body to `generate-email` edge function. Function appends a VOICE PROFILE block to the system prompt with style description, settings, and sample messages as few-shot style examples. Facts/content must stay intact — only wording adapts.

Wired callers: VoiceRecordingFlow (athlete + parent emails), ClubConversationLogger (conversation_update). Any new AI-drafting caller MUST also pass voiceProfile.
