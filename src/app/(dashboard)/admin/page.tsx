'use client'

import { useState, useEffect } from 'react'
import { Shield, Sparkles, User, RefreshCw, Check, X, Clock, Loader2, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface UserRow {
  id: string
  email: string
  full_name: string | null
  plan: 'free' | 'premium'
  plan_expires_at: string | null
  created_at: string
  last_sign_in: string | null
}

export default function AdminPage() {
  const router  = useRouter()
  const supabase = createClient()
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [unauthorized, setUnauthorized] = useState(false)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState<string | null>(null)  // user_id en proceso

  useEffect(() => { loadUsers() }, [])

  async function loadUsers() {
    setLoading(true)
    const res = await fetch('/api/admin/users')
    if (res.status === 403) { setUnauthorized(true); setLoading(false); return }
    const data = await res.json()
    setUsers(data.users ?? [])
    setLoading(false)
  }

  async function setPlan(userId: string, plan: 'free' | 'premium', expiresAt?: string) {
    setSaving(userId)
    const res = await fetch('/api/admin/set-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, plan, expires_at: expiresAt ?? null }),
    })
    if (res.ok) {
      setUsers(prev => prev.map(u =>
        u.id === userId
          ? { ...u, plan, plan_expires_at: expiresAt ?? null }
          : u
      ))
    }
    setSaving(null)
  }

  if (unauthorized) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <Shield size={40} style={{ color: 'var(--text-faint)' }} />
      <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Acceso restringido</p>
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Solo administradores pueden ver esta página.</p>
      <button onClick={() => router.push('/')} className="text-sm" style={{ color: 'var(--accent)' }}>Volver al inicio</button>
    </div>
  )

  const filtered = users.filter(u =>
    !search ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(search.toLowerCase())
  )

  const premiumCount = users.filter(u => u.plan === 'premium').length

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))', border: '1px solid rgba(99,102,241,0.3)' }}>
            <Shield size={18} style={{ color: '#818cf8' }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Panel de Admin</h1>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Gestión de usuarios y planes</p>
          </div>
        </div>
        <button onClick={loadUsers} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Actualizar
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total usuarios', value: users.length, color: 'var(--text-primary)' },
          { label: 'Premium',        value: premiumCount,          color: '#818cf8'         },
          { label: 'Free',           value: users.length - premiumCount, color: 'var(--text-muted)' },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4 text-center"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-faint)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-faint)' }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por email o nombre..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
        />
      </div>

      {/* Tabla de usuarios */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="animate-spin" style={{ color: 'var(--text-muted)' }} />
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          {/* Header tabla */}
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-2.5 text-xs font-bold uppercase tracking-wide"
            style={{ background: 'var(--surface-elevated)', color: 'var(--text-faint)', borderBottom: '1px solid var(--border)' }}>
            <span>Usuario</span>
            <span className="text-center">Plan</span>
            <span className="text-center hidden md:block">Vencimiento</span>
            <span className="text-center">Acción</span>
          </div>

          {/* Filas */}
          <div style={{ background: 'var(--surface)' }}>
            {filtered.length === 0 ? (
              <div className="py-12 text-center text-sm" style={{ color: 'var(--text-faint)' }}>
                No hay usuarios
              </div>
            ) : filtered.map((user, i) => (
              <div
                key={user.id}
                className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-3.5 items-center"
                style={{ borderTop: i === 0 ? 'none' : '1px solid var(--border-subtle)' }}
              >
                {/* Info usuario */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                    style={{ background: 'var(--surface-elevated)', color: 'var(--text-muted)' }}>
                    {(user.full_name ?? user.email ?? '?')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    {user.full_name && (
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                        {user.full_name}
                      </p>
                    )}
                    <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{user.email}</p>
                  </div>
                </div>

                {/* Badge plan */}
                <div className="flex justify-center">
                  {user.plan === 'premium' ? (
                    <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full"
                      style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>
                      <Sparkles size={10} /> Premium
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium px-2.5 py-1 rounded-full"
                      style={{ background: 'var(--surface-elevated)', color: 'var(--text-muted)' }}>
                      Free
                    </span>
                  )}
                </div>

                {/* Vencimiento */}
                <div className="hidden md:flex justify-center">
                  {user.plan_expires_at ? (
                    <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                      <Clock size={11} />
                      {new Date(user.plan_expires_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: '2-digit' })}
                    </span>
                  ) : user.plan === 'premium' ? (
                    <span className="text-xs" style={{ color: 'var(--text-faint)' }}>Sin vto.</span>
                  ) : (
                    <span className="text-xs" style={{ color: 'var(--text-faint)' }}>—</span>
                  )}
                </div>

                {/* Acciones */}
                <div className="flex justify-center">
                  {saving === user.id ? (
                    <Loader2 size={16} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
                  ) : user.plan === 'premium' ? (
                    <button
                      onClick={() => setPlan(user.id, 'free')}
                      title="Revocar Premium"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                      style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
                    >
                      <X size={12} /> Revocar
                    </button>
                  ) : (
                    <button
                      onClick={() => setPlan(user.id, 'premium')}
                      title="Activar Premium sin vencimiento"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                      style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)' }}
                    >
                      <Sparkles size={12} /> Activar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-center" style={{ color: 'var(--text-faint)' }}>
        Los cambios son inmediatos. El usuario ve el nuevo plan en su próxima carga de página.
      </p>
    </div>
  )
}
