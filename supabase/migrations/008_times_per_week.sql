-- Goal frequency as times per week (1–7). 7 = every day (daily), 1 = once per week (weekly).
ALTER TABLE goals
  ADD COLUMN IF NOT EXISTS times_per_week integer DEFAULT NULL;

COMMENT ON COLUMN goals.times_per_week IS 'Times per week user must submit proof (1–7). NULL = legacy: 7 for frequency daily, 1 for weekly.';
