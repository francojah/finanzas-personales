import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function getRequestingUser(req: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

function isAdmin(email: string): boolean {
  const admins = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim().toLowerCase())
  return admins.includes(email.toLowerCase())
}

export async function POST(req: NextRequest) {
  try {
    // 1. Verificar que el que llama es admin
    const requestingUser = await getRequestingUser(req)
    if (!requestingUser?.email || !isAdmin(requestingUser.email)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { user_id, plan, expires_at } = await req.json()
    if (!user_id || !plan) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
    }

    // 2. Activar o desactivar
    const admin = getAdminClient()
    if (plan === 'premium') {
      await admin.rpc('activate_premium', {
        p_user_id:    user_id,
        p_expires_at: expires_at ?? null,   // null = sin vencimiento
      })
    } else {
      await admin.rpc('deactivate_premium', { p_user_id: user_id })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[admin/set-plan]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
