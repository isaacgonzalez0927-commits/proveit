-- Contact email must be verified before use (password reset, recovery).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS contact_email_pending TEXT,
  ADD COLUMN IF NOT EXISTS contact_email_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS contact_email_verify_token TEXT,
  ADD COLUMN IF NOT EXISTS contact_email_verify_expires_at TIMESTAMPTZ;

-- Existing contact emails count as verified.
UPDATE public.profiles
SET contact_email_verified_at = NOW()
WHERE contact_email IS NOT NULL
  AND btrim(contact_email) <> ''
  AND contact_email_verified_at IS NULL;

CREATE INDEX IF NOT EXISTS profiles_contact_email_verify_token_idx
  ON public.profiles (contact_email_verify_token)
  WHERE contact_email_verify_token IS NOT NULL;
