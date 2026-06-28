-- Clank! Online — initial schema
-- Run this in the Supabase SQL editor (or via `supabase db push`).

create extension if not exists "pgcrypto";

-- =========================================================
-- games
-- =========================================================
create table if not exists games (
  id uuid primary key default gen_random_uuid(),
  join_code text not null unique,
  status text not null default 'lobby' check (status in ('lobby', 'active', 'finished')),
  current_player_index int not null default 0,
  player_order uuid[] not null default '{}',
  game_state jsonb not null default '{}'::jsonb,
  turn_number int not null default 0,
  dragon_rage int not null default 0,
  countdown_track int,
  first_escape_player_id uuid,
  host_player_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_games_join_code on games (join_code);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_games_updated_at on games;
create trigger trg_games_updated_at
  before update on games
  for each row execute function set_updated_at();

-- =========================================================
-- players
-- =========================================================
create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games (id) on delete cascade,
  display_name text not null,
  color text not null,
  position text not null default 'entrance',
  hand jsonb not null default '[]'::jsonb,
  deck jsonb not null default '[]'::jsonb,
  discard jsonb not null default '[]'::jsonb,
  clank_cubes_in_supply int not null default 26,
  clank_cubes_on_board int not null default 0,
  health int not null default 10,
  gold int not null default 0,
  artifacts jsonb not null default '[]'::jsonb,
  tokens jsonb not null default '[]'::jsonb,
  has_escaped boolean not null default false,
  is_knocked_out boolean not null default false,
  score int not null default 0,
  turn_order int not null default 0,
  is_host boolean not null default false,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_players_game_id on players (game_id);

-- =========================================================
-- turn_log
-- =========================================================
create table if not exists turn_log (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games (id) on delete cascade,
  player_id uuid references players (id) on delete set null,
  turn_number int not null default 0,
  actions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_turn_log_game_id on turn_log (game_id, created_at desc);

-- =========================================================
-- dungeon_row
-- =========================================================
create table if not exists dungeon_row (
  game_id uuid not null references games (id) on delete cascade,
  slot int not null check (slot between 0 and 5),
  card_id text,
  primary key (game_id, slot)
);

-- =========================================================
-- dragon_bag
-- =========================================================
create table if not exists dragon_bag (
  game_id uuid primary key references games (id) on delete cascade,
  cubes jsonb not null default '[]'::jsonb
);

-- =========================================================
-- Row Level Security
-- No account-based auth is used (players are identified by a
-- locally-stored UUID + join code), so we open these tables to the
-- anon role and rely on join-code obscurity + server-side validation
-- in the API routes for write integrity.
-- =========================================================
alter table games enable row level security;
alter table players enable row level security;
alter table turn_log enable row level security;
alter table dungeon_row enable row level security;
alter table dragon_bag enable row level security;

drop policy if exists "games_all" on games;
create policy "games_all" on games for all using (true) with check (true);

drop policy if exists "players_all" on players;
create policy "players_all" on players for all using (true) with check (true);

drop policy if exists "turn_log_all" on turn_log;
create policy "turn_log_all" on turn_log for all using (true) with check (true);

drop policy if exists "dungeon_row_all" on dungeon_row;
create policy "dungeon_row_all" on dungeon_row for all using (true) with check (true);

drop policy if exists "dragon_bag_all" on dragon_bag;
create policy "dragon_bag_all" on dragon_bag for all using (true) with check (true);

-- =========================================================
-- Realtime
-- =========================================================
do $$
declare
  t text;
begin
  foreach t in array array['games', 'players', 'turn_log', 'dungeon_row', 'dragon_bag']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table %I', t);
    end if;
  end loop;
end $$;
