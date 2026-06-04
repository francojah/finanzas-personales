'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  X, ArrowUpCircle, ArrowDownCircle, ArrowLeftRight,
  ExternalLink, Trash2, Receipt,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatARS, formatUSD, formatDate, cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Transaction } from '@/types/database'

interface Props {
  transactionId: string | null
  onClose: () => void
  onDeleted?: (id: string) => void
}

export function TransactionDrawer({ transactionId, onClose, onDeleted }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [tx, setTx] = useState<Transaction | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!transactionId) { setTx(null); return }
    setLoading(true)
    supabase
      .from('transactions')
      .select('*, category:categories(name,color,icon), subcategory:subcategories(name), account:accounts!account_id(name), credit_card:credit_cards(name)')
      .eq('id', transactionId)
      .single()
      .then(({ data }) => {
        setTx(data as Transaction)
        setLoading(false)
      })
  }, [transactionId])

  // Cerrar con Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  async function handleDelete() {
    if (!tx || !confirm('¿Eliminar este movimiento?')) return
    const { error } = await supabase.from('transactions').delete().eq('id', tx.id)
    if (error) { toast.error('Error al eliminar'); return }
    toast.success('Movimiento eliminado')
    onDeleted?.(tx.id)
    onClose()
  }

  const open = !!transactionId

  const isIncome  = tx?.type === 'income'
  const isExpense = tx?.type === 'expense'
  const Icon = isIncome ? ArrowUpCircle : isExpense ? ArrowDownCircle : ArrowLeftRight
  const iconBg    = isIncome ? 'bg-green-100' : isExpense ? 'bg-red-100'  : 'bg-indigo-100'
  const iconColor = isIncome ? 'text-green-600' : isExpense ? 'text-red-500' : 'text-indigo-600'
  const amtColor  = isIncome ? 'text-green-600' : isExpense ? 'text-red-500' : 'text-indigo-600'
  const prefix    = isIncome ? '+' : isExpense ? '-' : ''

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-black/30 z-40 transition-opacity duration-200',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          'fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-2xl z-50',
          'transition-transform duration-300 ease-in-out flex flex-col',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">Detalle</h2>
          <div className="flex items-center gap-1">
            {tx && (
              <>
                <button
                  onClick={() => { onClose(); router.push(`/transactions/${tx.id}`) }}
                  className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-indigo-600 transition-colors"
                  title="Ver página completa"
                >
                  <ExternalLink size={16} />
                </button>
                <button
                  onClick={handleDelete}
                  className="p-2 hover:bg-red-50 rounded-xl text-slate-400 hover:text-red-500 transition-colors"
                  title="Eliminar"
                >
                  <Trash2 size={16} />
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading && (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
          )}

          {!loading && tx && (
            <>
              {/* Monto */}
              <div className="text-center py-4">
                <div className={cn('inline-flex p-3 rounded-2xl mb-3', iconBg)}>
                  <Icon size={24} className={iconColor} />
                </div>
                <p className={cn('text-3xl font-bold', amtColor)}>
                  {prefix}{formatARS(tx.amount_ars)}
                </p>
                <p className="text-sm text-slate-400 mt-1">{prefix}{formatUSD(tx.amount_usd)}</p>
                {tx.exchange_rate && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    TC {tx.exchange_rate_type?.toUpperCase()} {formatARS(tx.exchange_rate)}
                  </p>
                )}
              </div>

              {/* Filas de detalle */}
              <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 overflow-hidden">
                {[
                  {
                    label: 'Tipo',
                    value: tx.type === 'income' ? 'Ingreso' : tx.type === 'expense' ? 'Gasto' : 'Transferencia',
                  },
                  { label: 'Fecha', value: formatDate(tx.date) },
                  { label: 'Categoría', value: (tx.category as any)?.name ?? '—' },
                  { label: 'Subcategoría', value: (tx.subcategory as any)?.name ?? '—' },
                  {
                    label: 'Cuenta',
                    value: (tx.account as any)?.name ?? (tx.credit_card as any)?.name ?? '—',
                  },
                  { label: 'Descripción', value: tx.description ?? '—' },
                  {
                    label: 'Recurrente',
                    value: tx.is_recurring ? `Sí (${tx.recurrence_frequency})` : 'No',
                  },
                  tx.has_installments
                    ? { label: 'Cuotas', value: `${tx.current_installment}/${tx.total_installments}` }
                    : null,
                ]
                  .filter(Boolean)
                  .map(({ label, value }: any) => (
                    <div key={label} className="flex justify-between px-4 py-3 bg-white">
                      <span className="text-sm text-slate-500">{label}</span>
                      <span className="text-sm font-medium text-slate-800 text-right max-w-[55%]">
                        {value}
                      </span>
                    </div>
                  ))}
              </div>

              {/* Comprobante */}
              {tx.receipt_url && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <Receipt size={12} /> Comprobante
                  </p>
                  <div className="relative rounded-xl overflow-hidden border border-slate-100">
                    <img
                      src={tx.receipt_url}
                      alt="Comprobante"
                      className="w-full max-h-52 object-contain bg-slate-50"
                    />
                    <a
                      href={tx.receipt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute top-2 right-2 bg-black/40 text-white rounded-lg p-1.5 hover:bg-black/60 transition-colors"
                    >
                      <ExternalLink size={13} />
                    </a>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
