-- ============================================================
-- MIGRATION: Telegram multi-usuario
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- Tabla de vínculos chat_id ↔ user_id
create table if not exists telegram_links (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references profiles on delete cascade not null unique,
  chat_id    text not null unique,
  username   text,
  first_name text,
  linked_at  timestamptz default now()
);

alter table telegram_links enable row level security;

create policy "Users read own telegram link"
  on telegram_links for select
  using (auth.uid() = user_id);

create policy "Service role manages telegram links"
  on telegram_links for all
  using (auth.role() = 'service_role');

create index if not exists telegram_links_chat_id_idx  on telegram_links(chat_id);
create index if not exists telegram_links_user_id_idx  on telegram_links(user_id);

-- Tabla de códigos temporales de vinculación (expiran en 10 min)
create table if not exists telegram_link_codes (
  code       text primary key,
  user_id    uuid references profiles on delete cascade not null,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

alter table telegram_link_codes enable row level security;

create policy "Service role manages link codes"
  on telegram_link_codes for all
  using (auth.role() = 'service_role');

-- Limpiar códigos expirados automáticamente (cron manual o via webhook)
create index if not exists telegram_link_codes_user_idx    on telegram_link_codes(user_id);
create index if not exists telegram_link_codes_expires_idx on telegram_link_codes(expires_at);
