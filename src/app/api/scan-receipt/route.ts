import { createAnthropic } from '@ai-sdk/anthropic'
import { generateText } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { getUserPlan } from '@/lib/get-user-plan'

export const runtime = 'nodejs'
export const maxDuration = 30

export interface ScanResult {
  amount: number | null
  currency: 'ARS' | 'USD'
  description: string
  date: string | null
  type: 'expense' | 'income'
  merchant: string
  confidence: 'high' | 'medium' | 'low'
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const plan = await getUserPlan(supabase, user.id)
    if (plan !== 'premium') {
      return Response.json({ error: 'premium_required' }, { status: 403 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      console.error('[scan-receipt] ANTHROPIC_API_KEY not set')
      return Response.json({ error: 'API key not configured' }, { status: 500 })
    }

    const body = await req.json()
    const { imageBase64, mimeType = 'image/jpeg' } = body as {
      imageBase64: string
      mimeType?: string
    }

    if (!imageBase64) return Response.json({ error: 'No image provided' }, { status: 400 })

    const anthropic = createAnthropic({ apiKey })

    // Data URL embebe el mimeType — funciona con todas las versiones del SDK
    const dataUrl = `data:${mimeType};base64,${imageBase64}`

    const { text } = await generateText({
      model: anthropic('claude-haiku-4-5-20251001'),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              image: new URL(dataUrl),
            },
            {
              type: 'text',
              text: `Analizá este ticket/comprobante argentino y extraé los datos.

Respondé SOLO con un bloque JSON (sin texto antes ni después):
{
  "amount": número con punto decimal o null,
  "currency": "ARS" o "USD",
  "description": "nombre del comercio breve",
  "merchant": "nombre del comercio",
  "date": "yyyy-MM-dd" o null,
  "type": "expense",
  "confidence": "high" | "medium" | "low"
}

Reglas:
- "$" sin indicación → ARS. "USD", "U$S", "US$" → USD
- amount = TOTAL del ticket, no subtotales, sin puntos de miles
- confidence "high" si todo se lee bien, "medium" con dudas, "low" si es ilegible
- Solo JSON, sin explicaciones adicionales`,
            },
          ],
        },
      ],
    })

    // Extraer JSON de la respuesta (el modelo puede agregar texto extra)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('[scan-receipt] no JSON found in response:', text.substring(0, 200))
      return Response.json({ error: 'no_json_in_response' }, { status: 422 })
    }

    const result = JSON.parse(jsonMatch[0]) as ScanResult

    // Validar y normalizar amount
    if (result.amount !== null) {
      result.amount = Number(result.amount)
      if (isNaN(result.amount) || result.amount <= 0) result.amount = null
    }

    return Response.json({ result })
  } catch (e: any) {
    console.error('[scan-receipt] error:', e?.message ?? e)
    return Response.json({ error: 'scan_failed', detail: e?.message }, { status: 500 })
  }
}
