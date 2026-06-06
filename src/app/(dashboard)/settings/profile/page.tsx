'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Eye, EyeOff, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function ProfileSettingsPage() {
  const router = useRouter()
  const supabase = createClient()

  // Perfil
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)

  // Contraseña
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  // Eliminar cuenta
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [showDeleteZone, setShowDeleteZone] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? '')
      setFullName(data.user?.user_metadata?.full_name ?? '')
    })
  }, [])

  async function saveProfile() {
    if (!fullName.trim()) { toast.error('Ingresá tu nombre'); return }
    setSavingProfile(true)
    const { error } = await supabase.auth.updateUser({
      data: { full_name: fullName.trim() },
    })
    setSavingProfile(false)
    if (error) { toast.error('Error al guardar'); return }
    toast.success('Perfil actualizado')
  }

  async function savePassword() {
    if (newPassword.length < 8) { toast.error('Mínimo 8 caracteres'); return }
    if (newPassword !== confirmPassword) { toast.error('Las contraseñas no coinciden'); return }
    setSavingPassword(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setSavingPassword(false)
    if (error) { toast.error('Error al cambiar contraseña'); return }
    toast.success('Contraseña actualizada')
    setNewPassword(''); setConfirmPassword('')
  }

  async function handleDeleteAccount() {
    if (deleteConfirm !== 'ELIMINAR') { toast.error('Escribí ELIMINAR para confirmar'); return }
    setDeleting(true)
    try {
      const res = await fetch('/api/account/delete', { method: 'DELETE' })
      if (!res.ok) throw new Error()
      await supabase.auth.signOut()
      router.push('/')
    } catch {
      toast.error('Error al eliminar la cuenta. Intentá de nuevo.')
      setDeleting(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 rounded-xl"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <ArrowLeft size={18} style={{ color: 'var(--text-secondary)' }} />
        </button>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Mi perfil</h1>
      </div>

      {/* Datos personales */}
      <div className="rounded-xl p-5 space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Datos personales</h2>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Nombre completo</label>
          <input
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            placeholder="Tu nombre"
            className="input-base"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Email</label>
          <input
            value={email}
            disabled
            className="input-base opacity-50 cursor-not-allowed"
          />
          <p className="text-xs mt-1" style={{ color: 'var(--text-faint)' }}>
            El email no se puede modificar desde aquí.
          </p>
        </div>

        <button
          onClick={saveProfile}
          disabled={savingProfile}
          className="w-full py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
          style={{ background: 'var(--accent)' }}
        >
          {savingProfile && <Loader2 size={14} className="animate-spin" />}
          Guardar cambios
        </button>
      </div>

      {/* Cambiar contraseña */}
      <div className="rounded-xl p-5 space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Cambiar contraseña</h2>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Nueva contraseña</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              className="input-base pr-10"
              autoComplete="new-password"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--text-faint)' }}>
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Confirmar contraseña</label>
          <input
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder="Repetí la contraseña"
            className="input-base"
            autoComplete="new-password"
          />
        </div>

        <button
          onClick={savePassword}
          disabled={savingPassword || !newPassword}
          className="w-full py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
          style={{ background: 'var(--accent)' }}
        >
          {savingPassword && <Loader2 size={14} className="animate-spin" />}
          Cambiar contraseña
        </button>
      </div>

      {/* Zona de peligro */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(248,113,113,0.3)' }}>
        <button
          onClick={() => setShowDeleteZone(!showDeleteZone)}
          className="w-full flex items-center gap-3 px-5 py-4"
          style={{ background: 'rgba(248,113,113,0.06)' }}
        >
          <AlertTriangle size={16} style={{ color: 'var(--expense)' }} />
          <span className="flex-1 text-sm font-semibold text-left" style={{ color: 'var(--expense)' }}>
            Zona de peligro
          </span>
          <span className="text-xs" style={{ color: 'var(--text-faint)' }}>
            {showDeleteZone ? 'Cerrar' : 'Ver opciones'}
          </span>
        </button>

        {showDeleteZone && (
          <div className="px-5 py-5 space-y-4" style={{ borderTop: '1px solid rgba(248,113,113,0.2)', background: 'var(--surface)' }}>
            <div>
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Eliminar mi cuenta</p>
              <p className="text-xs leading-5" style={{ color: 'var(--text-muted)' }}>
                Esta acción es <strong style={{ color: 'var(--text-primary)' }}>permanente e irreversible</strong>. Se eliminarán
                todos tus movimientos, cuentas, categorías y datos asociados dentro de los 30 días, conforme a nuestra{' '}
                <a href="/privacy" target="_blank" style={{ color: 'var(--accent)' }} className="underline">Política de Privacidad</a>.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Escribí <strong>ELIMINAR</strong> para confirmar
              </label>
              <input
                value={deleteConfirm}
                onChange={e => setDeleteConfirm(e.target.value)}
                placeholder="ELIMINAR"
                className="input-base"
                style={{ borderColor: deleteConfirm === 'ELIMINAR' ? 'var(--expense)' : undefined }}
              />
            </div>

            <button
              onClick={handleDeleteAccount}
              disabled={deleting || deleteConfirm !== 'ELIMINAR'}
              className="w-full py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
              style={{ background: 'var(--expense)' }}
            >
              {deleting && <Loader2 size={14} className="animate-spin" />}
              {deleting ? 'Eliminando cuenta...' : 'Eliminar mi cuenta permanentemente'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
