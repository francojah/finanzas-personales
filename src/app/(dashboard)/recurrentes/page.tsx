'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Repeat, Plus, Trash2, ArrowUpCircle, ArrowDownCircle, Landmark, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatARS, formatUSD } from '@/lib/utils'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

const FREQ_LABELS: Record<string, string> = {
  weekly: 'Semanal', monthly: 'Mensual', yearly: 'Anual',
}

interface RecurringTx {
  id: string
  description: string | null
  amount_ars: number
  amount_usd: number
  currency_original: string
  type: 'income' | 'expense'
  recurrence_frequency: string | null
  category: { name: string; color: string } | null
  account: { name: string } | null
}

interface ActiveLoan {
  id: string
  name: string
  lender: string | null
  monthly_payment: number
  currency: 'ARS' | 'USD'
  paid_installments: number
  total_installments: number | null
}

export default function RecurrentesPage() {
  const router = useRouter()
  const supabase = createClient()
  const [items, setItems] = useState<RecurringTx[]>([])
  const [loans, setLoans] = useState<ActiveLoan[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const [{ data: txData }, { data: loanData }] = await Promise.all([
      supabase
        .from('transactions')
        .select('*, category:categories(name,color), account:accounts!account_id(name)')
        .eq('is_recurring', true)
        .is('parent_transaction_id', null)
        .neq('type', 'transfer')
        .order('recurrence_frequency')
        .order('created_at', { ascending: false }),
      supabase
        .from('loans')
        .select('id, name, lender, monthly_payment, currency, paid_installments, total_installments')
        .eq('is_active', true)
        .order('created_at', { ascending: false }),
    ])
    setItems((txData ?? []) as RecurringTx[])
    setLoans((loanData ?? []) as ActiveLoan[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta transacción recurrente? No se eliminarán las instancias ya generadas.')) return
    await supabase.from('transactions').update({ is_recurring: false }).eq('id', id)
    toast.success('Recurrente eliminada')
    load()
  }

  const grouped = items.reduce<Record<string, RecurringTx[]>>((acc, t) => {
    const freq = t.recurrence_frequency ?? 'monthly'
    if (!acc[freq]) acc[freq] = []
    acc[freq].push(t)
    return acc
  }, {})

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Recurrentes</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Transacciones que se repiten automáticamente
          </p>
        </div>
        <button
          onClick={() => router.push('/transactions/new')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: 'var(--accent)' }}
        >
          <Plus size={15} /> Nueva
        </button>
      </div>

      {/* Info */}
      <div className="rounded-xl p-4" style={{ background: 'rgba(124,111,247,0.06)', border: '1px solid var(--accent-border)' }}>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          <strong style={{ color: 'var(--accent-text)' }}>¿Cómo funciona?</strong>{' '}
          Cuando cargás una transacción y la marcás como recurrente, aparece aquí. Cada mes el dashboard te avisa y podés generarlas todas con un click.
        </p>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'var(--surface)' }} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl flex flex-col items-center justify-center py-16 text-center"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <Repeat size={36} className="mb-3" style={{ color: 'var(--text-faint)' }} />
          <p className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Sin transacciones recurrentes</p>
          <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
            Al crear un movimiento, marcalo como recurrente para que aparezca aquí
          </p>
          <button
            onClick={() => router.push('/transactions/new')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'var(--accent)' }}>
            <Plus size={14} /> Crear primera recurrente
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).map(([freq, txs]) => (
            <div key={freq}>
              <div className="flex items-center gap-2 mb-2 px-1">
                <Repeat size={13} style={{ color: 'var(--accent-icon)' }} />
                <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-faint)' }}>
                  {FREQ_LABELS[freq] ?? freq} — {txs.length} transacción{txs.length > 1 ? 'es' : ''}
                </span>
              </div>
              <div className="space-y-2">
                {txs.map(tx => {
                  const isIncome = tx.type === 'income'
                  const Icon = isIncome ? ArrowUpCircle : ArrowDownCircle
                  const amount = tx.currency_original === 'USD' ? formatUSD(tx.amount_usd) : formatARS(tx.amount_ars)
                  return (
                    <div key={tx.id}
                      className="flex items-center gap-3 rounded-xl px-4 py-3"
                      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                      <Icon size={20} style={{ color: isIncome ? 'var(--income)' : 'var(--expense)', flexShrink: 0 }} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                          {tx.description || tx.category?.name || 'Sin descripción'}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {tx.category?.name ?? 'Sin categoría'}
                          {tx.account ? ` · ${tx.account.name}` : ''}
                        </p>
                      </div>
                      <p className="font-bold text-sm shrink-0"
                        style={{ color: isIncome ? 'var(--income)' : 'var(--expense)' }}>
                        {isIncome ? '+' : '-'}{amount}
                      </p>
                      <button
                        onClick={() => handleDelete(tx.id)}
                        className="p-1.5 rounded-lg ml-1 hover:bg-red-500/10 transition-colors shrink-0"
                        style={{ color: 'var(--text-faint)' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
      {/* ── Cuotas de préstamos ── */}
      {loans.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3 px-1">
            <Landmark size={13} style={{ color: '#ef4444' }} />
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-faint)' }}>
              Cuotas de préstamos — {loans.length} activo{loans.length > 1 ? 's' : ''}
            </span>
          </div>
          <div className="space-y-2">
            {loans.map(loan => {
              const rem = loan.total_installments ? loan.total_installments - loan.paid_installments : null
              const fmt = loan.currency === 'USD' ? formatUSD : formatARS
              return (
                <button
                  key={loan.id}
                  onClick={() => router.push(`/loans/${loan.id}`)}
                  className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(239,68,68,0.1)' }}>
                    <Landmark size={16} style={{ color: '#ef4444' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{loan.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {loan.lender ?? 'Préstamo'}
                      {rem !== null ? ` · ${rem} cuota${rem !== 1 ? 's' : ''} restante${rem !== 1 ? 's' : ''}` : ''}
                    </p>
                  </div>
                  <p className="font-bold text-sm shrink-0" style={{ color: '#ef4444' }}>
                    -{fmt(loan.monthly_payment)}
                  </p>
                  <ChevronRight size={14} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
