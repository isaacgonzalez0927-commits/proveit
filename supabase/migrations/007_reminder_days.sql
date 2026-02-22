-- Allow goals to repeat on multiple days per week (e.g. gym Mon–Sat).
-- reminder_day is kept for backward compatibility (first day); reminder_days holds the full set.
ALTER TABLE goals
  ADD COLUMN IF NOT EXISTS reminder_days integer[] DEFAULT NULL;

COMMENT ON COLUMN goals.reminder_days IS 'Days of week (0–6, 0=Sun) to send reminder; NULL or empty means use reminder_day.';
