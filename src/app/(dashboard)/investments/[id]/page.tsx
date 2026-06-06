'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Trash2, TrendingUp, TrendingDown, RefreshCw, Plus, X, Loader2, ArrowDownToLine, Pencil } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatARS, formatUSD, formatDate, formatPercent, cn } from '@/lib/utils'
import { useExchangeRate } from '@/hooks/useExchangeRate'
import { useAccounts } from '@/hooks/useAccounts'
import { toast } from 'sonner'
import type { InvestmentPosition, InvestmentTrade } from '@/types/database'

const TRADE_LABELS: Record<string, string> = {
  buy: 'Compra', sell: 'Venta', dividend: 'Dividendo',
  interest: 'Interés', staking: 'Staking',
}

const TRADE_TYPES = [
  { value: 'sell',     label: 'Venta',     desc: 'Vendiste parte o toda la posición' },
  { value: 'dividend', label: 'Dividendo', desc: 'Cobro de dividendo en efectivo' },
  { value: 'interest', label: 'Interés',   desc: 'Renta o interés recibido' },
  { value: 'staking',  label: 'Staking',   desc: 'Recompensa por staking' },
]

interface TradeForm {
  type: 'sell' | 'dividend' | 'interest' | 'staking'
  quantity: string
  price: string
  date: string
  dest_account_id: string
  create_transaction: boolean
}

const EMPTY_TRADE: TradeForm = {
  type: 'sell',
  quantity: '',
  price: '',
  date: new Date().toISOString().split('T')[0],
  dest_account_id: '',
  create_transaction: true,
}

interface EditForm {
  name: string
  ticker: string
  account_id: string
  quantity: string
  avg_purchase_price: string
  manual_return_pct: string
  fixed_term_tna: string
  fixed_term_start: string
  fixed_term_end: string
  notes: string
}

export default function InvestmentDetailPage() {
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()
  const { mep } = useExchangeRate()
  const { accounts } = useAccounts()

  const [pos, setPos] = useState<InvestmentPosition | null>(null)
  const [trades, setTrades] = useState<InvestmentTrade[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [manualReturn, setManualReturn] = useState('')
  const [editingReturn, setEditingReturn] = useState(false)

  // Formulario de nueva operación
  const [showTradeForm, setShowTradeForm] = useState(false)
  const [tradeForm, setTradeForm] = useState<TradeForm>(EMPTY_TRADE)
  const [savingTrade, setSavingTrade] = useState(false)

  // Formulario de edición
  const [showEditForm, setShowEditForm] = useState(false)
  const [editForm, setEditForm] = useState<EditForm>({
    name: '', ticker: '', account_id: '', quantity: '',
    avg_purchase_price: '', manual_return_pct: '',
    fixed_term_tna: '', fixed_term_start: '', fixed_term_end: '', notes: '',
  })
  const [savingEdit, setSavingEdit] = useState(false)

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
        current_price: price, current_price_usd: price,
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

  // ── Editar posición ───────────────────────────────────────────
  function openEdit() {
    if (!pos) return
    setEditForm({
      name:              pos.name,
      ticker:            pos.ticker ?? '',
      account_id:        (pos as any).account_id ?? '',
      quantity:          pos.quantity.toString(),
      avg_purchase_price: pos.avg_purchase_price.toString(),
      manual_return_pct: pos.manual_return_pct?.toString() ?? '',
      fixed_term_tna:    pos.fixed_term_tna?.toString() ?? '',
      fixed_term_start:  pos.fixed_term_start ?? '',
      fixed_term_end:    pos.fixed_term_end ?? '',
      notes:             (pos as any).notes ?? '',
    })
    setShowEditForm(true)
    setShowTradeForm(false)
  }

  async function handleSaveEdit() {
    if (!pos) return
    if (!editForm.name.trim()) { toast.error('El nombre es obligatorio'); return }
    if (!editForm.quantity || parseFloat(editForm.quantity) <= 0) { toast.error('La cantidad debe ser mayor a 0'); return }
    setSavingEdit(true)
    const { error } = await supabase
      .from('investment_positions')
      .update({
        name:               editForm.name.trim(),
        ticker:             editForm.ticker || null,
        account_id:         editForm.account_id || undefined,
        quantity:           parseFloat(editForm.quantity),
        avg_purchase_price: parseFloat(editForm.avg_purchase_price) || pos.avg_purchase_price,
        manual_return_pct:  editForm.manual_return_pct ? parseFloat(editForm.manual_return_pct) : null,
        fixed_term_tna:     editForm.fixed_term_tna ? parseFloat(editForm.fixed_term_tna) : null,
        fixed_term_start:   editForm.fixed_term_start || null,
        fixed_term_end:     editForm.fixed_term_end || null,
        notes:              editForm.notes || null,
        updated_at:         new Date().toISOString(),
      })
      .eq('id', pos.id)
    setSavingEdit(false)
    if (error) { toast.error('Error al guardar'); return }
    toast.success('Posición actualizada')
    setShowEditForm(false)
    load()
  }

  // ── Registrar operación (venta, dividendo, etc.) ──────────────
  async function handleSaveTrade() {
    if (!pos) return
    const qty    = parseFloat(tradeForm.quantity) || 0
    const price  = parseFloat(tradeForm.price)
    if (!tradeForm.date) { toast.error('Ingresá la fecha'); return }
    if (isNaN(price) || price <= 0) { toast.error('Ingresá un precio válido'); return }
    if (tradeForm.type === 'sell' && (qty <= 0 || qty > pos.quantity)) {
      toast.error(`Cantidad inválida (máximo ${pos.quantity})`); return
    }
    if (tradeForm.create_transaction && !tradeForm.dest_account_id) {
      toast.error('Seleccioná la cuenta donde van los fondos'); return
    }

    setSavingTrade(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const proceeds = (tradeForm.type === 'sell' ? qty : 1) * price

    // 1. Registrar el trade en el historial
    const { error: tradeErr } = await supabase.from('investment_trades').insert({
      position_id: pos.id,
      type: tradeForm.type,
      quantity: tradeForm.type === 'sell' ? qty : null,
      price,
      date: tradeForm.date,
      notes: null,
    })
    if (tradeErr) { toast.error('Error al guardar la operación'); setSavingTrade(false); return }

    // 2. Si es venta, actualizar cantidad de la posición
    if (tradeForm.type === 'sell') {
      const newQty = Math.round((pos.quantity - qty) * 10000) / 10000
      const { error: posErr } = await supabase
        .from('investment_positions')
        .update({ quantity: newQty, is_active: newQty > 0 })
        .eq('id', pos.id)
      if (posErr) toast.error('Error al actualizar la posición')
    }

    // 3. Si el usuario quiere reflejar el ingreso en una cuenta
    if (tradeForm.create_transaction && tradeForm.dest_account_id) {
      const destAcc = accounts.find(a => a.id === tradeForm.dest_account_id)
      const isUSD   = destAcc?.currency === 'USD' || destAcc?.currency === 'USDT'
      const typeLabel = TRADE_LABELS[tradeForm.type] ?? tradeForm.type

      await supabase.from('transactions').insert({
        user_id: user.id,
        type: 'income',
        amount_original: proceeds,
        currency_original: isUSD ? 'USD' : 'ARS',
        amount_ars: isUSD ? (mep ? proceeds * mep : proceeds * 1200) : proceeds,
        amount_usd: isUSD ? proceeds : (mep ? proceeds / mep : proceeds / 1200),
        exchange_rate: mep ?? 1200,
        exchange_rate_type: 'mep',
        description: `${typeLabel} — ${pos.name}`,
        date: tradeForm.date,
        account_id: tradeForm.dest_account_id,
        is_recurring: false,
      })
    }

    toast.success(
      tradeForm.type === 'sell'
        ? `Venta registrada${tradeForm.create_transaction ? ' e ingreso acreditado en tu cuenta' : ''}`
        : `${TRADE_LABELS[tradeForm.type]} registrado`
    )
    setShowTradeForm(false)
    setTradeForm(EMPTY_TRADE)
    setSavingTrade(false)

    // Si vendió todo, volver a la lista
    if (tradeForm.type === 'sell' && parseFloat(tradeForm.quantity) >= pos.quantity) {
      router.push('/investments')
    } else {
      load()
    }
  }

  if (loading) return (
    <div className="h-40 flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>
      Cargando...
    </div>
  )
  if (!pos) return (
    <div className="text-center py-20" style={{ color: 'var(--text-muted)' }}>No encontrado</div>
  )

  const currentPriceUSD = pos.current_price_usd ?? pos.avg_purchase_price
  const valueUSD  = pos.asset_type === 'fixed_term' ? pos.quantity * pos.avg_purchase_price : pos.quantity * currentPriceUSD
  const valueARS  = mep ? valueUSD * mep : 0
  const costUSD   = pos.quantity * pos.avg_purchase_price
  const pnlUSD    = valueUSD - costUSD
  const returnPct = pos.manual_return_pct ?? (pos.current_price_usd
    ? ((pos.current_price_usd - pos.avg_purchase_price) / pos.avg_purchase_price) * 100
    : null)
  const isPositive = (returnPct ?? 0) >= 0

  const isSell = tradeForm.type === 'sell'

  return (
    <div className="max-w-lg mx-auto space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-xl"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <ArrowLeft size={18} style={{ color: 'var(--text-secondary)' }} />
          </button>
          <div>
            <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{pos.name}</h1>
            {pos.ticker && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{pos.ticker}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowTradeForm(!showTradeForm); setShowEditForm(false); setTradeForm(EMPTY_TRADE) }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: showTradeForm ? 'var(--surface-elevated)' : 'var(--accent)' }}
          >
            {showTradeForm
              ? <X size={15} style={{ color: 'var(--text-secondary)' }} />
              : <><Plus size={15} /> Operación</>
            }
          </button>
          <button onClick={() => { openEdit(); setShowTradeForm(false) }}
            className="p-2 rounded-xl transition-colors"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: showEditForm ? 'var(--accent-icon)' : 'var(--text-muted)' }}
            title="Editar posición">
            <Pencil size={16} />
          </button>
          <button onClick={handleDelete} className="p-2 rounded-xl hover:text-red-400 transition-colors"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Formulario de edición */}
      {showEditForm && (
        <div className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Editar posición</h3>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Nombre</label>
              <input value={editForm.name}
                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                placeholder="ej: AAPL, Balanz FCI" className="input-base" autoFocus />
            </div>
            {pos.ticker !== null && (
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Ticker</label>
                <input value={editForm.ticker}
                  onChange={e => setEditForm(f => ({ ...f, ticker: e.target.value.toUpperCase() }))}
                  placeholder="ej: AAPL" className="input-base" />
              </div>
            )}
            <div className={pos.ticker !== null ? '' : 'col-span-2'}>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Cuenta</label>
              <select value={editForm.account_id}
                onChange={e => setEditForm(f => ({ ...f, account_id: e.target.value }))}
                className="input-base">
                <option value="">Sin cuenta</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Cantidad</label>
              <input type="number" step="any" value={editForm.quantity}
                onChange={e => setEditForm(f => ({ ...f, quantity: e.target.value }))}
                placeholder="0" className="input-base" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Precio promedio</label>
              <input type="number" step="any" value={editForm.avg_purchase_price}
                onChange={e => setEditForm(f => ({ ...f, avg_purchase_price: e.target.value }))}
                placeholder="0.00" className="input-base" />
            </div>
          </div>

          {pos.asset_type === 'fixed_term' && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>TNA %</label>
                <input type="number" step="any" value={editForm.fixed_term_tna}
                  onChange={e => setEditForm(f => ({ ...f, fixed_term_tna: e.target.value }))}
                  placeholder="0" className="input-base" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Inicio</label>
                <input type="date" value={editForm.fixed_term_start}
                  onChange={e => setEditForm(f => ({ ...f, fixed_term_start: e.target.value }))}
                  className="input-base" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Vencimiento</label>
                <input type="date" value={editForm.fixed_term_end}
                  onChange={e => setEditForm(f => ({ ...f, fixed_term_end: e.target.value }))}
                  className="input-base" />
              </div>
            </div>
          )}

          {!pos.ticker && pos.asset_type !== 'fixed_term' && (
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Rendimiento manual <span style={{ color: 'var(--text-faint)' }}>(opcional, %)</span>
              </label>
              <input type="number" step="any" value={editForm.manual_return_pct}
                onChange={e => setEditForm(f => ({ ...f, manual_return_pct: e.target.value }))}
                placeholder="ej: 12.5" className="input-base" />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Notas <span style={{ color: 'var(--text-faint)' }}>(opcional)</span>
            </label>
            <input value={editForm.notes}
              onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Notas sobre esta posición" className="input-base" />
          </div>

          <div className="flex gap-2">
            <button onClick={() => setShowEditForm(false)}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium"
              style={{ background: 'var(--surface-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
              Cancelar
            </button>
            <button onClick={handleSaveEdit} disabled={savingEdit}
              className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ background: 'var(--accent)' }}>
              {savingEdit && <Loader2 size={14} className="animate-spin" />}
              Guardar cambios
            </button>
          </div>
        </div>
      )}

      {/* Formulario nueva operación */}
      {showTradeForm && (
        <div className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Nueva operación</h3>

          {/* Tipo */}
          <div className="grid grid-cols-2 gap-2">
            {TRADE_TYPES.map(t => (
              <button key={t.value} onClick={() => setTradeForm(f => ({ ...f, type: t.value as TradeForm['type'] }))}
                className="text-left px-3 py-2.5 rounded-xl text-sm transition-all"
                style={tradeForm.type === t.value
                  ? { background: 'var(--accent-bg)', border: '1.5px solid var(--accent-border)', color: 'var(--accent-text)' }
                  : { background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }
                }>
                <p className="font-semibold">{t.label}</p>
                <p className="text-xs mt-0.5 opacity-70">{t.desc}</p>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Cantidad (solo para venta) */}
            {isSell && (
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Cantidad <span style={{ color: 'var(--text-faint)' }}>(máx. {pos.quantity})</span>
                </label>
                <input type="number" step="any" value={tradeForm.quantity}
                  onChange={e => setTradeForm(f => ({ ...f, quantity: e.target.value }))}
                  placeholder={`0 – ${pos.quantity}`} className="input-base" />
              </div>
            )}

            {/* Precio */}
            <div className={isSell ? '' : 'col-span-2'}>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                {isSell ? 'Precio de venta (USD)' : 'Monto (USD)'}
              </label>
              <input type="number" step="any" value={tradeForm.price}
                onChange={e => setTradeForm(f => ({ ...f, price: e.target.value }))}
                placeholder="0.00" className="input-base" />
            </div>
          </div>

          {/* Fecha */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Fecha</label>
            <input type="date" value={tradeForm.date}
              onChange={e => setTradeForm(f => ({ ...f, date: e.target.value }))}
              className="input-base" />
          </div>

          {/* Preview P&L para ventas */}
          {isSell && tradeForm.quantity && tradeForm.price && (
            (() => {
              const qty    = parseFloat(tradeForm.quantity)
              const price  = parseFloat(tradeForm.price)
              const proceeds = qty * price
              const cost     = qty * pos.avg_purchase_price
              const pnl      = proceeds - cost
              return (
                <div className="rounded-xl p-3 space-y-1.5" style={{ background: 'var(--surface-elevated)' }}>
                  <div className="flex justify-between text-xs">
                    <span style={{ color: 'var(--text-muted)' }}>Cobro estimado</span>
                    <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{formatUSD(proceeds)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span style={{ color: 'var(--text-muted)' }}>Costo original</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{formatUSD(cost)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold pt-1" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>P&L</span>
                    <span style={{ color: pnl >= 0 ? 'var(--income)' : 'var(--expense)' }}>
                      {pnl >= 0 ? '+' : ''}{formatUSD(pnl)}
                    </span>
                  </div>
                </div>
              )
            })()
          )}

          {/* Destino del dinero */}
          <div className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid var(--accent-border)' }}>
            <div className="flex items-center gap-2">
              <ArrowDownToLine size={14} style={{ color: 'var(--accent-icon)' }} />
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                ¿A qué cuenta van los fondos?
              </p>
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={tradeForm.create_transaction}
                onChange={e => setTradeForm(f => ({ ...f, create_transaction: e.target.checked }))}
                className="accent-indigo-500" style={{ width: 15, height: 15 }} />
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Registrar ingreso automáticamente en una cuenta
              </span>
            </label>

            {tradeForm.create_transaction && (
              <select value={tradeForm.dest_account_id}
                onChange={e => setTradeForm(f => ({ ...f, dest_account_id: e.target.value }))}
                className="input-base">
                <option value="">Seleccioná una cuenta...</option>
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>
                ))}
              </select>
            )}

            {!tradeForm.create_transaction && (
              <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
                Solo se registra en el historial de la posición, sin afectar tus cuentas.
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <button onClick={() => setShowTradeForm(false)}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium"
              style={{ background: 'var(--surface-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
              Cancelar
            </button>
            <button onClick={handleSaveTrade} disabled={savingTrade}
              className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ background: 'var(--accent)' }}>
              {savingTrade && <Loader2 size={14} className="animate-spin" />}
              Confirmar {TRADE_LABELS[tradeForm.type]}
            </button>
          </div>
        </div>
      )}

      {/* Card principal */}
      <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Valor actual</p>
            <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{formatUSD(valueUSD)}</p>
            {mep && <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>{formatARS(valueARS)}</p>}
          </div>
          {returnPct !== null && (
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-sm font-bold"
              style={{
                background: isPositive ? 'var(--income-bg)' : 'var(--expense-bg)',
                color: isPositive ? 'var(--income)' : 'var(--expense)',
              }}>
              {isPositive ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
              {formatPercent(returnPct)}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <div>
            <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Cantidad</p>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{pos.quantity}</p>
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Precio compra</p>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{formatUSD(pos.avg_purchase_price)}</p>
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>P&L</p>
            <p className="text-sm font-semibold" style={{ color: pnlUSD >= 0 ? 'var(--income)' : 'var(--expense)' }}>
              {pnlUSD >= 0 ? '+' : ''}{formatUSD(pnlUSD)}
            </p>
          </div>
        </div>

        {/* Precio actual + refresh */}
        {pos.ticker && (
          <div className="flex items-center justify-between mt-3 pt-3"
            style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <div>
              <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Precio actual</p>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {pos.current_price_usd ? formatUSD(pos.current_price_usd) : 'No disponible'}
              </p>
              {pos.last_price_update && (
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-faint)' }}>
                  {new Date(pos.last_price_update).toLocaleString('es-AR')}
                </p>
              )}
            </div>
            <button onClick={refreshPrice} disabled={refreshing}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
              style={{ background: 'var(--accent-bg)', color: 'var(--accent-text)', border: '1px solid var(--accent-border)' }}>
              <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
              Actualizar
            </button>
          </div>
        )}

        {/* Rendimiento manual */}
        {!pos.ticker && pos.asset_type !== 'fixed_term' && (
          <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Rendimiento manual</p>
              <button onClick={() => { setEditingReturn(true); setManualReturn(pos.manual_return_pct?.toString() ?? '') }}
                className="text-xs" style={{ color: 'var(--accent)' }}>Editar</button>
            </div>
            {editingReturn ? (
              <div className="flex gap-2 mt-2">
                <input value={manualReturn} onChange={e => setManualReturn(e.target.value)}
                  type="number" step="0.01" placeholder="%" className="input-base flex-1 !py-1.5 text-sm" autoFocus />
                <button onClick={saveManualReturn}
                  className="px-3 py-1.5 text-white text-xs rounded-lg font-semibold"
                  style={{ background: 'var(--accent)' }}>OK</button>
                <button onClick={() => setEditingReturn(false)}
                  className="px-3 py-1.5 text-xs rounded-lg"
                  style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>✕</button>
              </div>
            ) : (
              <p className="text-sm font-semibold mt-1" style={{ color: 'var(--text-primary)' }}>
                {pos.manual_return_pct !== null ? `${pos.manual_return_pct}%` : '—'}
              </p>
            )}
          </div>
        )}

        {/* Plazo fijo info */}
        {pos.asset_type === 'fixed_term' && (
          <div className="grid grid-cols-3 gap-3 mt-3 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <div>
              <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>TNA</p>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{pos.fixed_term_tna}%</p>
            </div>
            <div>
              <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Inicio</p>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{pos.fixed_term_start}</p>
            </div>
            <div>
              <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Vence</p>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{pos.fixed_term_end}</p>
            </div>
          </div>
        )}
      </div>

      {/* Historial de operaciones */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Historial de operaciones</h2>
        </div>
        {trades.length === 0 ? (
          <p className="text-center text-sm py-8" style={{ color: 'var(--text-muted)' }}>Sin operaciones registradas</p>
        ) : (
          <div>
            {trades.map((trade, i) => (
              <div key={trade.id} className="flex items-center justify-between px-4 py-3"
                style={{ borderTop: i > 0 ? '1px solid var(--border-subtle)' : 'none' }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {TRADE_LABELS[trade.type] ?? trade.type}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {formatDate(trade.date)}
                    {trade.quantity && ` · ${trade.quantity} u`}
                    {` · ${formatUSD(trade.price)}`}
                  </p>
                </div>
                <p className="text-sm font-semibold"
                  style={{ color: trade.type === 'buy' ? 'var(--expense)' : 'var(--income)' }}>
                  {trade.type === 'buy' ? '−' : '+'}
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
