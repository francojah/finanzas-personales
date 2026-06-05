-- ============================================================
-- MIGRATION: Planes y suscripciones
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Agregar campo plan a profiles
alter table profiles
  add column if not exists plan text not null default 'free'
    check (plan in ('free', 'premium')),
  add column if not exists plan_expires_at timestamptz;

-- 2. Tabla de suscripciones (tracking MercadoPago)
create table if not exists subscriptions (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid references profiles on delete cascade not null,

  -- MercadoPago
  mp_subscription_id      text unique,          -- ID del preapproval en MP
  mp_payer_email          text,
  mp_plan_id              text,                 -- ID del plan en MP

  -- Estado
  status                  text not null default 'pending'
    check (status in ('pending', 'active', 'paused', 'cancelled', 'expired')),

  -- Fechas
  started_at              timestamptz,
  current_period_start    timestamptz,
  current_period_end      timestamptz,
  cancelled_at            timestamptz,
  next_payment_date       timestamptz,

  -- Monto
  amount                  numeric(10,2),
  currency                text default 'ARS',

  -- Metadata
  created_at              timestamptz default now(),
  updated_at              timestamptz default now()
);

alter table subscriptions enable row level security;

create policy "Users read own subscriptions"
  on subscriptions for select
  using (auth.uid() = user_id);

-- Solo el service_role puede escribir (webhooks de MP corren con service key)
create policy "Service role manages subscriptions"
  on subscriptions for all
  using (auth.role() = 'service_role');

create index if not exists subscriptions_user_id_idx on subscriptions(user_id);
create index if not exists subscriptions_mp_id_idx   on subscriptions(mp_subscription_id);

-- 3. Función: activar plan premium cuando MP confirma pago
create or replace function activate_premium(p_user_id uuid, p_expires_at timestamptz)
returns void as $$
begin
  update profiles
    set plan = 'premium', plan_expires_at = p_expires_at, updated_at = now()
    where id = p_user_id;
end;
$$ language plpgsql security definer;

-- 4. Función: revertir a free cuando se cancela / expira
create or replace function deactivate_premium(p_user_id uuid)
returns void as $$
begin
  update profiles
    set plan = 'free', plan_expires_at = null, updated_at = now()
    where id = p_user_id;
end;
$$ language plpgsql security definer;
