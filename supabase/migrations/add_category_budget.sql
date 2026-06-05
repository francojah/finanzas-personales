-- Agregar presupuesto mensual a categorías
ALTER TABLE categories ADD COLUMN IF NOT EXISTS monthly_budget numeric(18,2);

-- Comentario
COMMENT ON COLUMN categories.monthly_budget IS 'Presupuesto mensual en ARS para esta categoría';
