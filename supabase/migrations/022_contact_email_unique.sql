-- Prevent the same real email on multiple accounts (contact email + pending verification).

CREATE UNIQUE INDEX IF NOT EXISTS profiles_contact_email_unique_lower
  ON public.profiles (LOWER(btrim(contact_email)))
  WHERE contact_email IS NOT NULL AND btrim(contact_email) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS profiles_contact_email_pending_unique_lower
  ON public.profiles (LOWER(btrim(contact_email_pending)))
  WHERE contact_email_pending IS NOT NULL AND btrim(contact_email_pending) <> '';

CREATE OR REPLACE FUNCTION public.auth_email_exists(check_email text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = auth, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users
    WHERE lower(btrim(email)) = lower(btrim(check_email))
  );
$$;

CREATE OR REPLACE FUNCTION public.auth_user_id_for_email(check_email text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = auth, public
AS $$
  SELECT id
  FROM auth.users
  WHERE lower(btrim(email)) = lower(btrim(check_email))
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.profile_contact_email_taken(
  check_email text,
  exclude_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE (
      (
        p.contact_email IS NOT NULL
        AND btrim(p.contact_email) <> ''
        AND lower(btrim(p.contact_email)) = lower(btrim(check_email))
      )
      OR (
        p.contact_email_pending IS NOT NULL
        AND btrim(p.contact_email_pending) <> ''
        AND lower(btrim(p.contact_email_pending)) = lower(btrim(check_email))
      )
    )
    AND (exclude_id IS NULL OR p.id <> exclude_id)
  );
$$;

REVOKE ALL ON FUNCTION public.auth_email_exists(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.auth_user_id_for_email(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.profile_contact_email_taken(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_email_exists(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.auth_user_id_for_email(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.profile_contact_email_taken(text, uuid) TO service_role;
