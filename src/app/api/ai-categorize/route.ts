import { createAnthropic } from '@ai-sdk/anthropic'
import { generateText } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { getUserPlan } from '@/lib/get-user-plan'

export const runtime = 'nodejs'
export const maxDuration = 60  // más tiempo para procesar batches grandes

// Cache server-side por descripción normalizada
const descCache = new Map<string, { category: string; subcategory: string | null }>()
const BATCH_SIZE = 40   // transacciones por llamada a Claude
const CACHE_MAX  = 5000

// Prefijos bancarios a eliminar antes de normalizar
const BANK_PREFIXES = [
  /^k\s+/i, /^merpago\*/i, /^mp\*/i, /^mercadopago\*/i,
  /^pagofacil\s*/i, /^rapipago\s*/i, /^debin\s*/i,
  /^compra\s+en\s+/i, /^pago\s+/i, /^\*+/,
]

function normalize(s: string): string {
  let clean = s.trim()
  let changed = true
  while (changed) {
    changed = false
    for (const re of BANK_PREFIXES) {
      const after = clean.replace(re, '').trim()
      if (after !== clean) { clean = after; changed = true }
    }
  }
  return clean.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim().slice(0, 60)
}

interface TxInput { id: string; description: string; type: 'income' | 'expense' }
interface CategoryInfo {
  id: string; name: string; type: string
  subcategories?: { id: string; name: string }[]
}

async function processBatch(
  batch: TxInput[],
  categories: CategoryInfo[],
  anthropic: ReturnType<typeof createAnthropic>,
): Promise<Record<string, { cat: string; sub: string | null }>> {
  // Incluir subcategorías en el prompt para mejor precisión
  const catList = categories.map(c => {
    const subs = c.subcategories?.map(s => s.name).join(', ')
    return subs ? `${c.name} (${subs})` : c.name
  }).join(' | ')

  const txList = batch.map(tx => `${tx.id}|${tx.type}|${tx.description}`).join('\n')

  const prompt = `Sos un categorizador de transacciones financieras argentinas.
Las descripciones vienen de extractos bancarios con códigos como "K ", "MERPAGO*", etc. — ignorá esos prefijos.

Categorías disponibles (con subcategorías):
${catList}

Transacciones (id|tipo|descripción):
${txList}

Respondé SOLO con JSON:
{"r":{"<id>":{"cat":"<nombre exacto de categoría>","sub":"<subcategoría exacta o null>"}}}

Solo incluí las que podés categorizar con confianza. Si no estás seguro, no incluyas esa fila.`

  const { text } = await generateText({
    model: anthropic('claude-haiku-4-5-20251001'),
    prompt,
  })

  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return {}
  const parsed = JSON.parse(jsonMatch[0])
  return parsed.r ?? {}
}

export async function POST(req: Request) {
  try {
    const { transactions, categories } = await req.json() as {
      transactions: TxInput[]
      categories: CategoryInfo[]
    }

    if (!transactions?.length || !categories?.length) {
      return Response.json({ suggestions: {} })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const plan = await getUserPlan(supabase, user.id)
    if (plan !== 'premium') return Response.json({ suggestions: {} })

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return Response.json({ suggestions: {} })

    const result: Record<string, { category_id: string; subcategory_id: string; confidence: string }> = {}
    const anthropic = createAnthropic({ apiKey })

    // 1. Resolver desde cache primero (gratis)
    const toProcess: TxInput[] = []
    for (const tx of transactions) {
      const key = normalize(tx.description)
      const hit = descCache.get(key)
      if (hit) {
        const cat = categories.find(c => c.name === hit.category)
        if (cat) {
          const sub = hit.subcategory ? cat.subcategories?.find(s => s.name === hit.subcategory) : null
          result[tx.id] = { category_id: cat.id, subcategory_id: sub?.id ?? '', confidence: 'high' }
        }
      } else {
        toProcess.push(tx)
      }
    }

    if (toProcess.length === 0) return Response.json({ suggestions: result })

    // 2. Deduplicar por descripción normalizada (muchas transacciones repiten comercio)
    const seen = new Map<string, string>() // normalized → first tx.id
    const unique: TxInput[] = []
    for (const tx of toProcess) {
      const key = normalize(tx.description)
      if (!seen.has(key)) { seen.set(key, tx.id); unique.push(tx) }
    }

    // 3. Procesar en batches paralelos (máx 3 a la vez para no saturar)
    const batches: TxInput[][] = []
    for (let i = 0; i < unique.length; i += BATCH_SIZE) {
      batches.push(unique.slice(i, i + BATCH_SIZE))
    }

    const batchResults = await Promise.all(
      batches.map(b => processBatch(b, categories, anthropic).catch(() => ({})))
    )

    // 4. Mapear resultados a IDs y propagar a duplicados
    if (descCache.size > CACHE_MAX) descCache.clear()

    const suggestionsByNorm = new Map<string, { cat: string; sub: string | null }>()

    for (let bi = 0; bi < batches.length; bi++) {
      const batchSuggestions = batchResults[bi]
      for (const tx of batches[bi]) {
        const s = batchSuggestions[tx.id]
        if (!s?.cat) continue
        const key = normalize(tx.description)
        suggestionsByNorm.set(key, s)
        descCache.set(key, { category: s.cat, subcategory: s.sub ?? null })
      }
    }

    // Aplicar sugerencias a todas las transacciones (incluso duplicados)
    for (const tx of toProcess) {
      const key = normalize(tx.description)
      const s = suggestionsByNorm.get(key)
      if (!s?.cat) continue
      const cat = categories.find(c => c.name === s.cat)
      if (!cat) continue
      const sub = s.sub ? cat.subcategories?.find(sc => sc.name === s.sub) : null
      result[tx.id] = { category_id: cat.id, subcategory_id: sub?.id ?? '', confidence: 'medium' }
    }

    return Response.json({ suggestions: result })
  } catch (e) {
    console.error('[ai-categorize]', e)
    return Response.json({ suggestions: {} })
  }
}
