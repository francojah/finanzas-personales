'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Pencil, Trash2, CreditCard } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { CreditCard as CreditCardType } from '@/types/database'

const COLORS = [
  '#6366f1','#8b5cf6','#3b82f6','#0ea5e9',
  '#10b981','#f59e0b','#ef4444','#64748b',
]

const BANKS = [
  'Galicia','Santander','BBVA','HSBC','Macro','Nación',
  'Ciudad','Brubank','Naranja X','Otro',
]

interface CardForm {
  name: string
  bank: string
  last_four: string
  limit_amount: string
  closing_day: string
  due_day: string
  color: string
}

const EMPTY: CardForm = {
  name: '', bank: 'Galicia', last_four: '',
  limit_amount: '', closing_day: '15', due_day: '5', color: '#6366f1',
}

export default function CreditCardsSettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [cards, setCards] = useState<CreditCardType[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<CreditCardType | null>(null)
  const [form, setForm] = useState<CardForm>(EMPTY)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('credit_cards').select('*').order('created_at')
    setCards(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openNew() { setEditing(null); setForm(EMPTY); setShowForm(true) }

  function openEdit(card: CreditCardType) {
    setEditing(card)
    setForm({
      name: card.name,
      bank: card.bank ?? 'Galicia',
      last_four: card.last_four ?? '',
      limit_amount: card.limit_amount?.toString() ?? '',
      closing_day: card.closing_day.toString(),
      due_day: card.due_day.toString(),
      color: card.color,
    })
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error('Ingresá un nombre'); return }
    if (!form.closing_day || !form.due_day) { toast.error('Ingresá fecha de cierre y vencimiento'); return }
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const payload = {
      user_id: user.id,
      name: form.name.trim(),
      bank: form.bank || null,
      last_four: form.last_four || null,
      limit_amount: form.limit_amount ? parseFloat(form.limit_amount) : null,
      closing_day: parseInt(form.closing_day),
      due_day: parseInt(form.due_day),
      color: form.color,
    }

    const { error } = editing
      ? await supabase.from('credit_cards').update(payload).eq('id', editing.id)
      : await supabase.from('credit_cards').insert(payload)

    if (error) { toast.error('Error al guardar'); console.warn(error); setSaving(false); return }
    toast.success(editing ? 'Tarjeta actualizada' : 'Tarjeta creada')
    setShowForm(false)
    load()
    setSaving(false)
  }

  async function handleDelete(card: CreditCardType) {
    if (!confirm(`¿Eliminar "${card.name}"?`)) return
    const { error } = await supabase.from('credit_cards').delete().eq('id', card.id)
    if (error) { toast.error('No se puede eliminar — tiene movimientos asociados'); return }
    toast.success('Tarjeta eliminada')
    load()
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-xl">
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <h1 className="text-xl font-bold text-slate-900">Tarjetas de crédito</h1>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-xl">
          <Plus size={15} /> Nueva
        </button>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="card mb-5 space-y-4">
          <h2 className="font-semibold text-slate-800">{editing ? 'Editar tarjeta' : 'Nueva tarjeta'}</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Nombre</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="ej: Galicia Visa" className="input-base" autoFocus />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Banco</label>
              <select value={form.bank} onChange={e => setForm(f => ({ ...f, bank: e.target.value }))} className="input-base">
                {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Últimos 4 dígitos</label>
              <input value={form.last_four} onChange={e => setForm(f => ({ ...f, last_four: e.target.value.slice(0,4) }))}
                placeholder="1234" maxLength={4} className="input-base" inputMode="numeric" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Límite (ARS)</label>
              <input value={form.limit_amount} onChange={e => setForm(f => ({ ...f, limit_amount: e.target.value }))}
                placeholder="Opcional" type="number" className="input-base" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Día de cierre</label>
              <input value={form.closing_day} onChange={e => setForm(f => ({ ...f, closing_day: e.target.value }))}
                type="number" min="1" max="31" placeholder="15" className="input-base" />
              <p className="text-xs text-slate-400 mt-1">Día del mes que cierra el resumen</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Día de vencimiento</label>
              <input value={form.due_day} onChange={e => setForm(f => ({ ...f, due_day: e.target.value }))}
                type="number" min="1" max="31" placeholder="5" className="input-base" />
              <p className="text-xs text-slate-400 mt-1">Día del mes siguiente para pagar</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Color</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))}
                  className={cn('w-8 h-8 rounded-lg transition-all', form.color === c ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : '')}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-60">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(2)].map((_, i) => <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      ) : cards.length === 0 && !showForm ? (
        <div className="text-center py-16">
          <CreditCard size={40} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 mb-3">No hay tarjetas todavía</p>
          <button onClick={openNew} className="text-indigo-600 font-medium text-sm hover:underline">
            + Agregar tarjeta
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {cards.map(card => (
            <div key={card.id} className="card flex items-center gap-4">
              {/* Visual de tarjeta */}
              <div className="w-14 h-9 rounded-lg flex items-center justify-center shrink-0 shadow-sm"
                style={{ backgroundColor: card.color }}>
                <CreditCard size={18} className="text-white opacity-80" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800">{card.name}</p>
                <p className="text-xs text-slate-400">
                  {card.bank && `${card.bank} · `}
                  {card.last_four && `···· ${card.last_four} · `}
                  Cierre día {card.closing_day} · Vence día {card.due_day}
                </p>
                {card.limit_amount && (
                  <p className="text-xs text-slate-400">Límite: ${card.limit_amount.toLocaleString('es-AR')}</p>
                )}
              </div>

              <div className="flex gap-1 shrink-0">
                <button onClick={() => openEdit(card)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600">
                  <Pencil size={15} />
                </button>
                <button onClick={() => handleDelete(card)} className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500">
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
