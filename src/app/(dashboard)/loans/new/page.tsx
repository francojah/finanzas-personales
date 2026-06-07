'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, RefreshCw, TrendingUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatARS } from '@/lib/utils'
import { toast } from 'sonner'

export default function NewLoanPage() {
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)

  // UVA state
  const [uvaValue, setUvaValue]   = useState<number | null>(null)
  const [uvaDate, setUvaDate]     = useState<string | null>(null)
  const [uvaLoading, setUvaLoading] = useState(false)

  const [form, setForm] = useState({
    name: '',
    lender: '',
    loan_type: 'fixed' as 'fixed' | 'uva',
    total_amount: '',
    currency: 'ARS' as 'ARS' | 'USD',
    monthly_payment: '',
    uva_installment: '',   // cuota en UVAs
    total_installments: '',
    paid_installments: '0',
    start_date: '',
    interest_rate: '',
    notes: '',
  })

  function set(key: string, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const isUVA = form.loan_type === 'uva'

  // Cuota estimada en ARS para préstamo UVA
  const estimatedARS = isUVA && uvaValue && form.uva_installment
    ? parseFloat(form.uva_installment) * uvaValue
    : null

  async function fetchUVA() {
    setUvaLoading(true)
    try {
      const res = await fetch('/api/prices/uva')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setUvaValue(data.value)
      setUvaDate(data.date)
    } catch {
      toast.error('No se pudo obtener el valor UVA del BCRA')
    } finally {
      setUvaLoading(false)
    }
  }

  // Cargar UVA al montar si el tipo es UVA
  useEffect(() => {
    if (isUVA && !uvaValue) fetchUVA()
  }, [isUVA])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name) { toast.error('Ingresá un nombre'); return }
    if (isUVA && !form.uva_installment) { toast.error('Ingresá la cuota en UVAs'); return }
    if (!isUVA && !form.monthly_payment) { toast.error('Ingresá la cuota mensual'); return }

    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const monthly = isUVA
      ? (estimatedARS ?? 0)                   // cuota ARS estimada al día de hoy
      : parseFloat(form.monthly_payment) || 0

    const { error } = await supabase.from('loans').insert({
      user_id: user.id,
      name: form.name,
      lender: form.lender || null,
      loan_type: form.loan_type,
      total_amount: parseFloat(form.total_amount) || 0,
      currency: isUVA ? 'ARS' : form.currency,
      monthly_payment: monthly,
      uva_installment: isUVA ? parseFloat(form.uva_installment) : null,
      total_installments: form.total_installments ? parseInt(form.total_installments) : null,
      paid_installments: parseInt(form.paid_installments) || 0,
      start_date: form.start_date || null,
      interest_rate: form.interest_rate ? parseFloat(form.interest_rate) : null,
      notes: form.notes || null,
      is_active: true,
    })

    if (error) { toast.error('Error al guardar: ' + error.message); setSaving(false); return }
    toast.success('Préstamo registrado')
    router.push('/loans')
  }

  const fc = "w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-all"
  const fs = { background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }
  const lc = "block text-xs font-medium mb-1.5"
  const ls = { color: 'var(--text-muted)' }

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-xl" style={{ color: 'var(--text-muted)', background: 'var(--surface)' }}>
          <ArrowLeft size={17} />
        </button>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Nuevo préstamo</h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Registrá un préstamo con cuota mensual</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>

          {/* Tipo de préstamo */}
          <div>
            <label className={lc} style={ls}>Tipo de préstamo</label>
            <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              {([
                { value: 'fixed', label: 'Cuota fija (ARS / USD)' },
                { value: 'uva',   label: '🏠 Cuota UVA' },
              ] as const).map(({ value, label }) => (
                <button key={value} type="button" onClick={() => set('loan_type', value)}
                  className="flex-1 py-2.5 text-sm font-semibold transition-colors"
                  style={form.loan_type === value
                    ? { background: value === 'uva' ? '#10b981' : 'var(--accent)', color: '#fff' }
                    : { background: 'var(--surface-elevated)', color: 'var(--text-muted)' }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Nombre */}
          <div>
            <label className={lc} style={ls}>Nombre *</label>
            <input className={fc} style={fs} placeholder="Ej: Hipoteca Banco Ciudad" value={form.name} onChange={e => set('name', e.target.value)} />
          </div>

          {/* Prestamista */}
          <div>
            <label className={lc} style={ls}>Banco / prestamista</label>
            <input className={fc} style={fs} placeholder="Ej: Banco Ciudad" value={form.lender} onChange={e => set('lender', e.target.value)} />
          </div>

          {/* ─── CUOTA UVA ─────────────────────────────────────── */}
          {isUVA && (
            <div className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.25)' }}>

              {/* Valor UVA actual */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp size={14} style={{ color: '#10b981' }} />
                  <div>
                    <p className="text-xs font-semibold" style={{ color: '#10b981' }}>
                      Valor UVA hoy {uvaDate ? `(${uvaDate})` : ''}
                    </p>
                    {uvaValue
                      ? <p className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>{formatARS(uvaValue)}</p>
                      : <p className="text-xs" style={{ color: 'var(--text-faint)' }}>Cargando desde BCRA...</p>
                    }
                  </div>
                </div>
                <button type="button" onClick={fetchUVA} disabled={uvaLoading}
                  className="p-2 rounded-lg" style={{ color: '#10b981', background: 'rgba(16,185,129,0.1)' }}>
                  <RefreshCw size={13} className={uvaLoading ? 'animate-spin' : ''} />
                </button>
              </div>

              {/* Cuota en UVAs */}
              <div>
                <label className={lc} style={{ color: '#10b981' }}>Cuota en UVAs *</label>
                <input type="number" min="0" step="0.01" className={fc}
                  style={{ ...fs, borderColor: 'rgba(16,185,129,0.4)' }}
                  placeholder="Ej: 270"
                  value={form.uva_installment}
                  onChange={e => set('uva_installment', e.target.value)} />
                <p className="text-xs mt-1" style={{ color: 'var(--text-faint)' }}>
                  Encontralo en tu contrato hipotecario o resumen de cuota.
                </p>
              </div>

              {/* Preview cuota ARS */}
              {estimatedARS !== null && (
                <div className="rounded-lg px-3 py-2" style={{ background: 'rgba(16,185,129,0.1)' }}>
                  <p className="text-xs" style={{ color: '#10b981' }}>
                    Cuota estimada este mes:
                    <strong className="ml-1 text-sm">{formatARS(estimatedARS)}</strong>
                    <span className="ml-1 font-normal" style={{ color: 'var(--text-faint)' }}>
                      ({form.uva_installment} UVAs × {formatARS(uvaValue!)})
                    </span>
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-faint)' }}>
                    Varía cada mes según el valor UVA que publica el BCRA.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ─── CUOTA FIJA ─────────────────────────────────────── */}
          {!isUVA && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lc} style={ls}>Moneda</label>
                <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                  {(['ARS', 'USD'] as const).map(c => (
                    <button key={c} type="button" onClick={() => set('currency', c)}
                      className="flex-1 py-2.5 text-sm font-semibold transition-colors"
                      style={form.currency === c
                        ? { background: 'var(--accent)', color: '#fff' }
                        : { background: 'var(--surface-elevated)', color: 'var(--text-muted)' }}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={lc} style={ls}>Cuota mensual *</label>
                <input type="number" min="0" step="0.01" className={fc} style={fs}
                  placeholder="0" value={form.monthly_payment} onChange={e => set('monthly_payment', e.target.value)} />
              </div>
            </div>
          )}

          {/* Monto total + cuotas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lc} style={ls}>Monto total del préstamo</label>
              <input type="number" min="0" className={fc} style={fs}
                placeholder="0" value={form.total_amount} onChange={e => set('total_amount', e.target.value)} />
            </div>
            <div>
              <label className={lc} style={ls}>Cantidad de cuotas</label>
              <input type="number" min="1" className={fc} style={fs}
                placeholder="Ej: 120" value={form.total_installments} onChange={e => set('total_installments', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lc} style={ls}>Cuotas ya pagadas</label>
              <input type="number" min="0" className={fc} style={fs}
                placeholder="0" value={form.paid_installments} onChange={e => set('paid_installments', e.target.value)} />
            </div>
            <div>
              <label className={lc} style={ls}>TNA (%)</label>
              <input type="number" min="0" step="0.01" className={fc} style={fs}
                placeholder="Ej: 7.5" value={form.interest_rate} onChange={e => set('interest_rate', e.target.value)} />
            </div>
          </div>

          <div>
            <label className={lc} style={ls}>Fecha de inicio</label>
            <input type="date" className={fc} style={fs}
              value={form.start_date} onChange={e => set('start_date', e.target.value)} />
          </div>

          <div>
            <label className={lc} style={ls}>Notas</label>
            <textarea className={fc} style={{ ...fs, resize: 'none' }} rows={2}
              placeholder="Condiciones, número de contrato, etc."
              value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
        </div>

        <button type="submit" disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white"
          style={{ background: saving ? 'var(--border)' : 'var(--accent)' }}>
          {saving ? <><Loader2 size={15} className="animate-spin" /> Guardando...</> : 'Guardar préstamo'}
        </button>
      </form>
    </div>
  )
}
