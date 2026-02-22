-- ProveIt: Initial schema
-- Run in Supabase Dashboard -> SQL Editor (paste ALL of this)

-- 1. Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grant access (required for Supabase API)
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON profiles TO service_role;

-- 2. Goals table
CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly')),
  reminder_time TEXT,
  reminder_day INTEGER,
  is_on_break BOOLEAN NOT NULL DEFAULT false,
  break_started_at TIMESTAMPTZ,
  break_streak_snapshot INTEGER,
  streak_carryover INTEGER,
  completed_dates JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

GRANT ALL ON goals TO authenticated;
GRANT ALL ON goals TO service_role;

-- 3. Submissions table
CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  goal_id TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  image_data_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  ai_feedback TEXT,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

GRANT ALL ON submissions TO authenticated;
GRANT ALL ON submissions TO service_role;

-- 4. Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- 5. Profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 6. Goals policies
DROP POLICY IF EXISTS "Users can manage own goals" ON goals;
CREATE POLICY "Users can manage own goals" ON goals FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 7. Submissions policies
DROP POLICY IF EXISTS "Users can view own submissions" ON submissions;
CREATE POLICY "Users can view own submissions" ON submissions FOR SELECT
  USING (goal_id IN (SELECT id FROM goals WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert own submissions" ON submissions;
CREATE POLICY "Users can insert own submissions" ON submissions FOR INSERT
  WITH CHECK (goal_id IN (SELECT id FROM goals WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update own submissions" ON submissions;
CREATE POLICY "Users can update own submissions" ON submissions FOR UPDATE
  USING (goal_id IN (SELECT id FROM goals WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete own submissions" ON submissions;
CREATE POLICY "Users can delete own submissions" ON submissions FOR DELETE
  USING (goal_id IN (SELECT id FROM goals WHERE user_id = auth.uid()));

-- 8. Auto-create profile on signup (for NEW users only)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 9. Backfill profiles for EXISTING users (run this if you had users before the migration)
INSERT INTO public.profiles (id, email, plan)
SELECT id, email, 'free' FROM auth.users
ON CONFLICT (id) DO NOTHING;
