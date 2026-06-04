-- ============================================================
-- SEED — Categorías y subcategorías default
-- ============================================================
-- Este seed se ejecuta vía función de base de datos cuando
-- un usuario nuevo se registra. Todas las categorías se
-- crean con is_default = true para que el usuario pueda
-- editarlas o eliminarlas.
-- ============================================================

create or replace function seed_default_categories(p_user_id uuid)
returns void as $$
declare
  -- Categorías de GASTOS
  cat_hogar         uuid;
  cat_alimentacion  uuid;
  cat_transporte    uuid;
  cat_salud         uuid;
  cat_personal      uuid;
  cat_entret        uuid;
  cat_suscripciones uuid;
  cat_financiero    uuid;
  cat_educacion     uuid;

  -- Categorías de INGRESOS
  cat_trabajo       uuid;
  cat_emprendimiento uuid;
  cat_inversiones   uuid;
  cat_otros         uuid;
begin

  -- ──────────────────────────────────────
  -- GASTOS
  -- ──────────────────────────────────────

  insert into categories (user_id, name, type, icon, color, is_default, sort_order)
  values (p_user_id, 'Gastos Hogar', 'expense', 'home', '#3b82f6', true, 1)
  returning id into cat_hogar;

  insert into subcategories (user_id, category_id, name, sort_order) values
    (p_user_id, cat_hogar, 'Alquiler', 1),
    (p_user_id, cat_hogar, 'Expensas', 2),
    (p_user_id, cat_hogar, 'Luz', 3),
    (p_user_id, cat_hogar, 'Gas', 4),
    (p_user_id, cat_hogar, 'Internet', 5),
    (p_user_id, cat_hogar, 'Agua', 6),
    (p_user_id, cat_hogar, 'Limpieza', 7),
    (p_user_id, cat_hogar, 'Reparaciones', 8);

  insert into categories (user_id, name, type, icon, color, is_default, sort_order)
  values (p_user_id, 'Alimentación', 'expense', 'shopping-cart', '#10b981', true, 2)
  returning id into cat_alimentacion;

  insert into subcategories (user_id, category_id, name, sort_order) values
    (p_user_id, cat_alimentacion, 'Supermercado', 1),
    (p_user_id, cat_alimentacion, 'Verdulería', 2),
    (p_user_id, cat_alimentacion, 'Carnicería', 3),
    (p_user_id, cat_alimentacion, 'Panadería', 4),
    (p_user_id, cat_alimentacion, 'Delivery', 5);

  insert into categories (user_id, name, type, icon, color, is_default, sort_order)
  values (p_user_id, 'Transporte', 'expense', 'car', '#f59e0b', true, 3)
  returning id into cat_transporte;

  insert into subcategories (user_id, category_id, name, sort_order) values
    (p_user_id, cat_transporte, 'Nafta', 1),
    (p_user_id, cat_transporte, 'Peaje', 2),
    (p_user_id, cat_transporte, 'Uber / Cabify', 3),
    (p_user_id, cat_transporte, 'Estacionamiento', 4),
    (p_user_id, cat_transporte, 'Mantenimiento auto', 5),
    (p_user_id, cat_transporte, 'Transporte público', 6);

  insert into categories (user_id, name, type, icon, color, is_default, sort_order)
  values (p_user_id, 'Salud', 'expense', 'heart', '#ef4444', true, 4)
  returning id into cat_salud;

  insert into subcategories (user_id, category_id, name, sort_order) values
    (p_user_id, cat_salud, 'Prepaga / Obra Social', 1),
    (p_user_id, cat_salud, 'Médico', 2),
    (p_user_id, cat_salud, 'Farmacia', 3),
    (p_user_id, cat_salud, 'Psicólogo', 4),
    (p_user_id, cat_salud, 'Dentista', 5),
    (p_user_id, cat_salud, 'Análisis clínicos', 6);

  insert into categories (user_id, name, type, icon, color, is_default, sort_order)
  values (p_user_id, 'Personal', 'expense', 'user', '#8b5cf6', true, 5)
  returning id into cat_personal;

  insert into subcategories (user_id, category_id, name, sort_order) values
    (p_user_id, cat_personal, 'Ropa', 1),
    (p_user_id, cat_personal, 'Calzado', 2),
    (p_user_id, cat_personal, 'Peluquería', 3),
    (p_user_id, cat_personal, 'Gym / Deporte', 4),
    (p_user_id, cat_personal, 'Cuidado personal', 5);

  insert into categories (user_id, name, type, icon, color, is_default, sort_order)
  values (p_user_id, 'Entretenimiento', 'expense', 'music', '#ec4899', true, 6)
  returning id into cat_entret;

  insert into subcategories (user_id, category_id, name, sort_order) values
    (p_user_id, cat_entret, 'Restaurantes / Bares', 1),
    (p_user_id, cat_entret, 'Cine / Teatro', 2),
    (p_user_id, cat_entret, 'Viajes / Turismo', 3),
    (p_user_id, cat_entret, 'Hobbies', 4),
    (p_user_id, cat_entret, 'Salidas', 5);

  insert into categories (user_id, name, type, icon, color, is_default, sort_order)
  values (p_user_id, 'Suscripciones', 'expense', 'repeat', '#06b6d4', true, 7)
  returning id into cat_suscripciones;

  insert into subcategories (user_id, category_id, name, sort_order) values
    (p_user_id, cat_suscripciones, 'Netflix', 1),
    (p_user_id, cat_suscripciones, 'Spotify', 2),
    (p_user_id, cat_suscripciones, 'Disney+', 3),
    (p_user_id, cat_suscripciones, 'iCloud / Google One', 4),
    (p_user_id, cat_suscripciones, 'Adobe', 5),
    (p_user_id, cat_suscripciones, 'ChatGPT / IA', 6),
    (p_user_id, cat_suscripciones, 'Otras suscripciones', 7);

  insert into categories (user_id, name, type, icon, color, is_default, sort_order)
  values (p_user_id, 'Financiero', 'expense', 'trending-down', '#64748b', true, 8)
  returning id into cat_financiero;

  insert into subcategories (user_id, category_id, name, sort_order) values
    (p_user_id, cat_financiero, 'Comisiones broker', 1),
    (p_user_id, cat_financiero, 'Impuestos', 2),
    (p_user_id, cat_financiero, 'Intereses', 3),
    (p_user_id, cat_financiero, 'Seguros', 4);

  insert into categories (user_id, name, type, icon, color, is_default, sort_order)
  values (p_user_id, 'Educación', 'expense', 'book', '#f97316', true, 9)
  returning id into cat_educacion;

  insert into subcategories (user_id, category_id, name, sort_order) values
    (p_user_id, cat_educacion, 'Cursos online', 1),
    (p_user_id, cat_educacion, 'Libros', 2),
    (p_user_id, cat_educacion, 'Universidad / Posgrado', 3),
    (p_user_id, cat_educacion, 'Idiomas', 4);

  -- ──────────────────────────────────────
  -- INGRESOS
  -- ──────────────────────────────────────

  insert into categories (user_id, name, type, icon, color, is_default, sort_order)
  values (p_user_id, 'Trabajo', 'income', 'briefcase', '#10b981', true, 1)
  returning id into cat_trabajo;

  insert into subcategories (user_id, category_id, name, sort_order) values
    (p_user_id, cat_trabajo, 'Sueldo', 1),
    (p_user_id, cat_trabajo, 'Aguinaldo', 2),
    (p_user_id, cat_trabajo, 'Bono', 3),
    (p_user_id, cat_trabajo, 'Horas extra', 4);

  insert into categories (user_id, name, type, icon, color, is_default, sort_order)
  values (p_user_id, 'Emprendimiento', 'income', 'zap', '#f59e0b', true, 2)
  returning id into cat_emprendimiento;

  insert into subcategories (user_id, category_id, name, sort_order) values
    (p_user_id, cat_emprendimiento, 'Facturación', 1),
    (p_user_id, cat_emprendimiento, 'Honorarios', 2),
    (p_user_id, cat_emprendimiento, 'Venta de producto', 3),
    (p_user_id, cat_emprendimiento, 'Consultoría', 4);

  insert into categories (user_id, name, type, icon, color, is_default, sort_order)
  values (p_user_id, 'Inversiones', 'income', 'trending-up', '#6366f1', true, 3)
  returning id into cat_inversiones;

  insert into subcategories (user_id, category_id, name, sort_order) values
    (p_user_id, cat_inversiones, 'Dividendos', 1),
    (p_user_id, cat_inversiones, 'Renta FCI', 2),
    (p_user_id, cat_inversiones, 'Cupón de bono', 3),
    (p_user_id, cat_inversiones, 'Renta ON', 4),
    (p_user_id, cat_inversiones, 'Plazo fijo', 5),
    (p_user_id, cat_inversiones, 'Staking / Crypto', 6),
    (p_user_id, cat_inversiones, 'Venta de activo', 7);

  insert into categories (user_id, name, type, icon, color, is_default, sort_order)
  values (p_user_id, 'Otros ingresos', 'income', 'plus-circle', '#64748b', true, 4)
  returning id into cat_otros;

  insert into subcategories (user_id, category_id, name, sort_order) values
    (p_user_id, cat_otros, 'Venta de bien', 1),
    (p_user_id, cat_otros, 'Reintegro', 2),
    (p_user_id, cat_otros, 'Regalo', 3);

  -- ──────────────────────────────────────
  -- ALERTAS DEFAULT
  -- ──────────────────────────────────────
  insert into alert_settings (user_id, type, is_enabled, days_before) values
    (p_user_id, 'expense_over_income',    true, 0),
    (p_user_id, 'credit_card_due',        true, 5),
    (p_user_id, 'fixed_term_maturity',    true, 7),
    (p_user_id, 'pending_debt_overdue',   true, 3);

end;
$$ language plpgsql security definer;


-- ──────────────────────────────────────────────────────────────
-- Llamar seed_default_categories automáticamente al crear perfil
-- ──────────────────────────────────────────────────────────────
create or replace function handle_new_profile()
returns trigger as $$
begin
  perform seed_default_categories(new.id);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_profile_created on profiles;
create trigger on_profile_created
  after insert on profiles
  for each row execute function handle_new_profile();
