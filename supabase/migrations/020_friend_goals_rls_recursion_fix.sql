/* Fix "infinite recursion detected" — RLS policies must not SELECT the same table they protect. */

CREATE OR REPLACE FUNCTION public.is_member_of_shared_goal(p_shared_goal_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM shared_goal_members m
    WHERE m.shared_goal_id = p_shared_goal_id
      AND m.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.friend_partner_goal_ids()
RETURNS SETOF text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m2.goal_id
  FROM shared_goal_members m1
  INNER JOIN shared_goal_members m2 ON m1.shared_goal_id = m2.shared_goal_id
  WHERE m1.user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.friend_partner_user_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m2.user_id
  FROM shared_goal_members m1
  INNER JOIN shared_goal_members m2 ON m1.shared_goal_id = m2.shared_goal_id
  WHERE m1.user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.is_member_of_shared_goal(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.friend_partner_goal_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.friend_partner_user_ids() TO authenticated;

DROP POLICY IF EXISTS "Members can view shared goals" ON shared_goals;
DROP POLICY IF EXISTS shared_goals_select_members ON shared_goals;
CREATE POLICY shared_goals_select_members ON shared_goals
  FOR SELECT
  USING (public.is_member_of_shared_goal(id));

DROP POLICY IF EXISTS "Members can view memberships" ON shared_goal_members;
DROP POLICY IF EXISTS shared_goal_members_select ON shared_goal_members;
CREATE POLICY shared_goal_members_select ON shared_goal_members
  FOR SELECT
  USING (public.is_member_of_shared_goal(shared_goal_id));

DROP POLICY IF EXISTS goals_select_friend_partners ON goals;
CREATE POLICY goals_select_friend_partners ON goals
  FOR SELECT
  USING (id IN (SELECT public.friend_partner_goal_ids()));

DROP POLICY IF EXISTS submissions_select_friend_partners ON submissions;
CREATE POLICY submissions_select_friend_partners ON submissions
  FOR SELECT
  USING (goal_id IN (SELECT public.friend_partner_goal_ids()));

DROP POLICY IF EXISTS profiles_select_friend_partners ON profiles;
CREATE POLICY profiles_select_friend_partners ON profiles
  FOR SELECT
  USING (id IN (SELECT public.friend_partner_user_ids()));
