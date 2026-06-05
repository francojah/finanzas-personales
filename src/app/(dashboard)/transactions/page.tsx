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
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Movimientos</h1>
        <div className="flex items-center gap-2">
          {/* Toggle moneda */}
          <div className="flex rounded-xl overflow-hidden" style={{ border: '1.5px solid var(--border)' }}>
            {(['ARS', 'USD'] as const).map(c => (
              <button key={c} onClick={() => setDisplayCurrency(c)}
                className="px-3 py-1.5 text-sm font-semibold transition-colors"
                style={displayCurrency === c
                  ? { background: 'var(--accent)', color: '#fff' }
                  : { background: 'var(--surface)', color: 'var(--text-muted)' }
                }>
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
        {[
          { label: 'Ingresos', value: fmt(totalIncome), color: 'var(--income)' },
          { label: 'Gastos',   value: fmt(totalExpense), color: 'var(--expense)' },
          { label: 'Balance',  value: fmt(totalIncome - totalExpense), color: totalIncome - totalExpense >= 0 ? 'var(--text-primary)' : 'var(--expense)' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl p-3 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
            <p className="text-base font-bold" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {TYPE_FILTERS.map(f => (
          <button key={f.value} onClick={() => setTypeFilter(f.value)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            style={typeFilter === f.value
              ? { background: 'var(--accent)', color: '#fff', border: '1px solid var(--accent)' }
              : { background: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }
            }>
            {f.label}
          </button>
        ))}
        <div className="flex-1 min-w-[160px] relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-faint)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg outline-none"
            style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)' }}
          />
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'var(--surface)' }} />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-16 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-lg mb-2" style={{ color: 'var(--text-faint)' }}>Sin movimientos</p>
          <p className="text-sm mb-6" style={{ color: 'var(--text-faint)' }}>Registrá tu primer movimiento</p>
          <button
            onClick={() => router.push('/transactions/new')}
            className="inline-flex items-center gap-2 text-white px-5 py-2.5 rounded-xl font-semibold"
            style={{ background: 'var(--accent)' }}
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
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-faint)' }}>
                  {formatDateShort(date)}
                </span>
                <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
                <span className="text-xs" style={{ color: 'var(--text-faint)' }}>
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

  const typeColor = tx.type === 'income' ? 'var(--income)'
    : tx.type === 'expense' ? 'var(--expense)'
    : 'var(--accent-icon)'
  const typeBg = tx.type === 'income' ? 'var(--income-bg)'
    : tx.type === 'expense' ? 'var(--expense-bg)'
    : 'var(--accent-bg)'
  const amountPrefix = tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all active:scale-[0.99]"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent-border)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
    >
      {/* Ícono */}
      <div className="p-2 rounded-xl shrink-0" style={{ background: typeBg }}>
        <Icon size={18} style={{ color: typeColor }} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
          {tx.description || (tx.category as any)?.name || (tx.type === 'transfer' ? 'Transferencia' : 'Sin descripción')}
        </p>
        <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
          {[
            tx.description ? (tx.category as any)?.name : null,
            (tx.subcategory as any)?.name,
            (tx.account as any)?.name,
          ].filter(Boolean).join(' · ') || ''}
        </p>
      </div>

      {/* Monto */}
      <div className="text-right shrink-0">
        <p className="text-sm font-bold" style={{ color: typeColor }}>
          {amountPrefix}{fmt(amount)}
        </p>
        <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
          {displayCurrency === 'ARS' ? formatUSD(tx.amount_usd) : formatARS(tx.amount_ars)}
        </p>
      </div>
    </button>
  )
}
