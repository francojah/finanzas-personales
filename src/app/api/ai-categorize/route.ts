import { createAnthropic } from '@ai-sdk/anthropic'
import { generateText } from 'ai'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 30

interface TxInput {
  id: string
  description: string
  type: 'income' | 'expense'
}

interface CategoryInfo {
  id: string
  name: string
  type: string
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

    // Auth check
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return Response.json({ suggestions: {} })

    // Build category list for the prompt
    const catList = categories
      .map(c => {
        const subs = c.subcategories?.map(s => s.name).join(', ')
        return subs ? `- ${c.name} (${c.type}) [subcategorías: ${subs}]` : `- ${c.name} (${c.type})`
      })
      .join('\n')

    // Build transaction list
    const txList = transactions
      .map(tx => `${tx.id}|${tx.type}|${tx.description}`)
      .join('\n')

    const prompt = `Sos un asistente de finanzas personales argentino. Dado un listado de transacciones, asigná la categoría y subcategoría más apropiada de las disponibles.

CATEGORÍAS DISPONIBLES:
${catList}

TRANSACCIONES (formato: id|tipo|descripción):
${txList}

Respondé SOLO con un JSON válido, sin texto adicional, con este formato exacto:
{
  "suggestions": {
    "<id>": {
      "category": "<nombre exacto de la categoría>",
      "subcategory": "<nombre exacto de la subcategoría o null>"
    }
  }
}

Reglas:
- Usá SOLO categorías del listado. Si ninguna aplica, omití esa transacción.
- El nombre debe ser EXACTO, incluyendo tildes y mayúsculas.
- Si no hay subcategoría apropiada, usá null.
- Para tipo "income", priorizá categorías de ingresos.`

    const anthropic = createAnthropic({ apiKey })

    const { text } = await generateText({
      model: anthropic('claude-haiku-4-5'),
      prompt,
      maxTokens: 1024,
    })

    // Parse response
    const parsed = JSON.parse(text.trim())
    const suggestions = parsed.suggestions ?? {}

    // Map category/subcategory names back to IDs
    const result: Record<string, { category_id: string; subcategory_id: string; confidence: string }> = {}

    for (const [txId, s] of Object.entries(suggestions) as [string, { category: string; subcategory: string | null }][]) {
      const cat = categories.find(c => c.name === s.category)
      if (!cat) continue

      let subcategory_id = ''
      if (s.subcategory && cat.subcategories) {
        const sub = cat.subcategories.find(sc => sc.name === s.subcategory)
        if (sub) subcategory_id = sub.id
      }

      result[txId] = {
        category_id: cat.id,
        subcategory_id,
        confidence: 'medium',
      }
    }

    return Response.json({ suggestions: result })
  } catch (e) {
    console.error('[ai-categorize]', e)
    return Response.json({ suggestions: {} })
  }
}
