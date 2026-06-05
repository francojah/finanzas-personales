'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Pencil, Trash2, Wallet, SlidersHorizontal, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { formatARS, formatUSD } from '@/lib/utils'
import { usePlan } from '@/hooks/usePlan'
import { UpgradeModal } from '@/components/shared/UpgradeModal'
import type { Account, AccountType, Currency } from '@/types/database'

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: 'bank',    label: 'Banco'    },
  { value: 'broker',  label: 'Broker'   },
  { value: 'crypto',  label: 'Crypto'   },
  { value: 'cash',    label: 'Efectivo' },
  { value: 'savings', label: 'Ahorro'   },
]
const CURRENCIES: Currency[] = ['ARS', 'USD', 'USDT']
const PLATFORMS = [
  { value: 'galicia',     label: 'Banco Galicia'  },
  { value: 'balanz',      label: 'Balanz'         },
  { value: 'etoro',       label: 'eToro'          },
  { value: 'binance',     label: 'Binance'        },
  { value: 'mercadopago', label: 'Mercado Pago'   },
  { value: 'otro',        label: 'Otro'           },
]
const COLORS = ['#6366f1','#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#64748b']

interface FormState { name: string; type: AccountType; platform: string; currency: Currency; initial_balance: string; color: string }
const EMPTY: FormState = { name: '', type: 'bank', platform: 'otro', currency: 'ARS', initial_balance: '0', color: '#6366f1' }

export default function AccountsSettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  const { features } = usePlan()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Account | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [showUpgrade, setShowUpgrade] = useState(false)

  // Reconciliation state
  const [reconcileAcc, setReconcileAcc] = useState<Account | null>(null)
  const [calculatedBalance, setCalculatedBalance] = useState<number | null>(null)
  const [realBalance, setRealBalance] = useState('')
  const [reconciling, setReconciling] = useState(false)

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('accounts').select('*').order('sort_order').order('created_at')
    setAccounts(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openNew() {
    const activeAccounts = accounts.filter(a => a.is_active).length
    if (activeAccounts >= features.maxAccounts) {
      setShowUpgrade(true)
      return
    }
    setEditing(null); setForm(EMPTY); setShowForm(true)
  }
  function openEdit(acc: Account) {
    setEditing(acc)
    setForm({ name: acc.name, type: acc.type, platform: acc.platform ?? 'otro', currency: acc.currency as Currency, initial_balance: acc.initial_balance.toString(), color: acc.color })
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error('Ingresá un nombre'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const payload = { user_id: user.id, name: form.name.trim(), type: form.type, platform: form.platform === 'otro' ? null : form.platform, currency: form.currency, initial_balance: parseFloat(form.initial_balance) || 0, color: form.color }
    const { error } = editing
      ? await supabase.from('accounts').update(payload).eq('id', editing.id)
      : await supabase.from('accounts').insert(payload)
    if (error) { toast.error('Error al guardar'); setSaving(false); return }
    toast.success(editing ? 'Cuenta actualizada' : 'Cuenta creada')
    setShowForm(false); load(); setSaving(false)
  }

  async function handleDelete(acc: Account) {
    if (!confirm(`¿Eliminar "${acc.name}"?`)) return
    await supabase.from('accounts').delete().eq('id', acc.id)
    toast.success('Cuenta eliminada'); load()
  }

  // ── Reconciliación ───────────────────────────────────────────
  async function openReconcile(acc: Account) {
    setReconcileAcc(acc)
    setRealBalance('')
    // Calcular saldo: initial_balance + ingresos - gastos - transferencias salientes + transferencias entrantes
    const [incRes, expRes, transOutRes, transInRes] = await Promise.all([
      supabase.from('transactions').select('amount_ars, amount_usd').eq('account_id', acc.id).eq('type', 'income'),
      supabase.from('transactions').select('amount_ars, amount_usd').eq('account_id', acc.id).eq('type', 'expense'),
      supabase.from('transactions').select('amount_ars, amount_usd').eq('account_id', acc.id).eq('type', 'transfer'),
      supabase.from('transactions').select('amount_ars, amount_usd').eq('transfer_to_account_id', acc.id).eq('type', 'transfer'),
    ])
    const isUSD = acc.currency === 'USD' || acc.currency === 'USDT'
    const field = isUSD ? 'amount_usd' : 'amount_ars'
    const sum = (rows: any[]) => (rows ?? []).reduce((s: number, r: any) => s + (r[field] ?? 0), 0)
    const calc = acc.initial_balance + sum(incRes.data ?? []) - sum(expRes.data ?? []) - sum(transOutRes.data ?? []) + sum(transInRes.data ?? [])
    setCalculatedBalance(Math.round(calc * 100) / 100)
  }

  async function handleReconcile() {
    if (!reconcileAcc || realBalance === '') return
    const real = parseFloat(realBalance)
    const diff = real - (calculatedBalance ?? 0)
    if (Math.abs(diff) < 0.01) { toast.success('¡Saldo coincide, no hay diferencia!'); setReconcileAcc(null); return }
    setReconciling(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const isUSD = reconcileAcc.currency === 'USD' || reconcileAcc.currency === 'USDT'
    await supabase.from('transactions').insert({
      user_id: user.id,
      type: diff > 0 ? 'income' : 'expense',
      amount_original: Math.abs(diff),
      currency_original: reconcileAcc.currency,
      amount_ars: isUSD ? Math.abs(diff) * 1200 : Math.abs(diff),
      amount_usd: isUSD ? Math.abs(diff) : Math.abs(diff) / 1200,
      exchange_rate: 1200,
      exchange_rate_type: 'mep',
      description: 'Ajuste de saldo (reconciliación)',
      date: new Date().toISOString().split('T')[0],
      account_id: reconcileAcc.id,
      is_recurring: false,
    })
    toast.success(`Ajuste de ${isUSD ? formatUSD(Math.abs(diff)) : formatARS(Math.abs(diff))} registrado`)
    setReconcileAcc(null)
    setReconciling(false)
  }

  const isUSD = reconcileAcc?.currency === 'USD' || reconcileAcc?.currency === 'USDT'
  const diff  = reconcileAcc && realBalance !== '' ? parseFloat(realBalance) - (calculatedBalance ?? 0) : null

  return (
    <>
    <div className="max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <ArrowLeft size={18} style={{ color: 'var(--text-secondary)' }} />
          </button>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Cuentas</h1>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: 'var(--accent)' }}>
          <Plus size={15} /> Nueva
        </button>
      </div>

      {/* Reconcile modal */}
      {reconcileAcc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-sm rounded-2xl p-6 space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Ajustar saldo</h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Cuenta: <strong>{reconcileAcc.name}</strong>
            </p>
            <div className="rounded-xl px-4 py-3" style={{ background: 'var(--surface-elevated)' }}>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Saldo calculado por la app</p>
              <p className="text-xl font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>
                {calculatedBalance !== null ? (isUSD ? formatUSD(calculatedBalance) : formatARS(calculatedBalance)) : '...'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Saldo real en tu banco / billetera
              </label>
              <input
                type="number"
                step="any"
                value={realBalance}
                onChange={e => setRealBalance(e.target.value)}
                placeholder="0.00"
                className="input-base"
                autoFocus
              />
            </div>
            {diff !== null && Math.abs(diff) > 0.01 && (
              <div className="rounded-xl px-4 py-3" style={{ background: diff > 0 ? 'var(--income-bg)' : 'var(--expense-bg)' }}>
                <p className="text-xs font-medium" style={{ color: diff > 0 ? 'var(--income)' : 'var(--expense)' }}>
                  Diferencia: {diff > 0 ? '+' : ''}{isUSD ? formatUSD(diff) : formatARS(diff)}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Se creará un ajuste de {diff > 0 ? 'ingreso' : 'gasto'} para cuadrar el saldo
                </p>
              </div>
            )}
            {diff !== null && Math.abs(diff) < 0.01 && realBalance !== '' && (
              <p className="text-sm text-center" style={{ color: 'var(--income)' }}>✓ El saldo ya está cuadrado</p>
            )}
            <div className="flex gap-2 pt-1">
              <button onClick={() => setReconcileAcc(null)} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ background: 'var(--surface-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                Cancelar
              </button>
              <button onClick={handleReconcile} disabled={reconciling || realBalance === ''} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2" style={{ background: 'var(--accent)' }}>
                {reconciling && <Loader2 size={14} className="animate-spin" />}
                Aplicar ajuste
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="rounded-xl mb-5 p-5 space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{editing ? 'Editar cuenta' : 'Nueva cuenta'}</h2>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Nombre</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="ej: Galicia Caja de Ahorro" className="input-base" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Tipo</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as AccountType }))} className="input-base">
                {ACCOUNT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Moneda</label>
              <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value as Currency }))} className="input-base">
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Plataforma</label>
              <select value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))} className="input-base">
                {PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Saldo inicial</label>
              <input type="number" value={form.initial_balance} onChange={e => setForm(f => ({ ...f, initial_balance: e.target.value }))} className="input-base" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Color</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))}
                  className="w-8 h-8 rounded-lg transition-all"
                  style={{ backgroundColor: c, outline: form.color === c ? `3px solid ${c}` : 'none', outlineOffset: 2 }} />
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ background: 'var(--surface-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60" style={{ background: 'var(--accent)' }}>{saving ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'var(--surface)' }} />)}</div>
      ) : accounts.length === 0 && !showForm ? (
        <div className="text-center py-16">
          <Wallet size={40} className="mx-auto mb-3" style={{ color: 'var(--text-faint)' }} />
          <p className="mb-4" style={{ color: 'var(--text-muted)' }}>No hay cuentas todavía</p>
          <button onClick={openNew} className="text-sm font-medium" style={{ color: 'var(--accent)' }}>+ Crear primera cuenta</button>
        </div>
      ) : (
        <div className="space-y-2">
          {accounts.map(acc => (
            <div key={acc.id} className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: acc.color + '18' }}>
                <Wallet size={18} style={{ color: acc.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{acc.name}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {ACCOUNT_TYPES.find(t => t.value === acc.type)?.label} · {acc.currency}
                  {acc.platform && ` · ${PLATFORMS.find(p => p.value === acc.platform)?.label ?? acc.platform}`}
                </p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openReconcile(acc)} title="Ajustar saldo" className="p-2 rounded-lg transition-colors" style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent-icon)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
                  <SlidersHorizontal size={15} />
                </button>
                <button onClick={() => openEdit(acc)} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--text-muted)' }}>
                  <Pencil size={15} />
                </button>
                <button onClick={() => handleDelete(acc)} className="p-2 rounded-lg transition-colors hover:text-red-400" style={{ color: 'var(--text-muted)' }}>
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>

    <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} feature="cuentas ilimitadas" />
    </>
  )
}
