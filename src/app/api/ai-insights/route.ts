import { createAnthropic } from '@ai-sdk/anthropic'
import { generateText } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { buildFinancialContext } from '@/lib/financial-context'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return Response.json({ insights: [] })

    // Contexto financiero completo del usuario
    const context = await buildFinancialContext(supabase)

    const prompt = `Sos un asesor financiero personal experto en finanzas personales argentinas.
Analizá el contexto financiero del usuario y generá exactamente 3 insights concisos y ACCIONABLES.

CONTEXTO FINANCIERO:
${JSON.stringify(context, null, 2)}

Reglas:
- Cada insight debe ser específico con números reales del usuario
- Debe incluir UNA acción concreta que el usuario puede tomar hoy
- Tono directo, amigable, en argentino (vos, etc.)
- NO digas "considerá" o "podrías" — decí QUÉ hacer
- Máximo 2 oraciones por insight

Respondé SOLO con JSON válido:
{
  "insights": [
    {
      "type": "saving" | "spending" | "investment" | "debt" | "alert",
      "title": "título corto (max 5 palabras)",
      "body": "descripción con número concreto y acción",
      "priority": "high" | "medium" | "low"
    }
  ]
}`

    const anthropic = createAnthropic({ apiKey })
    const { text } = await generateText({
      model: anthropic('claude-haiku-4-5'),
      prompt,
    })

    const parsed = JSON.parse(text.trim())
    return Response.json({ insights: parsed.insights ?? [] })
  } catch (e) {
    console.error('[ai-insights]', e)
    return Response.json({ insights: [] })
  }
}
