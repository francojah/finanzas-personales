'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Target, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatARS } from '@/lib/utils'
import { format, startOfMonth, endOfMonth } from 'date-fns'

interface BudgetRow {
  id: string
  name: string
  color: string
  monthly_budget: number
  spent: number
}

export function BudgetOverview({ selectedDate }: { selectedDate: Date }) {
  const router = useRouter()
  const supabase = createClient()
  const [rows, setRows] = useState<BudgetRow[]>([])

  useEffect(() => {
    async function load() {
      const from = format(startOfMonth(selectedDate), 'yyyy-MM-dd')
      const to   = format(endOfMonth(selectedDate),   'yyyy-MM-dd')

      const { data: cats } = await supabase
        .from('categories')
        .select('id, name, color, monthly_budget')
        .eq('type', 'expense')
        .not('monthly_budget', 'is', null)
        .gt('monthly_budget', 0)

      if (!cats || cats.length === 0) { setRows([]); return }

      const { data: txs } = await supabase
        .from('transactions')
        .select('category_id, amount_ars')
        .eq('type', 'expense')
        .gte('date', from)
        .lte('date', to)
        .in('category_id', cats.map(c => c.id))

      const spentMap: Record<string, number> = {}
      ;(txs ?? []).forEach((t: any) => {
        spentMap[t.category_id] = (spentMap[t.category_id] ?? 0) + t.amount_ars
      })

      setRows(
        cats.map((c: any) => ({
          id: c.id, name: c.name, color: c.color,
          monthly_budget: c.monthly_budget,
          spent: spentMap[c.id] ?? 0,
        })).sort((a, b) => (b.spent / b.monthly_budget) - (a.spent / a.monthly_budget))
      )
    }
    load()
  }, [selectedDate])

  if (rows.length === 0) return null

  return (
    <div className="rounded-xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target size={15} style={{ color: 'var(--accent-icon)' }} />
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
            Presupuesto del mes
          </h2>
        </div>
        <button
          onClick={() => router.push('/settings/categories')}
          className="flex items-center gap-1 text-xs font-medium"
          style={{ color: 'var(--accent)' }}
        >
          Editar <ChevronRight size={12} />
        </button>
      </div>

      <div className="space-y-3">
        {rows.map(row => {
          const pct     = Math.min((row.spent / row.monthly_budget) * 100, 100)
          const over    = row.spent > row.monthly_budget
          const barColor = over ? 'var(--expense)' : pct > 80 ? '#fbbf24' : row.color
          const remaining = row.monthly_budget - row.spent

          return (
            <div key={row.id}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: row.color }} />
                  <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{row.name}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span style={{ color: over ? 'var(--expense)' : 'var(--text-muted)' }}>
                    {formatARS(row.spent)}
                  </span>
                  <span style={{ color: 'var(--text-faint)' }}>/</span>
                  <span style={{ color: 'var(--text-muted)' }}>{formatARS(row.monthly_budget)}</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-elevated)' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: barColor }}
                />
              </div>

              {over && (
                <p className="text-[10px] mt-0.5 font-medium" style={{ color: 'var(--expense)' }}>
                  Excedido por {formatARS(row.spent - row.monthly_budget)}
                </p>
              )}
              {!over && pct > 80 && (
                <p className="text-[10px] mt-0.5" style={{ color: '#fbbf24' }}>
                  Quedan {formatARS(remaining)} ({(100 - pct).toFixed(0)}%)
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
