-- AI Coach weekly quotas (UTC Monday weeks).
-- Counters already exist on profiles (015_ai_usage_caps_and_shield_tuning.sql).
-- Limits enforced in app code on /api/ai-coach ONLY (not photo verify / Gardener's Note):
--   Free: 0/week, Pro: 5/week, Premium: 20/week
-- Cycle key: yyyy-MM-dd of the Monday (UTC) for the current week.

comment on column public.profiles.ai_verification_cycle_key is
  'AI Coach UTC week key: yyyy-MM-dd of Monday 00:00 UTC.';

comment on column public.profiles.ai_verification_count is
  'AI Coach uses consumed in the current UTC week (ai_verification_cycle_key).';
