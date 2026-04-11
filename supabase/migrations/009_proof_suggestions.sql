-- AI-generated proof prompts: user must pick one; can only switch among stored suggestions.
ALTER TABLE goals
  ADD COLUMN IF NOT EXISTS proof_suggestions jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS proof_requirement text DEFAULT NULL;

COMMENT ON COLUMN goals.proof_suggestions IS 'JSON array of 2–3 strings: allowed photo prompts from AI for this goal title.';
COMMENT ON COLUMN goals.proof_requirement IS 'User-selected prompt text; must equal one element of proof_suggestions.';
