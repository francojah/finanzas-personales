'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CreditCard, ChevronLeft, ChevronRight, AlertCircle, Settings } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatARS, cn } from '@/lib/utils'
import { format, startOfMonth, endOfMonth, addMonths, subMonths, isSameMonth, getDaysInMonth } from 'date-fns'
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
      const { data: cards } = await supabase
        .from('credit_cards')
        .select('*')
        .eq('is_active', true)
        .order('created_at')

      if (!cards?.length) { setSummaries([]); return }

      const results: CardSummary[] = []

      for (const card of cards) {
        // Calcular el período del resumen para el mes seleccionado
        // El período va del día (closing_day+1) del mes anterior al closing_day del mes seleccionado
        const closingDay = card.closing_day
        const year = selectedDate.getFullYear()
        const month = selectedDate.getMonth() // 0-indexed

        // Período: del día siguiente al cierre del mes anterior, al cierre del mes seleccionado
        const prevMonth = new Date(year, month - 1, closingDay + 1)
        const thisClose = new Date(year, month, closingDay)

        const periodStart = format(prevMonth, 'yyyy-MM-dd')
        const periodEnd   = format(thisClose, 'yyyy-MM-dd')

        // Transacciones de la tarjeta en ese período
        const { data: txs } = await supabase
          .from('transactions')
          .select('*, category:categories(name, color)')
          .eq('credit_card_id', card.id)
          .gte('date', periodStart)
          .lte('date', periodEnd)
          .order('date', { ascending: false })

        const txList = (txs ?? []) as Transaction[]
        const total = txList.reduce((s, t) => s + t.amount_ars, 0)

        // Cuotas que caen en este período (de compras anteriores)
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

  // Días para vencer (del mes seleccionado)
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
        <h1 className="text-2xl font-bold text-slate-900">Tarjetas</h1>
        <button onClick={() => router.push('/settings/credit-cards')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 px-3 py-1.5 rounded-xl transition-colors">
          <Settings size={14} /> Gestionar
        </button>
      </div>

      {/* Navegador de mes */}
      <div className="flex items-center gap-2">
        <button onClick={() => setSelectedDate(d => subMonths(d, 1))}
          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600">
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-semibold text-slate-700 capitalize min-w-[130px] text-center">
          {monthLabel}
        </span>
        <button onClick={() => setSelectedDate(d => addMonths(d, 1))}
          disabled={isCurrentMonth}
          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 disabled:opacity-30">
          <ChevronRight size={16} />
        </button>
        {!isCurrentMonth && (
          <button onClick={() => setSelectedDate(new Date())}
            className="text-xs text-indigo-600 hover:underline font-medium ml-1">
            Hoy
          </button>
        )}
      </div>

      {/* Total a pagar */}
      {!loading && summaries.length > 0 && (
        <div className="card !p-4 bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-100">
          <p className="text-sm text-indigo-600 font-medium mb-1">Total a pagar este mes</p>
          <p className="text-3xl font-bold text-indigo-700">{formatARS(grandTotal)}</p>
          <p className="text-xs text-indigo-400 mt-1">Suma de todas las tarjetas</p>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => <div key={i} className="h-32 bg-slate-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : summaries.length === 0 ? (
        <div className="text-center py-16">
          <CreditCard size={40} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 mb-4">No hay tarjetas configuradas</p>
          <button onClick={() => router.push('/settings/credit-cards')}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700">
            <CreditCard size={15} /> Agregar tarjeta
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {summaries.map(({ card, periodStart, periodEnd, transactions, total, installmentsTotal }) => {
            const isExpanded = expandedCard === card.id
            const subtotal = total + installmentsTotal
            const days = isCurrentMonth ? daysUntilDue(card) : null
            const isUrgent = days !== null && days <= 5

            return (
              <div key={card.id} className="card !p-0 overflow-hidden">

                {/* Header de tarjeta */}
                <button
                  onClick={() => setExpandedCard(isExpanded ? null : card.id)}
                  className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors text-left"
                >
                  {/* Mini tarjeta visual */}
                  <div className="w-12 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm"
                    style={{ backgroundColor: card.color }}>
                    <CreditCard size={14} className="text-white opacity-80" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-800">{card.name}</p>
                      {isUrgent && (
                        <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full font-medium">
                          <AlertCircle size={10} /> {days}d
                        </span>
                      )}
                      {days !== null && !isUrgent && (
                        <span className="text-xs text-slate-400">vence en {days}d</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">
                      Cierre: {format(new Date(periodStart), 'dd/MM')} → {format(new Date(periodEnd), 'dd/MM')}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="font-bold text-slate-900">{formatARS(subtotal)}</p>
                    {installmentsTotal > 0 && (
                      <p className="text-xs text-slate-400">incl. {formatARS(installmentsTotal)} cuotas</p>
                    )}
                  </div>
                </button>

                {/* Detalle expandido */}
                {isExpanded && (
                  <div className="border-t border-slate-100">
                    {/* Resumen */}
                    {installmentsTotal > 0 && (
                      <div className="flex justify-between px-4 py-2 bg-slate-50 text-xs text-slate-500 border-b border-slate-100">
                        <span>Consumos del período</span>
                        <span className="font-semibold">{formatARS(total)}</span>
                      </div>
                    )}
                    {installmentsTotal > 0 && (
                      <div className="flex justify-between px-4 py-2 bg-slate-50 text-xs text-slate-500 border-b border-slate-100">
                        <span>Cuotas de meses anteriores</span>
                        <span className="font-semibold">{formatARS(installmentsTotal)}</span>
                      </div>
                    )}

                    {/* Transacciones */}
                    {transactions.length === 0 ? (
                      <p className="text-center text-slate-400 text-sm py-6">Sin consumos en este período</p>
                    ) : (
                      <div className="divide-y divide-slate-50">
                        {transactions.map(tx => (
                          <button
                            key={tx.id}
                            onClick={() => router.push(`/transactions/${tx.id}`)}
                            className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 text-left transition-colors"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-700 truncate">
                                {tx.description || (tx.category as any)?.name || 'Sin descripción'}
                              </p>
                              <p className="text-xs text-slate-400">
                                {format(new Date(tx.date), 'dd/MM')}
                                {tx.has_installments && ` · ${tx.current_installment}/${tx.total_installments} cuotas`}
                              </p>
                            </div>
                            <p className="text-sm font-semibold text-slate-800 shrink-0 ml-3">
                              {formatARS(tx.amount_ars)}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Total del resumen */}
                    <div className="flex justify-between px-4 py-3 bg-indigo-50 border-t border-indigo-100">
                      <span className="text-sm font-bold text-indigo-700">Total resumen</span>
                      <span className="text-sm font-bold text-indigo-700">{formatARS(subtotal)}</span>
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
