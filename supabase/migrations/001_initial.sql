-- ProveIt: initial schema
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard → SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users profile (extends Supabase auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  plan text not null default 'free' check (plan in ('free', 'pro', 'premium')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Goals
create table if not exists public.goals (
  id text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  frequency text not null check (frequency in ('daily', 'weekly')),
  reminder_time text,
  reminder_day integer,
  created_at timestamptz not null default now(),
  completed_dates text[] not null default '{}'
);

-- Proof submissions
create table if not exists public.submissions (
  id text primary key,
  goal_id text not null references public.goals(id) on delete cascade,
  date text not null,
  image_data_url text not null,
  status text not null check (status in ('pending', 'verified', 'rejected')),
  ai_feedback text,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

-- RLS policies
alter table public.profiles enable row level security;
alter table public.goals enable row level security;
alter table public.submissions enable row level security;

-- Profiles: users can read/update their own
create policy "Users can read own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Goals: users can CRUD their own
create policy "Users can manage own goals" on public.goals
  for all using (auth.uid() = user_id);

-- Submissions: users can read/write submissions for their goals
create policy "Users can manage own submissions" on public.submissions
  for all using (
    goal_id in (select id from public.goals where user_id = auth.uid())
  );

-- Trigger: create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, plan)
  values (new.id, new.email, 'free');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
