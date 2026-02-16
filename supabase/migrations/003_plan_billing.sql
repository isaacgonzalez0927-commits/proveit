-- Add plan_billing to profiles for monthly/yearly distinction
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS plan_billing TEXT DEFAULT 'monthly' CHECK (plan_billing IN ('monthly', 'yearly'));
