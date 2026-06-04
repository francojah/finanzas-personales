'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Trash2, TrendingUp, TrendingDown, RefreshCw, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatARS, formatUSD, formatDate, formatPercent, cn } from '@/lib/utils'
import { useExchangeRate } from '@/hooks/useExchangeRate'
import { toast } from 'sonner'
import type { InvestmentPosition, InvestmentTrade } from '@/types/database'

const TRADE_LABELS: Record<string, string> = {
  buy: 'Compra', sell: 'Venta', dividend: 'Dividendo',
  interest: 'Interés', staking: 'Staking',
}

export default function InvestmentDetailPage() {
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()
  const { mep } = useExchangeRate()
  const [pos, setPos] = useState<InvestmentPosition | null>(null)
  const [trades, setTrades] = useState<InvestmentTrade[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [manualReturn, setManualReturn] = useState('')
  const [editingReturn, setEditingReturn] = useState(false)

  useEffect(() => { load() }, [params.id])

  async function load() {
    const [{ data: position }, { data: tradeData }] = await Promise.all([
      supabase.from('investment_positions')
        .select('*, account:accounts(name)')
        .eq('id', params.id as string)
        .single(),
      supabase.from('investment_trades')
        .select('*')
        .eq('position_id', params.id as string)
        .order('date', { ascending: false }),
    ])
    setPos(position as InvestmentPosition)
    setTrades((tradeData ?? []) as InvestmentTrade[])
    setLoading(false)
  }

  async function refreshPrice() {
    if (!pos?.ticker) return
    setRefreshing(true)
    try {
      const source = pos.price_source === 'coingecko' ? 'coingecko' : 'yahoo'
      const res = await fetch(`/api/prices?ticker=${pos.ticker}&source=${source}`)
      if (!res.ok) throw new Error()
      const { price } = await res.json()
      await supabase.from('investment_positions').update({
        current_price: price,
        current_price_usd: price,
        last_price_update: new Date().toISOString(),
      }).eq('id', pos.id)
      toast.success(`Precio actualizado: $${price.toFixed(2)}`)
      load()
    } catch {
      toast.error('No se pudo obtener el precio')
    } finally {
      setRefreshing(false)
    }
  }

  async function saveManualReturn() {
    const pct = parseFloat(manualReturn)
    if (isNaN(pct)) { toast.error('Ingresá un porcentaje válido'); return }
    await supabase.from('investment_positions').update({ manual_return_pct: pct }).eq('id', pos!.id)
    toast.success('Rendimiento actualizado')
    setEditingReturn(false)
    load()
  }

  async function handleDelete() {
    if (!confirm('¿Eliminar esta posición y todo su historial?')) return
    await supabase.from('investment_trades').delete().eq('position_id', pos!.id)
    await supabase.from('investment_positions').delete().eq('id', pos!.id)
    toast.success('Posición eliminada')
    router.push('/investments')
  }

  if (loading) return <div className="h-40 flex items-center justify-center text-slate-400">Cargando...</div>
  if (!pos) return <div className="text-center py-20 text-slate-400">No encontrado</div>

  const currentPriceUSD = pos.current_price_usd ?? pos.avg_purchase_price
  const valueUSD = pos.asset_type === 'fixed_term'
    ? pos.quantity * pos.avg_purchase_price // simplificado
    : pos.quantity * currentPriceUSD
  const valueARS = mep ? valueUSD * mep : 0
  const costUSD = pos.quantity * pos.avg_purchase_price
  const pnlUSD = valueUSD - costUSD
  const returnPct = pos.manual_return_pct ?? (pos.current_price_usd
    ? ((pos.current_price_usd - pos.avg_purchase_price) / pos.avg_purchase_price) * 100
    : null)
  const isPositive = (returnPct ?? 0) >= 0

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-xl">
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-900">{pos.name}</h1>
            {pos.ticker && <p className="text-xs text-slate-400">{pos.ticker}</p>}
          </div>
        </div>
        <button onClick={handleDelete} className="p-2 hover:bg-red-50 rounded-xl text-slate-400 hover:text-red-500">
          <Trash2 size={18} />
        </button>
      </div>

      {/* Card principal */}
      <div className="card !p-5 mb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs text-slate-500 mb-1">Valor actual</p>
            <p className="text-3xl font-bold text-slate-900">{formatUSD(valueUSD)}</p>
            {mep && <p className="text-sm text-slate-400 mt-0.5">{formatARS(valueARS)}</p>}
          </div>
          {returnPct !== null && (
            <div className={cn('flex items-center gap-1 px-3 py-1.5 rounded-xl text-sm font-bold',
              isPositive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'
            )}>
              {isPositive ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
              {formatPercent(returnPct)}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-100">
          <div>
            <p className="text-xs text-slate-400">Cantidad</p>
            <p className="text-sm font-semibold text-slate-700">{pos.quantity}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Precio compra</p>
            <p className="text-sm font-semibold text-slate-700">{formatUSD(pos.avg_purchase_price)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">P&L</p>
            <p className={cn('text-sm font-semibold', pnlUSD >= 0 ? 'text-green-600' : 'text-red-500')}>
              {pnlUSD >= 0 ? '+' : ''}{formatUSD(pnlUSD)}
            </p>
          </div>
        </div>

        {/* Precio actual + refresh */}
        {pos.ticker && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
            <div>
              <p className="text-xs text-slate-400">Precio actual</p>
              <p className="text-sm font-semibold text-slate-700">
                {pos.current_price_usd ? formatUSD(pos.current_price_usd) : 'No disponible'}
              </p>
              {pos.last_price_update && (
                <p className="text-xs text-slate-400">
                  {new Date(pos.last_price_update).toLocaleString('es-AR')}
                </p>
              )}
            </div>
            <button onClick={refreshPrice} disabled={refreshing}
              className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-medium px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors">
              <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
              Actualizar
            </button>
          </div>
        )}

        {/* Rendimiento manual */}
        {!pos.ticker && pos.asset_type !== 'fixed_term' && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-400">Rendimiento manual</p>
              <button onClick={() => { setEditingReturn(true); setManualReturn(pos.manual_return_pct?.toString() ?? '') }}
                className="text-xs text-indigo-600 hover:underline">Editar</button>
            </div>
            {editingReturn ? (
              <div className="flex gap-2 mt-2">
                <input value={manualReturn} onChange={e => setManualReturn(e.target.value)}
                  type="number" step="0.01" placeholder="%" className="input-base flex-1 !py-1.5 text-sm" autoFocus />
                <button onClick={saveManualReturn} className="px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-lg font-semibold">OK</button>
                <button onClick={() => setEditingReturn(false)} className="px-3 py-1.5 border border-slate-200 text-xs rounded-lg">✕</button>
              </div>
            ) : (
              <p className="text-sm font-semibold text-slate-700 mt-1">
                {pos.manual_return_pct !== null ? `${pos.manual_return_pct}%` : '—'}
              </p>
            )}
          </div>
        )}

        {/* Plazo fijo info */}
        {pos.asset_type === 'fixed_term' && (
          <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-slate-100">
            <div><p className="text-xs text-slate-400">TNA</p><p className="text-sm font-semibold">{pos.fixed_term_tna}%</p></div>
            <div><p className="text-xs text-slate-400">Inicio</p><p className="text-sm font-semibold">{pos.fixed_term_start}</p></div>
            <div><p className="text-xs text-slate-400">Vence</p><p className="text-sm font-semibold">{pos.fixed_term_end}</p></div>
          </div>
        )}
      </div>

      {/* Historial de operaciones */}
      <div className="card !p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700">Historial de operaciones</h2>
        </div>
        {trades.length === 0 ? (
          <p className="text-center text-slate-400 text-sm py-8">Sin operaciones registradas</p>
        ) : (
          <div className="divide-y divide-slate-50">
            {trades.map(trade => (
              <div key={trade.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    {TRADE_LABELS[trade.type] ?? trade.type}
                  </p>
                  <p className="text-xs text-slate-400">
                    {formatDate(trade.date)}
                    {trade.quantity && ` · ${trade.quantity} u`}
                    {` · ${formatUSD(trade.price)}`}
                  </p>
                </div>
                <p className={cn('text-sm font-semibold',
                  ['buy'].includes(trade.type) ? 'text-red-500' : 'text-green-600'
                )}>
                  {['buy'].includes(trade.type) ? '-' : '+'}
                  {formatUSD((trade.quantity ?? 1) * trade.price)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
