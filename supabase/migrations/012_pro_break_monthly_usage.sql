-- Pro: track how many calendar days each goal spent on break per month (yyyy-MM -> count).
ALTER TABLE public.goals
ADD COLUMN IF NOT EXISTS pro_break_usage_by_month JSONB NOT NULL DEFAULT '{}'::jsonb;
