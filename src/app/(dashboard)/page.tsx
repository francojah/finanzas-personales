'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  TrendingUp, TrendingDown, Wallet,
  ArrowUpCircle, ArrowDownCircle, ArrowLeftRight,
  Plus, ChevronRight, Building2, Info,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie,
} from 'recharts'
import { createClient } from '@/lib/supabase/client'
import { formatARS, formatUSD, formatDateShort, cn } from '@/lib/utils'
import { startOfMonth, endOfMonth, subMonths, format, isSameMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import { AlertsBanner } from '@/components/shared/AlertsBanner'
import { TransactionDrawer } from '@/components/shared/TransactionDrawer'
import { OnboardingTip } from '@/components/shared/OnboardingTip'
import { MonthPicker } from '@/components/shared/MonthPicker'
import { useExchangeRate } from '@/hooks/useExchangeRate'
import { BudgetOverview } from '@/components/dashboard/BudgetOverview'
import { RecurringBanner } from '@/components/dashboard/RecurringBanner'
import type { Transaction } from '@/types/database'

interface MonthSummary { income_ars: number; expense_ars: number; income_usd: number; expense_usd: number }
interface CategoryBreakdown { name: string; color: string; total_ars: number }
interface MonthBar { month: string; ingresos: number; gastos: number }

const fmt = (n: number, cur: 'ARS' | 'USD') => cur === 'ARS' ? formatARS(n) : formatUSD(n)

const tooltipStyle = {
  background: 'var(--surface-elevated)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  fontSize: 12,
  color: 'var(--text-primary)',
}

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const { mep } = useExchangeRate()
  const [currency, setCurrency] = useState<'ARS' | 'USD'>('ARS')
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [thisMonth, setThisMonth]   = useState<MonthSummary>({ income_ars: 0, expense_ars: 0, income_usd: 0, expense_usd: 0 })
  const [prevMonth, setPrevMonth]   = useState<MonthSummary>({ income_ars: 0, expense_ars: 0, income_usd: 0, expense_usd: 0 })
  const [recentTx, setRecentTx]     = useState<Transaction[]>([])
  const [catBreakdown, setCatBreakdown] = useState<CategoryBreakdown[]>([])
  const [barData, setBarData]       = useState<MonthBar[]>([])
  const [userName, setUserName]     = useState('')
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null)
  // Patrimonio: totales crudos (se convierten con MEP en render)
  const [rawAssetsUSD, setRawAssetsUSD] = useState(0)
  const [rawAssetsARS, setRawAssetsARS] = useState(0)
  const [inversionesUSD, setInversionesUSD] = useState(0)

  useEffect(() => { loadDashboard() }, [selectedDate])

  async function loadDashboard() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
      setUserName(profile?.full_name?.split(' ')[0] ?? '')

      const monthStart = format(startOfMonth(selectedDate), 'yyyy-MM-dd')
      const monthEnd   = format(endOfMonth(selectedDate),   'yyyy-MM-dd')
      const prevStart  = format(startOfMonth(subMonths(selectedDate, 1)), 'yyyy-MM-dd')
      const prevEnd    = format(endOfMonth(subMonths(selectedDate, 1)),   'yyyy-MM-dd')

      async function fetchSummary(from: string, to: string): Promise<MonthSummary> {
        const { data } = await supabase
          .from('transactions').select('type, amount_ars, amount_usd')
          .gte('date', from).lte('date', to).neq('type', 'transfer')
        const s: MonthSummary = { income_ars: 0, expense_ars: 0, income_usd: 0, expense_usd: 0 }
        ;(data ?? []).forEach((tx: any) => {
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

      // Categorías
      const { data: txMonth } = await supabase
        .from('transactions').select('*, category:categories(name,color,icon)')
        .gte('date', monthStart).lte('date', monthEnd).neq('type', 'transfer')
      const catMap: Record<string, CategoryBreakdown> = {}
      ;((txMonth ?? []) as Transaction[]).filter(t => t.type === 'expense').forEach(tx => {
        const cat = (tx.category as any)
        const key = cat?.name ?? 'Sin categoría'
        if (!catMap[key]) catMap[key] = { name: key, color: cat?.color ?? 'var(--border)', total_ars: 0 }
        catMap[key].total_ars += tx.amount_ars
      })
      setCatBreakdown(Object.values(catMap).sort((a, b) => b.total_ars - a.total_ars).slice(0, 6))

      // Últimas transacciones
      const { data: recent } = await supabase
        .from('transactions').select('*, category:categories(name,color,icon), account:accounts!account_id(name)')
        .gte('date', monthStart).lte('date', monthEnd)
        .order('date', { ascending: false }).order('created_at', { ascending: false }).limit(5)
      setRecentTx((recent ?? []) as Transaction[])

      // Bar chart 6 meses
      const months: MonthBar[] = []
      for (let i = 5; i >= 0; i--) {
        const d = subMonths(selectedDate, i)
        const { data: mTx } = await supabase
          .from('transactions').select('type, amount_ars')
          .gte('date', format(startOfMonth(d), 'yyyy-MM-dd'))
          .lte('date', format(endOfMonth(d),   'yyyy-MM-dd'))
          .neq('type', 'transfer')
        const inc = (mTx ?? []).filter((t: any) => t.type === 'income').reduce((s: number, t: any) => s + t.amount_ars, 0)
        const exp = (mTx ?? []).filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + t.amount_ars, 0)
        months.push({ month: format(d, 'MMM', { locale: es }), ingresos: inc, gastos: exp })
      }
      setBarData(months)

      // Patrimonio
      const { data: assets } = await supabase.from('assets').select('value, currency').eq('is_active', true)
      if (assets) {
        setRawAssetsUSD((assets as any[]).filter(a => a.currency === 'USD').reduce((s: number, a: any) => s + a.value, 0))
        setRawAssetsARS((assets as any[]).filter(a => a.currency === 'ARS').reduce((s: number, a: any) => s + a.value, 0))
      }

      // Inversiones
      const { data: positions } = await supabase
        .from('investment_positions').select('quantity, current_price_usd, avg_purchase_price').eq('is_active', true)
      if (positions) {
        setInversionesUSD((positions as any[]).reduce((s: number, p: any) => s + p.quantity * (p.current_price_usd ?? p.avg_purchase_price), 0))
      }
    } finally {
      setLoading(false)
    }
  }

  // Patrimonio convertido con MEP
  const patrimonioUSD = rawAssetsUSD + (mep ? rawAssetsARS / mep : 0)
  const patrimonioARS = rawAssetsARS + (mep ? rawAssetsUSD * mep : 0)
  const inversionesARS = mep ? inversionesUSD * mep : 0

  const balance_ars    = thisMonth.income_ars - thisMonth.expense_ars
  const balance_usd    = thisMonth.income_usd - thisMonth.expense_usd
  const prevBalance    = prevMonth.income_ars - prevMonth.expense_ars
  const savingsRate    = thisMonth.income_ars > 0 ? Math.round((balance_ars / thisMonth.income_ars) * 100) : 0

  function pctChange(curr: number, prev: number) {
    if (prev === 0) return null
    const p = ((curr - prev) / prev) * 100
    return `${p >= 0 ? '+' : ''}${p.toFixed(1)}%`
  }

  if (loading) return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-32 rounded-2xl animate-pulse" style={{ background: 'var(--surface)' }} />
      ))}
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {userName ? `Hola, ${userName} 👋` : 'Dashboard'}
          </h1>
          <div className="mt-2">
            <MonthPicker value={selectedDate} onChange={setSelectedDate} />
          </div>
        </div>

        {/* Selector ARS / USD */}
        <div className="flex rounded-xl overflow-hidden" style={{ border: '1.5px solid var(--border)' }}>
          {(['ARS', 'USD'] as const).map(c => (
            <button
              key={c}
              onClick={() => setCurrency(c)}
              className="px-3 py-1.5 text-sm font-semibold transition-colors"
              style={currency === c
                ? { background: 'var(--accent)', color: '#fff' }
                : { background: 'var(--surface)', color: 'var(--text-muted)' }
              }
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <OnboardingTip
        tipId="dashboard"
        title="¡Bienvenido a Finanzapp!"
        description="Empezá cargando tu primera cuenta en Configuración → Cuentas. Después registrá un movimiento y el dashboard se va a poblar solo."
        cta={{ label: 'Configurar mi cuenta', href: '/settings/accounts' }}
      />
      <AlertsBanner />
      <RecurringBanner />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard label="Ingresos"
          value={fmt(currency === 'ARS' ? thisMonth.income_ars : thisMonth.income_usd, currency)}
          iconBg="var(--income-bg)" iconColor="var(--income)" valueColor="var(--income)"
          change={pctChange(thisMonth.income_ars, prevMonth.income_ars)} changePositiveIsGood />
        <KPICard label="Gastos"
          value={fmt(currency === 'ARS' ? thisMonth.expense_ars : thisMonth.expense_usd, currency)}
          iconBg="var(--expense-bg)" iconColor="var(--expense)" valueColor="var(--expense)"
          change={pctChange(thisMonth.expense_ars, prevMonth.expense_ars)} changePositiveIsGood={false} />
        <KPICard label="Balance"
          value={fmt(currency === 'ARS' ? balance_ars : balance_usd, currency)}
          iconBg={balance_ars >= 0 ? 'var(--accent-bg)' : 'var(--expense-bg)'}
          iconColor={balance_ars >= 0 ? 'var(--accent-icon)' : 'var(--expense)'}
          valueColor={balance_ars >= 0 ? 'var(--text-primary)' : 'var(--expense)'}
          change={pctChange(balance_ars, prevBalance)} changePositiveIsGood />
        <KPICard label="Tasa de ahorro"
          value={`${savingsRate}%`}
          iconBg={savingsRate >= 20 ? 'var(--income-bg)' : 'rgba(251,191,36,0.1)'}
          iconColor={savingsRate >= 20 ? 'var(--income)' : '#fbbf24'}
          valueColor={savingsRate >= 20 ? 'var(--income)' : '#fbbf24'}
          subtitle={savingsRate >= 20 ? '¡Excelente!' : savingsRate > 0 ? 'Podés mejorar' : 'Más gastos que ingresos'}
          tooltip="% de tus ingresos que ahorraste este mes. Se calcula como (Ingresos − Gastos) / Ingresos. Un 20% o más se considera saludable." />
      </div>

      {/* Patrimonio + Inversiones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <button
          onClick={() => router.push('/patrimonio')}
          className="flex items-center gap-4 rounded-xl px-4 py-4 text-left transition-all"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(96,165,250,0.1)' }}>
            <Building2 size={19} style={{ color: '#60a5fa' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Patrimonio</p>
            {patrimonioUSD > 0 || patrimonioARS > 0 ? (
              <>
                <p className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{formatUSD(patrimonioUSD)}</p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{formatARS(patrimonioARS)}</p>
              </>
            ) : (
              <p className="text-sm" style={{ color: 'var(--text-faint)' }}>Sin activos registrados</p>
            )}
          </div>
          <ChevronRight size={14} style={{ color: 'var(--text-faint)' }} />
        </button>

        <button
          onClick={() => router.push('/investments')}
          className="flex items-center gap-4 rounded-xl px-4 py-4 text-left transition-all"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--accent-bg)' }}>
            <TrendingUp size={19} style={{ color: 'var(--accent-icon)' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Inversiones</p>
            {inversionesUSD > 0 ? (
              <>
                <p className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{formatUSD(inversionesUSD)}</p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{formatARS(inversionesARS)}</p>
              </>
            ) : (
              <p className="text-sm" style={{ color: 'var(--text-faint)' }}>Sin posiciones activas</p>
            )}
          </div>
          <ChevronRight size={14} style={{ color: 'var(--text-faint)' }} />
        </button>
      </div>

      {/* Patrimonio neto consolidado */}
      {(patrimonioUSD > 0 || inversionesUSD > 0) && (
        <div
          className="rounded-xl px-4 py-3 flex items-center justify-between"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-2">
            <Wallet size={16} style={{ color: 'var(--text-muted)' }} />
            <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Patrimonio neto total</span>
          </div>
          <div className="text-right">
            <p className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
              {formatUSD(patrimonioUSD + inversionesUSD)}
            </p>
            {mep && (
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {formatARS(patrimonioARS + inversionesARS)}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Budget Overview */}
      <BudgetOverview selectedDate={selectedDate} />

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>Ingresos vs Gastos (6 meses)</h2>
          {barData.every(d => d.ingresos === 0 && d.gastos === 0) ? (
            <div className="h-40 flex items-center justify-center text-sm" style={{ color: 'var(--text-faint)' }}>Sin datos aún</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={barData} barGap={4}>
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip formatter={(v: number) => formatARS(v)} contentStyle={tooltipStyle} />
                <Bar dataKey="ingresos" fill="var(--income)" radius={[4,4,0,0]} maxBarSize={20} />
                <Bar dataKey="gastos"   fill="var(--expense)" radius={[4,4,0,0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          )}
          <div className="flex gap-4 mt-2">
            {[['var(--income)', 'Ingresos'], ['var(--expense)', 'Gastos']].map(([color, label]) => (
              <div key={label} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                <div className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} /> {label}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>Gastos por categoría</h2>
          {catBreakdown.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-sm" style={{ color: 'var(--text-faint)' }}>Sin gastos este mes</div>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie data={catBreakdown} dataKey="total_ars" cx="50%" cy="50%" innerRadius={32} outerRadius={55} paddingAngle={2}>
                    {catBreakdown.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {catBreakdown.map((cat, i) => (
                  <div key={i} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: cat.color }} />
                      <span className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{cat.name}</span>
                    </div>
                    <span className="text-xs font-semibold shrink-0" style={{ color: 'var(--text-primary)' }}>
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
      <div className="rounded-xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Últimos movimientos</h2>
          <button onClick={() => router.push('/transactions')} className="flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--accent)' }}>
            Ver todos <ChevronRight size={13} />
          </button>
        </div>

        {recentTx.length === 0 ? (
          <div className="text-center py-8">
            <p className="mb-3 text-sm" style={{ color: 'var(--text-faint)' }}>Sin movimientos todavía</p>
            <button
              onClick={() => router.push('/transactions/new')}
              className="inline-flex items-center gap-2 text-white text-sm px-4 py-2 rounded-xl font-semibold"
              style={{ background: 'var(--accent)' }}
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
              const color = isIncome ? 'var(--income)' : isExpense ? 'var(--expense)' : 'var(--accent-icon)'
              const prefix = isIncome ? '+' : isExpense ? '-' : ''
              const amount = currency === 'ARS' ? tx.amount_ars : tx.amount_usd

              return (
                <button
                  key={tx.id}
                  onClick={() => setSelectedTxId(tx.id)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-colors"
                  style={{ background: 'transparent' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <Icon size={20} style={{ color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {tx.description || (tx.category as any)?.name || 'Sin descripción'}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {[tx.description ? (tx.category as any)?.name : null, formatDateShort(tx.date)].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <span className="text-sm font-bold shrink-0" style={{ color }}>
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
        onDeleted={id => { setRecentTx(prev => prev.filter(t => t.id !== id)); setSelectedTxId(null) }}
      />
    </div>
  )
}

function KPICard({ label, value, iconBg, iconColor, valueColor, subtitle, change, changePositiveIsGood, tooltip }: {
  label: string; value: string
  iconBg: string; iconColor: string; valueColor: string
  subtitle?: string; change?: string | null; changePositiveIsGood?: boolean
  tooltip?: string
}) {
  const [showTooltip, setShowTooltip] = useState(false)
  const isPositive = change?.startsWith('+')
  const changeColor = !change ? '' : changePositiveIsGood
    ? (isPositive ? 'var(--income)' : 'var(--expense)')
    : (isPositive ? 'var(--expense)' : 'var(--income)')

  return (
    <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-start justify-between mb-3">
        <div className="inline-flex p-2 rounded-xl" style={{ background: iconBg }}>
          <TrendingUp size={16} style={{ color: iconColor }} />
        </div>
        {change && (
          <span className="text-xs font-semibold px-1.5 py-0.5 rounded-md" style={{ color: changeColor, background: `color-mix(in srgb, ${changeColor} 15%, transparent)` }}>
            {change}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1 mb-0.5">
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
        {tooltip && (
          <div className="relative">
            <button
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onClick={() => setShowTooltip(v => !v)}
              className="flex items-center"
            >
              <Info size={11} style={{ color: 'var(--text-faint)' }} />
            </button>
            {showTooltip && (
              <div
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 p-2.5 rounded-xl text-xs z-50 shadow-lg"
                style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
              >
                {tooltip}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent"
                  style={{ borderTopColor: 'var(--border)' }} />
              </div>
            )}
          </div>
        )}
      </div>
      <p className="text-lg font-bold leading-tight" style={{ color: valueColor }}>{value}</p>
      {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>}
      {change && <p className="text-[10px] mt-1" style={{ color: 'var(--text-faint)' }}>vs mes anterior</p>}
    </div>
  )
}
