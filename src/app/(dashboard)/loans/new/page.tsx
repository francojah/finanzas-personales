'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function NewLoanPage() {
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    name: '',
    lender: '',
    total_amount: '',
    currency: 'ARS' as 'ARS' | 'USD',
    monthly_payment: '',
    total_installments: '',
    paid_installments: '0',
    start_date: '',
    interest_rate: '',
    notes: '',
  })

  function set(key: string, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.total_amount || !form.monthly_payment) {
      toast.error('Completá los campos obligatorios')
      return
    }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const { error } = await supabase.from('loans').insert({
      user_id: user.id,
      name: form.name,
      lender: form.lender || null,
      total_amount: parseFloat(form.total_amount),
      currency: form.currency,
      monthly_payment: parseFloat(form.monthly_payment),
      total_installments: form.total_installments ? parseInt(form.total_installments) : null,
      paid_installments: parseInt(form.paid_installments) || 0,
      start_date: form.start_date || null,
      interest_rate: form.interest_rate ? parseFloat(form.interest_rate) : null,
      notes: form.notes || null,
      is_active: true,
    })

    if (error) {
      toast.error('Error al guardar: ' + error.message)
      setSaving(false)
      return
    }
    toast.success('Préstamo registrado')
    router.push('/loans')
  }

  const fieldClass = "w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-all"
  const fieldStyle = { background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }
  const labelClass = "block text-xs font-medium mb-1.5"
  const labelStyle = { color: 'var(--text-muted)' }

  return (
    <div className="max-w-xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl transition-colors"
          style={{ color: 'var(--text-muted)', background: 'var(--surface)' }}
        >
          <ArrowLeft size={17} />
        </button>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Nuevo préstamo</h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Registrá un préstamo con cuota mensual</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-xl p-5 space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>

          <div>
            <label className={labelClass} style={labelStyle}>Nombre *</label>
            <input
              className={fieldClass}
              style={fieldStyle}
              placeholder="Ej: Préstamo personal Banco Nación"
              value={form.name}
              onChange={e => set('name', e.target.value)}
            />
          </div>

          <div>
            <label className={labelClass} style={labelStyle}>Banco / prestamista</label>
            <input
              className={fieldClass}
              style={fieldStyle}
              placeholder="Ej: Banco Galicia"
              value={form.lender}
              onChange={e => set('lender', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} style={labelStyle}>Moneda</label>
              <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                {(['ARS', 'USD'] as const).map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => set('currency', c)}
                    className="flex-1 py-2.5 text-sm font-semibold transition-colors"
                    style={form.currency === c
                      ? { background: 'var(--accent)', color: '#fff' }
                      : { background: 'var(--surface-elevated)', color: 'var(--text-muted)' }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={labelClass} style={labelStyle}>Monto total *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className={fieldClass}
                style={fieldStyle}
                placeholder="0"
                value={form.total_amount}
                onChange={e => set('total_amount', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} style={labelStyle}>Cuota mensual *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className={fieldClass}
                style={fieldStyle}
                placeholder="0"
                value={form.monthly_payment}
                onChange={e => set('monthly_payment', e.target.value)}
              />
            </div>

            <div>
              <label className={labelClass} style={labelStyle}>Cantidad de cuotas</label>
              <input
                type="number"
                min="1"
                className={fieldClass}
                style={fieldStyle}
                placeholder="Ej: 24"
                value={form.total_installments}
                onChange={e => set('total_installments', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} style={labelStyle}>Cuotas ya pagadas</label>
              <input
                type="number"
                min="0"
                className={fieldClass}
                style={fieldStyle}
                placeholder="0"
                value={form.paid_installments}
                onChange={e => set('paid_installments', e.target.value)}
              />
            </div>

            <div>
              <label className={labelClass} style={labelStyle}>TNA (%)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className={fieldClass}
                style={fieldStyle}
                placeholder="Ej: 45"
                value={form.interest_rate}
                onChange={e => set('interest_rate', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className={labelClass} style={labelStyle}>Fecha de inicio</label>
            <input
              type="date"
              className={fieldClass}
              style={fieldStyle}
              value={form.start_date}
              onChange={e => set('start_date', e.target.value)}
            />
          </div>

          <div>
            <label className={labelClass} style={labelStyle}>Notas</label>
            <textarea
              className={fieldClass}
              style={{ ...fieldStyle, resize: 'none' }}
              rows={2}
              placeholder="Condiciones, número de contrato, etc."
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white"
          style={{ background: saving ? 'var(--border)' : 'var(--accent)' }}
        >
          {saving ? <><Loader2 size={15} className="animate-spin" /> Guardando...</> : 'Guardar préstamo'}
        </button>
      </form>
    </div>
  )
}
