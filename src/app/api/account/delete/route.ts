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

export async function DELETE(req: NextRequest) {
  try {
    // 1. Verificar usuario autenticado
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll() } }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const userId = user.id

    // 2. Borrar datos del usuario (el service role ignora RLS)
    const admin = getAdminClient()
    const tables = [
      'transactions',
      'accounts',
      'subcategories',
      'categories',
      'credit_cards',
      'people',
      'budgets',
      'projects',
      'loans',
      'alerts',
      'user_plans',
    ]
    for (const table of tables) {
      await admin.from(table).delete().eq('user_id', userId)
    }

    // 3. Borrar usuario de auth
    const { error } = await admin.auth.admin.deleteUser(userId)
    if (error) {
      console.error('[account/delete] error al borrar user auth:', error)
      return NextResponse.json({ error: 'Error al eliminar cuenta' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[account/delete]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
