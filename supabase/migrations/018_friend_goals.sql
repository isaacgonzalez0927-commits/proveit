/* 018: Friend goals — invite link + shared progress (pairs, max 2 members). */

CREATE TABLE IF NOT EXISTS shared_goals (
  id TEXT PRIMARY KEY,
  invite_code TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly')),
  times_per_week INTEGER,
  reminder_time TEXT,
  reminder_days INTEGER[],
  proof_suggestions JSONB,
  proof_requirement TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS shared_goals_invite_code_idx ON shared_goals (invite_code);
CREATE INDEX IF NOT EXISTS shared_goals_created_by_idx ON shared_goals (created_by);

CREATE TABLE IF NOT EXISTS shared_goal_members (
  id TEXT PRIMARY KEY,
  shared_goal_id TEXT NOT NULL REFERENCES shared_goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (shared_goal_id, user_id),
  UNIQUE (goal_id)
);

CREATE INDEX IF NOT EXISTS shared_goal_members_user_idx ON shared_goal_members (user_id);
CREATE INDEX IF NOT EXISTS shared_goal_members_shared_idx ON shared_goal_members (shared_goal_id);

GRANT ALL ON shared_goals TO authenticated;
GRANT ALL ON shared_goal_members TO authenticated;
GRANT ALL ON shared_goals TO service_role;
GRANT ALL ON shared_goal_members TO service_role;

ALTER TABLE shared_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_goal_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view shared goals" ON shared_goals;
DROP POLICY IF EXISTS "Users can create shared goals" ON shared_goals;
DROP POLICY IF EXISTS shared_goals_select_members ON shared_goals;
CREATE POLICY shared_goals_select_members ON shared_goals
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM shared_goal_members m
      WHERE m.shared_goal_id = shared_goals.id AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS shared_goals_insert_owner ON shared_goals;
CREATE POLICY shared_goals_insert_owner ON shared_goals
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Members can view memberships" ON shared_goal_members;
DROP POLICY IF EXISTS "Users can join as themselves" ON shared_goal_members;
DROP POLICY IF EXISTS shared_goal_members_select ON shared_goal_members;
CREATE POLICY shared_goal_members_select ON shared_goal_members
  FOR SELECT
  USING (
    shared_goal_id IN (
      SELECT m.shared_goal_id FROM shared_goal_members m WHERE m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS shared_goal_members_insert_self ON shared_goal_members;
CREATE POLICY shared_goal_members_insert_self ON shared_goal_members
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
