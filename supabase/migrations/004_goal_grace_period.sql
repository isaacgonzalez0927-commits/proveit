-- Add grace_period to goals: how long after due time you can submit proof
ALTER TABLE goals
ADD COLUMN IF NOT EXISTS grace_period TEXT DEFAULT 'eod' CHECK (grace_period IN ('1h', '3h', '6h', '12h', 'eod'));
