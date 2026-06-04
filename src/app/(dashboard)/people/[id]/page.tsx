'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Plus, Trash2, CheckCircle, Clock, DollarSign } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatARS, formatUSD, formatDateShort, cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Person, SharedExpense } from '@/types/database'

interface LinkedTransaction {
  description: string | null
  amount_ars: number
  date: string
  category: { name: string; color: string } | null
}

interface ExpenseWithPayments extends Omit<SharedExpense, 'transaction' | 'payments'> {
  payments: { id: string; amount_ars: number; amount_usd: number | null; date: string; notes: string | null }[]
  transaction: LinkedTransaction | null
}

interface NewExpenseForm {
  description: string
  amount_ars: string
  amount_usd: string
  due_date: string
}

interface NewPaymentForm {
  amount_ars: string
  notes: string
}

const EMPTY_EXPENSE: NewExpenseForm = { description: '', amount_ars: '', amount_usd: '', due_date: '' }
const EMPTY_PAYMENT: NewPaymentForm = { amount_ars: '', notes: '' }

export default function PersonDetailPage() {
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()

  const [person, setPerson] = useState<Person | null>(null)
  const [expenses, setExpenses] = useState<ExpenseWithPayments[]>([])
  const [loading, setLoading] = useState(true)
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [expenseForm, setExpenseForm] = useState<NewExpenseForm>(EMPTY_EXPENSE)
  const [savingExpense, setSavingExpense] = useState(false)
  const [paymentTarget, setPaymentTarget] = useState<string | null>(null) // expense id
  const [paymentForm, setPaymentForm] = useState<NewPaymentForm>(EMPTY_PAYMENT)
  const [savingPayment, setSavingPayment] = useState(false)
  const [tab, setTab] = useState<'pending' | 'settled'>('pending')

  useEffect(() => { load() }, [params.id])

  async function load() {
    const [{ data: p }, { data: exp }] = await Promise.all([
      supabase.from('people').select('*').eq('id', params.id as string).single(),
      supabase.from('shared_expenses')
        .select('*, payments:shared_expense_payments(*), transaction:transactions(description, amount_ars, date, category:categories(name, color))')
        .eq('person_id', params.id as string)
        .order('created_at', { ascending: false }),
    ])
    setPerson(p as Person)
    setExpenses((exp ?? []) as ExpenseWithPayments[])
    setLoading(false)
  }

  // Calcular deuda restante de un gasto
  function remaining(expense: ExpenseWithPayments) {
    const paid = expense.payments.reduce((s, p) => s + p.amount_ars, 0)
    return Math.max(0, expense.amount_ars - paid)
  }

  function remainingUSD(expense: ExpenseWithPayments) {
    const paid = expense.payments.reduce((s, p) => s + (p.amount_usd ?? 0), 0)
    return Math.max(0, expense.amount_usd - paid)
  }

  // Guardar nuevo gasto
  async function saveExpense() {
    if (!expenseForm.description.trim() || !expenseForm.amount_ars) {
      toast.error('Completá descripción y monto')
      return
    }
    setSavingExpense(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('shared_expenses').insert({
      user_id: user.id,
      person_id: params.id as string,
      description: expenseForm.description.trim(),
      amount_ars: parseFloat(expenseForm.amount_ars),
      amount_usd: expenseForm.amount_usd ? parseFloat(expenseForm.amount_usd) : 0,
      due_date: expenseForm.due_date || null,
      status: 'pending',
    })

    if (error) { toast.error('Error al guardar'); setSavingExpense(false); return }
    toast.success('Gasto registrado')
    setExpenseForm(EMPTY_EXPENSE)
    setShowExpenseForm(false)
    setSavingExpense(false)
    load()
  }

  // Registrar pago parcial o total
  async function savePayment(expense: ExpenseWithPayments) {
    if (!paymentForm.amount_ars) { toast.error('Ingresá el monto'); return }
    setSavingPayment(true)

    const amount = parseFloat(paymentForm.amount_ars)
    const rem = remaining(expense)

    await supabase.from('shared_expense_payments').insert({
      shared_expense_id: expense.id,
      amount_ars: Math.min(amount, rem),
      date: new Date().toISOString().split('T')[0],
      notes: paymentForm.notes || null,
    })

    // Actualizar status
    const newRem = rem - amount
    const newStatus = newRem <= 0 ? 'settled' : 'partial'
    await supabase.from('shared_expenses').update({ status: newStatus }).eq('id', expense.id)

    toast.success(newRem <= 0 ? '✓ Deuda saldada' : 'Pago registrado')
    setPaymentTarget(null)
    setPaymentForm(EMPTY_PAYMENT)
    setSavingPayment(false)
    load()
  }

  async function settleAll(expense: ExpenseWithPayments) {
    const rem = remaining(expense)
    if (rem <= 0) return
    await supabase.from('shared_expense_payments').insert({
      shared_expense_id: expense.id,
      amount_ars: rem,
      date: new Date().toISOString().split('T')[0],
    })
    await supabase.from('shared_expenses').update({ status: 'settled' }).eq('id', expense.id)
    toast.success('✓ Deuda saldada')
    load()
  }

  async function deleteExpense(id: string) {
    if (!confirm('¿Eliminar este gasto?')) return
    await supabase.from('shared_expense_payments').delete().eq('shared_expense_id', id)
    await supabase.from('shared_expenses').delete().eq('id', id)
    toast.success('Eliminado')
    load()
  }

  async function deletePerson() {
    if (!confirm(`¿Eliminar a ${person?.name} y todos sus gastos?`)) return
    const ids = expenses.map(e => e.id)
    if (ids.length) {
      await supabase.from('shared_expense_payments').delete().in('shared_expense_id', ids)
      await supabase.from('shared_expenses').delete().eq('person_id', params.id as string)
    }
    await supabase.from('people').delete().eq('id', params.id as string)
    toast.success('Eliminado')
    router.push('/people')
  }

  if (loading) return <div className="h-40 flex items-center justify-center text-slate-400">Cargando...</div>
  if (!person) return <div className="text-center py-20 text-slate-400">No encontrado</div>

  const pending  = expenses.filter(e => e.status !== 'settled')
  const settled  = expenses.filter(e => e.status === 'settled')
  const totalARS = pending.reduce((s, e) => s + remaining(e), 0)
  const totalUSD = pending.reduce((s, e) => s + remainingUSD(e), 0)
  const displayed = tab === 'pending' ? pending : settled

  return (
    <div className="max-w-lg mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-xl">
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div className="w-10 h-10 rounded-2xl bg-orange-100 flex items-center justify-center text-lg font-bold text-orange-600">
            {person.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">{person.name}</h1>
            <p className="text-xs text-slate-400 capitalize">{
              person.relationship === 'partner' ? 'Pareja'
              : person.relationship === 'friend' ? 'Amigo/a'
              : person.relationship === 'family' ? 'Familia' : 'Otro'
            }</p>
          </div>
        </div>
        <button onClick={deletePerson} className="p-2 hover:bg-red-50 rounded-xl text-slate-400 hover:text-red-500">
          <Trash2 size={18} />
        </button>
      </div>

      {/* Resumen */}
      {totalARS > 0 && (
        <div className="card !p-4 mb-4 bg-orange-50 border-orange-100">
          <p className="text-xs text-orange-500 font-medium mb-1">Total pendiente de {person.name}</p>
          <p className="text-2xl font-bold text-orange-700">{formatARS(totalARS)}</p>
          {totalUSD > 0 && <p className="text-sm text-orange-400 mt-0.5">{formatUSD(totalUSD)}</p>}
        </div>
      )}
      {totalARS === 0 && pending.length === 0 && settled.length > 0 && (
        <div className="card !p-4 mb-4 bg-green-50 border-green-100 flex items-center gap-3">
          <CheckCircle size={20} className="text-green-500" />
          <p className="text-sm font-medium text-green-700">Todo saldado con {person.name}</p>
        </div>
      )}

      {/* Botón nuevo gasto */}
      <button onClick={() => setShowExpenseForm(true)}
        className="w-full mb-4 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors text-sm font-medium">
        <Plus size={16} /> Registrar gasto a nombre de {person.name}
      </button>

      {/* Form nuevo gasto */}
      {showExpenseForm && (
        <div className="card mb-4 space-y-3">
          <h3 className="font-semibold text-slate-800">Nuevo gasto</h3>
          <input value={expenseForm.description}
            onChange={e => setExpenseForm(f => ({ ...f, description: e.target.value }))}
            placeholder="ej: Seguro auto Junio" className="input-base" autoFocus />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Monto ARS</label>
              <input value={expenseForm.amount_ars}
                onChange={e => setExpenseForm(f => ({ ...f, amount_ars: e.target.value }))}
                type="number" placeholder="0" className="input-base" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Monto USD (opcional)</label>
              <input value={expenseForm.amount_usd}
                onChange={e => setExpenseForm(f => ({ ...f, amount_usd: e.target.value }))}
                type="number" placeholder="0" className="input-base" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Fecha límite (opcional)</label>
            <input value={expenseForm.due_date}
              onChange={e => setExpenseForm(f => ({ ...f, due_date: e.target.value }))}
              type="date" className="input-base" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowExpenseForm(false)}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">
              Cancelar
            </button>
            <button onClick={saveExpense} disabled={savingExpense}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60">
              {savingExpense ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex rounded-xl bg-slate-100 p-1 mb-4">
        <button onClick={() => setTab('pending')}
          className={cn('flex-1 py-2 rounded-lg text-sm font-semibold transition-all',
            tab === 'pending' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'
          )}>
          Pendientes {pending.length > 0 && `(${pending.length})`}
        </button>
        <button onClick={() => setTab('settled')}
          className={cn('flex-1 py-2 rounded-lg text-sm font-semibold transition-all',
            tab === 'settled' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'
          )}>
          Saldados {settled.length > 0 && `(${settled.length})`}
        </button>
      </div>

      {/* Lista de gastos */}
      {displayed.length === 0 ? (
        <div className="text-center py-10 text-slate-300">
          {tab === 'pending' ? 'Sin gastos pendientes' : 'Sin gastos saldados'}
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map(expense => {
            const rem = remaining(expense)
            const paidARS = expense.amount_ars - rem
            const progress = expense.amount_ars > 0 ? (paidARS / expense.amount_ars) * 100 : 0
            const isSettled = expense.status === 'settled'
            const isOverdue = expense.due_date && new Date(expense.due_date) < new Date() && !isSettled

            return (
              <div key={expense.id} className={cn('card !p-4 space-y-3',
                isOverdue ? 'border-red-200 bg-red-50' : ''
              )}>
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {isSettled
                        ? <CheckCircle size={14} className="text-green-500 shrink-0" />
                        : <Clock size={14} className="text-orange-400 shrink-0" />
                      }
                      <p className="font-semibold text-slate-800 truncate">{expense.description}</p>
                    </div>

                    {/* Detalle de la transacción original */}
                    {expense.transaction && (
                      <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                        {expense.transaction.category && (
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-medium text-white"
                            style={{ backgroundColor: (expense.transaction.category as any).color ?? '#94a3b8' }}
                          >
                            {(expense.transaction.category as any).name}
                          </span>
                        )}
                        <span className="text-xs text-slate-400">
                          Gasto original: {formatARS(expense.transaction.amount_ars)}
                          {' '}({Math.round((expense.amount_ars / expense.transaction.amount_ars) * 100)}%)
                          · {formatDateShort(expense.transaction.date)}
                        </span>
                      </div>
                    )}

                    {expense.due_date && (
                      <p className={cn('text-xs mt-0.5', isOverdue ? 'text-red-500 font-medium' : 'text-slate-400')}>
                        {isOverdue ? '⚠ Vencido · ' : 'Vence: '}{formatDateShort(expense.due_date)}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-slate-900">{formatARS(expense.amount_ars)}</p>
                    {expense.amount_usd > 0 && <p className="text-xs text-slate-400">{formatUSD(expense.amount_usd)}</p>}
                  </div>
                </div>

                {/* Progreso de pago */}
                {!isSettled && expense.amount_ars > 0 && (
                  <div>
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>Pagado: {formatARS(paidARS)}</span>
                      <span className="font-semibold text-orange-600">Debe: {formatARS(rem)}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-orange-400 rounded-full transition-all"
                        style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                )}

                {/* Historial de pagos */}
                {expense.payments.length > 0 && (
                  <div className="bg-slate-50 rounded-xl p-2 space-y-1">
                    {expense.payments.map(pay => (
                      <div key={pay.id} className="flex justify-between text-xs text-slate-500">
                        <span>{formatDateShort(pay.date)}{pay.notes ? ` · ${pay.notes}` : ''}</span>
                        <span className="font-medium text-green-600">+{formatARS(pay.amount_ars)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Acciones */}
                {!isSettled && (
                  <div className="flex gap-2">
                    {/* Form pago parcial */}
                    {paymentTarget === expense.id ? (
                      <div className="flex-1 flex gap-2">
                        <input value={paymentForm.amount_ars}
                          onChange={e => setPaymentForm(f => ({ ...f, amount_ars: e.target.value }))}
                          type="number" placeholder={`Máx. ${rem.toFixed(0)}`}
                          className="input-base flex-1 !py-2 text-sm" autoFocus />
                        <input value={paymentForm.notes}
                          onChange={e => setPaymentForm(f => ({ ...f, notes: e.target.value }))}
                          placeholder="Nota" className="input-base flex-1 !py-2 text-sm" />
                        <button onClick={() => savePayment(expense)} disabled={savingPayment}
                          className="px-3 py-2 bg-indigo-600 text-white text-xs rounded-lg font-semibold shrink-0">
                          OK
                        </button>
                        <button onClick={() => setPaymentTarget(null)}
                          className="px-2 py-2 border border-slate-200 text-slate-400 text-xs rounded-lg">
                          ✕
                        </button>
                      </div>
                    ) : (
                      <>
                        <button onClick={() => { setPaymentTarget(expense.id); setPaymentForm(EMPTY_PAYMENT) }}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 font-medium">
                          <DollarSign size={13} /> Pago parcial
                        </button>
                        <button onClick={() => settleAll(expense)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-semibold">
                          <CheckCircle size={13} /> Saldar todo
                        </button>
                      </>
                    )}
                    <button onClick={() => deleteExpense(expense.id)}
                      className="p-2 hover:bg-red-50 rounded-xl text-slate-300 hover:text-red-400">
                      <Trash2 size={15} />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
