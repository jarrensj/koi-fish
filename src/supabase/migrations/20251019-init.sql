-- tables

-- algos
create table if not exists public.algos (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  "desc" text not null,
  status text not null default 'active',
  min_alloc_sol numeric(24,9) not null default 0,
  fee_bps int not null default 0,
  created_at timestamptz not null default now()
);

-- users
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  telegram_id text not null unique,
  created_at timestamptz not null default now()
);

-- allocations
create table if not exists public.allocations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  algo_id uuid not null references public.algos(id) on delete cascade,
  status text not null default 'off' check (status in ('on','off')),
  allocated_sol numeric(24,9) not null default 0,
  pnl_sol numeric(24,9) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, algo_id)
);
