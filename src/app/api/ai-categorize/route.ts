import { createAnthropic } from '@ai-sdk/anthropic'
import { generateText } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { getUserPlan } from '@/lib/get-user-plan'

export const runtime = 'nodejs'
export const maxDuration = 20

// Cache server-side: description_normalized → { category, subcategory }
// Compartido entre usuarios para maximizar reutilización
const descCache = new Map<string, { category: string; subcategory: string | null }>()
const MAX_BATCH = 20    // max transacciones por llamada
const CACHE_MAX = 5000  // max entradas en cache

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim().slice(0, 60)
}

interface TxInput { id: string; description: string; type: 'income' | 'expense' }
interface CategoryInfo {
  id: string; name: string; type: string
  subcategories?: { id: string; name: string }[]
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

    // Solo Premium
    const plan = await getUserPlan(supabase, user.id)
    if (plan !== 'premium') return Response.json({ suggestions: {} })

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return Response.json({ suggestions: {} })

    const result: Record<string, { category_id: string; subcategory_id: string; confidence: string }> = {}

    // 1. Resolver desde cache de descripciones
    const toProcess: TxInput[] = []
    for (const tx of transactions) {
      const key = normalize(tx.description)
      const hit = descCache.get(key)
      if (hit) {
        const cat = categories.find(c => c.name === hit.category)
        if (cat) {
          const sub = hit.subcategory ? cat.subcategories?.find(s => s.name === hit.subcategory) : null
          result[tx.id] = { category_id: cat.id, subcategory_id: sub?.id ?? '', confidence: 'medium' }
        }
      } else {
        toProcess.push(tx)
      }
    }

    if (toProcess.length === 0) return Response.json({ suggestions: result })

    // 2. Llamar a Claude solo para los no cacheados (máximo MAX_BATCH)
    const batch = toProcess.slice(0, MAX_BATCH)

    // Prompt compacto: solo nombres de categorías (sin subcategorías en el listado principal)
    const catNames = categories.map(c => c.name).join(', ')
    const txList   = batch.map(tx => `${tx.id}|${tx.type}|${tx.description}`).join('\n')

    const prompt = `Categorizador financiero argentino.
Categorías: ${catNames}

Transacciones (id|tipo|descripción):
${txList}

JSON: {"r":{"<id>":{"cat":"<nombre exacto>","sub":"<subcategoría o null>"}}}
Solo incluí las que matcheen claramente.`

    const anthropic = createAnthropic({ apiKey })
    const { text } = await generateText({
      model: anthropic('claude-haiku-4-5'),
      prompt,
    })

    const parsed = JSON.parse(text.trim().replace(/```json|```/g, ''))
    const suggestions = parsed.r ?? {}

    // 3. Mapear a IDs y guardar en cache
    if (descCache.size > CACHE_MAX) descCache.clear()

    for (const tx of batch) {
      const s = suggestions[tx.id]
      if (!s?.cat) continue

      const cat = categories.find(c => c.name === s.cat)
      if (!cat) continue

      const sub = s.sub ? cat.subcategories?.find(sc => sc.name === s.sub) : null
      result[tx.id] = { category_id: cat.id, subcategory_id: sub?.id ?? '', confidence: 'medium' }

      // Guardar en cache por descripción normalizada
      descCache.set(normalize(tx.description), { category: s.cat, subcategory: s.sub ?? null })
    }

    return Response.json({ suggestions: result })
  } catch (e) {
    console.error('[ai-categorize]', e)
    return Response.json({ suggestions: {} })
  }
}
