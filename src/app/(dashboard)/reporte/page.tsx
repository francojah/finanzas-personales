'use client'

import { useState, useEffect, useRef } from 'react'
import { Printer, Download, ChevronLeft, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatARS, formatUSD } from '@/lib/utils'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import { MonthPicker } from '@/components/shared/MonthPicker'
import { useExchangeRate } from '@/hooks/useExchangeRate'
import { PlanGate } from '@/components/shared/PlanGate'

interface ReportData {
  userName: string
  income_ars: number
  expense_ars: number
  income_usd: number
  expense_usd: number
  savingsRate: number
  topCategories: { name: string; color: string; total: number; pct: number }[]
  prevIncome: number
  prevExpense: number
  inversionesUSD: number
  patrimonioUSD: number
  patrimonioARS: number
  txCount: number
}

export default function ReportePage() {
  return <PlanGate feature="reporte" featureLabel="Reporte mensual"><ReportePageContent /></PlanGate>
}

function ReportePageContent() {
  const supabase = createClient()
  const { mep } = useExchangeRate()
  const [date, setDate] = useState(new Date())
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => { loadReport() }, [date])

  async function loadReport() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const from     = format(startOfMonth(date), 'yyyy-MM-dd')
      const to       = format(endOfMonth(date),   'yyyy-MM-dd')
      const prevFrom = format(startOfMonth(subMonths(date, 1)), 'yyyy-MM-dd')
      const prevTo   = format(endOfMonth(subMonths(date, 1)),   'yyyy-MM-dd')

      const [profileRes, txRes, prevTxRes, posRes, assetRes] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('id', user.id).single(),
        supabase.from('transactions').select('type, amount_ars, amount_usd, category:categories(name,color)').gte('date', from).lte('date', to).neq('type', 'transfer'),
        supabase.from('transactions').select('type, amount_ars').gte('date', prevFrom).lte('date', prevTo).neq('type', 'transfer'),
        supabase.from('investment_positions').select('quantity, current_price_usd, avg_purchase_price').eq('is_active', true),
        supabase.from('assets').select('value, currency').eq('is_active', true),
      ])

      const txs     = (txRes.data ?? []) as any[]
      const prevTxs = (prevTxRes.data ?? []) as any[]

      const income_ars  = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount_ars, 0)
      const expense_ars = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount_ars, 0)
      const income_usd  = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount_usd, 0)
      const expense_usd = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount_usd, 0)
      const prevIncome  = prevTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount_ars, 0)
      const prevExpense = prevTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount_ars, 0)

      const catMap: Record<string, { name: string; color: string; total: number }> = {}
      txs.filter(t => t.type === 'expense').forEach(t => {
        const cat = t.category
        const key = cat?.name ?? 'Sin categoría'
        if (!catMap[key]) catMap[key] = { name: key, color: cat?.color ?? '#888', total: 0 }
        catMap[key].total += t.amount_ars
      })
      const topCats = Object.values(catMap)
        .sort((a, b) => b.total - a.total).slice(0, 8)
        .map(c => ({ ...c, pct: expense_ars > 0 ? (c.total / expense_ars) * 100 : 0 }))

      const inversionesUSD = (posRes.data ?? []).reduce((s: number, p: any) => s + p.quantity * (p.current_price_usd ?? p.avg_purchase_price), 0)
      const assets = (assetRes.data ?? []) as any[]
      const patrimonioUSD = assets.filter(a => a.currency === 'USD').reduce((s: number, a: any) => s + a.value, 0)
      const patrimonioARS = assets.filter(a => a.currency === 'ARS').reduce((s: number, a: any) => s + a.value, 0)

      setData({
        userName: profileRes.data?.full_name ?? '',
        income_ars, expense_ars, income_usd, expense_usd,
        savingsRate: income_ars > 0 ? Math.round(((income_ars - expense_ars) / income_ars) * 100) : 0,
        topCategories: topCats,
        prevIncome, prevExpense,
        inversionesUSD, patrimonioUSD, patrimonioARS,
        txCount: txs.length,
      })
    } finally {
      setLoading(false)
    }
  }

  function handlePrint() { window.print() }

  const monthLabel = format(date, 'MMMM yyyy', { locale: es })
  const monthLabelCap = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)

  const pctChange = (curr: number, prev: number) => {
    if (prev === 0) return null
    const p = ((curr - prev) / prev) * 100
    return `${p >= 0 ? '+' : ''}${p.toFixed(1)}%`
  }

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #report-content, #report-content * { visibility: visible !important; }
          #report-content { position: fixed; top: 0; left: 0; width: 100%; background: white !important; color: #1a1a1a !important; padding: 32px; }
          .no-print { display: none !important; }
          .print-card { background: #f8fafc !important; border: 1px solid #e2e8f0 !important; }
          .print-text-primary { color: #0f172a !important; }
          .print-text-secondary { color: #475569 !important; }
          .print-text-muted { color: #94a3b8 !important; }
        }
      `}</style>

      <div className="max-w-2xl mx-auto space-y-5">
        {/* Controls — hidden on print */}
        <div className="no-print flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Reporte mensual</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>Resumen ejecutivo de tus finanzas</p>
          </div>
          <div className="flex items-center gap-2">
            <MonthPicker value={date} onChange={setDate} />
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'var(--accent)' }}
            >
              <Printer size={15} /> Guardar PDF
            </button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-xl animate-pulse" style={{ background: 'var(--surface)' }} />)}
          </div>
        ) : data ? (
          <div id="report-content" ref={printRef} className="space-y-5">

            {/* Header */}
            <div className="rounded-2xl p-6 print-card" style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent-border)' }}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest print-text-muted" style={{ color: 'var(--text-muted)' }}>Reporte Financiero</p>
                  <h2 className="text-2xl font-bold mt-1 print-text-primary" style={{ color: 'var(--text-primary)' }}>{monthLabelCap}</h2>
                  {data.userName && <p className="text-sm mt-0.5 print-text-secondary" style={{ color: 'var(--text-secondary)' }}>{data.userName}</p>}
                </div>
                <div className="text-right">
                  <p className="text-xs print-text-muted" style={{ color: 'var(--text-muted)' }}>{data.txCount} movimientos</p>
                  <p className="text-xs mt-0.5 print-text-muted" style={{ color: 'var(--text-muted)' }}>Tasa de ahorro: <strong className="print-text-primary" style={{ color: 'var(--text-primary)' }}>{data.savingsRate}%</strong></p>
                </div>
              </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Ingresos', value: formatARS(data.income_ars), sub: formatUSD(data.income_usd), change: pctChange(data.income_ars, data.prevIncome), good: true },
                { label: 'Gastos',   value: formatARS(data.expense_ars), sub: formatUSD(data.expense_usd), change: pctChange(data.expense_ars, data.prevExpense), good: false },
                { label: 'Neto',     value: formatARS(data.income_ars - data.expense_ars), sub: formatUSD(data.income_usd - data.expense_usd), change: null, good: true },
              ].map(({ label, value, sub, change, good }) => (
                <div key={label} className="rounded-xl p-4 print-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <p className="text-xs print-text-muted mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
                  <p className="text-lg font-bold print-text-primary" style={{ color: 'var(--text-primary)' }}>{value}</p>
                  <p className="text-xs print-text-secondary mt-0.5" style={{ color: 'var(--text-secondary)' }}>{sub}</p>
                  {change && (
                    <p className="text-xs font-semibold mt-1" style={{ color: (good ? change.startsWith('+') : !change.startsWith('+')) ? 'var(--income)' : 'var(--expense)' }}>
                      {change} vs mes anterior
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Gastos por categoría */}
            {data.topCategories.length > 0 && (
              <div className="rounded-xl p-5 print-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <h3 className="text-sm font-semibold mb-4 print-text-secondary" style={{ color: 'var(--text-secondary)' }}>Gastos por categoría</h3>
                <div className="space-y-3">
                  {data.topCategories.map(cat => (
                    <div key={cat.name}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: cat.color }} />
                          <span className="text-xs font-medium print-text-primary" style={{ color: 'var(--text-primary)' }}>{cat.name}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs print-text-secondary" style={{ color: 'var(--text-secondary)' }}>
                          <span>{formatARS(cat.total)}</span>
                          <span className="w-8 text-right print-text-muted" style={{ color: 'var(--text-muted)' }}>{cat.pct.toFixed(0)}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-elevated)' }}>
                        <div className="h-full rounded-full" style={{ width: `${cat.pct}%`, background: cat.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Inversiones y Patrimonio */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl p-4 print-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <p className="text-xs print-text-muted mb-1" style={{ color: 'var(--text-muted)' }}>Inversiones</p>
                <p className="text-lg font-bold print-text-primary" style={{ color: 'var(--text-primary)' }}>{formatUSD(data.inversionesUSD)}</p>
                {mep && <p className="text-xs print-text-secondary mt-0.5" style={{ color: 'var(--text-secondary)' }}>{formatARS(data.inversionesUSD * mep)}</p>}
              </div>
              <div className="rounded-xl p-4 print-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <p className="text-xs print-text-muted mb-1" style={{ color: 'var(--text-muted)' }}>Patrimonio</p>
                {data.patrimonioUSD > 0 && <p className="text-lg font-bold print-text-primary" style={{ color: 'var(--text-primary)' }}>{formatUSD(data.patrimonioUSD)}</p>}
                {data.patrimonioARS > 0 && <p className="text-sm print-text-secondary" style={{ color: 'var(--text-secondary)' }}>{formatARS(data.patrimonioARS)}</p>}
                {data.patrimonioUSD === 0 && data.patrimonioARS === 0 && <p className="text-sm print-text-muted" style={{ color: 'var(--text-muted)' }}>Sin activos</p>}
              </div>
            </div>

            {/* Footer */}
            <p className="text-center text-xs print-text-muted" style={{ color: 'var(--text-faint)' }}>
              Generado por Finanzas JAH · {format(new Date(), 'dd/MM/yyyy HH:mm')}
            </p>
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)' }}>Sin datos para este mes</p>
        )}
      </div>
    </>
  )
}
