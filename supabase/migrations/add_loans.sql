-- ============================================================
-- MIGRATION: Agregar tabla loans (Préstamos)
-- Ejecutar en Supabase SQL Editor
-- ============================================================

create table if not exists loans (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references profiles on delete cascade not null,
  name                text not null,
  lender              text,                          -- banco o persona que prestó
  total_amount        numeric(18,2) not null,
  currency            text not null default 'ARS',   -- 'ARS' | 'USD'
  monthly_payment     numeric(18,2) not null,
  total_installments  integer,                       -- null = tiempo indefinido
  paid_installments   integer not null default 0,
  start_date          date,
  interest_rate       numeric(6,2),                  -- TNA %
  account_id          uuid references accounts,      -- cuenta desde la que se debita
  notes               text,
  is_active           boolean default true,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

alter table loans enable row level security;

create policy "Users manage own loans"
  on loans for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists loans_user_id_idx on loans(user_id);
