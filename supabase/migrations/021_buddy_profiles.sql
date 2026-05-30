/* Buddy profiles: plant avatar, accent background, visibility, friend-link connections. */

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS buddy_avatar_plant integer
    CHECK (buddy_avatar_plant IS NULL OR (buddy_avatar_plant >= 1 AND buddy_avatar_plant <= 8)),
  ADD COLUMN IF NOT EXISTS buddy_profile_accent text NOT NULL DEFAULT 'green',
  ADD COLUMN IF NOT EXISTS buddy_profile_visibility text NOT NULL DEFAULT 'shared_goals_only'
    CHECK (buddy_profile_visibility IN ('shared_goals_only', 'friend_link')),
  ADD COLUMN IF NOT EXISTS buddy_friend_code text;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_buddy_friend_code_unique
  ON public.profiles (buddy_friend_code)
  WHERE buddy_friend_code IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.buddy_connections (
  user_a uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_b uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_a, user_b),
  CONSTRAINT buddy_connections_ordered CHECK (user_a < user_b)
);

CREATE INDEX IF NOT EXISTS buddy_connections_user_a_idx ON public.buddy_connections (user_a);
CREATE INDEX IF NOT EXISTS buddy_connections_user_b_idx ON public.buddy_connections (user_b);

GRANT SELECT, INSERT ON public.buddy_connections TO authenticated;
GRANT ALL ON public.buddy_connections TO service_role;

ALTER TABLE public.buddy_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS buddy_connections_select ON public.buddy_connections;
CREATE POLICY buddy_connections_select ON public.buddy_connections
  FOR SELECT
  USING (user_a = auth.uid() OR user_b = auth.uid());

DROP POLICY IF EXISTS buddy_connections_insert ON public.buddy_connections;
CREATE POLICY buddy_connections_insert ON public.buddy_connections
  FOR INSERT
  WITH CHECK (user_a = auth.uid() OR user_b = auth.uid());

CREATE OR REPLACE FUNCTION public.buddy_connected_user_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE WHEN c.user_a = auth.uid() THEN c.user_b ELSE c.user_a END
  FROM public.buddy_connections c
  WHERE c.user_a = auth.uid() OR c.user_b = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.buddy_connected_user_ids() TO authenticated;

CREATE OR REPLACE FUNCTION public.can_view_buddy_profile(p_target uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() = p_target
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = p_target
        AND (
          (
            p.buddy_profile_visibility = 'shared_goals_only'
            AND p_target IN (SELECT public.friend_partner_user_ids())
          )
          OR (
            p.buddy_profile_visibility = 'friend_link'
            AND (
              p_target IN (SELECT public.friend_partner_user_ids())
              OR p_target IN (SELECT public.buddy_connected_user_ids())
            )
          )
        )
    );
$$;

GRANT EXECUTE ON FUNCTION public.can_view_buddy_profile(uuid) TO authenticated;

DROP POLICY IF EXISTS profiles_select_buddies ON public.profiles;
CREATE POLICY profiles_select_buddies ON public.profiles
  FOR SELECT
  USING (public.can_view_buddy_profile(id));

CREATE OR REPLACE FUNCTION public.get_buddy_profile_by_friend_code(p_code text)
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'userId', p.id,
    'displayName', COALESCE(NULLIF(trim(p.name), ''), NULLIF(trim(p.username), ''), 'Buddy'),
    'avatarPlant', COALESCE(p.buddy_avatar_plant, 1),
    'accentTheme', COALESCE(p.buddy_profile_accent, 'green'),
    'visibility', p.buddy_profile_visibility
  )
  FROM public.profiles p
  WHERE upper(trim(p_code)) = p.buddy_friend_code
    AND p.buddy_profile_visibility = 'friend_link'
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_buddy_profile_by_friend_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_buddy_profile_by_friend_code(text) TO anon;
