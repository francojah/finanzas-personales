'use client'

import { useMemo } from 'react'
import { TrendingUp, Shield, PiggyBank, CreditCard } from 'lucide-react'

interface ScoreInput {
  savingsRate: number        // % ahorro del mes (0-100+)
  expenseToIncome: number   // gastos / ingresos (0-1+)
  patrimonioUSD: number     // patrimonio total en USD
  totalDebtARS: number      // deuda total en ARS
  patrimonioARS: number     // patrimonio total en ARS
  hasInvestments: boolean   // tiene inversiones activas
  monthsWithData: number    // meses con datos registrados
}

interface ScoreResult {
  total: number             // 0-100
  breakdown: {
    label: string
    score: number
    max: number
    icon: React.ReactNode
    tip: string
  }[]
  label: string
  color: string
}

export function calcFinancialScore(input: ScoreInput): ScoreResult {
  const breakdown = []

  // 1. Tasa de ahorro (0-30 pts)
  let savingsScore = 0
  const sr = input.savingsRate
  if (sr >= 30) savingsScore = 30
  else if (sr >= 20) savingsScore = 25
  else if (sr >= 10) savingsScore = 18
  else if (sr >= 5)  savingsScore = 10
  else if (sr > 0)   savingsScore = 5
  breakdown.push({
    label: 'Tasa de ahorro',
    score: savingsScore,
    max: 30,
    icon: <PiggyBank size={14} />,
    tip: sr >= 20 ? '¡Excelente! Ahorrás más del 20%' : sr > 0 ? `Ahorrás el ${sr}%. Apuntá al 20%` : 'Este mes gastaste más de lo que ingresaste',
  })

  // 2. Control de gastos (0-25 pts)
  let spendingScore = 0
  const ratio = input.expenseToIncome
  if (ratio <= 0.6)      spendingScore = 25
  else if (ratio <= 0.75) spendingScore = 20
  else if (ratio <= 0.85) spendingScore = 15
  else if (ratio <= 0.95) spendingScore = 8
  else if (ratio <= 1.0)  spendingScore = 3
  breakdown.push({
    label: 'Control de gastos',
    score: spendingScore,
    max: 25,
    icon: <TrendingUp size={14} />,
    tip: ratio <= 0.75 ? 'Bien — tus gastos son razonables respecto a tus ingresos' : ratio <= 1 ? 'Gastos altos — intentá reducir categorías no esenciales' : 'Gastás más de lo que ingresás este mes',
  })

  // 3. Salud patrimonial (0-25 pts)
  let patrimonioScore = 0
  if (input.patrimonioUSD > 0) {
    const debtRatio = input.patrimonioARS > 0 ? input.totalDebtARS / input.patrimonioARS : 1
    if (debtRatio < 0.1)       patrimonioScore = 25
    else if (debtRatio < 0.25) patrimonioScore = 20
    else if (debtRatio < 0.4)  patrimonioScore = 14
    else if (debtRatio < 0.6)  patrimonioScore = 8
    else                        patrimonioScore = 3
  }
  breakdown.push({
    label: 'Salud patrimonial',
    score: patrimonioScore,
    max: 25,
    icon: <Shield size={14} />,
    tip: input.totalDebtARS === 0 ? '¡Sin deudas registradas!' : patrimonioScore >= 20 ? 'Deudas bajas respecto a tu patrimonio' : 'Las deudas representan una parte importante de tu patrimonio',
  })

  // 4. Inversiones y datos (0-20 pts)
  let investScore = 0
  if (input.hasInvestments) investScore += 12
  if (input.monthsWithData >= 3) investScore += 8
  else if (input.monthsWithData >= 1) investScore += 4
  breakdown.push({
    label: 'Inversiones y registro',
    score: investScore,
    max: 20,
    icon: <CreditCard size={14} />,
    tip: input.hasInvestments ? 'Bien — tenés inversiones activas' : 'Registrá inversiones para hacer crecer tu patrimonio',
  })

  const total = Math.min(100, breakdown.reduce((s, b) => s + b.score, 0))

  let label = 'Crítico'
  let color = '#ef4444'
  if (total >= 80) { label = 'Excelente'; color = '#10b981' }
  else if (total >= 65) { label = 'Muy bueno'; color = '#34d399' }
  else if (total >= 50) { label = 'Bueno'; color = '#f0b429' }
  else if (total >= 35) { label = 'Regular'; color = '#f97316' }

  return { total, breakdown, label, color }
}

export function FinancialScoreWidget({ input }: { input: ScoreInput }) {
  const score = useMemo(() => calcFinancialScore(input), [input])

  const circumference = 2 * Math.PI * 38
  const dashOffset = circumference - (score.total / 100) * circumference

  return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Score financiero</h2>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: score.color + '20', color: score.color }}>
          {score.label}
        </span>
      </div>

      <div className="flex items-center gap-6">
        {/* Gauge circular */}
        <div className="relative shrink-0">
          <svg width="96" height="96" viewBox="0 0 96 96">
            {/* Track */}
            <circle cx="48" cy="48" r="38" fill="none" strokeWidth="8"
              stroke="var(--border)" />
            {/* Progress */}
            <circle cx="48" cy="48" r="38" fill="none" strokeWidth="8"
              stroke={score.color}
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              transform="rotate(-90 48 48)"
              style={{ transition: 'stroke-dashoffset 0.8s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-black" style={{ color: score.color }}>{score.total}</span>
            <span className="text-[9px] font-semibold" style={{ color: 'var(--text-faint)' }}>/ 100</span>
          </div>
        </div>

        {/* Breakdown */}
        <div className="flex-1 space-y-2.5">
          {score.breakdown.map(item => (
            <div key={item.label}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                  {item.icon}
                  <span className="text-[11px] font-medium">{item.label}</span>
                </div>
                <span className="text-[11px] font-bold" style={{ color: 'var(--text-primary)' }}>
                  {item.score}/{item.max}
                </span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(item.score / item.max) * 100}%`,
                    background: item.score / item.max >= 0.7 ? '#10b981' : item.score / item.max >= 0.4 ? '#f0b429' : '#ef4444',
                  }}
                />
              </div>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-faint)' }}>{item.tip}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
