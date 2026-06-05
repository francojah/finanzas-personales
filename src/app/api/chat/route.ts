import { streamText } from 'ai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createClient } from '@/lib/supabase/server'
import { buildFinancialContext, buildSystemPrompt } from '@/lib/financial-context'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'ANTHROPIC_API_KEY no configurada en .env.local' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Contexto financiero del usuario autenticado
    const supabase = await createClient()
    const context  = await buildFinancialContext(supabase)
    const system   = buildSystemPrompt(context)

    const anthropic = createAnthropic({ apiKey })

    const result = streamText({
      model: anthropic('claude-haiku-4-5'),
      system,
      messages,
      maxOutputTokens: 1024,
      temperature: 0.7,
    })

    return result.toTextStreamResponse()
  } catch (err: any) {
    console.error('Chat API error:', err)
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
