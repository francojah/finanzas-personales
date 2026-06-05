'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Target, Settings, AlertCircle, CheckCircle2, TrendingDown, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatARS } from '@/lib/utils'
import { MonthPicker } from '@/components/shared/MonthPicker'
import { format, startOfMonth, endOfMonth } from 'date-fns'

interface BudgetRow {
  id: string
  name: string
  color: string
  monthly_budget: number
  spent: number
  icon: string
}

export default function BudgetPage() {
  const router = useRouter()
  const supabase = createClient()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [rows, setRows] = useState<BudgetRow[]>([])
  const [loading, setLoading] = useState(true)
  const [totalBudget, setTotalBudget] = useState(0)
  const [totalSpent, setTotalSpent] = useState(0)

  useEffect(() => { load() }, [selectedDate])

  async function load() {
    setLoading(true)
    const from = format(startOfMonth(selectedDate), 'yyyy-MM-dd')
    const to   = format(endOfMonth(selectedDate),   'yyyy-MM-dd')

    const { data: cats } = await supabase
      .from('categories')
      .select('id, name, color, icon, monthly_budget')
      .eq('type', 'expense')
      .not('monthly_budget', 'is', null)
      .gt('monthly_budget', 0)
      .order('name')

    if (!cats || cats.length === 0) { setRows([]); setLoading(false); return }

    const { data: txs } = await supabase
      .from('transactions')
      .select('category_id, amount_ars')
      .eq('type', 'expense')
      .gte('date', from)
      .lte('date', to)

    const spentMap: Record<string, number> = {}
    ;(txs ?? []).forEach((t: any) => {
      spentMap[t.category_id] = (spentMap[t.category_id] ?? 0) + t.amount_ars
    })

    const data: BudgetRow[] = cats.map((c: any) => ({
      id: c.id, name: c.name, color: c.color, icon: c.icon,
      monthly_budget: c.monthly_budget,
      spent: spentMap[c.id] ?? 0,
    })).sort((a, b) => (b.spent / b.monthly_budget) - (a.spent / a.monthly_budget))

    setRows(data)
    setTotalBudget(data.reduce((s, r) => s + r.monthly_budget, 0))
    setTotalSpent(data.reduce((s, r) => s + r.spent, 0))
    setLoading(false)
  }

  const overCount  = rows.filter(r => r.spent > r.monthly_budget).length
  const warnCount  = rows.filter(r => r.spent / r.monthly_budget > 0.8 && r.spent <= r.monthly_budget).length
  const totalPct   = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0
  const totalOver  = totalSpent > totalBudget

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Presupuesto</h1>
          <div className="mt-2">
            <MonthPicker value={selectedDate} onChange={setSelectedDate} />
          </div>
        </div>
        <button
          onClick={() => router.push('/settings/categories')}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
        >
          <Settings size={14} /> Editar límites
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="animate-spin" style={{ color: 'var(--text-muted)' }} />
        </div>
      ) : rows.length === 0 ? (
        /* Empty state */
        <div className="rounded-2xl p-10 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <Target size={36} className="mx-auto mb-3" style={{ color: 'var(--text-faint)' }} />
          <p className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Sin presupuestos configurados</p>
          <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
            Configurá un límite mensual en cada categoría de gasto para hacer seguimiento acá.
          </p>
          <button
            onClick={() => router.push('/settings/categories')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'var(--accent)' }}
          >
            <Settings size={14} /> Configurar presupuestos
          </button>
        </div>
      ) : (
        <>
          {/* Resumen total */}
          <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>TOTAL DEL MES</p>
              <div className="flex items-center gap-3">
                {overCount > 0 && (
                  <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--expense)' }}>
                    <AlertCircle size={13} /> {overCount} excedido{overCount > 1 ? 's' : ''}
                  </span>
                )}
                {warnCount > 0 && overCount === 0 && (
                  <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: '#fbbf24' }}>
                    <AlertCircle size={13} /> {warnCount} cerca del límite
                  </span>
                )}
                {overCount === 0 && warnCount === 0 && (
                  <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--income)' }}>
                    <CheckCircle2 size={13} /> Todo en orden
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-end justify-between mb-2">
              <div>
                <p className="text-3xl font-bold" style={{ color: totalOver ? 'var(--expense)' : 'var(--text-primary)' }}>
                  {formatARS(totalSpent)}
                </p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  de {formatARS(totalBudget)} presupuestados
                </p>
              </div>
              <p className="text-2xl font-bold" style={{ color: totalOver ? 'var(--expense)' : totalPct > 80 ? '#fbbf24' : 'var(--income)' }}>
                {totalPct.toFixed(0)}%
              </p>
            </div>

            <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-elevated)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${totalPct}%`,
                  background: totalOver ? 'var(--expense)' : totalPct > 80 ? '#fbbf24' : 'var(--income)',
                }}
              />
            </div>

            {totalOver && (
              <p className="text-xs mt-2 font-medium" style={{ color: 'var(--expense)' }}>
                <TrendingDown size={12} className="inline mr-1" />
                Excedido por {formatARS(totalSpent - totalBudget)} este mes
              </p>
            )}
          </div>

          {/* Lista por categoría */}
          <div className="space-y-3">
            {rows.map(row => {
              const pct      = Math.min((row.spent / row.monthly_budget) * 100, 100)
              const over     = row.spent > row.monthly_budget
              const warn     = !over && pct > 80
              const barColor = over ? 'var(--expense)' : warn ? '#fbbf24' : row.color
              const remaining = row.monthly_budget - row.spent

              return (
                <div
                  key={row.id}
                  className="rounded-xl p-4"
                  style={{
                    background: 'var(--surface)',
                    border: `1px solid ${over ? 'rgba(239,68,68,0.25)' : 'var(--border)'}`,
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ background: row.color }} />
                      <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{row.name}</span>
                      {over && <AlertCircle size={13} style={{ color: 'var(--expense)' }} />}
                      {warn && <AlertCircle size={13} style={{ color: '#fbbf24' }} />}
                    </div>
                    <span className="text-xs font-bold" style={{ color: pct.toFixed(0) + '%' ? (over ? 'var(--expense)' : 'var(--text-muted)') : 'var(--text-muted)' }}>
                      {pct.toFixed(0)}%
                    </span>
                  </div>

                  <div className="h-2 rounded-full overflow-hidden mb-2" style={{ background: 'var(--surface-elevated)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: barColor }}
                    />
                  </div>

                  <div className="flex justify-between text-xs">
                    <span style={{ color: over ? 'var(--expense)' : 'var(--text-secondary)' }}>
                      {formatARS(row.spent)} gastados
                    </span>
                    <span style={{ color: 'var(--text-faint)' }}>
                      {over
                        ? `+${formatARS(row.spent - row.monthly_budget)} excedido`
                        : `${formatARS(remaining)} disponibles`
                      }
                    </span>
                    <span style={{ color: 'var(--text-muted)' }}>
                      límite {formatARS(row.monthly_budget)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
