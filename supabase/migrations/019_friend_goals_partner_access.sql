/* Partner read access + safe invite lookup (no service role required for core flows). */

DROP POLICY IF EXISTS goals_select_friend_partners ON goals;
CREATE POLICY goals_select_friend_partners ON goals
  FOR SELECT
  USING (
    id IN (
      SELECT m2.goal_id
      FROM shared_goal_members m1
      INNER JOIN shared_goal_members m2 ON m1.shared_goal_id = m2.shared_goal_id
      WHERE m1.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS submissions_select_friend_partners ON submissions;
CREATE POLICY submissions_select_friend_partners ON submissions
  FOR SELECT
  USING (
    goal_id IN (
      SELECT m2.goal_id
      FROM shared_goal_members m1
      INNER JOIN shared_goal_members m2 ON m1.shared_goal_id = m2.shared_goal_id
      WHERE m1.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS profiles_select_friend_partners ON profiles;
CREATE POLICY profiles_select_friend_partners ON profiles
  FOR SELECT
  USING (
    id IN (
      SELECT m2.user_id
      FROM shared_goal_members m1
      INNER JOIN shared_goal_members m2 ON m1.shared_goal_id = m2.shared_goal_id
      WHERE m1.user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.get_friend_goal_invite(p_code text)
RETURNS json
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'id', sg.id,
    'invite_code', sg.invite_code,
    'title', sg.title,
    'description', sg.description,
    'frequency', sg.frequency,
    'times_per_week', sg.times_per_week,
    'created_by', sg.created_by,
    'member_count', (
      SELECT count(*)::int FROM shared_goal_members m WHERE m.shared_goal_id = sg.id
    )
  )
  FROM shared_goals sg
  WHERE sg.invite_code = upper(trim(p_code))
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_friend_goal_invite(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_friend_goal_invite(text) TO anon;
