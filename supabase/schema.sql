-- Schema preparatorio: non ancora collegato all'app.
-- RLS senza policy pubbliche: accesso negato fino all'implementazione
-- delle membership e delle funzioni transazionali descritte nel README.
create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references auth.users(id),
  revision bigint not null default 0,
  created_at timestamptz not null default now()
);
create table public.players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  seat smallint not null check (seat between 1 and 5),
  name text not null check (length(trim(name)) between 1 and 30),
  unique(room_id, seat),
  unique(room_id, id)
);
create unique index players_unique_name on public.players(room_id, lower(trim(name)));
create table public.room_members (
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key(room_id, user_id)
);
create table public.hands (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  caller_id uuid not null,
  called_player_id uuid,
  call_type text not null check (call_type in ('normal', 'double', 'triple', 'carichi')),
  caller_won boolean not null,
  created_at timestamptz not null default now(),
  foreign key(room_id, caller_id) references public.players(room_id, id),
  foreign key(room_id, called_player_id) references public.players(room_id, id),
  check ((call_type = 'carichi' and called_player_id is null) or
    (call_type <> 'carichi' and called_player_id is not null and called_player_id <> caller_id))
);
create table public.proposals (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  author_id uuid not null references auth.users(id),
  kind text not null check (kind in ('add', 'edit', 'delete')),
  hand_payload jsonb not null,
  base_hand jsonb,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);
alter table public.rooms enable row level security;
alter table public.players enable row level security;
alter table public.room_members enable row level security;
alter table public.hands enable row level security;
alter table public.proposals enable row level security;
