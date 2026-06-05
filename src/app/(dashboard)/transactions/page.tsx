'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, ArrowUpCircle, ArrowDownCircle, ArrowLeftRight, Search, Upload, Repeat, Zap } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatARS, formatUSD, formatDateShort, cn } from '@/lib/utils'
import { toast } from 'sonner'
import { usePlan } from '@/hooks/usePlan'
import { UpgradeModal } from '@/components/shared/UpgradeModal'
import type { Transaction } from '@/types/database'

const TYPE_FILTERS = [
  { value: '',         label: 'Todos' },
  { value: 'expense',  label: 'Gastos' },
  { value: 'income',   label: 'Ingresos' },
  { value: 'transfer', label: 'Transferencias' },
]

export default function TransactionsPage() {
  const router = useRouter()
  const supabase = createClient()
  const { features, isPremium } = usePlan()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('')
  const [search, setSearch] = useState('')
  const [displayCurrency, setDisplayCurrency] = useState<'ARS' | 'USD'>('ARS')
  const [showUpgrade, setShowUpgrade] = useState(false)

  const txLimit = features.maxTransactions

  const load = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('transactions')
        .select(`
          *,
          category:categories(name, color, icon),
          subcategory:subcategories(name),
          account:accounts!account_id(name)
        `)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(txLimit === Infinity ? 500 : txLimit)

      if (typeFilter) query = query.eq('type', typeFilter)
      if (search) query = query.ilike('description', `%${search}%`)

      const { data, error } = await query
      if (error) {
        console.warn('Supabase error:', error.message, error.details)
        toast.error(`Error al cargar: ${error.message}`)
      }
      setTransactions((data as Transaction[]) ?? [])
    } catch (e) {
      console.warn('Error inesperado:', e)
    } finally {
      setLoading(false)
    }
  }, [typeFilter, search])

  useEffect(() => { load() }, [load])

  // Agrupar por fecha
  const grouped = transactions.reduce<Record<string, Transaction[]>>((acc, tx) => {
    const key = tx.date
    if (!acc[key]) acc[key] = []
    acc[key].push(tx)
    return acc
  }, {})

  const totalIncome  = transactions.filter(t => t.type === 'income').reduce((s, t) => s + (displayCurrency === 'ARS' ? t.amount_ars : t.amount_usd), 0)
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + (displayCurrency === 'ARS' ? t.amount_ars : t.amount_usd), 0)
  const fmt = (n: number) => displayCurrency === 'ARS' ? formatARS(n) : formatUSD(n)

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Movimientos</h1>
        <div className="flex items-center gap-2">
          {/* Toggle moneda */}
          <div className="flex rounded-xl border border-slate-200 overflow-hidden text-sm">
            {(['ARS', 'USD'] as const).map(c => (
              <button key={c} onClick={() => setDisplayCurrency(c)}
                className={cn('px-3 py-1.5 font-medium transition-colors',
                  displayCurrency === c ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'
                )}>
                {c}
              </button>
            ))}
          </div>
          {/* Acciones secundarias */}
          <button
            onClick={() => router.push('/recurrentes')}
            className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          >
            <Repeat size={14} style={{ color: 'var(--text-muted)' }} /> Recurrentes
          </button>
          <button
            onClick={() => router.push('/import')}
            className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          >
            <Upload size={14} style={{ color: 'var(--text-muted)' }} /> Importar
          </button>
          {/* Nuevo movimiento */}
          <button
            onClick={() => router.push('/transactions/new')}
            className="hidden md:flex items-center gap-2 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
            style={{ background: 'var(--accent)' }}
          >
            <Plus size={16} /> Nuevo
          </button>
        </div>
      </div>

      {/* Resumen del período */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card !p-3 text-center">
          <p className="text-xs text-slate-500 mb-1">Ingresos</p>
          <p className="text-base font-bold text-green-600">{fmt(totalIncome)}</p>
        </div>
        <div className="card !p-3 text-center">
          <p className="text-xs text-slate-500 mb-1">Gastos</p>
          <p className="text-base font-bold text-red-500">{fmt(totalExpense)}</p>
        </div>
        <div className="card !p-3 text-center">
          <p className="text-xs text-slate-500 mb-1">Balance</p>
          <p className={cn('text-base font-bold', totalIncome - totalExpense >= 0 ? 'text-slate-900' : 'text-red-500')}>
            {fmt(totalIncome - totalExpense)}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {TYPE_FILTERS.map(f => (
          <button key={f.value} onClick={() => setTypeFilter(f.value)}
            className={cn('px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border',
              typeFilter === f.value
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            )}>
            {f.label}
          </button>
        ))}
        <div className="flex-1 min-w-[160px] relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-indigo-400 bg-white"
          />
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-slate-400 text-lg mb-2">Sin movimientos</p>
          <p className="text-slate-400 text-sm mb-6">Registrá tu primer movimiento</p>
          <button
            onClick={() => router.push('/transactions/new')}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
          >
            <Plus size={16} /> Nuevo movimiento
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).map(([date, txs]) => (
            <div key={date}>
              {/* Separador de fecha */}
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  {formatDateShort(date)}
                </span>
                <div className="flex-1 h-px bg-slate-100" />
                <span className="text-xs text-slate-400">
                  {fmt(txs.reduce((s, t) => {
                    if (t.type === 'income') return s + (displayCurrency === 'ARS' ? t.amount_ars : t.amount_usd)
                    if (t.type === 'expense') return s - (displayCurrency === 'ARS' ? t.amount_ars : t.amount_usd)
                    return s
                  }, 0))}
                </span>
              </div>

              {/* Transacciones del día */}
              <div className="space-y-2">
                {txs.map(tx => (
                  <TransactionRow
                    key={tx.id}
                    tx={tx}
                    displayCurrency={displayCurrency}
                    onClick={() => router.push(`/transactions/${tx.id}`)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Banner límite Free */}
      {!isPremium && transactions.length >= txLimit && (
        <div
          className="rounded-xl p-4 flex items-center gap-3"
          style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.08))', border: '1px solid rgba(99,102,241,0.25)' }}
        >
          <Zap size={16} style={{ color: '#818cf8' }} />
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Estás viendo los últimos {txLimit} movimientos
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Pasate a Premium para ver el historial completo
            </p>
          </div>
          <button
            onClick={() => setShowUpgrade(true)}
            className="text-xs font-bold px-3 py-1.5 rounded-lg text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          >
            Ver planes
          </button>
        </div>
      )}

      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} />
    </div>
  )
}

function TransactionRow({
  tx,
  displayCurrency,
  onClick,
}: {
  tx: Transaction
  displayCurrency: 'ARS' | 'USD'
  onClick: () => void
}) {
  const amount = displayCurrency === 'ARS' ? tx.amount_ars : tx.amount_usd
  const fmt = (n: number) => displayCurrency === 'ARS' ? formatARS(n) : formatUSD(n)

  const Icon = tx.type === 'income' ? ArrowUpCircle
    : tx.type === 'expense' ? ArrowDownCircle
    : ArrowLeftRight

  const iconColor = tx.type === 'income' ? 'text-green-500'
    : tx.type === 'expense' ? 'text-red-400'
    : 'text-indigo-400'

  const amountColor = tx.type === 'income' ? 'text-green-600'
    : tx.type === 'expense' ? 'text-red-500'
    : 'text-indigo-600'

  const amountPrefix = tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''

  return (
    <button
      onClick={onClick}
      className="w-full card !p-3 flex items-center gap-3 hover:shadow-sm hover:border-slate-300 transition-all text-left active:scale-[0.99]"
    >
      {/* Ícono */}
      <div className={cn('p-2 rounded-xl bg-slate-50', iconColor)}>
        <Icon size={18} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 truncate">
          {tx.description || (tx.category as any)?.name || (tx.type === 'transfer' ? 'Transferencia' : 'Sin descripción')}
        </p>
        <p className="text-xs text-slate-400 truncate">
          {[
            tx.description ? (tx.category as any)?.name : null,
            (tx.subcategory as any)?.name,
            (tx.account as any)?.name,
          ].filter(Boolean).join(' · ') || ''}
        </p>
      </div>

      {/* Monto */}
      <div className="text-right shrink-0">
        <p className={cn('text-sm font-bold', amountColor)}>
          {amountPrefix}{fmt(amount)}
        </p>
        {/* Monto en otra moneda */}
        <p className="text-xs text-slate-400">
          {displayCurrency === 'ARS' ? formatUSD(tx.amount_usd) : formatARS(tx.amount_ars)}
        </p>
      </div>
    </button>
  )
}
