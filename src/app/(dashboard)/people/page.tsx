'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Users, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatARS, formatUSD } from '@/lib/utils'
import type { Person, SharedExpense } from '@/types/database'
import { PlanGate } from '@/components/shared/PlanGate'

interface PersonWithDebt extends Person {
  total_ars: number
  total_usd: number
  pending_count: number
  all_settled: boolean
}

export default function PeoplePage() {
  return <PlanGate feature="people" featureLabel="Cobros"><PeoplePageContent /></PlanGate>
}

function PeoplePageContent() {
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
    const { data: persons } = await supabase.from('people').select('*').order('name')
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
        return { ...person, total_ars, total_usd, pending_count: list.length, all_settled: list.length === 0 }
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
    await supabase.from('people').insert({ user_id: user.id, name: newName.trim(), relationship: newRelationship })
    setNewName(''); setShowNewPerson(false); setSaving(false); load()
  }

  const totalPendingARS = people.reduce((s, p) => s + p.total_ars, 0)
  const pendingPeople   = people.filter(p => !p.all_settled).length

  return (
    <div className="max-w-lg mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Cobros pendientes</h1>
        <button onClick={() => setShowNewPerson(true)}
          className="flex items-center gap-2 text-white text-sm font-semibold px-4 py-2 rounded-xl"
          style={{ background: 'var(--accent)' }}>
          <Plus size={15} /> Persona
        </button>
      </div>

      {/* Resumen */}
      {!loading && people.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Total te deben</p>
            <p className="text-xl font-bold" style={{ color: 'var(--income)' }}>{formatARS(totalPendingARS)}</p>
          </div>
          <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Personas con deuda</p>
            <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{pendingPeople}</p>
          </div>
        </div>
      )}

      {/* Form nueva persona */}
      {showNewPerson && (
        <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Nueva persona</h3>
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
              className="flex-1 py-2 rounded-xl text-sm font-medium"
              style={{ background: 'var(--surface-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
              Cancelar
            </button>
            <button onClick={savePerson} disabled={saving || !newName.trim()}
              className="flex-1 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-60"
              style={{ background: 'var(--accent)' }}>
              Guardar
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: 'var(--surface)' }} />)}
        </div>
      ) : people.length === 0 ? (
        <div className="text-center py-16">
          <Users size={40} className="mx-auto mb-3" style={{ color: 'var(--text-faint)' }} />
          <p className="mb-2" style={{ color: 'var(--text-muted)' }}>No hay personas todavía</p>
          <p className="text-xs mb-4" style={{ color: 'var(--text-faint)' }}>Agregá a alguien para registrar gastos que te deben</p>
          <button onClick={() => setShowNewPerson(true)}
            className="text-sm font-medium" style={{ color: 'var(--accent)' }}>
            + Agregar persona
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {people.map(person => (
            <button key={person.id}
              onClick={() => router.push(`/people/${person.id}`)}
              className="w-full flex items-center gap-4 rounded-xl px-4 py-3.5 text-left transition-all active:scale-[0.99]"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent-border)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              {/* Avatar */}
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-lg font-bold shrink-0"
                style={{
                  background: person.all_settled ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)',
                  color: person.all_settled ? 'var(--income)' : 'var(--expense)',
                }}>
                {person.name.charAt(0).toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{person.name}</p>
                <p className="text-xs mt-0.5 capitalize" style={{ color: 'var(--text-muted)' }}>
                  {person.relationship === 'partner' ? 'Pareja'
                    : person.relationship === 'friend' ? 'Amigo/a'
                    : person.relationship === 'family' ? 'Familia' : 'Otro'}
                  {!person.all_settled && ` · ${person.pending_count} pendiente${person.pending_count !== 1 ? 's' : ''}`}
                </p>
              </div>

              <div className="text-right shrink-0">
                {person.all_settled ? (
                  <div className="flex items-center gap-1" style={{ color: 'var(--income)' }}>
                    <CheckCircle size={16} />
                    <span className="text-xs font-medium">Al día</span>
                  </div>
                ) : (
                  <>
                    <p className="font-bold text-sm" style={{ color: 'var(--expense)' }}>{formatARS(person.total_ars)}</p>
                    {person.total_usd > 0 && (
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatUSD(person.total_usd)}</p>
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
