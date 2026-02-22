-- Pro goal break mode fields
ALTER TABLE public.goals
ADD COLUMN IF NOT EXISTS is_on_break BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.goals
ADD COLUMN IF NOT EXISTS break_started_at TIMESTAMPTZ;

ALTER TABLE public.goals
ADD COLUMN IF NOT EXISTS break_streak_snapshot INTEGER;

ALTER TABLE public.goals
ADD COLUMN IF NOT EXISTS streak_carryover INTEGER;
