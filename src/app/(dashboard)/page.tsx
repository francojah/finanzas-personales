'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  TrendingUp, TrendingDown, Wallet, ArrowUpCircle,
  ArrowDownCircle, ArrowLeftRight, Plus, ChevronRight,
  ChevronLeft, Building2,
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

interface MonthSummary {
  income_ars: number; expense_ars: number
  income_usd: number; expense_usd: number
}
interface CategoryBreakdown { name: string; color: string; total_ars: number }
interface MonthBar { month: string; ingresos: number; gastos: number }

const fmt = (n: number, cur: 'ARS' | 'USD') => cur === 'ARS' ? formatARS(n) : formatUSD(n)

// ── Dark tooltip ──────────────────────────────────────────────
const darkTooltipStyle = {
  background: '#1e1e1e',
  border: '1px solid #2a2a2a',
  borderRadius: 10,
  fontSize: 12,
  color: '#ededed',
}

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
  // Patrimonio + Inversiones
  const [patrimonioUSD, setPatrimonioUSD] = useState(0)
  const [patrimonioARS, setPatrimonioARS] = useState(0)
  const [inversionesUSD, setInversionesUSD] = useState(0)

  const isCurrentMonth = isSameMonth(selectedDate, new Date())

  useEffect(() => { loadDashboard() }, [selectedDate])

  async function loadDashboard() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles').select('full_name').eq('id', user.id).single()
      setUserName(profile?.full_name?.split(' ')[0] ?? '')

      const monthStart = format(startOfMonth(selectedDate), 'yyyy-MM-dd')
      const monthEnd   = format(endOfMonth(selectedDate),   'yyyy-MM-dd')
      const prevStart  = format(startOfMonth(subMonths(selectedDate, 1)), 'yyyy-MM-dd')
      const prevEnd    = format(endOfMonth(subMonths(selectedDate, 1)),   'yyyy-MM-dd')

      async function fetchSummary(from: string, to: string): Promise<MonthSummary> {
        const { data } = await supabase
          .from('transactions').select('type, amount_ars, amount_usd, category:categories(name,color,icon)')
          .gte('date', from).lte('date', to).neq('type', 'transfer')
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

      const { data: txThisMonth } = await supabase
        .from('transactions').select('*, category:categories(name,color,icon)')
        .gte('date', monthStart).lte('date', monthEnd).neq('type', 'transfer')
      const txList = (txThisMonth ?? []) as Transaction[]

      const catMap: Record<string, CategoryBreakdown> = {}
      txList.filter(t => t.type === 'expense').forEach(tx => {
        const cat = (tx.category as any)
        const key = cat?.name ?? 'Sin categoría'
        if (!catMap[key]) catMap[key] = { name: key, color: cat?.color ?? '#555', total_ars: 0 }
        catMap[key].total_ars += tx.amount_ars
      })
      setCategoryBreakdown(Object.values(catMap).sort((a, b) => b.total_ars - a.total_ars).slice(0, 6))

      const { data: recent } = await supabase
        .from('transactions').select('*, category:categories(name,color,icon), account:accounts!account_id(name)')
        .gte('date', monthStart).lte('date', monthEnd)
        .order('date', { ascending: false }).order('created_at', { ascending: false }).limit(5)
      setRecentTx((recent ?? []) as Transaction[])

      const months: MonthBar[] = []
      for (let i = 5; i >= 0; i--) {
        const d = subMonths(selectedDate, i)
        const { data: mTx } = await supabase
          .from('transactions').select('type, amount_ars')
          .gte('date', format(startOfMonth(d), 'yyyy-MM-dd'))
          .lte('date', format(endOfMonth(d),   'yyyy-MM-dd'))
          .neq('type', 'transfer')
        const inc = (mTx ?? []).filter(t => t.type === 'income').reduce((s, t) => s + t.amount_ars, 0)
        const exp = (mTx ?? []).filter(t => t.type === 'expense').reduce((s, t) => s + t.amount_ars, 0)
        months.push({ month: format(d, 'MMM', { locale: es }), ingresos: inc, gastos: exp })
      }
      setBarData(months)

      // Patrimonio
      const { data: assets } = await supabase
        .from('assets').select('value, currency').eq('is_active', true)
      if (assets) {
        setPatrimonioUSD((assets as any[]).filter(a => a.currency === 'USD').reduce((s: number, a: any) => s + a.value, 0))
        setPatrimonioARS((assets as any[]).filter(a => a.currency === 'ARS').reduce((s: number, a: any) => s + a.value, 0))
      }

      // Inversiones (posiciones activas)
      const { data: positions } = await supabase
        .from('investment_positions')
        .select('quantity, current_price_usd, avg_purchase_price, purchase_currency')
        .eq('is_active', true)
      if (positions) {
        const totalUSD = (positions as any[]).reduce((s: number, p: any) => {
          const price = p.current_price_usd ?? p.avg_purchase_price
          return s + (p.quantity * price)
        }, 0)
        setInversionesUSD(totalUSD)
      }
    } finally {
      setLoading(false)
    }
  }

  const balance_ars = thisMonth.income_ars - thisMonth.expense_ars
  const balance_usd = thisMonth.income_usd - thisMonth.expense_usd
  const prevBalance_ars = prevMonth.income_ars - prevMonth.expense_ars
  const savingsRate = thisMonth.income_ars > 0
    ? Math.round((balance_ars / thisMonth.income_ars) * 100) : 0

  function pctChange(current: number, previous: number): string | null {
    if (previous === 0) return null
    const pct = ((current - previous) / previous) * 100
    return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`
  }

  const selectedMonthLabel = format(selectedDate, 'MMMM yyyy', { locale: es })

  if (loading) return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-32 rounded-2xl animate-pulse" style={{ background: '#1a1a1a' }} />
      ))}
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#ededed' }}>
            {userName ? `Hola, ${userName} 👋` : 'Dashboard'}
          </h1>
          <div className="flex items-center gap-2 mt-1.5">
            <button
              onClick={() => setSelectedDate(d => subMonths(d, 1))}
              className="p-1 rounded-lg transition-colors hover:bg-white/5"
              style={{ color: '#555' }}
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-semibold capitalize min-w-[130px] text-center" style={{ color: '#999' }}>
              {selectedMonthLabel}
            </span>
            <button
              onClick={() => setSelectedDate(d => addMonths(d, 1))}
              disabled={isCurrentMonth}
              className="p-1 rounded-lg transition-colors hover:bg-white/5 disabled:opacity-30"
              style={{ color: '#555' }}
            >
              <ChevronRight size={16} />
            </button>
            {!isCurrentMonth && (
              <button onClick={() => setSelectedDate(new Date())} className="text-xs font-medium ml-1" style={{ color: '#7c6ff7' }}>
                Hoy
              </button>
            )}
          </div>
        </div>

        <div className="flex rounded-xl overflow-hidden" style={{ border: '1.5px solid #2a2a2a' }}>
          {(['ARS', 'USD'] as const).map(c => (
            <button key={c} onClick={() => setCurrency(c)}
              className="px-3 py-1.5 text-sm font-semibold transition-colors"
              style={currency === c ? { background: '#7c6ff7', color: '#fff' } : { background: '#1a1a1a', color: '#666' }}
            >
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
          iconBg="rgba(74,222,128,0.1)" iconColor="#4ade80"
          valueColor="#4ade80"
          change={pctChange(thisMonth.income_ars, prevMonth.income_ars)}
          changePositiveIsGood={true}
        />
        <KPICard
          label="Gastos"
          value={fmt(currency === 'ARS' ? thisMonth.expense_ars : thisMonth.expense_usd, currency)}
          iconBg="rgba(248,113,113,0.1)" iconColor="#f87171"
          valueColor="#f87171"
          change={pctChange(thisMonth.expense_ars, prevMonth.expense_ars)}
          changePositiveIsGood={false}
        />
        <KPICard
          label="Balance"
          value={fmt(currency === 'ARS' ? balance_ars : balance_usd, currency)}
          iconBg={balance_ars >= 0 ? 'rgba(124,111,247,0.1)' : 'rgba(248,113,113,0.1)'}
          iconColor={balance_ars >= 0 ? '#a89efa' : '#f87171'}
          valueColor={balance_ars >= 0 ? '#ededed' : '#f87171'}
          change={pctChange(balance_ars, prevBalance_ars)}
          changePositiveIsGood={true}
        />
        <KPICard
          label="Tasa de ahorro"
          value={`${savingsRate}%`}
          iconBg={savingsRate >= 20 ? 'rgba(74,222,128,0.1)' : 'rgba(251,191,36,0.1)'}
          iconColor={savingsRate >= 20 ? '#4ade80' : '#fbbf24'}
          valueColor={savingsRate >= 20 ? '#4ade80' : '#fbbf24'}
          subtitle={savingsRate >= 20 ? '¡Excelente!' : savingsRate > 0 ? 'Podés mejorar' : 'Más gastos que ingresos'}
        />
      </div>

      {/* Patrimonio + Inversiones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Patrimonio */}
        <button
          onClick={() => router.push('/patrimonio')}
          className="flex items-center gap-4 rounded-xl px-4 py-4 text-left transition-all hover:border-[#333] group"
          style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(96,165,250,0.1)' }}>
            <Building2 size={19} style={{ color: '#60a5fa' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium mb-1" style={{ color: '#666' }}>Patrimonio</p>
            {patrimonioUSD > 0 && (
              <p className="text-base font-bold" style={{ color: '#ededed' }}>{formatUSD(patrimonioUSD)}</p>
            )}
            {patrimonioARS > 0 && (
              <p className="text-sm font-semibold" style={{ color: '#999' }}>{formatARS(patrimonioARS)}</p>
            )}
            {patrimonioUSD === 0 && patrimonioARS === 0 && (
              <p className="text-sm" style={{ color: '#444' }}>Sin activos registrados</p>
            )}
          </div>
          <ChevronRight size={14} style={{ color: '#333' }} />
        </button>

        {/* Inversiones */}
        <button
          onClick={() => router.push('/investments')}
          className="flex items-center gap-4 rounded-xl px-4 py-4 text-left transition-all hover:border-[#333] group"
          style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(124,111,247,0.1)' }}>
            <TrendingUp size={19} style={{ color: '#a89efa' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium mb-1" style={{ color: '#666' }}>Inversiones</p>
            {inversionesUSD > 0 ? (
              <p className="text-base font-bold" style={{ color: '#ededed' }}>{formatUSD(inversionesUSD)}</p>
            ) : (
              <p className="text-sm" style={{ color: '#444' }}>Sin posiciones activas</p>
            )}
          </div>
          <ChevronRight size={14} style={{ color: '#333' }} />
        </button>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl p-5" style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: '#999' }}>Ingresos vs Gastos (6 meses)</h2>
          {barData.every(d => d.ingresos === 0 && d.gastos === 0) ? (
            <div className="h-40 flex items-center justify-center text-sm" style={{ color: '#444' }}>Sin datos aún</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={barData} barGap={4}>
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#555' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip formatter={(v: number) => formatARS(v)} contentStyle={darkTooltipStyle} />
                <Bar dataKey="ingresos" fill="#4ade80" radius={[4,4,0,0]} maxBarSize={20} />
                <Bar dataKey="gastos"   fill="#f87171" radius={[4,4,0,0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          )}
          <div className="flex gap-4 mt-2">
            <div className="flex items-center gap-1.5 text-xs" style={{ color: '#555' }}>
              <div className="w-2.5 h-2.5 rounded-sm bg-green-400" /> Ingresos
            </div>
            <div className="flex items-center gap-1.5 text-xs" style={{ color: '#555' }}>
              <div className="w-2.5 h-2.5 rounded-sm bg-red-400" /> Gastos
            </div>
          </div>
        </div>

        <div className="rounded-xl p-5" style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: '#999' }}>Gastos por categoría</h2>
          {categoryBreakdown.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-sm" style={{ color: '#444' }}>Sin gastos este mes</div>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie data={categoryBreakdown} dataKey="total_ars" cx="50%" cy="50%" innerRadius={32} outerRadius={55} paddingAngle={2}>
                    {categoryBreakdown.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {categoryBreakdown.map((cat, i) => (
                  <div key={i} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="text-xs truncate" style={{ color: '#888' }}>{cat.name}</span>
                    </div>
                    <span className="text-xs font-semibold shrink-0" style={{ color: '#ededed' }}>
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
      <div className="rounded-xl p-5" style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold" style={{ color: '#999' }}>Últimos movimientos</h2>
          <button onClick={() => router.push('/transactions')} className="flex items-center gap-1 text-xs font-medium" style={{ color: '#7c6ff7' }}>
            Ver todos <ChevronRight size={13} />
          </button>
        </div>

        {recentTx.length === 0 ? (
          <div className="text-center py-8">
            <p className="mb-3 text-sm" style={{ color: '#444' }}>Sin movimientos todavía</p>
            <button
              onClick={() => router.push('/transactions/new')}
              className="inline-flex items-center gap-2 text-white text-sm px-4 py-2 rounded-xl font-semibold"
              style={{ background: '#7c6ff7' }}
            >
              <Plus size={14} /> Cargar primero
            </button>
          </div>
        ) : (
          <div className="space-y-1">
            {recentTx.map(tx => {
              const isIncome  = tx.type === 'income'
              const isExpense = tx.type === 'expense'
              const Icon = isIncome ? ArrowUpCircle : isExpense ? ArrowDownCircle : ArrowLeftRight
              const iconColor  = isIncome ? '#4ade80' : isExpense ? '#f87171' : '#a89efa'
              const amountColor = isIncome ? '#4ade80' : isExpense ? '#f87171' : '#a89efa'
              const prefix = isIncome ? '+' : isExpense ? '-' : ''
              const amount = currency === 'ARS' ? tx.amount_ars : tx.amount_usd

              return (
                <button
                  key={tx.id}
                  onClick={() => setSelectedTxId(tx.id)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors text-left hover:bg-white/3"
                >
                  <Icon size={20} style={{ color: iconColor }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: '#ededed' }}>
                      {tx.description || (tx.category as any)?.name || 'Sin descripción'}
                    </p>
                    <p className="text-xs" style={{ color: '#555' }}>
                      {[tx.description ? (tx.category as any)?.name : null, formatDateShort(tx.date)].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <span className="text-sm font-bold shrink-0" style={{ color: amountColor }}>
                    {prefix}{fmt(amount, currency)}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

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

// ── KPI Card ──────────────────────────────────────────────────
function KPICard({
  label, value, iconBg, iconColor, valueColor, subtitle, change, changePositiveIsGood,
}: {
  label: string; value: string
  iconBg: string; iconColor: string; valueColor: string
  subtitle?: string; change?: string | null; changePositiveIsGood?: boolean
}) {
  const isPositive = change?.startsWith('+')
  const changeColor = change == null ? ''
    : changePositiveIsGood
      ? (isPositive ? '#4ade80' : '#f87171')
      : (isPositive ? '#f87171' : '#4ade80')

  return (
    <div className="rounded-xl p-4" style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}>
      <div className="flex items-start justify-between mb-3">
        <div className="inline-flex p-2 rounded-xl" style={{ background: iconBg }}>
          <TrendingUp size={16} style={{ color: iconColor }} />
        </div>
        {change && (
          <span className="text-xs font-semibold px-1.5 py-0.5 rounded-md" style={{ color: changeColor, background: `${changeColor}18` }}>
            {change}
          </span>
        )}
      </div>
      <p className="text-xs mb-0.5" style={{ color: '#666' }}>{label}</p>
      <p className="text-lg font-bold leading-tight" style={{ color: valueColor }}>{value}</p>
      {subtitle && <p className="text-xs mt-0.5" style={{ color: '#555' }}>{subtitle}</p>}
      {change && <p className="text-[10px] mt-1" style={{ color: '#444' }}>vs mes anterior</p>}
    </div>
  )
}
