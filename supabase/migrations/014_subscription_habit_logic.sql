-- Subscription-aware reminders, grace-day streak insurance, and trial review state.

alter table public.profiles
  drop constraint if exists profiles_plan_check;

alter table public.profiles
  add constraint profiles_plan_check check (plan in ('free', 'pro', 'premium'));

alter table public.profiles
  add column if not exists grace_day_balance integer not null default 0,
  add column if not exists grace_day_cycle_anchor timestamptz,
  add column if not exists strict_ai_verification boolean not null default false,
  add column if not exists trial_expired_needs_review boolean not null default false;

alter table public.goals
  add column if not exists reminder_is_active boolean not null default true,
  add column if not exists archived_at timestamptz;

create table if not exists public.grace_day_events (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id text not null references public.goals(id) on delete cascade,
  week_start date not null,
  missed_date date,
  used_at timestamptz not null default now(),
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists grace_day_events_user_week_idx
  on public.grace_day_events(user_id, week_start);

create index if not exists grace_day_events_goal_week_idx
  on public.grace_day_events(goal_id, week_start);

alter table public.grace_day_events enable row level security;

drop policy if exists "Users can read own grace day events" on public.grace_day_events;
create policy "Users can read own grace day events"
  on public.grace_day_events for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own grace day events" on public.grace_day_events;
create policy "Users can insert own grace day events"
  on public.grace_day_events for insert
  with check (auth.uid() = user_id);

