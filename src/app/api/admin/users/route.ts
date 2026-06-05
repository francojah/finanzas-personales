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

function isAdmin(email: string): boolean {
  const admins = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim().toLowerCase())
  return admins.includes(email.toLowerCase())
}

export async function GET(req: NextRequest) {
  try {
    // Verificar admin
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll() } }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email || !isAdmin(user.email)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const admin = getAdminClient()

    // Traer todos los usuarios de auth
    const { data: authData } = await admin.auth.admin.listUsers({ perPage: 200 })
    const authUsers: any[] = (authData as any)?.users ?? []

    // Traer perfiles con plan
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, full_name, plan, plan_expires_at, created_at')

    const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]))

    const users = authUsers.map(u => ({
      id:              u.id,
      email:           u.email,
      full_name:       profileMap[u.id]?.full_name ?? null,
      plan:            profileMap[u.id]?.plan ?? 'free',
      plan_expires_at: profileMap[u.id]?.plan_expires_at ?? null,
      created_at:      u.created_at,
      last_sign_in:    u.last_sign_in_at,
    }))

    return NextResponse.json({ users })
  } catch (err) {
    console.error('[admin/users]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
