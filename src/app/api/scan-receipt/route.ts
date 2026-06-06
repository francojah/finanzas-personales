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
  date: string | null         // yyyy-MM-dd o null
  type: 'expense' | 'income'
  merchant: string
  confidence: 'high' | 'medium' | 'low'
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    // Solo Premium — escaneo consume tokens de imagen (más caro)
    const plan = await getUserPlan(supabase, user.id)
    if (plan !== 'premium') {
      return Response.json({ error: 'premium_required' }, { status: 403 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return Response.json({ error: 'API key not configured' }, { status: 500 })

    const body = await req.json()
    const { imageBase64, mimeType = 'image/jpeg' } = body as {
      imageBase64: string
      mimeType?: string
    }

    if (!imageBase64) return Response.json({ error: 'No image provided' }, { status: 400 })

    const anthropic = createAnthropic({ apiKey })

    const { text } = await generateText({
      model: anthropic('claude-haiku-4-5'),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              image: imageBase64,
            },
            {
              type: 'text',
              text: `Analizá este ticket/comprobante argentino y extraé los datos.

Respondé SOLO con JSON válido:
{
  "amount": <número sin puntos de miles, con punto decimal, o null si no se ve>,
  "currency": "ARS" o "USD",
  "description": "<nombre del comercio o descripción breve>",
  "merchant": "<nombre del comercio>",
  "date": "<yyyy-MM-dd o null>",
  "type": "expense",
  "confidence": "high" si los datos son claros, "medium" si hay dudas, "low" si es difícil leer
}

Reglas:
- Si ves "$" sin indicación USD, es ARS
- Si ves "USD", "U$S" o "US$", es USD
- El monto debe ser el TOTAL del ticket (no subtotales)
- La fecha debe estar en formato yyyy-MM-dd
- Si no podés leer algo, ponés null`,
            },
          ],
        },
      ],
    })

    // Parse respuesta
    const clean = text.trim().replace(/```json|```/g, '').trim()
    const result = JSON.parse(clean) as ScanResult

    // Validaciones básicas
    if (result.amount !== null && (isNaN(result.amount) || result.amount <= 0)) {
      result.amount = null
    }

    return Response.json({ result })
  } catch (e) {
    console.error('[scan-receipt]', e)
    return Response.json({ error: 'scan_failed' }, { status: 500 })
  }
}
