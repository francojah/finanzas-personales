'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Search, Loader2, GitMerge } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAccounts } from '@/hooks/useAccounts'
import { formatUSD } from '@/lib/utils'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { AssetType, Currency } from '@/types/database'

const ASSET_TYPES: { value: AssetType; label: string; source: 'yahoo' | 'coingecko' | 'manual' }[] = [
  { value: 'stock',      label: 'Acción',     source: 'yahoo'     },
  { value: 'etf',        label: 'ETF',        source: 'yahoo'     },
  { value: 'cedear',     label: 'CEDEAR',     source: 'yahoo'     },
  { value: 'crypto',     label: 'Crypto',     source: 'coingecko' },
  { value: 'bond',       label: 'Bono',       source: 'manual'    },
  { value: 'on',         label: 'ON',         source: 'manual'    },
  { value: 'fci',        label: 'FCI',        source: 'manual'    },
  { value: 'fixed_term', label: 'Plazo Fijo', source: 'manual'    },
]

interface Form {
  name: string; ticker: string; asset_type: AssetType; account_id: string
  quantity: string; avg_purchase_price: string; purchase_currency: Currency
  manual_return_pct: string; fixed_term_start: string; fixed_term_end: string
  fixed_term_tna: string; notes: string
}

const EMPTY: Form = {
  name: '', ticker: '', asset_type: 'stock', account_id: '',
  quantity: '', avg_purchase_price: '', purchase_currency: 'USD',
  manual_return_pct: '', fixed_term_start: '', fixed_term_end: '',
  fixed_term_tna: '', notes: '',
}

interface ExistingPosition {
  id: string; quantity: number; avg_purchase_price: number; name: string
}

export default function NewInvestmentPage() {
  const router = useRouter()
  const supabase = createClient()
  const { accounts } = useAccounts()
  const [form, setForm] = useState<Form>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [lookingUpPrice, setLookingUpPrice] = useState(false)
  const [priceFound, setPriceFound] = useState<number | null>(null)
  const [priceError, setPriceError] = useState(false)
  // Posición existente detectada
  const [existingPos, setExistingPos] = useState<ExistingPosition | null>(null)
  const [checkingExisting, setCheckingExisting] = useState(false)

  const assetConfig = ASSET_TYPES.find(a => a.value === form.asset_type)!
  const isFixedTerm = form.asset_type === 'fixed_term'
  const needsTicker = ['stock', 'etf', 'cedear', 'crypto'].includes(form.asset_type)

  function set(key: keyof Form, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  // Buscar precio y verificar si ya existe posición
  async function lookupPrice() {
    if (!form.ticker) return
    setLookingUpPrice(true)
    setPriceFound(null)
    setPriceError(false)

    try {
      const source = assetConfig.source === 'coingecko' ? 'coingecko' : 'yahoo'
      const res = await fetch(`/api/prices?ticker=${form.ticker}&source=${source}`)
      if (!res.ok) throw new Error()
      const { price } = await res.json()
      setPriceFound(price)
      if (!form.avg_purchase_price) set('avg_purchase_price', price.toString())
    } catch {
      setPriceError(true)
    } finally {
      setLookingUpPrice(false)
    }
  }

  // Verificar posición existente al cambiar cuenta o ticker/nombre
  async function checkExistingPosition() {
    if (!form.account_id) return
    const lookupField = needsTicker && form.ticker ? form.ticker : form.name.trim()
    if (!lookupField) { setExistingPos(null); return }

    setCheckingExisting(true)
    const query = supabase
      .from('investment_positions')
      .select('id, quantity, avg_purchase_price, name')
      .eq('is_active', true)
      .eq('account_id', form.account_id)
      .eq('asset_type', form.asset_type)

    const { data } = needsTicker && form.ticker
      ? await query.ilike('ticker', form.ticker)
      : await query.ilike('name', lookupField)

    setExistingPos(data && data.length > 0 ? (data[0] as ExistingPosition) : null)
    setCheckingExisting(false)
  }

  // Calcular precio promedio resultante
  const mergedPreview = (() => {
    if (!existingPos || !form.quantity || !form.avg_purchase_price) return null
    const newQty = parseFloat(form.quantity)
    const newPrice = parseFloat(form.avg_purchase_price)
    const totalQty = existingPos.quantity + newQty
    const avgPrice = (existingPos.quantity * existingPos.avg_purchase_price + newQty * newPrice) / totalQty
    return { totalQty, avgPrice }
  })()

  async function handleSave() {
    if (!form.name.trim()) { toast.error('Ingresá un nombre'); return }
    if (!form.quantity || parseFloat(form.quantity) <= 0) { toast.error('Ingresá la cantidad'); return }
    if (!form.avg_purchase_price) { toast.error('Ingresá el precio de compra'); return }
    if (!form.account_id) { toast.error('Seleccioná una cuenta'); return }

    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const newQty   = parseFloat(form.quantity)
    const newPrice = parseFloat(form.avg_purchase_price)

    if (existingPos) {
      // ── FUSIONAR con posición existente ─────────────────────────
      const totalQty  = existingPos.quantity + newQty
      const avgPrice  = (existingPos.quantity * existingPos.avg_purchase_price + newQty * newPrice) / totalQty

      const { error: updateError } = await supabase
        .from('investment_positions')
        .update({
          quantity: totalQty,
          avg_purchase_price: avgPrice,
          ...(priceFound ? {
            current_price: priceFound,
            current_price_usd: priceFound,
            last_price_update: new Date().toISOString(),
          } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingPos.id)

      if (updateError) { toast.error('Error al actualizar posición'); setSaving(false); return }

      // Registrar trade contra la posición existente
      await supabase.from('investment_trades').insert({
        user_id: user.id,
        position_id: existingPos.id,
        type: 'buy',
        quantity: newQty,
        price: newPrice,
        currency: form.purchase_currency,
        commission: 0,
        date: new Date().toISOString().split('T')[0],
        notes: form.notes || null,
      })

      toast.success(`Nueva compra registrada y fusionada con "${existingPos.name}"`)
    } else {
      // ── CREAR posición nueva ─────────────────────────────────────
      const source = needsTicker && form.ticker ? assetConfig.source : 'manual'

      const { data: pos, error } = await supabase
        .from('investment_positions')
        .insert({
          user_id: user.id,
          account_id: form.account_id,
          name: form.name.trim(),
          ticker: form.ticker || null,
          asset_type: form.asset_type,
          quantity: newQty,
          avg_purchase_price: newPrice,
          purchase_currency: form.purchase_currency,
          current_price: priceFound ?? null,
          current_price_usd: priceFound ?? null,
          price_source: source,
          manual_return_pct: form.manual_return_pct ? parseFloat(form.manual_return_pct) : null,
          fixed_term_start: form.fixed_term_start || null,
          fixed_term_end: form.fixed_term_end || null,
          fixed_term_tna: form.fixed_term_tna ? parseFloat(form.fixed_term_tna) : null,
          notes: form.notes || null,
          last_price_update: priceFound ? new Date().toISOString() : null,
        })
        .select()
        .single()

      if (error) { toast.error('Error al guardar'); setSaving(false); return }

      if (pos) {
        await supabase.from('investment_trades').insert({
          user_id: user.id, position_id: pos.id, type: 'buy',
          quantity: newQty, price: newPrice, currency: form.purchase_currency,
          commission: 0, date: new Date().toISOString().split('T')[0],
          notes: form.notes || null,
        })
      }
      toast.success('Posición agregada')
    }

    router.push('/investments')
  }

  // ─── UI ──────────────────────────────────────────────────────
  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 rounded-xl transition-colors"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <ArrowLeft size={18} style={{ color: 'var(--text-secondary)' }} />
        </button>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Nueva compra</h1>
      </div>

      <div className="space-y-5">

        {/* Tipo de activo */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Tipo de activo</label>
          <div className="grid grid-cols-4 gap-2">
            {ASSET_TYPES.map(({ value, label }) => (
              <button key={value} type="button"
                onClick={() => { set('asset_type', value); setPriceFound(null); setPriceError(false); setExistingPos(null) }}
                className="py-2 px-2 rounded-xl text-xs font-semibold transition-all text-center"
                style={form.asset_type === value
                  ? { background: 'var(--accent)', color: '#fff', border: '1px solid var(--accent)' }
                  : { background: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }
                }>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Nombre y Ticker */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Nombre</label>
            <input value={form.name}
              onChange={e => { set('name', e.target.value); setExistingPos(null) }}
              onBlur={checkExistingPosition}
              placeholder={isFixedTerm ? 'Plazo Fijo Galicia' : 'Apple Inc.'}
              className="input-base" />
          </div>
          {needsTicker && (
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Ticker</label>
              <div className="relative">
                <input value={form.ticker}
                  onChange={e => { set('ticker', e.target.value.toUpperCase()); setPriceFound(null); setPriceError(false); setExistingPos(null) }}
                  onBlur={() => { lookupPrice(); checkExistingPosition() }}
                  placeholder={form.asset_type === 'crypto' ? 'BTC' : 'AAPL'}
                  className="input-base pr-8"
                  style={priceFound ? { borderColor: 'var(--income)' } : priceError ? { borderColor: 'var(--expense)' } : {}}
                />
                <button onClick={() => { lookupPrice(); checkExistingPosition() }} disabled={lookingUpPrice || !form.ticker}
                  className="absolute right-2 top-1/2 -translate-y-1/2 disabled:opacity-40"
                  style={{ color: 'var(--text-muted)' }}>
                  {lookingUpPrice ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                </button>
              </div>
              {priceFound !== null && (
                <p className="text-xs mt-1" style={{ color: 'var(--income)' }}>✓ Precio: {formatUSD(priceFound)}</p>
              )}
              {priceError && (
                <p className="text-xs mt-1" style={{ color: '#fbbf24' }}>No encontrado — ingresá el precio manualmente</p>
              )}
            </div>
          )}
        </div>

        {/* Cuenta */}
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Cuenta / Broker</label>
          <select value={form.account_id}
            onChange={e => { set('account_id', e.target.value); setExistingPos(null) }}
            onBlur={checkExistingPosition}
            className="input-base">
            <option value="">Seleccioná...</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>

        {/* Banner posición existente */}
        {existingPos && (
          <div className="rounded-xl p-4 flex items-start gap-3"
            style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
            <GitMerge size={16} style={{ color: '#fbbf24', marginTop: 2, flexShrink: 0 }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: '#fbbf24' }}>
                Ya tenés esta posición — se va a fusionar
              </p>
              <p className="text-xs mt-1" style={{ color: '#d97706' }}>
                Actual: {existingPos.quantity} u · precio promedio {formatUSD(existingPos.avg_purchase_price)}
              </p>
              {mergedPreview && (
                <p className="text-xs mt-0.5" style={{ color: '#d97706' }}>
                  Resultado: {mergedPreview.totalQty.toFixed(4)} u · nuevo promedio {formatUSD(mergedPreview.avgPrice)}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Cantidad y precio */}
        {!isFixedTerm ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                {existingPos ? 'Cantidad a agregar' : 'Cantidad'}
              </label>
              <input value={form.quantity} onChange={e => set('quantity', e.target.value)}
                type="number" step="any" min="0" placeholder="0" className="input-base" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Precio de compra</label>
              <div className="relative">
                <input value={form.avg_purchase_price} onChange={e => set('avg_purchase_price', e.target.value)}
                  type="number" step="any" min="0" placeholder="0.00" className="input-base pr-14" />
                <select value={form.purchase_currency}
                  onChange={e => set('purchase_currency', e.target.value as Currency)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-xs border-none outline-none font-semibold cursor-pointer"
                  style={{ background: 'transparent', color: 'var(--text-muted)' }}>
                  <option value="USD">USD</option>
                  <option value="ARS">ARS</option>
                </select>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Monto invertido</label>
                <input value={form.quantity} onChange={e => set('quantity', e.target.value)}
                  type="number" placeholder="500000" className="input-base" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>TNA %</label>
                <input value={form.fixed_term_tna} onChange={e => set('fixed_term_tna', e.target.value)}
                  type="number" step="0.01" placeholder="70.00" className="input-base" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Fecha inicio</label>
                <input value={form.fixed_term_start} onChange={e => set('fixed_term_start', e.target.value)}
                  type="date" className="input-base" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Fecha vencimiento</label>
                <input value={form.fixed_term_end} onChange={e => set('fixed_term_end', e.target.value)}
                  type="date" className="input-base" />
              </div>
            </div>
          </div>
        )}

        {/* Rendimiento manual */}
        {!needsTicker && !isFixedTerm && (
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Rendimiento actual % <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>(opcional)</span>
            </label>
            <input value={form.manual_return_pct} onChange={e => set('manual_return_pct', e.target.value)}
              type="number" step="0.01" placeholder="ej: 12.5" className="input-base" />
          </div>
        )}

        {/* Notas */}
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            Notas <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>(opcional)</span>
          </label>
          <input value={form.notes} onChange={e => set('notes', e.target.value)}
            placeholder="ej: Comprado en eToro, diversificación USA" className="input-base" />
        </div>

        <button onClick={handleSave} disabled={saving}
          className="w-full py-3.5 rounded-xl text-white font-semibold transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
          style={{ background: 'var(--accent)' }}>
          {saving
            ? <><Loader2 size={16} className="animate-spin" /> Guardando...</>
            : existingPos
              ? <><GitMerge size={16} /> Fusionar compra</>
              : 'Agregar posición'
          }
        </button>
      </div>
    </div>
  )
}
