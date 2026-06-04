'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Bell, BellOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { AlertType } from '@/types/database'

interface AlertConfig {
  type: AlertType
  label: string
  description: string
  hasDaysBefore: boolean
}

const ALERT_CONFIGS: AlertConfig[] = [
  {
    type: 'expense_over_income',
    label: 'Gasto supera ingreso',
    description: 'Cuando los gastos del mes superan los ingresos',
    hasDaysBefore: false,
  },
  {
    type: 'credit_card_due',
    label: 'Vencimiento de tarjeta',
    description: 'Antes del vencimiento de cada tarjeta de crédito',
    hasDaysBefore: true,
  },
  {
    type: 'fixed_term_maturity',
    label: 'Vencimiento de plazo fijo',
    description: 'Antes del vencimiento de un plazo fijo',
    hasDaysBefore: true,
  },
  {
    type: 'pending_debt_overdue',
    label: 'Cobro pendiente vencido',
    description: 'Cuando un cobro a tercero supera su fecha límite',
    hasDaysBefore: false,
  },
]

interface Setting {
  id?: string
  type: AlertType
  is_enabled: boolean
  days_before: number
}

export default function AlertsSettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [settings, setSettings] = useState<Record<AlertType, Setting>>(() => {
    const defaults: Partial<Record<AlertType, Setting>> = {}
    ALERT_CONFIGS.forEach(c => {
      defaults[c.type] = { type: c.type, is_enabled: true, days_before: 3 }
    })
    return defaults as Record<AlertType, Setting>
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('alert_settings')
      .select('*')
      .eq('user_id', user.id)

    if (data && data.length > 0) {
      const map: Partial<Record<AlertType, Setting>> = {}
      data.forEach(s => { map[s.type as AlertType] = s })
      setSettings(prev => {
        const updated = { ...prev }
        ALERT_CONFIGS.forEach(c => {
          if (map[c.type]) updated[c.type] = map[c.type]!
        })
        return updated
      })
    }
  }

  async function handleToggle(type: AlertType) {
    setSettings(prev => ({
      ...prev,
      [type]: { ...prev[type], is_enabled: !prev[type].is_enabled }
    }))
  }

  function handleDays(type: AlertType, value: string) {
    const n = parseInt(value)
    if (!isNaN(n) && n > 0) {
      setSettings(prev => ({ ...prev, [type]: { ...prev[type], days_before: n } }))
    }
  }

  async function handleSave() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const upserts = Object.values(settings).map(s => ({
      user_id: user.id,
      type: s.type,
      is_enabled: s.is_enabled,
      days_before: s.days_before,
    }))

    const { error } = await supabase
      .from('alert_settings')
      .upsert(upserts, { onConflict: 'user_id,type' })

    setSaving(false)
    if (error) {
      toast.error('Error al guardar')
      return
    }
    toast.success('Alertas guardadas')
    router.back()
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-xl">
          <ArrowLeft size={20} className="text-slate-600" />
        </button>
        <h1 className="text-xl font-bold text-slate-900">Alertas</h1>
      </div>

      <div className="space-y-3">
        {ALERT_CONFIGS.map(cfg => {
          const setting = settings[cfg.type]
          return (
            <div key={cfg.type} className="card !p-4">
              <div className="flex items-start gap-3">
                <div className={cn(
                  'p-2 rounded-xl shrink-0 mt-0.5',
                  setting.is_enabled ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'
                )}>
                  {setting.is_enabled ? <Bell size={16} /> : <BellOff size={16} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{cfg.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{cfg.description}</p>

                  {cfg.hasDaysBefore && setting.is_enabled && (
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-xs text-slate-500">Avisar</span>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={setting.days_before}
                        onChange={e => handleDays(cfg.type, e.target.value)}
                        className="w-14 text-center border border-slate-200 rounded-lg py-1 text-sm font-semibold outline-none focus:border-indigo-400"
                      />
                      <span className="text-xs text-slate-500">días antes</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleToggle(cfg.type)}
                  className={cn(
                    'relative w-11 h-6 rounded-full transition-colors shrink-0 mt-0.5',
                    setting.is_enabled ? 'bg-indigo-600' : 'bg-slate-200'
                  )}
                >
                  <span className={cn(
                    'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all',
                    setting.is_enabled ? 'left-5' : 'left-0.5'
                  )} />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full mt-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors disabled:opacity-60"
      >
        {saving ? 'Guardando...' : 'Guardar configuración'}
      </button>
    </div>
  )
}
