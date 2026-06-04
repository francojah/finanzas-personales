'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Search, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAccounts } from '@/hooks/useAccounts'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { AssetType, Currency } from '@/types/database'

const ASSET_TYPES: { value: AssetType; label: string; source: 'yahoo' | 'coingecko' | 'manual' }[] = [
  { value: 'stock',      label: 'Acción',      source: 'yahoo'     },
  { value: 'etf',        label: 'ETF',         source: 'yahoo'     },
  { value: 'cedear',     label: 'CEDEAR',      source: 'yahoo'     },
  { value: 'crypto',     label: 'Crypto',      source: 'coingecko' },
  { value: 'bond',       label: 'Bono',        source: 'manual'    },
  { value: 'on',         label: 'ON',          source: 'manual'    },
  { value: 'fci',        label: 'FCI',         source: 'manual'    },
  { value: 'fixed_term', label: 'Plazo Fijo',  source: 'manual'    },
]

interface Form {
  name: string
  ticker: string
  asset_type: AssetType
  account_id: string
  quantity: string
  avg_purchase_price: string
  purchase_currency: Currency
  manual_return_pct: string
  // Plazo fijo
  fixed_term_start: string
  fixed_term_end: string
  fixed_term_tna: string
  notes: string
}

const EMPTY: Form = {
  name: '', ticker: '', asset_type: 'stock', account_id: '',
  quantity: '', avg_purchase_price: '', purchase_currency: 'USD',
  manual_return_pct: '', fixed_term_start: '', fixed_term_end: '',
  fixed_term_tna: '', notes: '',
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

  const assetConfig = ASSET_TYPES.find(a => a.value === form.asset_type)!
  const isFixedTerm = form.asset_type === 'fixed_term'
  const needsTicker = ['stock', 'etf', 'cedear', 'crypto'].includes(form.asset_type)

  function set(key: keyof Form, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  // Buscar precio automáticamente
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

  async function handleSave() {
    if (!form.name.trim()) { toast.error('Ingresá un nombre'); return }
    if (!form.quantity || parseFloat(form.quantity) <= 0) { toast.error('Ingresá la cantidad'); return }
    if (!form.avg_purchase_price) { toast.error('Ingresá el precio de compra'); return }
    if (!form.account_id) { toast.error('Seleccioná una cuenta'); return }

    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const source = needsTicker && form.ticker
      ? assetConfig.source
      : 'manual'

    const payload = {
      user_id: user.id,
      account_id: form.account_id,
      name: form.name.trim(),
      ticker: form.ticker || null,
      asset_type: form.asset_type,
      quantity: parseFloat(form.quantity),
      avg_purchase_price: parseFloat(form.avg_purchase_price),
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
    }

    const { data: pos, error } = await supabase
      .from('investment_positions')
      .insert(payload)
      .select()
      .single()

    if (error) { toast.error('Error al guardar'); console.warn(error); setSaving(false); return }

    // Registrar el trade de compra inicial
    if (pos) {
      await supabase.from('investment_trades').insert({
        user_id: user.id,
        position_id: pos.id,
        type: 'buy',
        quantity: parseFloat(form.quantity),
        price: parseFloat(form.avg_purchase_price),
        currency: form.purchase_currency,
        date: new Date().toISOString().split('T')[0],
      })
    }

    toast.success('Posición agregada')
    router.push('/investments')
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-xl">
          <ArrowLeft size={20} className="text-slate-600" />
        </button>
        <h1 className="text-xl font-bold text-slate-900">Nueva posición</h1>
      </div>

      <div className="space-y-5">

        {/* Tipo de activo */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Tipo de activo</label>
          <div className="grid grid-cols-4 gap-2">
            {ASSET_TYPES.map(({ value, label }) => (
              <button key={value} type="button"
                onClick={() => { set('asset_type', value); setPriceFound(null); setPriceError(false) }}
                className={cn(
                  'py-2 px-2 rounded-xl border text-xs font-semibold transition-all text-center',
                  form.asset_type === value
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300 bg-white'
                )}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Nombre y ticker */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Nombre</label>
            <input value={form.name} onChange={e => set('name', e.target.value)}
              placeholder={isFixedTerm ? 'Plazo Fijo Galicia' : 'Apple Inc.'}
              className="input-base" />
          </div>
          {needsTicker && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Ticker</label>
              <div className="relative">
                <input value={form.ticker}
                  onChange={e => { set('ticker', e.target.value.toUpperCase()); setPriceFound(null); setPriceError(false) }}
                  onBlur={lookupPrice}
                  placeholder={form.asset_type === 'crypto' ? 'BTC' : 'AAPL'}
                  className={cn('input-base pr-8', priceFound ? 'border-green-400' : priceError ? 'border-red-300' : '')}
                />
                <button onClick={lookupPrice} disabled={lookingUpPrice || !form.ticker}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 disabled:opacity-40">
                  {lookingUpPrice
                    ? <Loader2 size={14} className="animate-spin" />
                    : <Search size={14} />
                  }
                </button>
              </div>
              {priceFound !== null && (
                <p className="text-xs text-green-600 mt-1">✓ Precio encontrado: ${priceFound.toFixed(2)}</p>
              )}
              {priceError && (
                <p className="text-xs text-amber-600 mt-1">No encontrado — podés ingresar el precio manualmente</p>
              )}
            </div>
          )}
        </div>

        {/* Cuenta */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Cuenta / Broker</label>
          <select value={form.account_id} onChange={e => set('account_id', e.target.value)} className="input-base">
            <option value="">Seleccioná...</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>

        {/* Cantidad y precio */}
        {!isFixedTerm ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Cantidad</label>
              <input value={form.quantity} onChange={e => set('quantity', e.target.value)}
                type="number" step="any" min="0" placeholder="0" className="input-base" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Precio promedio compra</label>
              <div className="relative">
                <input value={form.avg_purchase_price} onChange={e => set('avg_purchase_price', e.target.value)}
                  type="number" step="any" min="0" placeholder="0.00" className="input-base pr-14" />
                <select value={form.purchase_currency}
                  onChange={e => set('purchase_currency', e.target.value as Currency)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-xs bg-transparent border-none outline-none text-slate-500 font-semibold cursor-pointer">
                  <option value="USD">USD</option>
                  <option value="ARS">ARS</option>
                </select>
              </div>
            </div>
          </div>
        ) : (
          /* Plazo fijo */
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Monto invertido</label>
                <input value={form.quantity} onChange={e => set('quantity', e.target.value)}
                  type="number" placeholder="500000" className="input-base" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">TNA %</label>
                <input value={form.fixed_term_tna} onChange={e => set('fixed_term_tna', e.target.value)}
                  type="number" step="0.01" placeholder="70.00" className="input-base" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Fecha inicio</label>
                <input value={form.fixed_term_start} onChange={e => set('fixed_term_start', e.target.value)}
                  type="date" className="input-base" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Fecha vencimiento</label>
                <input value={form.fixed_term_end} onChange={e => set('fixed_term_end', e.target.value)}
                  type="date" className="input-base" />
              </div>
            </div>
            {/* avg_purchase_price = precio unitario = 1 para plazo fijo (monto = quantity) */}
            <input type="hidden" value="1" onChange={() => set('avg_purchase_price', '1')} />
          </div>
        )}

        {/* Rendimiento manual (para activos sin ticker) */}
        {!needsTicker && !isFixedTerm && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Rendimiento actual % <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            <input value={form.manual_return_pct} onChange={e => set('manual_return_pct', e.target.value)}
              type="number" step="0.01" placeholder="ej: 12.5" className="input-base" />
          </div>
        )}

        {/* Notas */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Notas <span className="text-slate-400 font-normal">(opcional)</span>
          </label>
          <input value={form.notes} onChange={e => set('notes', e.target.value)}
            placeholder="ej: Comprado en eToro, diversificación USA" className="input-base" />
        </div>

        {/* Submit */}
        <button onClick={handleSave} disabled={saving}
          className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors disabled:opacity-60">
          {saving ? 'Guardando...' : 'Agregar posición'}
        </button>
      </div>
    </div>
  )
}
