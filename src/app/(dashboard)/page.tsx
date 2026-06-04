'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  TrendingUp, TrendingDown, Wallet, ArrowUpCircle,
  ArrowDownCircle, ArrowLeftRight, Plus, ChevronRight,
  ChevronLeft,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts'
import { createClient } from '@/lib/supabase/client'
import { formatARS, formatUSD, formatDateShort, cn } from '@/lib/utils'
import { startOfMonth, endOfMonth, subMonths, addMonths, format, isSameMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import { AlertsBanner } from '@/components/shared/AlertsBanner'
import { TransactionDrawer } from '@/components/shared/TransactionDrawer'
import type { Transaction } from '@/types/database'

// ─────────────────────────────────────────
// Tipos internos
// ─────────────────────────────────────────
interface MonthSummary {
  income_ars: number
  expense_ars: number
  income_usd: number
  expense_usd: number
}

interface CategoryBreakdown {
  name: string
  color: string
  total_ars: number
}

interface MonthBar {
  month: string
  ingresos: number
  gastos: number
}

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────
const fmt = (n: number, cur: 'ARS' | 'USD') =>
  cur === 'ARS' ? formatARS(n) : formatUSD(n)

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const [currency, setCurrency] = useState<'ARS' | 'USD'>('ARS')
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [thisMonth, setThisMonth] = useState<MonthSummary>({ income_ars: 0, expense_ars: 0, income_usd: 0, expense_usd: 0 })
  const [prevMonth, setPrevMonth] = useState<MonthSummary>({ income_ars: 0, expense_ars: 0, income_usd: 0, expense_usd: 0 })
  const [recentTx, setRecentTx] = useState<Transaction[]>([])
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdown[]>([])
  const [barData, setBarData] = useState<MonthBar[]>([])
  const [userName, setUserName] = useState('')
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null)

  const isCurrentMonth = isSameMonth(selectedDate, new Date())

  useEffect(() => {
    loadDashboard()
  }, [selectedDate])

  async function loadDashboard() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Nombre del usuario
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()
      setUserName(profile?.full_name?.split(' ')[0] ?? '')

      const monthStart = format(startOfMonth(selectedDate), 'yyyy-MM-dd')
      const monthEnd   = format(endOfMonth(selectedDate),   'yyyy-MM-dd')
      const prevStart  = format(startOfMonth(subMonths(selectedDate, 1)), 'yyyy-MM-dd')
      const prevEnd    = format(endOfMonth(subMonths(selectedDate, 1)),   'yyyy-MM-dd')

      // Función helper para calcular resumen de un período
      async function fetchSummary(from: string, to: string): Promise<MonthSummary> {
        const { data } = await supabase
          .from('transactions')
          .select('type, amount_ars, amount_usd, category:categories(name, color, icon)')
          .gte('date', from)
          .lte('date', to)
          .neq('type', 'transfer')
        const list = (data ?? []) as unknown as Transaction[]
        const s: MonthSummary = { income_ars: 0, expense_ars: 0, income_usd: 0, expense_usd: 0 }
        list.forEach(tx => {
          if (tx.type === 'income') { s.income_ars += tx.amount_ars; s.income_usd += tx.amount_usd }
          else                      { s.expense_ars += tx.amount_ars; s.expense_usd += tx.amount_usd }
        })
        return s
      }

      const [summary, prevSummary] = await Promise.all([
        fetchSummary(monthStart, monthEnd),
        fetchSummary(prevStart, prevEnd),
      ])
      setThisMonth(summary)
      setPrevMonth(prevSummary)

      // Categorías del mes seleccionado
      const { data: txThisMonth } = await supabase
        .from('transactions')
        .select('*, category:categories(name, color, icon)')
        .gte('date', monthStart)
        .lte('date', monthEnd)
        .neq('type', 'transfer')
      const txList = (txThisMonth ?? []) as Transaction[]

      // Breakdown por categoría (gastos del mes)
      const catMap: Record<string, CategoryBreakdown> = {}
      txList.filter(t => t.type === 'expense').forEach(tx => {
        const cat = (tx.category as any)
        const key = cat?.name ?? 'Sin categoría'
        if (!catMap[key]) catMap[key] = { name: key, color: cat?.color ?? '#94a3b8', total_ars: 0 }
        catMap[key].total_ars += tx.amount_ars
      })
      setCategoryBreakdown(
        Object.values(catMap).sort((a, b) => b.total_ars - a.total_ars).slice(0, 6)
      )

      // Últimas 5 transacciones del mes seleccionado
      const { data: recent } = await supabase
        .from('transactions')
        .select('*, category:categories(name, color, icon), account:accounts!account_id(name)')
        .gte('date', monthStart)
        .lte('date', monthEnd)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(5)
      setRecentTx((recent ?? []) as Transaction[])

      // Últimos 6 meses para el bar chart (centrado en el mes seleccionado)
      const months: MonthBar[] = []
      for (let i = 5; i >= 0; i--) {
        const d = subMonths(selectedDate, i)
        const start = format(startOfMonth(d), 'yyyy-MM-dd')
        const end = format(endOfMonth(d), 'yyyy-MM-dd')
        const { data: mTx } = await supabase
          .from('transactions')
          .select('type, amount_ars')
          .gte('date', start)
          .lte('date', end)
          .neq('type', 'transfer')

        const inc = (mTx ?? []).filter(t => t.type === 'income').reduce((s, t) => s + t.amount_ars, 0)
        const exp = (mTx ?? []).filter(t => t.type === 'expense').reduce((s, t) => s + t.amount_ars, 0)
        months.push({
          month: format(d, 'MMM', { locale: es }),
          ingresos: inc,
          gastos: exp,
        })
      }
      setBarData(months)
    } finally {
      setLoading(false)
    }
  }

  const balance_ars = thisMonth.income_ars - thisMonth.expense_ars
  const balance_usd = thisMonth.income_usd - thisMonth.expense_usd
  const prevBalance_ars = prevMonth.income_ars - prevMonth.expense_ars
  const savingsRate = thisMonth.income_ars > 0
    ? Math.round((balance_ars / thisMonth.income_ars) * 100)
    : 0

  // Helper: variación % vs período anterior
  function pctChange(current: number, previous: number): string | null {
    if (previous === 0) return null
    const pct = ((current - previous) / previous) * 100
    return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`
  }

  const selectedMonthLabel = format(selectedDate, 'MMMM yyyy', { locale: es })

  if (loading) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-slate-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {userName ? `Hola, ${userName} 👋` : 'Dashboard'}
          </h1>
          {/* Navegador de mes */}
          <div className="flex items-center gap-2 mt-1.5">
            <button
              onClick={() => setSelectedDate(d => subMonths(d, 1))}
              className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-semibold text-slate-700 capitalize min-w-[130px] text-center">
              {selectedMonthLabel}
            </span>
            <button
              onClick={() => setSelectedDate(d => addMonths(d, 1))}
              disabled={isCurrentMonth}
              className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} />
            </button>
            {!isCurrentMonth && (
              <button
                onClick={() => setSelectedDate(new Date())}
                className="text-xs text-indigo-600 hover:underline font-medium ml-1"
              >
                Hoy
              </button>
            )}
          </div>
        </div>

        <div className="flex rounded-xl border border-slate-200 overflow-hidden">
          {(['ARS', 'USD'] as const).map(c => (
            <button key={c} onClick={() => setCurrency(c)}
              className={cn('px-3 py-1.5 text-sm font-semibold transition-colors',
                currency === c ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'
              )}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Alertas */}
      <AlertsBanner />

      {/* KPIs principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard
          label="Ingresos"
          value={fmt(currency === 'ARS' ? thisMonth.income_ars : thisMonth.income_usd, currency)}
          icon={<TrendingUp size={18} />}
          iconBg="bg-green-100"
          iconColor="text-green-600"
          valueColor="text-green-600"
          change={pctChange(thisMonth.income_ars, prevMonth.income_ars)}
          changePositiveIsGood={true}
        />
        <KPICard
          label="Gastos"
          value={fmt(currency === 'ARS' ? thisMonth.expense_ars : thisMonth.expense_usd, currency)}
          icon={<TrendingDown size={18} />}
          iconBg="bg-red-100"
          iconColor="text-red-500"
          valueColor="text-red-500"
          change={pctChange(thisMonth.expense_ars, prevMonth.expense_ars)}
          changePositiveIsGood={false}
        />
        <KPICard
          label="Balance"
          value={fmt(currency === 'ARS' ? balance_ars : balance_usd, currency)}
          icon={<Wallet size={18} />}
          iconBg={balance_ars >= 0 ? 'bg-indigo-100' : 'bg-red-100'}
          iconColor={balance_ars >= 0 ? 'text-indigo-600' : 'text-red-500'}
          valueColor={balance_ars >= 0 ? 'text-slate-900' : 'text-red-500'}
          change={pctChange(balance_ars, prevBalance_ars)}
          changePositiveIsGood={true}
        />
        <KPICard
          label="Tasa de ahorro"
          value={`${savingsRate}%`}
          icon={<TrendingUp size={18} />}
          iconBg={savingsRate >= 20 ? 'bg-green-100' : 'bg-amber-100'}
          iconColor={savingsRate >= 20 ? 'text-green-600' : 'text-amber-600'}
          valueColor={savingsRate >= 20 ? 'text-green-600' : 'text-amber-600'}
          subtitle={savingsRate >= 20 ? '¡Excelente!' : savingsRate > 0 ? 'Podés mejorar' : 'Gastás más de lo que ganás'}
        />
      </div>

      {/* Bar chart + Pie chart */}
      <div className="grid md:grid-cols-2 gap-4">

        {/* Últimos 6 meses */}
        <div className="card">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Ingresos vs Gastos (6 meses)</h2>
          {barData.every(d => d.ingresos === 0 && d.gastos === 0) ? (
            <div className="h-40 flex items-center justify-center text-slate-300 text-sm">
              Sin datos aún
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={barData} barGap={4}>
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  formatter={(v: number) => formatARS(v)}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                />
                <Bar dataKey="ingresos" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={20} />
                <Bar dataKey="gastos"   fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          )}
          <div className="flex gap-4 mt-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <div className="w-2.5 h-2.5 rounded-sm bg-green-500" /> Ingresos
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <div className="w-2.5 h-2.5 rounded-sm bg-red-400" /> Gastos
            </div>
          </div>
        </div>

        {/* Gastos por categoría */}
        <div className="card">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Gastos por categoría</h2>
          {categoryBreakdown.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-slate-300 text-sm">
              Sin gastos este mes
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie
                    data={categoryBreakdown}
                    dataKey="total_ars"
                    cx="50%"
                    cy="50%"
                    innerRadius={32}
                    outerRadius={55}
                    paddingAngle={2}
                  >
                    {categoryBreakdown.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {categoryBreakdown.map((cat, i) => (
                  <div key={i} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="text-xs text-slate-600 truncate">{cat.name}</span>
                    </div>
                    <span className="text-xs font-semibold text-slate-700 shrink-0">
                      {formatARS(cat.total_ars)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Últimos movimientos */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-700">Últimos movimientos</h2>
          <button
            onClick={() => router.push('/transactions')}
            className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
          >
            Ver todos <ChevronRight size={13} />
          </button>
        </div>

        {recentTx.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-300 mb-3">Sin movimientos todavía</p>
            <button
              onClick={() => router.push('/transactions/new')}
              className="inline-flex items-center gap-2 bg-indigo-600 text-white text-sm px-4 py-2 rounded-xl font-semibold hover:bg-indigo-700"
            >
              <Plus size={14} /> Cargar primero
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {recentTx.map(tx => {
              const isIncome = tx.type === 'income'
              const isExpense = tx.type === 'expense'
              const Icon = isIncome ? ArrowUpCircle : isExpense ? ArrowDownCircle : ArrowLeftRight
              const iconColor = isIncome ? 'text-green-500' : isExpense ? 'text-red-400' : 'text-indigo-400'
              const amountColor = isIncome ? 'text-green-600' : isExpense ? 'text-red-500' : 'text-indigo-600'
              const prefix = isIncome ? '+' : isExpense ? '-' : ''
              const amount = currency === 'ARS' ? tx.amount_ars : tx.amount_usd

              return (
                <button
                  key={tx.id}
                  onClick={() => setSelectedTxId(tx.id)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors text-left"
                >
                  <Icon size={20} className={iconColor} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {tx.description || (tx.category as any)?.name || 'Sin descripción'}
                    </p>
                    <p className="text-xs text-slate-400">
                      {[
                        tx.description ? (tx.category as any)?.name : null,
                        formatDateShort(tx.date),
                      ].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <span className={cn('text-sm font-bold shrink-0', amountColor)}>
                    {prefix}{fmt(amount, currency)}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>


      {/* Drawer de detalle */}
      <TransactionDrawer
        transactionId={selectedTxId}
        onClose={() => setSelectedTxId(null)}
        onDeleted={(id) => {
          setRecentTx(prev => prev.filter(t => t.id !== id))
          setSelectedTxId(null)
        }}
      />

    </div>
  )
}

// ─────────────────────────────────────────
// Componente KPI Card
// ─────────────────────────────────────────
function KPICard({
  label, value, icon, iconBg, iconColor, valueColor, subtitle, change, changePositiveIsGood,
}: {
  label: string
  value: string
  icon: React.ReactNode
  iconBg: string
  iconColor: string
  valueColor: string
  subtitle?: string
  change?: string | null
  changePositiveIsGood?: boolean
}) {
  const isPositive = change?.startsWith('+')
  const changeColor = change == null ? ''
    : changePositiveIsGood
      ? (isPositive ? 'text-green-600' : 'text-red-500')
      : (isPositive ? 'text-red-500'   : 'text-green-600')

  return (
    <div className="card !p-4">
      <div className="flex items-start justify-between mb-3">
        <div className={cn('inline-flex p-2 rounded-xl', iconBg, iconColor)}>
          {icon}
        </div>
        {change && (
          <span className={cn('text-xs font-semibold px-1.5 py-0.5 rounded-md bg-slate-50', changeColor)}>
            {change}
          </span>
        )}
      </div>
      <p className="text-xs text-slate-500 mb-0.5">{label}</p>
      <p className={cn('text-lg font-bold leading-tight', valueColor)}>{value}</p>
      {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      {change && (
        <p className="text-[10px] text-slate-400 mt-1">vs mes anterior</p>
      )}
    </div>
  )
}
