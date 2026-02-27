-- GameOn Schema Migration
-- Run this in your Supabase SQL editor

create extension if not exists "pgcrypto";

-- Groups table
create table if not exists groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sport text not null,
  default_capacity int not null default 10,
  location text not null default '',
  created_by text not null default 'organizer',
  invite_code text unique not null,
  pin_hash text not null,
  created_at timestamptz not null default now()
);

-- Games table
create table if not exists games (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  date date not null,
  time time not null,
  location text not null default '',
  capacity int not null default 10,
  status text not null default 'upcoming' check (status in ('upcoming', 'completed', 'cancelled')),
  recurring text default null check (recurring in (null, 'weekly', 'biweekly')),
  created_at timestamptz not null default now()
);

-- RSVPs table
create table if not exists rsvps (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  player_name text not null,
  status text not null default 'in' check (status in ('in', 'out', 'maybe')),
  waitlist_position int default null,
  created_at timestamptz not null default now(),
  unique(game_id, player_name)
);

-- Indexes
create index if not exists idx_groups_invite_code on groups(invite_code);
create index if not exists idx_games_group_id on games(group_id);
create index if not exists idx_games_date on games(date);
create index if not exists idx_rsvps_game_id on rsvps(game_id);

-- Enable RLS
alter table groups enable row level security;
alter table games enable row level security;
alter table rsvps enable row level security;

-- Public read/write policies (no auth required)
create policy "Public read groups" on groups for select using (true);
create policy "Public insert groups" on groups for insert with check (true);
create policy "Public update groups" on groups for update using (true);

create policy "Public read games" on games for select using (true);
create policy "Public insert games" on games for insert with check (true);
create policy "Public update games" on games for update using (true);

create policy "Public read rsvps" on rsvps for select using (true);
create policy "Public insert rsvps" on rsvps for insert with check (true);
create policy "Public update rsvps" on rsvps for update using (true);
create policy "Public delete rsvps" on rsvps for delete using (true);

-- Enable realtime
alter publication supabase_realtime add table rsvps;
alter publication supabase_realtime add table games;
