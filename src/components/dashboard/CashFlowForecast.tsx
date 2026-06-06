'use client'

import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { createClient } from '@/lib/supabase/client'
import { formatARS } from '@/lib/utils'
import { TrendingUp } from 'lucide-react'
import { addMonths, format, startOfMonth, endOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'

interface ForecastMonth {
  month: string
  ingresos: number
  gastos: number
  balance: number
  isPast: boolean
}

const tooltipStyle = {
  background: 'var(--surface-elevated)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  fontSize: 12,
  color: 'var(--text-primary)',
}

export function CashFlowForecast() {
  const [data, setData] = useState<ForecastMonth[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const supabase = createClient()

    // 1. Obtener recurrentes activos
    const { data: recurring } = await supabase
      .from('transactions')
      .select('type, amount_ars, frequency, next_date')
      .eq('is_recurring', true)
      .eq('is_active', true)

    // 2. Mes actual real (para comparar)
    const now = new Date()
    const months: ForecastMonth[] = []

    for (let i = -1; i <= 3; i++) {
      const monthDate = addMonths(now, i)
      const start = startOfMonth(monthDate).toISOString().split('T')[0]
      const end   = endOfMonth(monthDate).toISOString().split('T')[0]
      const label = format(monthDate, 'MMM', { locale: es })
      const isPast = i < 0

      if (isPast || i === 0) {
        // Datos reales para meses pasados y el actual
        const { data: txs } = await supabase
          .from('transactions')
          .select('type, amount_ars')
          .gte('date', start)
          .lte('date', end)
          .neq('type', 'transfer')

        const ingresos = (txs ?? []).filter(t => t.type === 'income').reduce((s, t) => s + t.amount_ars, 0)
        const gastos   = (txs ?? []).filter(t => t.type === 'expense').reduce((s, t) => s + t.amount_ars, 0)
        months.push({ month: label, ingresos, gastos, balance: ingresos - gastos, isPast })
      } else {
        // Proyección basada en recurrentes
        const ingresos = (recurring ?? [])
          .filter(r => r.type === 'income')
          .reduce((s, r) => s + (r.amount_ars ?? 0), 0)
        const gastos = (recurring ?? [])
          .filter(r => r.type === 'expense')
          .reduce((s, r) => s + (r.amount_ars ?? 0), 0)

        // Si no hay recurrentes, usamos promedio de meses anteriores
        const prevMonths = months.filter(m => !m.isPast || months.indexOf(m) > 0)
        const avgIngresos = prevMonths.length > 0
          ? prevMonths.reduce((s, m) => s + m.ingresos, 0) / prevMonths.length
          : 0
        const avgGastos = prevMonths.length > 0
          ? prevMonths.reduce((s, m) => s + m.gastos, 0) / prevMonths.length
          : 0

        const projIngresos = ingresos > 0 ? ingresos : avgIngresos
        const projGastos   = gastos > 0 ? gastos : avgGastos

        months.push({
          month: label + ' *',
          ingresos: projIngresos,
          gastos: projGastos,
          balance: projIngresos - projGastos,
          isPast: false,
        })
      }
    }

    setData(months)
    setLoading(false)
  }

  if (loading) return (
    <div className="rounded-2xl p-5 h-48 animate-pulse" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }} />
  )

  const nextMonthBalance = data.find(d => d.month.includes('*'))?.balance ?? 0

  return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Proyección de flujo</h2>
          <p className="text-[11px]" style={{ color: 'var(--text-faint)' }}>* estimado por recurrentes</p>
        </div>
        {nextMonthBalance !== 0 && (
          <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: nextMonthBalance >= 0 ? 'var(--income)' : 'var(--expense)' }}>
            <TrendingUp size={13} />
            Próximo mes: {formatARS(nextMonthBalance)}
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} barGap={4}>
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-faint)' }} axisLine={false} tickLine={false} />
          <YAxis hide />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value: number, name: string) => [
              formatARS(value),
              name === 'ingresos' ? 'Ingresos' : 'Gastos'
            ]}
          />
          <Bar dataKey="ingresos" radius={[4,4,0,0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.isPast ? 'var(--income)' : 'rgba(16,185,129,0.35)'} />
            ))}
          </Bar>
          <Bar dataKey="gastos" radius={[4,4,0,0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.isPast ? 'var(--expense)' : 'rgba(239,68,68,0.35)'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
