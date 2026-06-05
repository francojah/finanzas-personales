import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

function randomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return 'LINK-' + Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function POST(req: NextRequest) {
  // Verificar sesión del usuario
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const admin = adminClient()

  // Limpiar códigos anteriores del mismo usuario
  await admin.from('telegram_link_codes').delete().eq('user_id', user.id)

  // Verificar si ya está vinculado
  const { data: existing } = await admin
    .from('telegram_links')
    .select('chat_id, username')
    .eq('user_id', user.id)
    .single()

  if (existing) {
    return NextResponse.json({ already_linked: true, username: existing.username, chat_id: existing.chat_id })
  }

  // Generar nuevo código con 10 min de expiración
  const code = randomCode()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

  await admin.from('telegram_link_codes').insert({
    code,
    user_id: user.id,
    expires_at: expiresAt,
  })

  return NextResponse.json({ code, expires_at: expiresAt })
}

export async function DELETE(req: NextRequest) {
  // Desvincular Telegram
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const admin = adminClient()
  await admin.from('telegram_links').delete().eq('user_id', user.id)

  return NextResponse.json({ ok: true })
}
