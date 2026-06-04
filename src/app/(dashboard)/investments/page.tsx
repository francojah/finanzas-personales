'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, RefreshCw, TrendingUp, TrendingDown, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatARS, formatUSD, formatPercent, cn } from '@/lib/utils'
import { useExchangeRate } from '@/hooks/useExchangeRate'
import type { InvestmentPosition } from '@/types/database'

const ASSET_LABELS: Record<string, string> = {
  stock: 'Acciones', etf: 'ETFs', crypto: 'Crypto',
  bond: 'Bonos', on: 'ONs', fci: 'FCI',
  cedear: 'CEDEARs', fixed_term: 'Plazo Fijo',
}

const ASSET_COLORS: Record<string, string> = {
  stock: '#6366f1', etf: '#3b82f6', crypto: '#f59e0b',
  bond: '#10b981', on: '#06b6d4', fci: '#8b5cf6',
  cedear: '#ec4899', fixed_term: '#64748b',
}

export default function InvestmentsPage() {
  const router = useRouter()
  const supabase = createClient()
  const { mep } = useExchangeRate()
  const [positions, setPositions] = useState<InvestmentPosition[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [currency, setCurrency] = useState<'ARS' | 'USD'>('USD')

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

  // Actualizar precios de todas las posiciones
  async function refreshPrices() {
    setRefreshing(true)
    const updates: Promise<void>[] = positions
      .filter(p => p.ticker && p.price_source !== 'manual' && p.asset_type !== 'fixed_term')
      .map(async (pos) => {
        try {
          const source = pos.price_source === 'coingecko' ? 'coingecko' : 'yahoo'
          const res = await fetch(`/api/prices?ticker=${pos.ticker}&source=${source}`)
          if (!res.ok) return
          const { price } = await res.json()
          await supabase
            .from('investment_positions')
            .update({
              current_price: price,
              current_price_usd: price, // Yahoo retorna en USD para acciones internacionales
              last_price_update: new Date().toISOString(),
            })
            .eq('id', pos.id)
        } catch { /* silencioso */ }
      })

    await Promise.all(updates)
    await load()
    setRefreshing(false)
  }

  // ── Cálculos ────────────────────────────────────────────────
  function positionValueUSD(pos: InvestmentPosition): number {
    if (pos.asset_type === 'fixed_term') {
      // Plazo fijo: calcular con TNA
      if (!pos.fixed_term_tna || !pos.fixed_term_start || !pos.fixed_term_end) {
        return pos.quantity * pos.avg_purchase_price
      }
      const start = new Date(pos.fixed_term_start)
      const end = new Date(pos.fixed_term_end)
      const days = Math.max(0, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
      const interest = pos.quantity * pos.avg_purchase_price * (pos.fixed_term_tna / 100) * (days / 365)
      const totalARS = pos.quantity * pos.avg_purchase_price + interest
      return mep ? totalARS / mep : 0
    }

    const price = pos.current_price_usd ?? pos.avg_purchase_price
    return pos.quantity * price
  }

  function positionReturnPct(pos: InvestmentPosition): number | null {
    if (pos.asset_type === 'fixed_term') return pos.fixed_term_tna ?? null
    if (pos.manual_return_pct !== null && pos.manual_return_pct !== undefined) return pos.manual_return_pct
    if (!pos.current_price_usd) return null
    return ((pos.current_price_usd - pos.avg_purchase_price) / pos.avg_purchase_price) * 100
  }

  // Agrupar por tipo de activo
  const grouped = positions.reduce<Record<string, InvestmentPosition[]>>((acc, p) => {
    if (!acc[p.asset_type]) acc[p.asset_type] = []
    acc[p.asset_type].push(p)
    return acc
  }, {})

  const totalUSD = positions.reduce((s, p) => s + positionValueUSD(p), 0)
  const totalARS = mep ? totalUSD * mep : 0

  const fmt = (usd: number) => currency === 'USD' ? formatUSD(usd) : formatARS(usd * (mep ?? 1))

  return (
    <div className="max-w-2xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Inversiones</h1>
        <div className="flex items-center gap-2">
          <button onClick={refreshPrices} disabled={refreshing}
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"
            title="Actualizar precios">
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <div className="flex rounded-xl border border-slate-200 overflow-hidden">
            {(['USD', 'ARS'] as const).map(c => (
              <button key={c} onClick={() => setCurrency(c)}
                className={cn('px-3 py-1.5 text-sm font-semibold transition-colors',
                  currency === c ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'
                )}>{c}</button>
            ))}
          </div>
          <button onClick={() => router.push('/investments/new')}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-xl">
            <Plus size={15} /> Nueva
          </button>
        </div>
      </div>

      {/* Total portfolio */}
      {!loading && positions.length > 0 && (
        <div className="card !p-5 bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-100">
          <p className="text-sm text-indigo-600 font-medium mb-1">Portfolio total</p>
          <p className="text-3xl font-bold text-indigo-800">{fmt(totalUSD)}</p>
          <p className="text-sm text-indigo-400 mt-1">
            {currency === 'USD' ? formatARS(totalARS) : formatUSD(totalUSD)}
            {mep && <span className="ml-2">· MEP {formatARS(mep)}</span>}
          </p>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      ) : positions.length === 0 ? (
        <div className="text-center py-16">
          <TrendingUp size={40} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 mb-4">No hay posiciones registradas</p>
          <button onClick={() => router.push('/investments/new')}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700">
            <Plus size={15} /> Agregar posición
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).map(([type, items]) => {
            const groupTotal = items.reduce((s, p) => s + positionValueUSD(p), 0)
            return (
              <div key={type}>
                {/* Header grupo */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ASSET_COLORS[type] ?? '#94a3b8' }} />
                    <span className="text-sm font-semibold text-slate-600">{ASSET_LABELS[type] ?? type}</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-700">{fmt(groupTotal)}</span>
                </div>

                {/* Posiciones del grupo */}
                <div className="space-y-2">
                  {items.map(pos => {
                    const valueUSD = positionValueUSD(pos)
                    const returnPct = positionReturnPct(pos)
                    const pnlUSD = pos.current_price_usd
                      ? pos.quantity * (pos.current_price_usd - pos.avg_purchase_price)
                      : null
                    const hasPrice = !!pos.current_price_usd || pos.asset_type === 'fixed_term'
                    const isFixedTerm = pos.asset_type === 'fixed_term'

                    return (
                      <button
                        key={pos.id}
                        onClick={() => router.push(`/investments/${pos.id}`)}
                        className="w-full card flex items-center gap-3 hover:shadow-sm hover:border-slate-300 transition-all text-left active:scale-[0.99]"
                      >
                        {/* Color dot */}
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white font-bold text-xs"
                          style={{ backgroundColor: ASSET_COLORS[pos.asset_type] + '20', color: ASSET_COLORS[pos.asset_type] }}>
                          {pos.ticker?.slice(0, 3) ?? '···'}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-800 truncate">{pos.name}</p>
                          <p className="text-xs text-slate-400">
                            {isFixedTerm
                              ? `TNA ${pos.fixed_term_tna}% · vence ${pos.fixed_term_end}`
                              : `${pos.quantity} u · ${!hasPrice ? 'sin precio' : `precio ${formatUSD(pos.current_price_usd ?? 0)}`}`
                            }
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="font-bold text-slate-900">{fmt(valueUSD)}</p>
                          {returnPct !== null && (
                            <p className={cn('text-xs font-semibold flex items-center gap-0.5 justify-end',
                              returnPct >= 0 ? 'text-green-600' : 'text-red-500'
                            )}>
                              {returnPct >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                              {formatPercent(returnPct)}
                            </p>
                          )}
                          {!hasPrice && (
                            <p className="text-xs text-slate-400">manual</p>
                          )}
                        </div>

                        <ChevronRight size={14} className="text-slate-300 shrink-0" />
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
