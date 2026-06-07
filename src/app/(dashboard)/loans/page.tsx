'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Landmark, ChevronRight, CheckCircle2, Loader2, TrendingUp, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatARS, formatUSD } from '@/lib/utils'
import { PlanGate } from '@/components/shared/PlanGate'
import { OnboardingTip } from '@/components/shared/OnboardingTip'

interface Loan {
  id: string
  name: string
  lender: string | null
  loan_type: 'fixed' | 'uva'
  total_amount: number
  currency: 'ARS' | 'USD'
  monthly_payment: number
  uva_installment: number | null
  total_installments: number | null
  paid_installments: number
  start_date: string | null
  interest_rate: number | null
  notes: string | null
  is_active: boolean
}

function progressPct(loan: Loan) {
  if (!loan.total_installments) return null
  return Math.min(100, Math.round((loan.paid_installments / loan.total_installments) * 100))
}

function remainingInstallments(loan: Loan) {
  if (!loan.total_installments) return null
  return loan.total_installments - loan.paid_installments
}

function remainingAmount(loan: Loan, uvaValue: number | null) {
  const rem = remainingInstallments(loan)
  if (rem === null) return null
  const cuota = loan.loan_type === 'uva' && uvaValue && loan.uva_installment
    ? loan.uva_installment * uvaValue
    : loan.monthly_payment
  return rem * cuota
}

export default function LoansPage() {
  return <PlanGate feature="loans" featureLabel="Préstamos"><LoansPageContent /></PlanGate>
}

function LoansPageContent() {
  const router = useRouter()
  const supabase = createClient()
  const [loans, setLoans] = useState<Loan[]>([])
  const [loading, setLoading] = useState(true)
  const [uvaValue, setUvaValue] = useState<number | null>(null)
  const [uvaDate, setUvaDate] = useState<string | null>(null)
  const [uvaLoading, setUvaLoading] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('loans')
      .select('*')
      .order('created_at', { ascending: false })
    const result = (data ?? []) as Loan[]
    setLoans(result)
    setLoading(false)
    // Si hay préstamos UVA, traer el valor
    if (result.some(l => l.loan_type === 'uva')) fetchUVA()
  }

  async function fetchUVA() {
    setUvaLoading(true)
    try {
      const res = await fetch('/api/prices/uva')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setUvaValue(data.value)
      setUvaDate(data.date)
    } catch {
      // silencioso — el usuario puede refrescar desde detalle
    } finally {
      setUvaLoading(false)
    }
  }

  async function markPaid(loan: Loan) {
    const newPaid = loan.paid_installments + 1
    await supabase.from('loans').update({ paid_installments: newPaid }).eq('id', loan.id)
    setLoans(prev => prev.map(l => l.id === loan.id ? { ...l, paid_installments: newPaid } : l))
  }

  const activeLoans = loans.filter(l => l.is_active)
  const finishedLoans = loans.filter(l => !l.is_active)

  const totalMonthlyARS = activeLoans
    .filter(l => l.currency === 'ARS' || l.loan_type === 'uva')
    .reduce((s, l) => {
      if (l.loan_type === 'uva' && uvaValue && l.uva_installment) {
        return s + l.uva_installment * uvaValue
      }
      return s + l.monthly_payment
    }, 0)
  const totalMonthlyUSD = activeLoans
    .filter(l => l.currency === 'USD' && l.loan_type === 'fixed')
    .reduce((s, l) => s + l.monthly_payment, 0)

  const hasUVA = activeLoans.some(l => l.loan_type === 'uva')

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <Loader2 className="animate-spin" style={{ color: 'var(--text-muted)' }} />
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      <OnboardingTip
        tipId="loans"
        title="Seguimiento de préstamos"
        description="Registrá cualquier préstamo que hayas tomado — banco, tarjeta, personal. REGI$TRATIO te recuerda cada cuota y te muestra cuánto te falta pagar."
        cta={{ label: 'Registrar préstamo', href: '/loans/new' }}
        accent
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Préstamos</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Préstamos tomados con cuota mensual
          </p>
        </div>
        <button
          onClick={() => router.push('/loans/new')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: 'var(--accent)' }}
        >
          <Plus size={15} /> Nuevo préstamo
        </button>
      </div>

      {/* Valor UVA actual (si hay préstamos UVA) */}
      {hasUVA && (
        <div className="rounded-xl px-4 py-3 flex items-center justify-between"
          style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <div className="flex items-center gap-2">
            <TrendingUp size={14} style={{ color: '#10b981' }} />
            <div>
              <p className="text-xs font-semibold" style={{ color: '#10b981' }}>
                Valor UVA {uvaDate ? `· ${uvaDate}` : ''}
              </p>
              {uvaValue
                ? <p className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{formatARS(uvaValue)}</p>
                : <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
                    {uvaLoading ? 'Consultando BCRA...' : 'No disponible'}
                  </p>
              }
            </div>
          </div>
          <button onClick={fetchUVA} disabled={uvaLoading}
            className="p-1.5 rounded-lg" style={{ color: '#10b981', background: 'rgba(16,185,129,0.1)' }}>
            <RefreshCw size={13} className={uvaLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      )}

      {/* Resumen mensual */}
      {activeLoans.length > 0 && (
        <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>CUOTAS ESTE MES</p>
          <div className="flex gap-6 flex-wrap">
            {totalMonthlyARS > 0 && (
              <div>
                <p className="text-xl font-bold" style={{ color: 'var(--expense)' }}>{formatARS(totalMonthlyARS)}</p>
                <p className="text-xs" style={{ color: 'var(--text-faint)' }}>en ARS{hasUVA && uvaValue ? ' (UVA actualizado)' : ''}</p>
              </div>
            )}
            {totalMonthlyUSD > 0 && (
              <div>
                <p className="text-xl font-bold" style={{ color: 'var(--expense)' }}>{formatUSD(totalMonthlyUSD)}</p>
                <p className="text-xs" style={{ color: 'var(--text-faint)' }}>en USD</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lista de préstamos activos */}
      {activeLoans.length === 0 ? (
        <div className="rounded-xl p-10 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <Landmark size={32} className="mx-auto mb-3" style={{ color: 'var(--text-faint)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Sin préstamos activos</p>
          <p className="text-xs mt-1 mb-4" style={{ color: 'var(--text-faint)' }}>
            Registrá un préstamo para hacer seguimiento de las cuotas
          </p>
          <button
            onClick={() => router.push('/loans/new')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'var(--accent)' }}
          >
            <Plus size={14} /> Agregar préstamo
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {activeLoans.map(loan => {
            const isUVA = loan.loan_type === 'uva'
            const cuotaARS = isUVA && uvaValue && loan.uva_installment
              ? loan.uva_installment * uvaValue
              : null
            const pct = progressPct(loan)
            const rem = remainingInstallments(loan)
            const remAmt = remainingAmount(loan, uvaValue)
            const fmt = loan.currency === 'USD' && !isUVA ? formatUSD : formatARS
            const displayCuota = cuotaARS ?? loan.monthly_payment

            return (
              <div
                key={loan.id}
                className="rounded-xl p-4"
                style={{ background: 'var(--surface)', border: `1px solid ${isUVA ? 'rgba(16,185,129,0.25)' : 'var(--border)'}` }}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: isUVA ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)' }}>
                    {isUVA
                      ? <span style={{ fontSize: 18 }}>🏠</span>
                      : <Landmark size={18} style={{ color: '#ef4444' }} />
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{loan.name}</p>
                        {isUVA && (
                          <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
                            UVA
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => router.push(`/loans/${loan.id}`)}
                        className="p-1 rounded-lg transition-colors shrink-0"
                        style={{ color: 'var(--text-faint)' }}
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>

                    {loan.lender && (
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{loan.lender}</p>
                    )}

                    <div className="flex items-center gap-4 mt-2 flex-wrap">
                      <div>
                        <p className="text-xs" style={{ color: 'var(--text-faint)' }}>Cuota</p>
                        {isUVA ? (
                          <div>
                            <p className="text-sm font-bold" style={{ color: 'var(--expense)' }}>
                              {cuotaARS ? formatARS(cuotaARS) : `${loan.uva_installment} UVAs`}
                            </p>
                            {cuotaARS && loan.uva_installment && (
                              <p className="text-[10px]" style={{ color: 'var(--text-faint)' }}>
                                {loan.uva_installment} UVAs × {formatARS(uvaValue!)}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm font-bold" style={{ color: 'var(--expense)' }}>{fmt(displayCuota)}</p>
                        )}
                      </div>
                      {rem !== null && (
                        <div>
                          <p className="text-xs" style={{ color: 'var(--text-faint)' }}>Cuotas restantes</p>
                          <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                            {rem} de {loan.total_installments}
                          </p>
                        </div>
                      )}
                      {remAmt !== null && (
                        <div>
                          <p className="text-xs" style={{ color: 'var(--text-faint)' }}>Saldo pendiente</p>
                          <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{formatARS(remAmt)}</p>
                        </div>
                      )}
                      {loan.interest_rate && (
                        <div>
                          <p className="text-xs" style={{ color: 'var(--text-faint)' }}>TNA</p>
                          <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{loan.interest_rate}%</p>
                        </div>
                      )}
                    </div>

                    {/* Barra de progreso */}
                    {pct !== null && (
                      <div className="mt-3">
                        <div className="flex justify-between text-[10px] mb-1" style={{ color: 'var(--text-faint)' }}>
                          <span>{loan.paid_installments} pagadas</span>
                          <span>{pct}%</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, background: pct >= 80 ? 'var(--income)' : isUVA ? '#10b981' : 'var(--accent)' }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Botón pagar cuota */}
                    {(rem === null || rem > 0) && (
                      <button
                        onClick={() => markPaid(loan)}
                        className="mt-3 flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                        style={{ background: 'var(--accent-bg)', color: 'var(--accent-text)', border: '1px solid var(--accent-border)' }}
                      >
                        <CheckCircle2 size={13} /> Marcar cuota como pagada
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Préstamos finalizados */}
      {finishedLoans.length > 0 && (
        <div>
          <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-faint)' }}>FINALIZADOS</p>
          <div className="space-y-2">
            {finishedLoans.map(loan => (
              <div
                key={loan.id}
                className="rounded-xl px-4 py-3 flex items-center gap-3"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', opacity: 0.55 }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{loan.name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {loan.loan_type === 'uva' ? `${loan.uva_installment} UVAs` : `${loan.currency} ${loan.total_amount.toLocaleString('es-AR')}`} · Finalizado
                  </p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full shrink-0" style={{ background: 'var(--surface-elevated)', color: 'var(--text-faint)' }}>✓</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
