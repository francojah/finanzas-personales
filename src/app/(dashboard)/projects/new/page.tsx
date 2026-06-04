'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Target, Wallet } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAccounts } from '@/hooks/useAccounts'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { ProjectType, Currency } from '@/types/database'

const COLORS = [
  '#10b981','#6366f1','#f59e0b','#3b82f6',
  '#ec4899','#8b5cf6','#ef4444','#06b6d4',
]

interface Form {
  name: string
  type: ProjectType
  description: string
  color: string
  // Ahorro
  target_amount: string
  target_currency: Currency
  target_date: string
  linked_account_id: string
  // Gasto
  budget_amount: string
  budget_currency: Currency
}

const EMPTY: Form = {
  name: '', type: 'savings', description: '', color: '#10b981',
  target_amount: '', target_currency: 'USD', target_date: '',
  linked_account_id: '', budget_amount: '', budget_currency: 'ARS',
}

export default function NewProjectPage() {
  const router = useRouter()
  const supabase = createClient()
  const { accounts } = useAccounts()
  const [form, setForm] = useState<Form>(EMPTY)
  const [saving, setSaving] = useState(false)

  function set(key: keyof Form, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  const isSavings = form.type === 'savings'

  async function handleSave() {
    if (!form.name.trim()) { toast.error('Ingresá un nombre'); return }
    if (isSavings && !form.target_amount) { toast.error('Ingresá el monto objetivo'); return }
    if (!isSavings && !form.budget_amount) { toast.error('Ingresá el presupuesto'); return }

    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const payload = {
      user_id: user.id,
      name: form.name.trim(),
      type: form.type,
      description: form.description || null,
      color: form.color,
      // Ahorro
      target_amount: isSavings ? parseFloat(form.target_amount) : null,
      target_currency: isSavings ? form.target_currency : null,
      target_date: isSavings && form.target_date ? form.target_date : null,
      linked_account_id: isSavings && form.linked_account_id ? form.linked_account_id : null,
      // Gasto
      budget_amount: !isSavings ? parseFloat(form.budget_amount) : null,
      budget_currency: !isSavings ? form.budget_currency : null,
    }

    const { error } = await supabase.from('projects').insert(payload)
    if (error) { toast.error('Error al guardar'); setSaving(false); return }

    toast.success('Proyecto creado')
    router.push('/projects')
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-xl">
          <ArrowLeft size={20} className="text-slate-600" />
        </button>
        <h1 className="text-xl font-bold text-slate-900">Nuevo proyecto</h1>
      </div>

      <div className="space-y-5">

        {/* Tipo */}
        <div className="grid grid-cols-2 gap-3">
          {([
            { value: 'savings', label: 'Ahorro',        icon: Wallet, desc: 'Meta de dinero a acumular' },
            { value: 'expense', label: 'Gasto',          icon: Target, desc: 'Presupuesto para un objetivo' },
          ] as const).map(({ value, label, icon: Icon, desc }) => (
            <button key={value} type="button" onClick={() => set('type', value)}
              className={cn(
                'p-4 rounded-2xl border-2 text-left transition-all',
                form.type === value
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              )}>
              <Icon size={20} className={form.type === value ? 'text-indigo-600' : 'text-slate-400'} />
              <p className={cn('font-semibold mt-2 text-sm', form.type === value ? 'text-indigo-700' : 'text-slate-700')}>
                {label}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
            </button>
          ))}
        </div>

        {/* Nombre */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Nombre del proyecto</label>
          <input value={form.name} onChange={e => set('name', e.target.value)}
            placeholder={isSavings ? 'ej: Viaje a Europa, Moto nueva' : 'ej: Vacaciones 2025, Remodelación'}
            className="input-base" autoFocus />
        </div>

        {/* Descripción */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Descripción <span className="text-slate-400 font-normal">(opcional)</span>
          </label>
          <input value={form.description} onChange={e => set('description', e.target.value)}
            placeholder="Detalles adicionales..." className="input-base" />
        </div>

        {/* Campos según tipo */}
        {isSavings ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Monto objetivo</label>
                <input value={form.target_amount} onChange={e => set('target_amount', e.target.value)}
                  type="number" min="0" placeholder="5000" className="input-base" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Moneda</label>
                <select value={form.target_currency} onChange={e => set('target_currency', e.target.value as Currency)} className="input-base">
                  <option value="USD">USD</option>
                  <option value="ARS">ARS</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Fecha objetivo <span className="text-slate-400 font-normal">(opcional)</span>
                </label>
                <input value={form.target_date} onChange={e => set('target_date', e.target.value)}
                  type="date" className="input-base" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Cuenta vinculada <span className="text-slate-400 font-normal">(opcional)</span>
                </label>
                <select value={form.linked_account_id} onChange={e => set('linked_account_id', e.target.value)} className="input-base">
                  <option value="">Ninguna</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            </div>
          </>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Presupuesto total</label>
              <input value={form.budget_amount} onChange={e => set('budget_amount', e.target.value)}
                type="number" min="0" placeholder="200000" className="input-base" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Moneda</label>
              <select value={form.budget_currency} onChange={e => set('budget_currency', e.target.value as Currency)} className="input-base">
                <option value="ARS">ARS</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>
        )}

        {/* Color */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Color</label>
          <div className="flex gap-2 flex-wrap">
            {COLORS.map(c => (
              <button key={c} type="button" onClick={() => set('color', c)}
                className={cn('w-8 h-8 rounded-lg transition-all', form.color === c ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : '')}
                style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>

        {/* Submit */}
        <button onClick={handleSave} disabled={saving}
          className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors disabled:opacity-60">
          {saving ? 'Guardando...' : 'Crear proyecto'}
        </button>
      </div>
    </div>
  )
}
