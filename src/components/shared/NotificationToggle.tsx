'use client'

import { Bell, BellOff, BellRing } from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'

export function NotificationToggle() {
  const { permission, requestPermission } = useNotifications()

  if (permission === 'unsupported') return null

  if (permission === 'granted') return (
    <div className="flex items-center gap-2 px-4 py-3 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <BellRing size={16} style={{ color: 'var(--income)' }} />
      <div className="flex-1">
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Notificaciones activas</p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Recibirás alertas de vencimientos y presupuesto</p>
      </div>
      <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>ON</span>
    </div>
  )

  if (permission === 'denied') return (
    <div className="flex items-center gap-2 px-4 py-3 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <BellOff size={16} style={{ color: 'var(--text-faint)' }} />
      <div className="flex-1">
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Notificaciones bloqueadas</p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Habilitá en la configuración del navegador</p>
      </div>
    </div>
  )

  return (
    <button
      onClick={requestPermission}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.1)' }}>
        <Bell size={16} style={{ color: '#6366f1' }} />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Activar notificaciones</p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Alertas de vencimientos, presupuesto y recordatorios</p>
      </div>
      <span className="text-xs font-bold px-3 py-1.5 rounded-lg text-white" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
        Activar
      </span>
    </button>
  )
}
