'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CreditCard, ChevronLeft, ChevronRight, AlertCircle, Settings } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatARS } from '@/lib/utils'
import { format, addMonths, subMonths, isSameMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import type { CreditCard as CreditCardType, Transaction } from '@/types/database'

interface CardSummary {
  card: CreditCardType
  periodStart: string
  periodEnd: string
  transactions: Transaction[]
  total: number
  installmentsTotal: number
}

export default function CreditCardsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [summaries, setSummaries] = useState<CardSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedCard, setExpandedCard] = useState<string | null>(null)

  const isCurrentMonth = isSameMonth(selectedDate, new Date())
  const monthLabel = format(selectedDate, 'MMMM yyyy', { locale: es })

  useEffect(() => { load() }, [selectedDate])

  async function load() {
    setLoading(true)
    try {
      const { data: cards } = await supabase.from('credit_cards').select('*').eq('is_active', true).order('created_at')
      if (!cards?.length) { setSummaries([]); return }

      const results: CardSummary[] = []
      for (const card of cards) {
        const closingDay = card.closing_day
        const year = selectedDate.getFullYear()
        const month = selectedDate.getMonth()
        const prevMonth = new Date(year, month - 1, closingDay + 1)
        const thisClose = new Date(year, month, closingDay)
        const periodStart = format(prevMonth, 'yyyy-MM-dd')
        const periodEnd   = format(thisClose, 'yyyy-MM-dd')

        const { data: txs } = await supabase
          .from('transactions')
          .select('*, category:categories(name, color)')
          .eq('credit_card_id', card.id)
          .gte('date', periodStart)
          .lte('date', periodEnd)
          .order('date', { ascending: false })

        const txList = (txs ?? []) as Transaction[]
        const total = txList.reduce((s, t) => s + t.amount_ars, 0)

        const { data: installments } = await supabase
          .from('installment_plans')
          .select('*')
          .eq('credit_card_id', card.id)
          .gte('due_date', periodStart)
          .lte('due_date', periodEnd)

        const installmentsTotal = (installments ?? []).reduce((s, i) => s + i.amount_ars, 0)
        results.push({ card, periodStart, periodEnd, transactions: txList, total, installmentsTotal })
      }
      setSummaries(results)
    } finally {
      setLoading(false)
    }
  }

  const grandTotal = summaries.reduce((s, r) => s + r.total + r.installmentsTotal, 0)

  function daysUntilDue(card: CreditCardType): number {
    const now = new Date()
    const dueDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), card.due_day)
    if (dueDate < now) dueDate.setMonth(dueDate.getMonth() + 1)
    return Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Tarjetas</h1>
        <button onClick={() => router.push('/settings/credit-cards')}
          className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl transition-colors"
          style={{ color: 'var(--text-muted)', background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <Settings size={14} /> Gestionar
        </button>
      </div>

      {/* Navegador de mes */}
      <div className="flex items-center gap-2">
        <button onClick={() => setSelectedDate(d => subMonths(d, 1))}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: 'var(--text-muted)', background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-semibold capitalize min-w-[130px] text-center"
          style={{ color: 'var(--text-primary)' }}>
          {monthLabel}
        </span>
        <button onClick={() => setSelectedDate(d => addMonths(d, 1))}
          disabled={isCurrentMonth}
          className="p-1.5 rounded-lg transition-colors disabled:opacity-30"
          style={{ color: 'var(--text-muted)', background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <ChevronRight size={16} />
        </button>
        {!isCurrentMonth && (
          <button onClick={() => setSelectedDate(new Date())}
            className="text-xs font-medium ml-1" style={{ color: 'var(--accent)' }}>
            Hoy
          </button>
        )}
      </div>

      {/* Total a pagar */}
      {!loading && summaries.length > 0 && (
        <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Total a pagar este mes</p>
          <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{formatARS(grandTotal)}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-faint)' }}>Suma de todas las tarjetas</p>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-32 rounded-2xl animate-pulse" style={{ background: 'var(--surface)' }} />
          ))}
        </div>
      ) : summaries.length === 0 ? (
        <div className="text-center py-16">
          <CreditCard size={40} className="mx-auto mb-3" style={{ color: 'var(--text-faint)' }} />
          <p className="mb-4" style={{ color: 'var(--text-muted)' }}>No hay tarjetas configuradas</p>
          <button onClick={() => router.push('/settings/credit-cards')}
            className="inline-flex items-center gap-2 text-white px-5 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: 'var(--accent)' }}>
            <CreditCard size={15} /> Agregar tarjeta
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {summaries.map(({ card, periodStart, periodEnd, transactions, total, installmentsTotal }) => {
            const isExpanded = expandedCard === card.id
            const subtotal = total + installmentsTotal
            const days = isCurrentMonth ? daysUntilDue(card) : null
            const isUrgent = days !== null && days <= 5

            return (
              <div key={card.id} className="rounded-2xl overflow-hidden"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>

                {/* Header de tarjeta */}
                <button
                  onClick={() => setExpandedCard(isExpanded ? null : card.id)}
                  className="w-full flex items-center gap-4 p-4 text-left transition-colors"
                  style={{ background: 'transparent' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div className="w-12 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: card.color }}>
                    <CreditCard size={14} className="text-white opacity-80" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{card.name}</p>
                      {isUrgent && (
                        <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full font-medium"
                          style={{ color: 'var(--expense)', background: 'var(--expense-bg)' }}>
                          <AlertCircle size={10} /> {days}d
                        </span>
                      )}
                      {days !== null && !isUrgent && (
                        <span className="text-xs" style={{ color: 'var(--text-faint)' }}>vence en {days}d</span>
                      )}
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      Cierre: {format(new Date(periodStart), 'dd/MM')} → {format(new Date(periodEnd), 'dd/MM')}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{formatARS(subtotal)}</p>
                    {installmentsTotal > 0 && (
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>incl. {formatARS(installmentsTotal)} cuotas</p>
                    )}
                  </div>
                </button>

                {/* Detalle expandido */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid var(--border-subtle)' }}>
                    {installmentsTotal > 0 && (
                      <>
                        <div className="flex justify-between px-4 py-2 text-xs"
                          style={{ background: 'var(--surface-elevated)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                          <span>Consumos del período</span>
                          <span className="font-semibold">{formatARS(total)}</span>
                        </div>
                        <div className="flex justify-between px-4 py-2 text-xs"
                          style={{ background: 'var(--surface-elevated)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                          <span>Cuotas de meses anteriores</span>
                          <span className="font-semibold">{formatARS(installmentsTotal)}</span>
                        </div>
                      </>
                    )}

                    {transactions.length === 0 ? (
                      <p className="text-center text-sm py-6" style={{ color: 'var(--text-muted)' }}>
                        Sin consumos en este período
                      </p>
                    ) : (
                      <div>
                        {transactions.map((tx, i) => (
                          <button key={tx.id}
                            onClick={() => router.push(`/transactions/${tx.id}`)}
                            className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors"
                            style={{ borderTop: i > 0 ? '1px solid var(--border-subtle)' : 'none' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-hover)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                                {tx.description || (tx.category as any)?.name || 'Sin descripción'}
                              </p>
                              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                {format(new Date(tx.date), 'dd/MM')}
                                {tx.has_installments && ` · ${tx.current_installment}/${tx.total_installments} cuotas`}
                              </p>
                            </div>
                            <p className="text-sm font-semibold shrink-0 ml-3" style={{ color: 'var(--text-primary)' }}>
                              {formatARS(tx.amount_ars)}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Total resumen */}
                    <div className="flex justify-between px-4 py-3"
                      style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--accent-bg)' }}>
                      <span className="text-sm font-bold" style={{ color: 'var(--accent-text)' }}>Total resumen</span>
                      <span className="text-sm font-bold" style={{ color: 'var(--accent-text)' }}>{formatARS(subtotal)}</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
