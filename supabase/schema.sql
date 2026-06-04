-- ============================================================
-- FINANZAS PERSONALES - SUPABASE SCHEMA
-- ============================================================
-- Ejecutar en orden en el SQL Editor de Supabase
-- ============================================================


-- ============================================================
-- 1. PROFILES
-- ============================================================
create table if not exists profiles (
  id              uuid references auth.users on delete cascade primary key,
  full_name       text,
  avatar_url      text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- Auto-crear perfil al registrarse
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();


-- ============================================================
-- 2. TIPOS DE CAMBIO
-- ============================================================
create table if not exists exchange_rates (
  id            uuid primary key default gen_random_uuid(),
  rate_type     text not null,                    -- 'mep' | 'ccl' | 'blue' | 'oficial'
  from_currency text not null default 'USD',
  to_currency   text not null default 'ARS',
  rate          numeric(18,4) not null,
  date          date not null,
  source        text default 'api',               -- 'api' | 'manual'
  created_at    timestamptz default now(),
  unique(rate_type, date, from_currency, to_currency)
);


-- ============================================================
-- 3. CUENTAS BANCARIAS / BROKER / EFECTIVO
-- ============================================================
create table if not exists accounts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references profiles on delete cascade not null,
  name            text not null,
  type            text not null,                  -- 'bank' | 'broker' | 'crypto' | 'cash' | 'savings'
  platform        text,                           -- 'galicia' | 'balanz' | 'etoro' | 'binance' | null
  currency        text not null default 'ARS',
  initial_balance numeric(18,2) default 0,
  color           text default '#6366f1',
  icon            text default 'wallet',
  is_active       boolean default true,
  sort_order      integer default 0,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);


-- ============================================================
-- 4. TARJETAS DE CRÉDITO
-- ============================================================
create table if not exists credit_cards (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references profiles on delete cascade not null,
  name            text not null,                  -- 'Galicia Visa'
  bank            text,
  last_four       text,                           -- últimos 4 dígitos
  limit_amount    numeric(18,2),
  currency        text default 'ARS',
  closing_day     integer not null,               -- día del mes en que cierra el resumen
  due_day         integer not null,               -- día del mes en que vence el pago
  color           text default '#8b5cf6',
  is_active       boolean default true,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);


-- ============================================================
-- 5. CATEGORÍAS
-- ============================================================
create table if not exists categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references profiles on delete cascade not null,
  name        text not null,
  type        text not null,                      -- 'income' | 'expense'
  icon        text default 'tag',
  color       text default '#6366f1',
  is_default  boolean default false,
  is_active   boolean default true,
  sort_order  integer default 0,
  created_at  timestamptz default now()
);

-- ============================================================
-- 6. SUBCATEGORÍAS
-- ============================================================
create table if not exists subcategories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references profiles on delete cascade not null,
  category_id uuid references categories on delete cascade not null,
  name        text not null,
  description text,
  is_active   boolean default true,
  sort_order  integer default 0,
  created_at  timestamptz default now()
);


-- ============================================================
-- 7. PROYECTOS (ahorro y gasto)
-- ============================================================
create table if not exists projects (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references profiles on delete cascade not null,
  name                text not null,
  type                text not null,              -- 'savings' | 'expense'
  description         text,

  -- Para proyectos de ahorro
  target_amount       numeric(18,2),
  target_currency     text default 'USD',
  target_date         date,
  linked_account_id   uuid references accounts,

  -- Para proyectos de gasto
  budget_amount       numeric(18,2),
  budget_currency     text default 'ARS',

  color               text default '#10b981',
  icon                text default 'target',
  status              text default 'active',      -- 'active' | 'completed' | 'paused'
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);


-- ============================================================
-- 8. TRANSACCIONES
-- ============================================================
create table if not exists transactions (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid references profiles on delete cascade not null,
  type                      text not null,            -- 'income' | 'expense' | 'transfer'

  -- Montos (siempre guardamos ambas monedas)
  amount_original           numeric(18,2) not null,
  currency_original         text not null,            -- 'ARS' | 'USD'
  amount_ars                numeric(18,2) not null,
  amount_usd                numeric(18,2) not null,
  exchange_rate             numeric(18,4),            -- tipo de cambio usado
  exchange_rate_type        text,                     -- 'mep' | 'ccl'

  -- Categorización
  category_id               uuid references categories,
  subcategory_id            uuid references subcategories,

  -- Cuenta / Tarjeta
  account_id                uuid references accounts,
  credit_card_id            uuid references credit_cards,
  transfer_to_account_id    uuid references accounts,  -- solo para transfers

  -- Datos del movimiento
  description               text,
  date                      date not null,
  receipt_url               text,                     -- foto comprobante (Supabase Storage)

  -- Recurrencia
  is_recurring              boolean default false,
  recurrence_frequency      text,                     -- 'weekly' | 'monthly' | 'yearly'
  recurrence_end_date       date,
  parent_transaction_id     uuid references transactions,

  -- Cuotas
  has_installments          boolean default false,
  total_installments        integer,
  current_installment       integer,

  -- Proyecto vinculado
  project_id                uuid references projects,

  created_at                timestamptz default now(),
  updated_at                timestamptz default now()
);


-- ============================================================
-- 9. CUOTAS (detalle por mes)
-- ============================================================
create table if not exists installment_plans (
  id                            uuid primary key default gen_random_uuid(),
  user_id                       uuid references profiles on delete cascade not null,
  transaction_id                uuid references transactions on delete cascade not null,
  credit_card_id                uuid references credit_cards not null,
  installment_number            integer not null,           -- 1, 2, 3...
  total_installments            integer not null,
  amount_ars                    numeric(18,2) not null,
  amount_usd                    numeric(18,2) not null,
  due_date                      date not null,              -- mes en que cae esta cuota
  is_paid                       boolean default false,
  created_at                    timestamptz default now()
);


-- ============================================================
-- 10. POSICIONES DE INVERSIÓN
-- ============================================================
create table if not exists investment_positions (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid references profiles on delete cascade not null,
  account_id            uuid references accounts not null,

  ticker                text,                             -- 'AAPL', 'BTC', 'AL30'
  name                  text not null,                    -- nombre legible
  asset_type            text not null,                    -- 'stock' | 'etf' | 'crypto' | 'bond' | 'on' | 'fci' | 'cedear' | 'fixed_term'

  quantity              numeric(18,8) not null,
  avg_purchase_price    numeric(18,4) not null,
  purchase_currency     text not null,

  -- Precio actual
  current_price         numeric(18,4),
  current_price_usd     numeric(18,4),                   -- siempre en USD para comparar
  price_source          text,                             -- 'yahoo' | 'coingecko' | 'manual'
  last_price_update     timestamptz,
  manual_return_pct     numeric(8,4),                    -- % manual si no hay ticker

  -- Solo para plazos fijos
  fixed_term_start      date,
  fixed_term_end        date,
  fixed_term_tna        numeric(8,4),

  notes                 text,
  is_active             boolean default true,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);


-- ============================================================
-- 11. OPERACIONES DE INVERSIÓN (historial de trades)
-- ============================================================
create table if not exists investment_trades (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references profiles on delete cascade not null,
  position_id     uuid references investment_positions on delete cascade not null,

  type            text not null,      -- 'buy' | 'sell' | 'dividend' | 'interest' | 'staking'
  quantity        numeric(18,8),
  price           numeric(18,4) not null,
  currency        text not null,
  amount_ars      numeric(18,2),
  amount_usd      numeric(18,2),
  commission      numeric(18,2) default 0,
  date            date not null,
  notes           text,

  created_at      timestamptz default now()
);


-- ============================================================
-- 12. PERSONAS (para cobros pendientes)
-- ============================================================
create table if not exists people (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references profiles on delete cascade not null,
  name            text not null,
  relationship    text,               -- 'partner' | 'friend' | 'family' | 'other'
  contact         text,               -- teléfono o email opcional
  created_at      timestamptz default now()
);


-- ============================================================
-- 13. GASTOS A NOMBRE DE TERCEROS (cobros pendientes)
-- ============================================================
create table if not exists shared_expenses (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references profiles on delete cascade not null,
  transaction_id  uuid references transactions,           -- gasto original
  person_id       uuid references people on delete cascade not null,

  description     text not null,
  amount_ars      numeric(18,2) not null,
  amount_usd      numeric(18,2) not null,
  due_date        date,
  status          text default 'pending',                 -- 'pending' | 'partial' | 'settled'

  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);


-- ============================================================
-- 14. PAGOS DE COBROS PENDIENTES
-- ============================================================
create table if not exists shared_expense_payments (
  id                  uuid primary key default gen_random_uuid(),
  shared_expense_id   uuid references shared_expenses on delete cascade not null,
  amount_ars          numeric(18,2) not null,
  amount_usd          numeric(18,2),
  date                date not null,
  notes               text,
  created_at          timestamptz default now()
);


-- ============================================================
-- 15. ALERTAS / NOTIFICACIONES (configuración)
-- ============================================================
create table if not exists alert_settings (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references profiles on delete cascade not null,
  type            text not null,      -- 'expense_over_income' | 'credit_card_due' | 'fixed_term_maturity' | 'pending_debt_overdue'
  is_enabled      boolean default true,
  days_before     integer default 3,  -- para alertas de vencimiento
  created_at      timestamptz default now()
);


-- ============================================================
-- ÍNDICES para performance
-- ============================================================
create index if not exists idx_transactions_user_date     on transactions(user_id, date desc);
create index if not exists idx_transactions_user_type     on transactions(user_id, type);
create index if not exists idx_transactions_category      on transactions(category_id);
create index if not exists idx_transactions_account       on transactions(account_id);
create index if not exists idx_transactions_credit_card   on transactions(credit_card_id);
create index if not exists idx_installments_due_date      on installment_plans(user_id, due_date);
create index if not exists idx_investments_user           on investment_positions(user_id, is_active);
create index if not exists idx_shared_expenses_status     on shared_expenses(user_id, status);
create index if not exists idx_exchange_rates_date        on exchange_rates(rate_type, date desc);


-- ============================================================
-- ROW LEVEL SECURITY (RLS) — cada usuario solo ve sus datos
-- ============================================================
alter table profiles               enable row level security;
alter table accounts               enable row level security;
alter table credit_cards           enable row level security;
alter table categories             enable row level security;
alter table subcategories          enable row level security;
alter table projects               enable row level security;
alter table transactions           enable row level security;
alter table installment_plans      enable row level security;
alter table investment_positions   enable row level security;
alter table investment_trades      enable row level security;
alter table people                 enable row level security;
alter table shared_expenses        enable row level security;
alter table shared_expense_payments enable row level security;
alter table alert_settings         enable row level security;

-- exchange_rates: lectura pública
alter table exchange_rates enable row level security;
create policy "exchange_rates_select" on exchange_rates for select using (true);

-- profiles (usa id, no user_id)
create policy "profiles_select" on profiles for select using (id = auth.uid());
create policy "profiles_update" on profiles for update using (id = auth.uid());

-- accounts
create policy "accounts_user_policy" on accounts
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- credit_cards
create policy "credit_cards_user_policy" on credit_cards
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- categories
create policy "categories_user_policy" on categories
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- subcategories
create policy "subcategories_user_policy" on subcategories
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- projects
create policy "projects_user_policy" on projects
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- transactions
create policy "transactions_user_policy" on transactions
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- installment_plans
create policy "installment_plans_user_policy" on installment_plans
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- investment_positions
create policy "investment_positions_user_policy" on investment_positions
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- investment_trades
create policy "investment_trades_user_policy" on investment_trades
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- people
create policy "people_user_policy" on people
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- shared_expenses
create policy "shared_expenses_user_policy" on shared_expenses
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- shared_expense_payments (sin user_id, accede via join)
create policy "shared_expense_payments_user_policy" on shared_expense_payments
  using (
    exists (
      select 1 from shared_expenses se
      where se.id = shared_expense_payments.shared_expense_id
        and se.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from shared_expenses se
      where se.id = shared_expense_payments.shared_expense_id
        and se.user_id = auth.uid()
    )
  );

-- alert_settings
create policy "alert_settings_user_policy" on alert_settings
  using (user_id = auth.uid()) with check (user_id = auth.uid());
