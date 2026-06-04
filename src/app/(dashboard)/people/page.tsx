'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Users, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatARS, formatUSD, cn } from '@/lib/utils'
import type { Person, SharedExpense } from '@/types/database'

interface PersonWithDebt extends Person {
  total_ars: number
  total_usd: number
  pending_count: number
  all_settled: boolean
}

export default function PeoplePage() {
  const router = useRouter()
  const supabase = createClient()
  const [people, setPeople] = useState<PersonWithDebt[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewPerson, setShowNewPerson] = useState(false)
  const [newName, setNewName] = useState('')
  const [newRelationship, setNewRelationship] = useState('other')
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data: persons } = await supabase
      .from('people')
      .select('*')
      .order('name')

    if (!persons?.length) { setPeople([]); setLoading(false); return }

    const withDebt: PersonWithDebt[] = await Promise.all(
      persons.map(async (person) => {
        const { data: expenses } = await supabase
          .from('shared_expenses')
          .select('*, payments:shared_expense_payments(*)')
          .eq('person_id', person.id)
          .neq('status', 'settled')

        const list = (expenses ?? []) as (SharedExpense & { payments: any[] })[]
        const total_ars = list.reduce((s, e) => {
          const paid = e.payments.reduce((p: number, pay: any) => p + pay.amount_ars, 0)
          return s + (e.amount_ars - paid)
        }, 0)
        const total_usd = list.reduce((s, e) => {
          const paid = e.payments.reduce((p: number, pay: any) => p + (pay.amount_usd ?? 0), 0)
          return s + (e.amount_usd - paid)
        }, 0)

        return {
          ...person,
          total_ars,
          total_usd,
          pending_count: list.length,
          all_settled: list.length === 0,
        }
      })
    )

    setPeople(withDebt)
    setLoading(false)
  }

  async function savePerson() {
    if (!newName.trim()) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('people').insert({
      user_id: user.id,
      name: newName.trim(),
      relationship: newRelationship,
    })
    setNewName('')
    setShowNewPerson(false)
    setSaving(false)
    load()
  }

  const totalPendingARS = people.reduce((s, p) => s + p.total_ars, 0)
  const pendingPeople   = people.filter(p => !p.all_settled).length

  return (
    <div className="max-w-lg mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Cobros pendientes</h1>
        <button onClick={() => setShowNewPerson(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-xl">
          <Plus size={15} /> Persona
        </button>
      </div>

      {/* Resumen */}
      {!loading && people.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="card !p-4">
            <p className="text-xs text-slate-400 mb-1">Total te deben</p>
            <p className="text-xl font-bold text-orange-600">{formatARS(totalPendingARS)}</p>
          </div>
          <div className="card !p-4">
            <p className="text-xs text-slate-400 mb-1">Personas con deuda</p>
            <p className="text-xl font-bold text-slate-900">{pendingPeople}</p>
          </div>
        </div>
      )}

      {/* Form nueva persona */}
      {showNewPerson && (
        <div className="card space-y-3">
          <h3 className="font-semibold text-slate-800">Nueva persona</h3>
          <input value={newName} onChange={e => setNewName(e.target.value)}
            placeholder="Nombre" className="input-base" autoFocus
            onKeyDown={e => e.key === 'Enter' && savePerson()} />
          <select value={newRelationship} onChange={e => setNewRelationship(e.target.value)} className="input-base">
            <option value="partner">Pareja</option>
            <option value="friend">Amigo/a</option>
            <option value="family">Familia</option>
            <option value="other">Otro</option>
          </select>
          <div className="flex gap-2">
            <button onClick={() => setShowNewPerson(false)}
              className="flex-1 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">
              Cancelar
            </button>
            <button onClick={savePerson} disabled={saving || !newName.trim()}
              className="flex-1 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60">
              Guardar
            </button>
          </div>
        </div>
      )}

      {/* Lista de personas */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      ) : people.length === 0 ? (
        <div className="text-center py-16">
          <Users size={40} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 mb-2">No hay personas todavía</p>
          <p className="text-xs text-slate-300 mb-4">Agregá a alguien para registrar gastos que te deben</p>
          <button onClick={() => setShowNewPerson(true)}
            className="text-indigo-600 text-sm font-medium hover:underline">
            + Agregar persona
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {people.map(person => (
            <button key={person.id}
              onClick={() => router.push(`/people/${person.id}`)}
              className="w-full card flex items-center gap-4 hover:shadow-sm hover:border-slate-300 transition-all text-left active:scale-[0.99]">

              {/* Avatar */}
              <div className={cn(
                'w-11 h-11 rounded-2xl flex items-center justify-center text-lg font-bold shrink-0',
                person.all_settled ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'
              )}>
                {person.name.charAt(0).toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800">{person.name}</p>
                <p className="text-xs text-slate-400 capitalize">
                  {person.relationship === 'partner' ? 'Pareja'
                    : person.relationship === 'friend' ? 'Amigo/a'
                    : person.relationship === 'family' ? 'Familia'
                    : 'Otro'}
                  {!person.all_settled && ` · ${person.pending_count} pendiente${person.pending_count !== 1 ? 's' : ''}`}
                </p>
              </div>

              <div className="text-right shrink-0">
                {person.all_settled ? (
                  <div className="flex items-center gap-1 text-green-500">
                    <CheckCircle size={16} />
                    <span className="text-xs font-medium">Al día</span>
                  </div>
                ) : (
                  <>
                    <p className="font-bold text-orange-600">{formatARS(person.total_ars)}</p>
                    {person.total_usd > 0 && (
                      <p className="text-xs text-slate-400">{formatUSD(person.total_usd)}</p>
                    )}
                  </>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
