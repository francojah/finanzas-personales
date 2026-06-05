'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Loader2, Trash2, CheckCircle2, Landmark } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatARS, formatUSD } from '@/lib/utils'
import { toast } from 'sonner'

interface Loan {
  id: string
  name: string
  lender: string | null
  total_amount: number
  currency: 'ARS' | 'USD'
  monthly_payment: number
  total_installments: number | null
  paid_installments: number
  start_date: string | null
  interest_rate: number | null
  notes: string | null
  is_active: boolean
}

export default function LoanDetailPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const supabase = createClient()
  const [loan, setLoan] = useState<Loan | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [id])

  async function load() {
    const { data } = await supabase.from('loans').select('*').eq('id', id).single()
    setLoan(data as Loan)
    setLoading(false)
  }

  async function markPaid() {
    if (!loan) return
    const newPaid = loan.paid_installments + 1
    const finished = loan.total_installments ? newPaid >= loan.total_installments : false
    await supabase.from('loans').update({
      paid_installments: newPaid,
      is_active: !finished,
    }).eq('id', id)
    setLoan(prev => prev ? { ...prev, paid_installments: newPaid, is_active: !finished } : prev)
    toast.success(finished ? '¡Préstamo cancelado! 🎉' : 'Cuota registrada')
  }

  async function deleteLoan() {
    if (!confirm('¿Eliminar este préstamo?')) return
    await supabase.from('loans').delete().eq('id', id)
    toast.success('Préstamo eliminado')
    router.push('/loans')
  }

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <Loader2 className="animate-spin" style={{ color: 'var(--text-muted)' }} />
    </div>
  )
  if (!loan) return null

  const fmt = loan.currency === 'ARS' ? formatARS : formatUSD
  const rem = loan.total_installments ? loan.total_installments - loan.paid_installments : null
  const pct = loan.total_installments ? Math.min(100, Math.round((loan.paid_installments / loan.total_installments) * 100)) : null
  const remAmt = rem !== null ? rem * loan.monthly_payment : null

  return (
    <div className="max-w-xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-xl"
            style={{ color: 'var(--text-muted)', background: 'var(--surface)' }}
          >
            <ArrowLeft size={17} />
          </button>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{loan.name}</h1>
            {loan.lender && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{loan.lender}</p>}
          </div>
        </div>
        <button
          onClick={deleteLoan}
          className="p-2 rounded-xl text-red-400 hover:text-red-500 transition-colors"
          style={{ background: 'var(--surface)' }}
        >
          <Trash2 size={17} />
        </button>
      </div>

      {/* Stats */}
      <div className="rounded-xl p-5 space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs mb-1" style={{ color: 'var(--text-faint)' }}>Cuota mensual</p>
            <p className="text-xl font-bold" style={{ color: 'var(--expense)' }}>{fmt(loan.monthly_payment)}</p>
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: 'var(--text-faint)' }}>Monto total</p>
            <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{fmt(loan.total_amount)}</p>
          </div>
          {rem !== null && (
            <div>
              <p className="text-xs mb-1" style={{ color: 'var(--text-faint)' }}>Cuotas restantes</p>
              <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{rem} de {loan.total_installments}</p>
            </div>
          )}
          {remAmt !== null && (
            <div>
              <p className="text-xs mb-1" style={{ color: 'var(--text-faint)' }}>Saldo pendiente</p>
              <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{fmt(remAmt)}</p>
            </div>
          )}
          {loan.interest_rate && (
            <div>
              <p className="text-xs mb-1" style={{ color: 'var(--text-faint)' }}>TNA</p>
              <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{loan.interest_rate}%</p>
            </div>
          )}
          {loan.start_date && (
            <div>
              <p className="text-xs mb-1" style={{ color: 'var(--text-faint)' }}>Inicio</p>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {new Date(loan.start_date).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            </div>
          )}
        </div>

        {/* Progreso */}
        {pct !== null && (
          <div>
            <div className="flex justify-between text-xs mb-1.5" style={{ color: 'var(--text-faint)' }}>
              <span>{loan.paid_installments} cuotas pagadas</span>
              <span>{pct}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, background: pct >= 80 ? 'var(--income)' : 'var(--accent)' }}
              />
            </div>
          </div>
        )}

        {loan.notes && (
          <p className="text-xs p-3 rounded-lg" style={{ background: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}>
            {loan.notes}
          </p>
        )}
      </div>

      {/* Estado */}
      {!loan.is_active ? (
        <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
          <CheckCircle2 size={20} style={{ color: 'var(--income)' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--income)' }}>Préstamo cancelado</p>
        </div>
      ) : (
        <button
          onClick={markPaid}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold"
          style={{ background: 'var(--accent-bg)', color: 'var(--accent-text)', border: '1px solid var(--accent-border)' }}
        >
          <CheckCircle2 size={16} /> Marcar cuota como pagada
        </button>
      )}
    </div>
  )
}
