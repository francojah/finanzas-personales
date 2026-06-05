-- ============================================================
-- MIGRATION: Agregar tabla assets (Patrimonio)
-- Ejecutar en Supabase SQL Editor
-- ============================================================

create table if not exists assets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references profiles on delete cascade not null,
  name        text not null,
  type        text not null,        -- 'property' | 'vehicle' | 'business' | 'other'
  description text,
  value       numeric(18,2) not null,
  currency    text not null default 'USD',  -- 'USD' | 'ARS'
  is_active   boolean default true,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- RLS
alter table assets enable row level security;

create policy "Users can manage own assets"
  on assets for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Index
create index if not exists assets_user_id_idx on assets(user_id);
