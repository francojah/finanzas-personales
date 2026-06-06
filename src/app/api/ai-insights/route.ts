import { createAnthropic } from '@ai-sdk/anthropic'
import { generateText } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { buildLightContext } from '@/lib/light-context'
import { getUserPlan } from '@/lib/get-user-plan'

export const runtime = 'nodejs'
export const maxDuration = 20

// Cache server-side por user_id: { ts, insights }
const serverCache = new Map<string, { ts: number; insights: unknown[] }>()
const CACHE_TTL = 23 * 60 * 60 * 1000 // 23 horas

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    // Solo Premium
    const plan = await getUserPlan(supabase, user.id)
    if (plan !== 'premium') {
      return Response.json({ insights: [], upgradeRequired: true })
    }

    // Cache server-side: 1 llamada/usuario/23h
    const cached = serverCache.get(user.id)
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return Response.json({ insights: cached.insights, cached: true })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return Response.json({ insights: [] })

    // Contexto mínimo (~80-100 tokens)
    const context = await buildLightContext(supabase)
    if (!context) return Response.json({ insights: [] })

    // Prompt ultra-compacto — objetivo: <250 tokens totales de input
    const prompt = `Asesor financiero argentino. Datos del usuario:
${context}

Dame 2 insights concisos y ACCIONABLES (máximo 1 oración cada uno, con número concreto).
JSON: {"insights":[{"type":"saving|spending|investment|alert","title":"max 4 palabras","body":"1 oración con número"}]}`

    const anthropic = createAnthropic({ apiKey })
    const { text } = await generateText({
      model: anthropic('claude-haiku-4-5'),
      prompt,
    })

    const parsed = JSON.parse(text.trim().replace(/```json|```/g, ''))
    const insights = (parsed.insights ?? []).slice(0, 2) // máximo 2

    // Guardar en cache server-side
    serverCache.set(user.id, { ts: Date.now(), insights })

    // Limpiar cache vieja cada 100 inserciones
    if (serverCache.size > 1000) {
      const now = Date.now()
      for (const [key, val] of serverCache.entries()) {
        if (now - val.ts > CACHE_TTL) serverCache.delete(key)
      }
    }

    return Response.json({ insights })
  } catch (e) {
    console.error('[ai-insights]', e)
    return Response.json({ insights: [] })
  }
}
