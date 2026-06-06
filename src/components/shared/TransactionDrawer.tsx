'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  X, ArrowUpCircle, ArrowDownCircle, ArrowLeftRight,
  ExternalLink, Trash2, Receipt, Pencil, Check, Loader2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatARS, formatUSD, formatDate, cn } from '@/lib/utils'
import { useCategories } from '@/hooks/useCategories'
import { toast } from 'sonner'
import type { Transaction } from '@/types/database'
import { useRouter } from 'next/navigation'

interface Props {
  transactionId: string | null
  onClose: () => void
  onDeleted?: (id: string) => void
  onSaved?: (id: string) => void
}

interface EditForm {
  description: string
  amount: string
  date: string
  category_id: string
  subcategory_id: string
}

export function TransactionDrawer({ transactionId, onClose, onDeleted, onSaved }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const { categories } = useCategories()

  const [tx, setTx]           = useState<Transaction | null>(null)
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [form, setForm]       = useState<EditForm>({
    description: '', amount: '', date: '', category_id: '', subcategory_id: '',
  })

  const open = !!transactionId

  // Carga transacción
  useEffect(() => {
    if (!transactionId) { setTx(null); setEditing(false); return }
    setLoading(true)
    supabase
      .from('transactions')
      .select('*, category:categories(name,color,icon), subcategory:subcategories(name), account:accounts!account_id(name), credit_card:credit_cards(name)')
      .eq('id', transactionId)
      .single()
      .then(({ data }) => {
        const t = data as Transaction
        setTx(t)
        setForm({
          description:    t.description ?? '',
          amount:         String(t.amount_original ?? t.amount_ars),
          date:           t.date,
          category_id:    t.category_id ?? '',
          subcategory_id: t.subcategory_id ?? '',
        })
        setLoading(false)
      })
  }, [transactionId])

  // Escape cierra
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') { if (editing) setEditing(false); else onClose() } }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose, editing])

  const handleDelete = useCallback(async () => {
    if (!tx || !confirm('¿Eliminar este movimiento?')) return
    const { error } = await supabase.from('transactions').delete().eq('id', tx.id)
    if (error) { toast.error('Error al eliminar'); return }
    toast.success('Movimiento eliminado')
    onDeleted?.(tx.id)
    onClose()
  }, [tx, supabase, onDeleted, onClose])

  const handleSave = useCallback(async () => {
    if (!tx) return
    setSaving(true)
    try {
      const amount = parseFloat(form.amount)
      if (isNaN(amount) || amount <= 0) { toast.error('Monto inválido'); return }

      // Recalcular ARS/USD si cambió el monto
      const ratio = amount / (tx.amount_original ?? tx.amount_ars)
      const newARS = tx.amount_ars * ratio
      const newUSD = tx.amount_usd * ratio

      const { error } = await supabase
        .from('transactions')
        .update({
          description:    form.description || null,
          amount_original: amount,
          amount_ars:     newARS,
          amount_usd:     newUSD,
          date:           form.date,
          category_id:    form.category_id || null,
          subcategory_id: form.subcategory_id || null,
        })
        .eq('id', tx.id)

      if (error) throw error
      toast.success('Movimiento actualizado')
      setEditing(false)
      onSaved?.(tx.id)
      // Recargar datos
      const { data } = await supabase
        .from('transactions')
        .select('*, category:categories(name,color,icon), subcategory:subcategories(name), account:accounts!account_id(name), credit_card:credit_cards(name)')
        .eq('id', tx.id)
        .single()
      if (data) setTx(data as Transaction)
    } catch {
      toast.error('Error al guardar')
    } finally {
      setSaving(false)
    }
  }, [tx, form, supabase, onSaved])

  const isIncome  = tx?.type === 'income'
  const isExpense = tx?.type === 'expense'
  const Icon      = isIncome ? ArrowUpCircle : isExpense ? ArrowDownCircle : ArrowLeftRight
  const amtColor  = isIncome ? 'var(--income)' : isExpense ? 'var(--expense)' : 'var(--accent)'
  const iconBg    = isIncome ? 'rgba(16,185,129,0.12)' : isExpense ? 'rgba(239,68,68,0.1)' : 'rgba(99,102,241,0.1)'
  const prefix    = isIncome ? '+' : isExpense ? '-' : ''

  const subcategories = categories.find(c => c.id === form.category_id)?.subcategories?.filter(s => s.is_active) ?? []

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn('fixed inset-0 z-40 transition-opacity duration-200', open ? 'opacity-100' : 'opacity-0 pointer-events-none')}
        style={{ background: 'rgba(0,0,0,0.4)' }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn('fixed top-0 right-0 h-full w-full max-w-sm z-50 flex flex-col transition-transform duration-300 ease-in-out', open ? 'translate-x-0' : 'translate-x-full')}
        style={{ background: 'var(--surface-elevated)', boxShadow: '-4px 0 32px rgba(0,0,0,0.25)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
            {editing ? 'Editar movimiento' : 'Detalle'}
          </h2>
          <div className="flex items-center gap-1">
            {tx && !editing && (
              <>
                <button onClick={() => setEditing(true)}
                  className="p-2 rounded-xl transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  title="Editar">
                  <Pencil size={15} />
                </button>
                <button onClick={() => { onClose(); router.push(`/transactions/${tx.id}`) }}
                  className="p-2 rounded-xl transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  title="Ver página completa">
                  <ExternalLink size={15} />
                </button>
                <button onClick={handleDelete}
                  className="p-2 rounded-xl transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  title="Eliminar">
                  <Trash2 size={15} />
                </button>
              </>
            )}
            {editing && (
              <button onClick={() => setEditing(false)}
                className="text-xs px-3 py-1.5 rounded-lg"
                style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                Cancelar
              </button>
            )}
            <button onClick={onClose} className="p-2 rounded-xl" style={{ color: 'var(--text-muted)' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading && (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: 'var(--surface)' }} />)}
            </div>
          )}

          {!loading && tx && !editing && (
            <>
              {/* Monto */}
              <div className="text-center py-4">
                <div className="inline-flex p-3 rounded-2xl mb-3" style={{ background: iconBg }}>
                  <Icon size={24} style={{ color: amtColor }} />
                </div>
                <p className="text-3xl font-bold" style={{ color: amtColor }}>
                  {prefix}{formatARS(tx.amount_ars)}
                </p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{prefix}{formatUSD(tx.amount_usd)}</p>
                {tx.exchange_rate && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-faint)' }}>
                    TC {tx.exchange_rate_type?.toUpperCase()} {formatARS(tx.exchange_rate)}
                  </p>
                )}
              </div>

              {/* Filas de detalle */}
              <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                {[
                  { label: 'Tipo', value: tx.type === 'income' ? 'Ingreso' : tx.type === 'expense' ? 'Gasto' : 'Transferencia' },
                  { label: 'Fecha', value: formatDate(tx.date) },
                  { label: 'Descripción', value: tx.description ?? '—' },
                  { label: 'Categoría', value: (tx.category as any)?.name ?? '—' },
                  { label: 'Subcategoría', value: (tx.subcategory as any)?.name ?? '—' },
                  { label: 'Cuenta', value: (tx.account as any)?.name ?? (tx.credit_card as any)?.name ?? '—' },
                  { label: 'Recurrente', value: tx.is_recurring ? `Sí (${tx.recurrence_frequency})` : 'No' },
                  tx.has_installments ? { label: 'Cuotas', value: `${tx.current_installment}/${tx.total_installments}` } : null,
                ].filter(Boolean).map(({ label, value }: any) => (
                  <div key={label} className="flex justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                    <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{label}</span>
                    <span className="text-sm font-medium text-right max-w-[55%]" style={{ color: 'var(--text-primary)' }}>{value}</span>
                  </div>
                ))}
              </div>

              {/* Comprobante */}
              {tx.receipt_url && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                    <Receipt size={12} /> Comprobante
                  </p>
                  <div className="relative rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                    <img src={tx.receipt_url} alt="Comprobante" className="w-full max-h-52 object-contain" style={{ background: 'var(--surface)' }} />
                    <a href={tx.receipt_url} target="_blank" rel="noopener noreferrer"
                      className="absolute top-2 right-2 rounded-lg p-1.5 transition-colors"
                      style={{ background: 'rgba(0,0,0,0.4)', color: 'white' }}>
                      <ExternalLink size={13} />
                    </a>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── MODO EDICIÓN ── */}
          {!loading && tx && editing && (
            <div className="space-y-4">
              {/* Monto */}
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Monto ({tx.currency_original})</label>
                <input
                  type="number"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  className="input-base text-lg font-bold"
                  placeholder="0.00"
                />
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Descripción</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="input-base"
                  placeholder="Ej: Psicólogo, Alquiler, Netflix..."
                />
              </div>

              {/* Fecha */}
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Fecha</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="input-base"
                />
              </div>

              {/* Categoría */}
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Categoría</label>
                <select
                  value={form.category_id}
                  onChange={e => setForm(f => ({ ...f, category_id: e.target.value, subcategory_id: '' }))}
                  className="input-base"
                >
                  <option value="">Sin categoría</option>
                  {categories.filter(c => c.type === tx.type).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Subcategoría */}
              {subcategories.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Subcategoría</label>
                  <select
                    value={form.subcategory_id}
                    onChange={e => setForm(f => ({ ...f, subcategory_id: e.target.value }))}
                    className="input-base"
                  >
                    <option value="">Sin subcategoría</option>
                    {subcategories.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer — botón guardar en modo edición */}
        {editing && (
          <div className="p-5" style={{ borderTop: '1px solid var(--border)' }}>
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', opacity: saving ? 0.7 : 1 }}
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        )}
      </div>
    </>
  )
}
