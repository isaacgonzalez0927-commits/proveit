-- Premium: one-time 7-day trial (server-enforced end + revert plan)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS premium_trial_ends_at TIMESTAMPTZ;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS premium_trial_used BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS premium_trial_revert_plan TEXT
  CHECK (premium_trial_revert_plan IS NULL OR premium_trial_revert_plan IN ('free', 'pro'));

COMMENT ON COLUMN profiles.premium_trial_ends_at IS 'When set and in the past while plan=premium, profile is reverted on next profile load.';
COMMENT ON COLUMN profiles.premium_trial_used IS 'True after the user has started their one-time Premium trial.';
COMMENT ON COLUMN profiles.premium_trial_revert_plan IS 'Plan to restore when the Premium trial ends (free or pro).';
