-- AI usage counters for plan-aware verification caps.

alter table public.profiles
  add column if not exists ai_verification_cycle_key text,
  add column if not exists ai_verification_count integer not null default 0;

comment on column public.profiles.grace_day_balance is
  'Streak Shield balance. Free: 0, Pro/trial: 3, Premium: 7.';

comment on column public.profiles.ai_verification_cycle_key is
  'Current AI usage cycle. Free/trial use yyyy-Www; paid plans use yyyy-MM.';

comment on column public.profiles.ai_verification_count is
  'Number of AI verification calls used in the current cycle.';

