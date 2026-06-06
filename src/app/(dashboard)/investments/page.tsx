'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, RefreshCw, TrendingUp, TrendingDown, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatARS, formatUSD, formatPercent } from '@/lib/utils'
import { useExchangeRate } from '@/hooks/useExchangeRate'
import { PlanGate } from '@/components/shared/PlanGate'
import { OnboardingTip } from '@/components/shared/OnboardingTip'
import type { InvestmentPosition } from '@/types/database'

const ASSET_LABELS: Record<string, string> = {
  stock: 'Acciones', etf: 'ETFs', crypto: 'Crypto',
  bond: 'Bonos', on: 'ONs', fci: 'FCI',
  cedear: 'CEDEARs', fixed_term: 'Plazo Fijo',
  cash_usd: 'Dólares',
}
const ASSET_COLORS: Record<string, string> = {
  stock: '#7c6ff7', etf: '#60a5fa', crypto: '#f59e0b',
  bond: '#4ade80', on: '#22d3ee', fci: '#c084fc',
  cedear: '#f472b6', fixed_term: '#94a3b8',
  cash_usd: '#22c55e',
}

export default function InvestmentsPage() {
  return <PlanGate feature="investments" featureLabel="Inversiones"><InvestmentsContent /></PlanGate>
}

function InvestmentsContent() {
  const router = useRouter()
  const supabase = createClient()
  const { mep } = useExchangeRate()
  const [positions, setPositions] = useState<InvestmentPosition[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [currency, setCurrency] = useState<'ARS' | 'USD'>('USD')
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('investment_positions')
      .select('*, account:accounts(name)')
      .eq('is_active', true)
      .order('asset_type')
    setPositions((data as InvestmentPosition[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function refreshPrices() {
    setRefreshing(true)
    const updates = positions
      .filter(p => p.ticker && p.price_source !== 'manual' && p.asset_type !== 'fixed_term' && p.asset_type !== 'cash_usd')
      .map(async (pos) => {
        try {
          const source = pos.price_source === 'coingecko' ? 'coingecko' : 'yahoo'
          const res = await fetch(`/api/prices?ticker=${pos.ticker}&source=${source}`)
          if (!res.ok) return
          const { price } = await res.json()
          await supabase.from('investment_positions').update({
            current_price: price, current_price_usd: price,
            last_price_update: new Date().toISOString(),
          }).eq('id', pos.id)
        } catch { /* silencioso */ }
      })
    await Promise.all(updates)
    await load()
    setRefreshing(false)
  }

  function positionValueUSD(pos: InvestmentPosition): number {
    if (pos.asset_type === 'fixed_term') {
      if (!pos.fixed_term_tna || !pos.fixed_term_start || !pos.fixed_term_end) {
        return pos.quantity * pos.avg_purchase_price
      }
      const days = Math.max(0, Math.ceil(
        (new Date(pos.fixed_term_end).getTime() - new Date(pos.fixed_term_start).getTime()) / 86400000
      ))
      const totalARS = pos.quantity * pos.avg_purchase_price * (1 + (pos.fixed_term_tna / 100) * (days / 365))
      return mep ? totalARS / mep : 0
    }
    return pos.quantity * (pos.current_price_usd ?? pos.avg_purchase_price)
  }

  function positionReturnPct(pos: InvestmentPosition): number | null {
    if (pos.asset_type === 'fixed_term') return pos.fixed_term_tna ?? null
    if (pos.manual_return_pct != null) return pos.manual_return_pct
    if (!pos.current_price_usd) return null
    return ((pos.current_price_usd - pos.avg_purchase_price) / pos.avg_purchase_price) * 100
  }

  const grouped = positions.reduce<Record<string, InvestmentPosition[]>>((acc, p) => {
    if (!acc[p.asset_type]) acc[p.asset_type] = []
    acc[p.asset_type].push(p)
    return acc
  }, {})

  const totalUSD  = positions.reduce((s, p) => s + positionValueUSD(p), 0)
  const totalARS  = mep ? totalUSD * mep : 0
  const totalCost = positions.reduce((s, p) => s + p.quantity * p.avg_purchase_price, 0)
  const totalPnL  = totalUSD - totalCost
  const totalPct  = totalCost > 0 ? (totalPnL / totalCost) * 100 : null

  const toggleGroup = (type: string) =>
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      next.has(type) ? next.delete(type) : next.add(type)
      return next
    })

  const fmt = (usd: number) => currency === 'USD' ? formatUSD(usd) : formatARS(usd * (mep ?? 1))

  return (
    <div className="max-w-2xl mx-auto space-y-5">

      <OnboardingTip
        tipId="investments"
        title="Tu portfolio de inversiones"
        description="Agregá acciones, CEDEARs, crypto, plazos fijos o dólares físicos. Los precios de acciones y crypto se actualizan automáticamente."
        cta={{ label: 'Agregar primera inversión', href: '/investments/new' }}
        accent
      />

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Inversiones</h1>
        <div className="flex items-center gap-2">
          <button onClick={refreshPrices} disabled={refreshing}
            className="p-2 rounded-xl transition-colors"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
            title="Actualizar precios">
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <div className="flex rounded-xl overflow-hidden" style={{ border: '1.5px solid var(--border)' }}>
            {(['USD', 'ARS'] as const).map(c => (
              <button key={c} onClick={() => setCurrency(c)}
                className="px-3 py-1.5 text-sm font-semibold transition-colors"
                style={currency === c
                  ? { background: 'var(--accent)', color: '#fff' }
                  : { background: 'var(--surface)', color: 'var(--text-muted)' }
                }>{c}</button>
            ))}
          </div>
          <button onClick={() => router.push('/investments/new')}
            className="flex items-center gap-2 text-white text-sm font-semibold px-4 py-2 rounded-xl"
            style={{ background: 'var(--accent)' }}>
            <Plus size={15} /> Nueva inversión
          </button>
        </div>
      </div>

      {/* Portfolio total */}
      {!loading && positions.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="p-5">
            <p className="text-xs font-bold tracking-widest mb-3" style={{ color: 'var(--text-faint)' }}>PORTFOLIO TOTAL</p>
            <div className="flex items-end gap-3 flex-wrap">
              <p className="text-4xl font-black" style={{ color: 'var(--text-primary)' }}>{fmt(totalUSD)}</p>
              {totalPct !== null && (
                <div className="flex items-center gap-1.5 mb-1 px-2.5 py-1 rounded-lg"
                  style={{
                    background: totalPnL >= 0 ? 'var(--income-bg)' : 'var(--expense-bg)',
                  }}>
                  {totalPnL >= 0
                    ? <TrendingUp size={13} style={{ color: 'var(--income)' }} />
                    : <TrendingDown size={13} style={{ color: 'var(--expense)' }} />
                  }
                  <span className="text-sm font-bold"
                    style={{ color: totalPnL >= 0 ? 'var(--income)' : 'var(--expense)' }}>
                    {totalPnL >= 0 ? '+' : ''}{formatPercent(totalPct)}
                  </span>
                  <span className="text-xs" style={{ color: totalPnL >= 0 ? 'var(--income)' : 'var(--expense)', opacity: 0.8 }}>
                    ({totalPnL >= 0 ? '+' : ''}{fmt(totalPnL)})
                  </span>
                </div>
              )}
            </div>
            <p className="text-sm mt-1.5" style={{ color: 'var(--text-secondary)' }}>
              {currency === 'USD' ? formatARS(totalARS) : formatUSD(totalUSD)}
              {mep && <span style={{ color: 'var(--text-faint)' }}> · MEP {formatARS(mep)}</span>}
            </p>
          </div>
          {/* Barra de allocación por tipo */}
          <div className="flex h-1">
            {Object.entries(grouped).map(([type, items]) => {
              const groupTotal = items.reduce((s, p) => s + positionValueUSD(p), 0)
              const pct = totalUSD > 0 ? (groupTotal / totalUSD) * 100 : 0
              return <div key={type} title={`${ASSET_LABELS[type]}: ${pct.toFixed(1)}%`}
                style={{ width: `${pct}%`, background: ASSET_COLORS[type] ?? '#94a3b8', transition: 'width 0.5s' }} />
            })}
          </div>
          {/* Leyenda */}
          <div className="flex gap-3 flex-wrap px-5 py-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            {Object.entries(grouped).map(([type, items]) => {
              const groupTotal = items.reduce((s, p) => s + positionValueUSD(p), 0)
              const pct = totalUSD > 0 ? (groupTotal / totalUSD) * 100 : 0
              const color = ASSET_COLORS[type] ?? '#94a3b8'
              return (
                <div key={type} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {ASSET_LABELS[type]} <span style={{ color: 'var(--text-faint)' }}>{pct.toFixed(0)}%</span>
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: 'var(--surface)' }} />
          ))}
        </div>
      ) : positions.length === 0 ? (
        <div className="text-center py-16 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <TrendingUp size={40} className="mx-auto mb-3" style={{ color: 'var(--text-faint)' }} />
          <p className="mb-4" style={{ color: 'var(--text-muted)' }}>No hay posiciones registradas</p>
          <button onClick={() => router.push('/investments/new')}
            className="inline-flex items-center gap-2 text-white px-5 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: 'var(--accent)' }}>
            <Plus size={15} /> Agregar posición
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(grouped).map(([type, items]) => {
            const groupTotal = items.reduce((s, p) => s + positionValueUSD(p), 0)
            const groupCost  = items.reduce((s, p) => s + p.quantity * p.avg_purchase_price, 0)
            const groupPnL   = groupTotal - groupCost
            const groupPnLPct = groupCost > 0 ? (groupPnL / groupCost) * 100 : null
            const groupPct   = totalUSD > 0 ? (groupTotal / totalUSD) * 100 : 0
            const color      = ASSET_COLORS[type] ?? '#94a3b8'
            const isCollapsed = collapsedGroups.has(type)

            return (
              <div key={type} className="rounded-xl overflow-hidden"
                style={{ border: `1px solid ${color}30` }}>
                {/* Group header — acordeón */}
                <button
                  onClick={() => toggleGroup(type)}
                  className="w-full flex items-center justify-between px-4 py-3"
                  style={{ background: color + '12', borderLeft: `3px solid ${color}` }}>
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm font-bold" style={{ color }}>{ASSET_LABELS[type] ?? type}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                      style={{ background: color + '25', color }}>
                      {items.length} {items.length === 1 ? 'posición' : 'posiciones'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{fmt(groupTotal)}</p>
                      <div className="flex items-center gap-1.5 justify-end">
                        <span className="text-xs" style={{ color: 'var(--text-faint)' }}>{groupPct.toFixed(1)}%</span>
                        {groupPnLPct !== null && (
                          <span className="text-xs font-semibold"
                            style={{ color: groupPnL >= 0 ? 'var(--income)' : 'var(--expense)' }}>
                            {groupPnL >= 0 ? '+' : ''}{formatPercent(groupPnLPct)}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={14} className="shrink-0 transition-transform"
                      style={{ color: 'var(--text-faint)', transform: isCollapsed ? 'rotate(0deg)' : 'rotate(90deg)' }} />
                  </div>
                </button>

                {/* Positions — colapsables */}
                {!isCollapsed && <div className="divide-y" style={{ divideColor: 'var(--border-subtle)' }}>
                  {items.map(pos => {
                    const valueUSD    = positionValueUSD(pos)
                    const returnPct   = positionReturnPct(pos)
                    const weightPct   = totalUSD > 0 ? (valueUSD / totalUSD) * 100 : 0
                    const isFixedTerm = pos.asset_type === 'fixed_term'
                    const isPos       = (returnPct ?? 0) >= 0

                    return (
                      <button
                        key={pos.id}
                        onClick={() => router.push(`/investments/${pos.id}`)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                        style={{ background: 'var(--surface)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-hover)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface)')}
                      >
                        {/* Ticker badge */}
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-[11px] font-black"
                          style={{ background: color + '18', color }}>
                          {pos.asset_type === 'cash_usd' ? 'USD' : (pos.ticker?.slice(0, 4) ?? pos.name.slice(0, 3).toUpperCase())}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                            {pos.name}
                          </p>
                          <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                            {isFixedTerm
                              ? `TNA ${pos.fixed_term_tna}% · vence ${pos.fixed_term_end}`
                              : pos.asset_type === 'cash_usd'
                                ? 'Dólares físicos'
                                : `${pos.quantity} u · ${pos.current_price_usd ? formatUSD(pos.current_price_usd) : 'sin precio'}`
                            }
                          </p>
                        </div>

                        {/* Valores */}
                        <div className="text-right shrink-0 space-y-1">
                          <p className="font-bold text-sm tabular-nums" style={{ color: 'var(--text-primary)' }}>
                            {fmt(valueUSD)}
                          </p>
                          <div className="flex items-center gap-1.5 justify-end">
                            {/* Weight % */}
                            <span className="text-xs tabular-nums" style={{ color: 'var(--text-faint)' }}>
                              {weightPct.toFixed(1)}%
                            </span>
                            {/* Return badge */}
                            {returnPct !== null && (
                              <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-0.5"
                                style={{
                                  background: isPos ? 'var(--income-bg)' : 'var(--expense-bg)',
                                  color: isPos ? 'var(--income)' : 'var(--expense)',
                                }}>
                                {isPos ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                                {formatPercent(returnPct)}
                              </span>
                            )}
                          </div>
                        </div>

                        <ChevronRight size={13} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
                      </button>
                    )
                  })}
                </div>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
