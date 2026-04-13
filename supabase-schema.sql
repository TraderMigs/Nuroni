-- ============================================
-- NURONI DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- ============================================

-- PROFILES TABLE
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  display_name text,
  username text unique,
  height numeric,
  weight_unit text default 'lbs',
  distance_unit text default 'miles',
  start_weight numeric,
  is_public boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- GOALS TABLE
create table if not exists public.goals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  goal_weight numeric,
  daily_step_goal integer default 8000,
  target_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ENTRIES TABLE
create table if not exists public.entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  weight numeric not null,
  steps integer default 0,
  distance numeric,
  notes text,
  created_at timestamptz default now()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

alter table public.profiles enable row level security;
alter table public.goals enable row level security;
alter table public.entries enable row level security;

-- PROFILES policies
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Public profiles are viewable by anyone"
  on public.profiles for select
  using (is_public = true);

-- GOALS policies
create policy "Users can manage own goals"
  on public.goals for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Public goals viewable if profile is public"
  on public.goals for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = goals.user_id
      and profiles.is_public = true
    )
  );

-- ENTRIES policies
create policy "Users can manage own entries"
  on public.entries for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Public entries viewable if profile is public"
  on public.entries for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = entries.user_id
      and profiles.is_public = true
    )
  );

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================

create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger set_goals_updated_at
  before update on public.goals
  for each row execute function public.handle_updated_at();

-- ============================================
-- PHASE 2: PLUS+ SUBSCRIPTION
-- Run this in Supabase SQL Editor
-- ============================================

-- Add plus subscription fields to profiles
alter table public.profiles
  add column if not exists is_plus boolean default false,
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists plus_expires_at timestamptz;

-- Add notes field to entries
alter table public.entries
  add column if not exists note text;
