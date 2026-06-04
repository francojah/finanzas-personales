'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Pencil, Trash2, Wallet } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { Account, AccountType, Currency } from '@/types/database'

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: 'bank',    label: 'Banco'      },
  { value: 'broker',  label: 'Broker'     },
  { value: 'crypto',  label: 'Crypto'     },
  { value: 'cash',    label: 'Efectivo'   },
  { value: 'savings', label: 'Ahorro'     },
]

const CURRENCIES: Currency[] = ['ARS', 'USD', 'USDT']

const PLATFORMS = [
  { value: 'galicia',  label: 'Banco Galicia' },
  { value: 'balanz',   label: 'Balanz'        },
  { value: 'etoro',    label: 'eToro'          },
  { value: 'binance',  label: 'Binance'        },
  { value: 'mercadopago', label: 'Mercado Pago' },
  { value: 'otro',     label: 'Otro'           },
]

const COLORS = [
  '#6366f1','#3b82f6','#10b981','#f59e0b',
  '#ef4444','#8b5cf6','#ec4899','#64748b',
]

interface FormState {
  name: string
  type: AccountType
  platform: string
  currency: Currency
  initial_balance: string
  color: string
}

const EMPTY: FormState = {
  name: '', type: 'bank', platform: 'otro',
  currency: 'ARS', initial_balance: '0', color: '#6366f1',
}

export default function AccountsSettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Account | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('accounts').select('*').order('sort_order').order('created_at')
    setAccounts(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openNew() {
    setEditing(null)
    setForm(EMPTY)
    setShowForm(true)
  }

  function openEdit(acc: Account) {
    setEditing(acc)
    setForm({
      name: acc.name,
      type: acc.type,
      platform: acc.platform ?? 'otro',
      currency: acc.currency as Currency,
      initial_balance: acc.initial_balance.toString(),
      color: acc.color,
    })
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error('Ingresá un nombre'); return }
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Sesión expirada'); return }

    const payload = {
      user_id: user.id,
      name: form.name.trim(),
      type: form.type,
      platform: form.platform === 'otro' ? null : form.platform,
      currency: form.currency,
      initial_balance: parseFloat(form.initial_balance) || 0,
      color: form.color,
    }

    let error
    if (editing) {
      ({ error } = await supabase.from('accounts').update(payload).eq('id', editing.id))
    } else {
      ({ error } = await supabase.from('accounts').insert(payload))
    }

    if (error) { toast.error('Error al guardar'); console.error(error); setSaving(false); return }

    toast.success(editing ? 'Cuenta actualizada' : 'Cuenta creada')
    setShowForm(false)
    load()
    setSaving(false)
  }

  async function handleDelete(acc: Account) {
    if (!confirm(`¿Eliminar "${acc.name}"?`)) return
    const { error } = await supabase.from('accounts').delete().eq('id', acc.id)
    if (error) { toast.error('Error al eliminar'); return }
    toast.success('Cuenta eliminada')
    load()
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-xl">
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <h1 className="text-xl font-bold text-slate-900">Cuentas</h1>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
        >
          <Plus size={15} /> Nueva
        </button>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="card mb-5 space-y-4">
          <h2 className="font-semibold text-slate-800">{editing ? 'Editar cuenta' : 'Nueva cuenta'}</h2>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Nombre</label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="ej: Galicia Caja de Ahorro"
              className="input-base"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Tipo</label>
              <select
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value as AccountType }))}
                className="input-base"
              >
                {ACCOUNT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Moneda</label>
              <select
                value={form.currency}
                onChange={e => setForm(f => ({ ...f, currency: e.target.value as Currency }))}
                className="input-base"
              >
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Plataforma</label>
              <select
                value={form.platform}
                onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}
                className="input-base"
              >
                {PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Saldo inicial</label>
              <input
                type="number"
                value={form.initial_balance}
                onChange={e => setForm(f => ({ ...f, initial_balance: e.target.value }))}
                className="input-base"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Color</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, color: c }))}
                  className={cn('w-8 h-8 rounded-lg transition-all', form.color === c ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : '')}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-60"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      ) : accounts.length === 0 && !showForm ? (
        <div className="text-center py-16">
          <Wallet size={40} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-400 mb-4">No hay cuentas todavía</p>
          <button onClick={openNew} className="text-indigo-600 font-medium text-sm hover:underline">
            + Crear primera cuenta
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {accounts.map(acc => (
            <div key={acc.id} className="card flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: acc.color + '20' }}>
                <Wallet size={18} style={{ color: acc.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 truncate">{acc.name}</p>
                <p className="text-xs text-slate-400">
                  {ACCOUNT_TYPES.find(t => t.value === acc.type)?.label} · {acc.currency}
                  {acc.platform && ` · ${PLATFORMS.find(p => p.value === acc.platform)?.label ?? acc.platform}`}
                </p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(acc)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600">
                  <Pencil size={15} />
                </button>
                <button onClick={() => handleDelete(acc)} className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
