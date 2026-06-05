'use client'

import { useState, useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { DollarSign, Percent, Calendar, TrendingUp } from 'lucide-react'

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return n.toFixed(2)
}
function fmtFull(n: number, currency: 'USD' | 'ARS'): string {
  const s = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
  return currency === 'USD' ? `USD ${s}` : `$ ${s}`
}

interface YearRow { year: number; balance: number; contributed: number; interest: number }

function calcCompound(initialCapital: number, monthlyContrib: number, annualRate: number, years: number): YearRow[] {
  const rate = annualRate / 100 / 12
  const rows: YearRow[] = []
  let balance = initialCapital
  let totalContributed = initialCapital
  for (let y = 1; y <= years; y++) {
    for (let m = 0; m < 12; m++) {
      balance = balance * (1 + rate) + monthlyContrib
      totalContributed += monthlyContrib
    }
    rows.push({ year: y, balance: Math.round(balance * 100) / 100, contributed: Math.round(totalContributed * 100) / 100, interest: Math.round((balance - totalContributed) * 100) / 100 })
  }
  return rows
}

export default function InteresCompuestoPage() {
  const [capital,  setCapital]  = useState(10000)
  const [monthly,  setMonthly]  = useState(500)
  const [rate,     setRate]     = useState(8)
  const [years,    setYears]    = useState(10)
  const [currency, setCurrency] = useState<'USD' | 'ARS'>('USD')

  const data = useMemo(() => calcCompound(capital, monthly, rate, years), [capital, monthly, rate, years])
  const last = data[data.length - 1] ?? { balance: 0, contributed: 0, interest: 0 }

  const tooltipStyle = {
    background: 'var(--surface-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    fontSize: 12,
    color: 'var(--text-primary)',
  }

  const inputFields = [
    { key: 'capital',  label: 'Capital inicial',  icon: DollarSign, value: capital,  setter: setCapital,  min: 0,   step: 1 },
    { key: 'monthly',  label: 'Aporte mensual',   icon: TrendingUp, value: monthly,  setter: setMonthly,  min: 0,   step: 1 },
    { key: 'rate',     label: 'Tasa anual (%)',   icon: Percent,    value: rate,     setter: setRate,     min: 0,   step: 0.1 },
    { key: 'years',    label: 'Plazo (años)',     icon: Calendar,   value: years,    setter: (v: number) => setYears(Math.min(50, Math.max(1, v))), min: 1, step: 1 },
  ]

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Interés Compuesto</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>Proyectá el crecimiento de tus ahorros en el tiempo</p>
      </div>

      {/* Inputs */}
      <div className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        {/* Moneda */}
        <div className="flex rounded-xl overflow-hidden w-fit" style={{ border: '1.5px solid var(--border)' }}>
          {(['USD', 'ARS'] as const).map(c => (
            <button key={c} onClick={() => setCurrency(c)}
              className="px-4 py-1.5 text-sm font-semibold transition-colors"
              style={currency === c ? { background: 'var(--accent)', color: '#fff' } : { background: 'var(--surface-elevated)', color: 'var(--text-muted)' }}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {inputFields.map(({ key, label, icon: Icon, value, setter, min, step }) => (
            <div key={key}>
              <label className="flex items-center gap-1 text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                <Icon size={11} /> {label}
              </label>
              <input
                type="number" value={value} min={min} step={step}
                onChange={e => (setter as (v: number) => void)(Number(e.target.value))}
                className="input-base"
              />
            </div>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Monto final',       value: fmtFull(last.balance, currency),     color: 'var(--income)' },
          { label: 'Total aportado',    value: fmtFull(last.contributed, currency), color: 'var(--text-primary)' },
          { label: 'Intereses ganados', value: fmtFull(last.interest, currency),    color: 'var(--accent-icon)' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
            <p className="text-lg font-bold" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>Proyección de crecimiento</h2>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="gradBal"  x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="var(--accent)" stopOpacity={0.25} />
                <stop offset="95%" stopColor="var(--accent)" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gradCon"  x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="var(--income)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="var(--income)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="year" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false}
              tickFormatter={v => `Año ${v}`} interval={Math.floor(years / 5)} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false}
              tickFormatter={v => fmt(v)} width={50} />
            <Tooltip contentStyle={tooltipStyle}
              formatter={(v: number, name: string) => [fmtFull(v, currency), name === 'balance' ? 'Total' : name === 'contributed' ? 'Aportado' : 'Intereses']}
              labelFormatter={v => `Año ${v}`} />
            <Area type="monotone" dataKey="contributed" stroke="var(--income)"  strokeWidth={1.5} fill="url(#gradCon)" />
            <Area type="monotone" dataKey="balance"     stroke="var(--accent)"  strokeWidth={2}   fill="url(#gradBal)" />
          </AreaChart>
        </ResponsiveContainer>
        <div className="flex gap-4 mt-3">
          {[['var(--accent)', 'Monto total'], ['var(--income)', 'Aportes acumulados']].map(([color, label]) => (
            <div key={label} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
              <div className="w-3 h-3 rounded-sm" style={{ background: color }} /> {label}
            </div>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="px-5 py-3.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Proyección año a año</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                {['Año', 'Total aportado', 'Intereses', 'Monto final'].map(h => (
                  <th key={h} className="text-left px-5 py-2.5 text-xs font-semibold" style={{ color: 'var(--text-faint)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={row.year} style={{ background: i % 2 === 1 ? 'var(--surface-hover)' : 'transparent', borderBottom: i < data.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                  <td className="px-5 py-2.5 font-medium" style={{ color: 'var(--text-secondary)' }}>Año {row.year}</td>
                  <td className="px-5 py-2.5" style={{ color: 'var(--text-primary)' }}>{fmtFull(row.contributed, currency)}</td>
                  <td className="px-5 py-2.5 font-medium" style={{ color: 'var(--accent-icon)' }}>{fmtFull(row.interest, currency)}</td>
                  <td className="px-5 py-2.5 font-bold" style={{ color: 'var(--income)' }}>{fmtFull(row.balance, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
