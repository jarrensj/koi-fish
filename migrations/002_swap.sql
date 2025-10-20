-- Track each swap (one row per completed on-chain swap)
create table if not exists swap_event (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_user(id) on delete cascade,
  chain text not null,                           -- 'sol' | 'eth' | 'base' | 'zora'
  tx_hash text,                                  -- sig (Sol) or tx hash (EVM)
  sell_token text not null,
  buy_token  text not null,
  sell_amount_atomic numeric,                    -- bigint-safe numeric
  buy_amount_atomic  numeric,
  buy_token_decimals int,
  notional_usd numeric,                          -- nullable; fill if you have it
  quote jsonb,                                   -- snapshot for audit/debug
  platform_fee_bps int not null,                 -- from env
  platform_fee_atomic numeric not null,          -- in buy token units (or SOL for sol→*)
  created_at timestamptz default now()
);

create index if not exists idx_swap_event_user_created on swap_event (user_id, created_at desc);

-- Ledger of referral earnings (one row per eligible swap)
create table if not exists referral_earning (
  id uuid primary key default gen_random_uuid(),
  referrer_user_id uuid not null references app_user(id) on delete cascade,
  invitee_user_id uuid not null references app_user(id) on delete cascade,
  swap_event_id uuid not null references swap_event(id) on delete cascade,
  share_percent numeric not null,                -- REFERRAL_FEE_SHARE_PERCENT at time of accrual
  amount_atomic numeric not null,                -- referrer’s share, same units as swap_event.platform_fee_atomic
  token_address text not null,                   -- equals swap_event.buy_token (or your canonical “fee token”)
  status text not null default 'accrued',        -- 'accrued' | 'paid' | 'void'
  created_at timestamptz default now(),
  paid_at timestamptz
);

create index if not exists idx_ref_earning_referrer on referral_earning (referrer_user_id, created_at desc);
create index if not exists idx_ref_earning_invitee  on referral_earning (invitee_user_id, created_at desc);
