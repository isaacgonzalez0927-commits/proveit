-- One-shot catch-up for `goals` if you see errors like:
--   column "proof_requirement" does not exist
--   column "times_per_week" does not exist
--   column "reminder_days" does not exist
-- Safe to run multiple times (IF NOT EXISTS).

ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS grace_period TEXT DEFAULT 'eod';

ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS is_on_break BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS break_started_at TIMESTAMPTZ;
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS break_streak_snapshot INTEGER;
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS streak_carryover INTEGER;

ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS reminder_days INTEGER[] DEFAULT NULL;
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS times_per_week INTEGER DEFAULT NULL;

ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS proof_suggestions JSONB DEFAULT NULL;
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS proof_requirement TEXT DEFAULT NULL;
