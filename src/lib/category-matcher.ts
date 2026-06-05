// ─────────────────────────────────────────────────────────────
// Category Matcher
// Auto-detecta categoría y subcategoría de una transacción
// usando dos estrategias en orden de prioridad:
//   1. Historial propio del usuario (aprendizaje)
//   2. Reglas por palabras clave (fallback)
// ─────────────────────────────────────────────────────────────

import type { Category } from '@/types/database'

export interface CategorySuggestion {
  category_id: string
  subcategory_id: string
  confidence: 'high' | 'medium' | 'low'
  source: 'history' | 'keyword'
}

// ── Normalizar texto ─────────────────────────────────────────
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quitar tildes
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// ── Reglas de palabras clave ─────────────────────────────────
// Formato: { keywords[], categoryName, subcategoryName? }
// Se prueba en orden — la primera que matchea gana.

const KEYWORD_RULES: {
  keywords: string[]
  category: string
  subcategory?: string
  type?: 'income' | 'expense'
}[] = [
  // ── Ingresos ─────────────────────────────────────────────
  { keywords: ['sueldo', 'salario', 'haberes', 'liquidacion', 'remuneracion'], category: 'Sueldo', type: 'income' },
  { keywords: ['honorarios', 'factura', 'freelance', 'honorario'],            category: 'Honorarios', type: 'income' },
  { keywords: ['alquiler cobrado', 'renta cobrada'],                           category: 'Alquiler', type: 'income' },
  { keywords: ['dividendo', 'cupon', 'renta fija', 'interes acreditado'],     category: 'Inversiones', type: 'income' },
  { keywords: ['reintegro', 'devolucion', 'cashback'],                         category: 'Reintegros', type: 'income' },

  // ── Supermercado / Alimentación ──────────────────────────
  { keywords: ['carrefour', 'coto', 'disco', 'vea', 'walmart', 'jumbo', 'la anonima', 'dia ', 'changomas', 'makro'], category: 'Supermercado' },
  { keywords: ['verduleria', 'verduras', 'fruteria', 'mercado'], category: 'Supermercado', subcategory: 'Verdulería' },
  { keywords: ['pedidosya', 'pedidos ya', 'rappi', 'uber eats', 'glovo', 'delivery'], category: 'Delivery' },
  { keywords: ['restaurant', 'restaurante', 'resto ', 'sushi', 'pizza', 'burger', 'hamburgues', 'comida', 'almuerzo', 'cena'], category: 'Restaurantes' },
  { keywords: ['cafe ', 'cafeteria', 'starbucks', 'coffee', 'medialunas', 'panaderia', 'confiteria'], category: 'Cafeterías' },
  { keywords: ['almacen', 'kiosco', 'kioskos', 'maxikiosco', 'buffet'], category: 'Alimentación' },

  // ── Transporte ───────────────────────────────────────────
  { keywords: ['ypf', 'shell', 'axion', 'puma', 'petrobras', 'nafta', 'combustible', 'gasoil'], category: 'Transporte', subcategory: 'Nafta' },
  { keywords: ['peaje', 'autopista', 'autovia', 'ruta', 'acceso'],    category: 'Transporte', subcategory: 'Peaje' },
  { keywords: ['sube', 'colectivo', 'subte', 'tren', 'metro'],        category: 'Transporte', subcategory: 'Transporte público' },
  { keywords: ['uber', 'cabify', 'remis', 'taxi'],                    category: 'Transporte', subcategory: 'Taxi/Uber' },
  { keywords: ['estacionamiento', 'parking', 'playa de estacionamiento'], category: 'Transporte', subcategory: 'Estacionamiento' },
  { keywords: ['aeropuerto', 'vuelo', 'aerolineas', 'lan', 'flybondi', 'jetsmart', 'pasaje'], category: 'Viajes' },

  // ── Servicios del hogar ──────────────────────────────────
  { keywords: ['edesur', 'edenor', 'edelap', 'luz', 'electricidad', 'energia electrica'], category: 'Servicios', subcategory: 'Electricidad' },
  { keywords: ['metrogas', 'naturgy', 'gas natural', 'gas ban'],      category: 'Servicios', subcategory: 'Gas' },
  { keywords: ['aguas ', 'aysa', 'agua potable', 'osba'],             category: 'Servicios', subcategory: 'Agua' },
  { keywords: ['telefono', 'personal ', 'claro', 'movistar', 'telecom', 'cablevision', 'fibertel', 'arlink', 'telecentro', 'internet'], category: 'Servicios', subcategory: 'Internet/Telefonía' },
  { keywords: ['expensas', 'consorcio', 'administracion'],            category: 'Vivienda', subcategory: 'Expensas' },
  { keywords: ['alquiler', 'alq.'],                                    category: 'Vivienda', subcategory: 'Alquiler' },
  { keywords: ['hipoteca', 'prestamo hipotecario', 'uva'],            category: 'Vivienda', subcategory: 'Hipoteca' },

  // ── Salud ────────────────────────────────────────────────
  { keywords: ['farmacia', 'farmacity', 'del pueblo', 'farmacias'],   category: 'Salud', subcategory: 'Farmacia' },
  { keywords: ['medico', 'doctor', 'consulta', 'clinica', 'hospital', 'sanatorio', 'laboratorio', 'analisis', 'radiologia', 'ecografia'], category: 'Salud', subcategory: 'Consultas' },
  { keywords: ['obra social', 'prepaga', 'osde', 'swiss medical', 'medicus', 'galeno', 'sancor salud', 'hospital italiano'], category: 'Salud', subcategory: 'Prepaga/Obra social' },
  { keywords: ['gym', 'gimnasio', 'pilates', 'yoga', 'crossfit', 'fitclub', 'megatlon', 'megatlón'], category: 'Salud', subcategory: 'Gimnasio' },

  // ── Entretenimiento ──────────────────────────────────────
  { keywords: ['netflix', 'spotify', 'disney', 'hbo', 'amazon prime', 'youtube premium', 'apple tv', 'flow', 'directv'], category: 'Entretenimiento', subcategory: 'Streaming' },
  { keywords: ['cine', 'teatro', 'show', 'recital', 'evento', 'entrada'],     category: 'Entretenimiento', subcategory: 'Cine/Teatro' },
  { keywords: ['playstation', 'xbox', 'nintendo', 'steam', 'epic games'],     category: 'Entretenimiento', subcategory: 'Videojuegos' },

  // ── Ropa / Compras ───────────────────────────────────────
  { keywords: ['zara', 'h&m', 'mango', 'forever 21', 'adidas', 'nike', 'indumentaria', 'ropa', 'calzado', 'zapatillas', 'jean', 'remera'], category: 'Ropa' },
  { keywords: ['mercadolibre', 'mercado libre', 'amazon', 'fravega', 'garbarino', 'musimundo', 'cetrogar'], category: 'Compras online' },
  { keywords: ['electrodomestico', 'electronica', 'celular', 'computadora', 'notebook', 'tablet', 'iphone', 'samsung'], category: 'Tecnología' },

  // ── Educación ────────────────────────────────────────────
  { keywords: ['universidad', 'facultad', 'uba', 'uade', 'udesa', 'austral', 'belgrano', 'palermo', 'colegio', 'escuela', 'cuota colegio'], category: 'Educación', subcategory: 'Cuotas' },
  { keywords: ['udemy', 'coursera', 'platzi', 'linkedin learning', 'curso', 'capacitacion'],                            category: 'Educación', subcategory: 'Cursos online' },
  { keywords: ['libreria', 'libros', 'cuadernos', 'utiles'],          category: 'Educación', subcategory: 'Útiles' },

  // ── Finanzas ─────────────────────────────────────────────
  { keywords: ['comision bancaria', 'mantenimiento cuenta', 'cargo cuenta', 'debito automatico'], category: 'Gastos bancarios' },
  { keywords: ['seguro auto', 'seguro hogar', 'seguro vida', 'zurich', 'sancor seguros', 'san cristobal'], category: 'Seguros' },
  { keywords: ['cuota prestamo', 'cuota personal', 'prestamo personal', 'credito personal'], category: 'Préstamos' },

  // ── Mascotas ─────────────────────────────────────────────
  { keywords: ['veterinaria', 'veterinario', 'petshop', 'pet shop', 'alimento perro', 'alimento gato', 'petco'], category: 'Mascotas' },
]

// ── Matching por keywords ────────────────────────────────────
export function matchByKeywords(
  description: string,
  txType: 'income' | 'expense',
  categories: Category[],
): CategorySuggestion | null {
  const normalized = norm(description)

  for (const rule of KEYWORD_RULES) {
    // Filtrar reglas que no corresponden al tipo
    if (rule.type && rule.type !== txType) continue

    const matched = rule.keywords.some(kw => normalized.includes(norm(kw)))
    if (!matched) continue

    // Buscar la categoría en las del usuario
    const cat = categories.find(c =>
      norm(c.name).includes(norm(rule.category)) ||
      rule.category.toLowerCase().split('/').some(part => norm(c.name).includes(norm(part.trim())))
    )
    if (!cat) continue

    let subcategory_id = ''
    if (rule.subcategory && cat.subcategories) {
      const sub = cat.subcategories.find(s =>
        s.is_active && norm(s.name).includes(norm(rule.subcategory!))
      )
      if (sub) subcategory_id = sub.id
    }

    return {
      category_id: cat.id,
      subcategory_id,
      confidence: 'medium',
      source: 'keyword',
    }
  }

  return null
}

// ── Matching por historial ───────────────────────────────────
// Busca en Supabase transacciones previas con descripción similar
export async function matchFromHistory(
  description: string,
  supabase: any,
): Promise<Omit<CategorySuggestion, 'source'> | null> {
  const normalized = norm(description)

  // Tomar las palabras más significativas (largo > 3 chars)
  const words = normalized.split(' ').filter(w => w.length > 3).slice(0, 3)
  if (words.length === 0) return null

  try {
    // Buscar transacciones con descripción similar usando ilike
    const queries = words.map(w =>
      supabase
        .from('transactions')
        .select('category_id, subcategory_id, description')
        .ilike('description', `%${w}%`)
        .not('category_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(5)
    )

    const results = await Promise.all(queries)
    const allRows = results.flatMap(r => r.data ?? []) as {
      category_id: string
      subcategory_id: string | null
      description: string
    }[]

    if (allRows.length === 0) return null

    // Contar cuántas veces aparece cada category_id
    const freq: Record<string, { count: number; subcategory_id: string }> = {}
    for (const row of allRows) {
      if (!freq[row.category_id]) {
        freq[row.category_id] = { count: 0, subcategory_id: row.subcategory_id ?? '' }
      }
      freq[row.category_id].count++
    }

    // La más frecuente gana
    const best = Object.entries(freq).sort((a, b) => b[1].count - a[1].count)[0]
    if (!best) return null

    const confidence: CategorySuggestion['confidence'] =
      best[1].count >= 3 ? 'high' : best[1].count >= 2 ? 'medium' : 'low'

    return {
      category_id: best[0],
      subcategory_id: best[1].subcategory_id,
      confidence,
    }
  } catch {
    return null
  }
}

// ── API principal: combina historial + keywords ───────────────
export async function suggestCategory(
  description: string,
  txType: 'income' | 'expense',
  categories: Category[],
  supabase: any,
): Promise<CategorySuggestion | null> {
  // 1. Historial (más confiable — el usuario ya lo categorizó antes)
  const fromHistory = await matchFromHistory(description, supabase)
  if (fromHistory && fromHistory.confidence !== 'low') {
    return { ...fromHistory, source: 'history' }
  }

  // 2. Keywords
  const fromKeywords = matchByKeywords(description, txType, categories)
  if (fromKeywords) return fromKeywords

  // 3. Si historial tenía baja confianza, igual lo usamos
  if (fromHistory) {
    return { ...fromHistory, source: 'history' }
  }

  return null
}

// ── Batch: sugerir para múltiples transacciones ───────────────
export async function suggestCategoriesBatch(
  transactions: { id: string; description: string; type: 'income' | 'expense' }[],
  categories: Category[],
  supabase: any,
): Promise<Record<string, CategorySuggestion>> {
  const results: Record<string, CategorySuggestion> = {}

  await Promise.all(
    transactions.map(async tx => {
      const suggestion = await suggestCategory(tx.description, tx.type, categories, supabase)
      if (suggestion) {
        results[tx.id] = suggestion
      }
    })
  )

  return results
}
