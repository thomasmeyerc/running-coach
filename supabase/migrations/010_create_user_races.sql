-- User Races: tracks which races a user has completed, has upcoming, or is interested in
create table user_races (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  race_id text not null,
  status text not null check (status in ('completed', 'upcoming', 'interested')),
  year integer,
  finish_time_seconds integer,
  notes text,
  goal_id uuid references goals(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, race_id, year)
);

-- Index for fast user lookups
create index idx_user_races_user_id on user_races(user_id);
create index idx_user_races_race_id on user_races(race_id);

-- RLS
alter table user_races enable row level security;

create policy "Users can view own races"
  on user_races for select
  using (auth.uid() = user_id);

create policy "Users can insert own races"
  on user_races for insert
  with check (auth.uid() = user_id);

create policy "Users can update own races"
  on user_races for update
  using (auth.uid() = user_id);

create policy "Users can delete own races"
  on user_races for delete
  using (auth.uid() = user_id);
