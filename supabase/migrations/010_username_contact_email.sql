-- Username sign-in (stored lowercase) and optional contact email for recovery / notices.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS name TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique_lower
  ON public.profiles (LOWER(username))
  WHERE username IS NOT NULL AND btrim(username) <> '';
