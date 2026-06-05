'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Wallet, TrendingUp, Plus, Check, ChevronRight, Sparkles, X, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

const STEPS = [
  { id: 'welcome',  title: '¡Bienvenido a Finanzas!',    icon: Sparkles },
  { id: 'account',  title: 'Agregá tu primera cuenta',   icon: Wallet   },
  { id: 'income',   title: 'Cargá tu ingreso mensual',   icon: TrendingUp },
  { id: 'done',     title: '¡Listo para comenzar!',      icon: Check    },
]

export function OnboardingWizard() {
  const router = useRouter()
  const supabase = createClient()
  const [show, setShow] = useState(false)
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)

  // Account form
  const [accName, setAccName]   = useState('')
  const [accCurrency, setAccCurrency] = useState<'ARS' | 'USD'>('ARS')
  const [accBalance, setAccBalance]   = useState('')

  // Income form
  const [incAmount, setIncAmount]   = useState('')
  const [incDesc, setIncDesc]       = useState('Sueldo')

  useEffect(() => {
    const done = localStorage.getItem('onboarding_done')
    if (done) return

    // Check if user already has data
    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: accs } = await supabase.from('accounts').select('id').limit(1)
      if (!accs || accs.length === 0) setShow(true)
    }
    check()
  }, [])

  function dismiss() {
    localStorage.setItem('onboarding_done', '1')
    setShow(false)
  }

  async function handleSaveAccount() {
    if (!accName.trim()) { toast.error('Ingresá un nombre'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('accounts').insert({
      user_id: user.id, name: accName.trim(),
      type: 'bank', currency: accCurrency,
      initial_balance: parseFloat(accBalance) || 0,
      color: '#7c6ff7',
    })
    if (error) { toast.error('Error al guardar'); setSaving(false); return }
    setSaving(false)
    setStep(2)
  }

  async function handleSaveIncome() {
    if (!incAmount || parseFloat(incAmount) <= 0) { toast.error('Ingresá un monto'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const amount = parseFloat(incAmount)
    await supabase.from('transactions').insert({
      user_id: user.id, type: 'income',
      amount_original: amount, currency_original: 'ARS',
      amount_ars: amount, amount_usd: amount / 1200,
      exchange_rate: 1200, exchange_rate_type: 'mep',
      description: incDesc || 'Sueldo',
      date: new Date().toISOString().split('T')[0],
      is_recurring: true, recurrence_frequency: 'monthly',
    })
    setSaving(false)
    setStep(3)
  }

  if (!show) return null

  const S = STEPS[step]

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 32px 80px rgba(0,0,0,0.5)' }}>

        {/* Step indicator */}
        <div className="flex" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex-1 h-1" style={{
              background: i <= step ? 'var(--accent)' : 'var(--surface-elevated)',
              transition: 'background 0.3s',
            }} />
          ))}
        </div>

        <div className="p-6">
          {/* Close */}
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-bg)' }}>
                <S.icon size={20} style={{ color: 'var(--accent-icon)' }} />
              </div>
              <div>
                <p className="text-xs font-medium" style={{ color: 'var(--text-faint)' }}>Paso {step + 1} de {STEPS.length}</p>
                <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{S.title}</h2>
              </div>
            </div>
            <button onClick={dismiss} className="p-1.5 rounded-lg" style={{ color: 'var(--text-faint)' }}>
              <X size={16} />
            </button>
          </div>

          {/* Step 0: Welcome */}
          {step === 0 && (
            <div className="space-y-4">
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                En 3 pasos rápidos tenés tu perfil financiero configurado y listo para empezar a registrar tus movimientos.
              </p>
              <div className="space-y-2">
                {[
                  { icon: Wallet,    text: 'Agregás tu cuenta bancaria o billetera' },
                  { icon: TrendingUp, text: 'Registrás tu ingreso mensual' },
                  { icon: Check,     text: '¡Listo! El dashboard ya muestra tus datos' },
                ].map(({ icon: Icon, text }, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ background: 'var(--surface-elevated)' }}>
                    <Icon size={16} style={{ color: 'var(--accent-icon)', flexShrink: 0 }} />
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{text}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => setStep(1)} className="w-full py-3 rounded-xl text-white font-semibold flex items-center justify-center gap-2 mt-2" style={{ background: 'var(--accent)' }}>
                Empezar <ChevronRight size={16} />
              </button>
            </div>
          )}

          {/* Step 1: Account */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Agregá la cuenta principal donde recibís tu sueldo o manejás tu plata.
              </p>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Nombre de la cuenta</label>
                <input value={accName} onChange={e => setAccName(e.target.value)} placeholder="ej: Galicia, Mercado Pago..." className="input-base" autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Moneda</label>
                  <div className="flex rounded-xl overflow-hidden" style={{ border: '1.5px solid var(--border)' }}>
                    {(['ARS', 'USD'] as const).map(c => (
                      <button key={c} onClick={() => setAccCurrency(c)} className="flex-1 py-2 text-sm font-semibold transition-colors"
                        style={accCurrency === c ? { background: 'var(--accent)', color: '#fff' } : { background: 'var(--surface)', color: 'var(--text-muted)' }}>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Saldo actual</label>
                  <input type="number" value={accBalance} onChange={e => setAccBalance(e.target.value)} placeholder="0" className="input-base" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setStep(2)} className="flex-1 py-2.5 rounded-xl text-sm" style={{ color: 'var(--text-muted)', background: 'var(--surface-elevated)' }}>
                  Saltar
                </button>
                <button onClick={handleSaveAccount} disabled={saving} className="flex-1 py-2.5 rounded-xl text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-2" style={{ background: 'var(--accent)' }}>
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  Guardar y continuar
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Income */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                ¿Cuánto cobrás por mes? Lo registramos como ingreso recurrente mensual.
              </p>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Concepto</label>
                <input value={incDesc} onChange={e => setIncDesc(e.target.value)} placeholder="Sueldo" className="input-base" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Monto mensual (ARS)</label>
                <input type="number" value={incAmount} onChange={e => setIncAmount(e.target.value)} placeholder="ej: 500000" className="input-base" autoFocus />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setStep(3)} className="flex-1 py-2.5 rounded-xl text-sm" style={{ color: 'var(--text-muted)', background: 'var(--surface-elevated)' }}>
                  Saltar
                </button>
                <button onClick={handleSaveIncome} disabled={saving} className="flex-1 py-2.5 rounded-xl text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-2" style={{ background: 'var(--accent)' }}>
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  Guardar y continuar
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Done */}
          {step === 3 && (
            <div className="space-y-4 text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ background: 'var(--income-bg)' }}>
                <Check size={28} style={{ color: 'var(--income)' }} />
              </div>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                ¡Tu perfil está configurado! Ahora podés explorar el dashboard, cargar gastos y ver cómo evolucionan tus finanzas.
              </p>
              <div className="space-y-2">
                <button onClick={() => { dismiss(); router.push('/transactions/new') }} className="w-full py-3 rounded-xl text-white font-semibold flex items-center justify-center gap-2" style={{ background: 'var(--accent)' }}>
                  <Plus size={16} /> Cargar primer gasto
                </button>
                <button onClick={dismiss} className="w-full py-2.5 rounded-xl text-sm font-medium" style={{ color: 'var(--text-secondary)', background: 'var(--surface-elevated)' }}>
                  Explorar dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
