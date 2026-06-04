'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Trash2, ArrowUpCircle, ArrowDownCircle, ArrowLeftRight, Users, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatARS, formatUSD, formatDate, cn } from '@/lib/utils'
import { toast } from 'sonner'
import { usePeople } from '@/hooks/usePeople'
import type { Transaction } from '@/types/database'

export default function TransactionDetailPage() {
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()
  const [tx, setTx] = useState<Transaction | null>(null)
  const [loading, setLoading] = useState(true)
  const [showSplit, setShowSplit] = useState(false)
  const [splitPersonId, setSplitPersonId] = useState('')
  const [splitPct, setSplitPct] = useState('50')
  const [savingSplit, setSavingSplit] = useState(false)
  const { people } = usePeople()

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('transactions')
        .select('*, category:categories(name,color,icon), subcategory:subcategories(name), account:accounts!account_id(name), credit_card:credit_cards(name)')
        .eq('id', params.id as string)
        .single()
      setTx(data as Transaction)
      setLoading(false)
    }
    load()
  }, [params.id])

  async function handleSplit() {
    if (!splitPersonId || !tx) return
    setSavingSplit(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const pct = parseFloat(splitPct) / 100
    await supabase.from('shared_expenses').insert({
      user_id: user.id,
      transaction_id: tx.id,
      person_id: splitPersonId,
      description: tx.description || `Gasto ${formatDate(tx.date)}`,
      amount_ars: tx.amount_ars * pct,
      amount_usd: tx.amount_usd * pct,
      status: 'pending',
    })
    toast.success(`Cobro creado para ${people.find(p => p.id === splitPersonId)?.name}`)
    setShowSplit(false)
    setSavingSplit(false)
  }

  async function handleDelete() {
    if (!confirm('¿Eliminar este movimiento?')) return
    const { error } = await supabase.from('transactions').delete().eq('id', tx!.id)
    if (error) { toast.error('Error al eliminar'); return }
    toast.success('Movimiento eliminado')
    router.push('/transactions')
  }

  if (loading) return <div className="h-40 flex items-center justify-center text-slate-400">Cargando...</div>
  if (!tx) return <div className="text-center py-20 text-slate-400">No encontrado</div>

  const isIncome = tx.type === 'income'
  const isExpense = tx.type === 'expense'

  const Icon = isIncome ? ArrowUpCircle : isExpense ? ArrowDownCircle : ArrowLeftRight
  const iconBg = isIncome ? 'bg-green-100' : isExpense ? 'bg-red-100' : 'bg-indigo-100'
  const iconColor = isIncome ? 'text-green-600' : isExpense ? 'text-red-500' : 'text-indigo-600'
  const amountColor = isIncome ? 'text-green-600' : isExpense ? 'text-red-500' : 'text-indigo-600'
  const prefix = isIncome ? '+' : isExpense ? '-' : ''

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-xl">
          <ArrowLeft size={20} className="text-slate-600" />
        </button>
        <h1 className="text-lg font-bold text-slate-900">Detalle</h1>
        <button onClick={handleDelete} className="p-2 hover:bg-red-50 rounded-xl text-red-400 hover:text-red-600 transition-colors">
          <Trash2 size={18} />
        </button>
      </div>

      {/* Monto principal */}
      <div className="card !p-6 text-center mb-4">
        <div className={cn('inline-flex p-4 rounded-2xl mb-4', iconBg)}>
          <Icon size={28} className={iconColor} />
        </div>
        <p className={cn('text-4xl font-bold mb-1', amountColor)}>
          {prefix}{formatARS(tx.amount_ars)}
        </p>
        <p className="text-slate-400 text-sm">{prefix}{formatUSD(tx.amount_usd)}</p>
        {tx.exchange_rate && (
          <p className="text-xs text-slate-400 mt-1">
            TC {tx.exchange_rate_type?.toUpperCase()} {formatARS(tx.exchange_rate)}
          </p>
        )}
      </div>

      {/* Dividir gasto */}
      {tx.type === 'expense' && (
        <div className="card !p-4 mb-4">
          {!showSplit ? (
            <button onClick={() => setShowSplit(true)}
              className="w-full flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-indigo-600 font-medium transition-colors">
              <Users size={15} /> Compartir este gasto con alguien
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Users size={14} /> Compartir gasto
              </p>
              <select value={splitPersonId} onChange={e => setSplitPersonId(e.target.value)} className="input-base">
                <option value="">Seleccioná persona...</option>
                {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <div className="relative">
                <input value={splitPct} onChange={e => setSplitPct(e.target.value)}
                  type="number" min="1" max="100" className="input-base pr-8" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">%</span>
              </div>
              {splitPersonId && (
                <div className="bg-indigo-50 rounded-xl px-3 py-2 flex justify-between text-sm">
                  <span className="text-indigo-600">{people.find(p => p.id === splitPersonId)?.name} debe:</span>
                  <span className="font-bold text-indigo-700">
                    {formatARS(tx.amount_ars * (parseFloat(splitPct) / 100))}
                  </span>
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={() => setShowSplit(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">
                  Cancelar
                </button>
                <button onClick={handleSplit} disabled={!splitPersonId || savingSplit}
                  className="flex-1 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60">
                  {savingSplit ? 'Creando...' : 'Crear cobro'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Detalles */}
      <div className="card !p-0 divide-y divide-slate-100">
        {[
          { label: 'Tipo', value: tx.type === 'income' ? 'Ingreso' : tx.type === 'expense' ? 'Gasto' : 'Transferencia' },
          { label: 'Fecha', value: formatDate(tx.date) },
          { label: 'Categoría', value: (tx.category as any)?.name ?? '—' },
          { label: 'Subcategoría', value: (tx.subcategory as any)?.name ?? '—' },
          { label: 'Cuenta', value: (tx.account as any)?.name ?? (tx.credit_card as any)?.name ?? '—' },
          { label: 'Descripción', value: tx.description ?? '—' },
          { label: 'Recurrente', value: tx.is_recurring ? `Sí (${tx.recurrence_frequency})` : 'No' },
          tx.has_installments ? { label: 'Cuotas', value: `${tx.current_installment}/${tx.total_installments}` } : null,
        ].filter(Boolean).map(({ label, value }: any) => (
          <div key={label} className="flex justify-between px-5 py-3.5">
            <span className="text-sm text-slate-500">{label}</span>
            <span className="text-sm font-medium text-slate-800 text-right max-w-[60%]">{value}</span>
          </div>
        ))}
      </div>

      {/* Comprobante */}
      {tx.receipt_url && (
        <div className="card !p-4 mt-4">
          <p className="text-sm font-semibold text-slate-700 mb-3">Comprobante</p>
          <div className="relative">
            <img
              src={tx.receipt_url}
              alt="Comprobante"
              className="w-full max-h-64 object-contain rounded-xl border border-slate-100 bg-slate-50"
            />
            <a
              href={tx.receipt_url}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute top-2 right-2 bg-black/40 text-white rounded-lg p-1.5 hover:bg-black/60 transition-colors"
            >
              <ExternalLink size={14} />
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
