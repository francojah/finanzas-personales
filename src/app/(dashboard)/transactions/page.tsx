'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, ArrowUpCircle, ArrowDownCircle, ArrowLeftRight, Search, Upload, Repeat, Zap, Download } from 'lucide-react'
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

  function exportCSV() {
    if (transactions.length === 0) return
    const header = ['Fecha', 'Tipo', 'Descripcion', 'Categoria', 'Cuenta', 'Monto ARS', 'Monto USD']
    const rows = transactions.map(t => [
      t.date,
      t.type === 'income' ? 'Ingreso' : t.type === 'expense' ? 'Gasto' : 'Transferencia',
      t.description ?? '',
      (t.category as any)?.name ?? '',
      (t.account as any)?.name ?? '',
      t.amount_ars.toFixed(2),
      t.amount_usd.toFixed(2),
    ])
    const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `registratio-movimientos-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

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
          {/* Export */}
          <button
            onClick={exportCSV}
            disabled={transactions.length === 0}
            className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-40"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
            title="Exportar a CSV"
          >
            <Download size={14} style={{ color: 'var(--text-muted)' }} />
          </button>
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
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-faint)