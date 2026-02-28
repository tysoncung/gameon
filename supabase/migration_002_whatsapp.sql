-- Migration 002: WhatsApp bot support
-- Run this AFTER migration.sql

-- Add phone column to track WhatsApp users
-- We create a separate players table for phone->name mapping
create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  name text not null,
  group_id uuid not null references groups(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(phone, group_id)
);

-- Add guests column to rsvps for +N tracking
alter table rsvps add column if not exists guests int not null default 0;

-- Add phone reference to rsvps (nullable - web RSVPs won't have it)
alter table rsvps add column if not exists player_phone text default null;

-- Reminders table
create table if not exists reminders (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  reminder_type text not null check (reminder_type in ('24h', '2h')),
  sent_at timestamptz not null default now(),
  unique(game_id, reminder_type)
);

-- WhatsApp group mapping (link a GameOn group to a WhatsApp group)
create table if not exists whatsapp_groups (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  whatsapp_group_id text not null,
  created_at timestamptz not null default now(),
  unique(group_id),
  unique(whatsapp_group_id)
);

-- Indexes
create index if not exists idx_players_phone on players(phone);
create index if not exists idx_players_group on players(group_id);
create index if not exists idx_reminders_game on reminders(game_id);
create index if not exists idx_whatsapp_groups_wa on whatsapp_groups(whatsapp_group_id);

-- RLS policies for new tables
alter table players enable row level security;
alter table reminders enable row level security;
alter table whatsapp_groups enable row level security;

create policy "Public read players" on players for select using (true);
create policy "Public insert players" on players for insert with check (true);
create policy "Public update players" on players for update using (true);

create policy "Public read reminders" on reminders for select using (true);
create policy "Public insert reminders" on reminders for insert with check (true);

create policy "Public read whatsapp_groups" on whatsapp_groups for select using (true);
create policy "Public insert whatsapp_groups" on whatsapp_groups for insert with check (true);
create policy "Public update whatsapp_groups" on whatsapp_groups for update using (true);

-- Enable realtime on new tables
alter publication supabase_realtime add table players;
