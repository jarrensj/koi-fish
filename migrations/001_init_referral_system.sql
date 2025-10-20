-- Migration: Initial Referral/Invite System (Phase 1)
-- Description: Invite codes and attribution tracking
-- Date: 2025-10-19

-- Users
create table if not exists app_user (
  id uuid primary key default gen_random_uuid(),
  wallet_evm text,                -- 0x..., optional
  wallet_sol text,                -- base58, optional
  created_at timestamptz default now()
);

-- One invite code per user (simpler & anti-gaming for v1)
create table if not exists invite_code (
  user_id uuid primary key references app_user(id) on delete cascade,
  code text unique not null,      -- e.g. 8 chars UPPER
  created_at timestamptz default now(),
  
  constraint invite_code_format check (char_length(code) >= 4 and char_length(code) <= 20)
);

-- One attribution per invitee (immutable)
create table if not exists invite_attribution (
  invitee_user_id uuid primary key references app_user(id) on delete cascade,
  inviter_user_id uuid not null references app_user(id) on delete cascade,
  attributed_at timestamptz not null default now(),
  first_swap_at timestamptz,      -- filled later (Phase 2)
  total_swaps int default 0,      -- maintained later (Phase 2)
  
  constraint no_self_invite check (invitee_user_id != inviter_user_id)
);

-- Indexes
create index if not exists idx_invite_attribution_inviter on invite_attribution (inviter_user_id);
create index if not exists idx_invite_code_code on invite_code (code);

-- Comments
comment on table invite_code is 'One invite code per user';
comment on table invite_attribution is 'Successful referrals - expires_at derived from attributed_at + REFERRAL_DURATION_DAYS';

