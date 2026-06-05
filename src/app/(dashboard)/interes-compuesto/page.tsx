'use client'

import { useState, useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { TrendingUp, DollarSign, Percent, Calendar } from 'lucide-react'

// ─── Helpers ───────────────────────────────────────────────
function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return n.toFixed(2)
}

function fmtFull(n: number, currency: 'USD' | 'ARS'): string {
  const formatted = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
  return currency === 'USD' ? `USD ${formatted}` : `$ ${formatted}`
}

interface YearRow {
  year: number
  balance: number
  contributed: number
  interest: number
}

function calcCompound(
  initialCapital: number,
  monthlyContrib: number,
  annualRate: number,
  years: number,
): YearRow[] {
  const monthlyRate = annualRate / 100 / 12
  const rows: YearRow[] = []
  let balance = initialCapital
  let totalContributed = initialCapital

  for (let y = 1; y <= years; y++) {
    for (let m = 0; m < 12; m++) {
      balance = balance * (1 + monthlyRate) + monthlyContrib
      totalContributed += monthlyContrib
    }
    rows.push({
      year: y,
      balance: Math.round(balance * 100) / 100,
      contributed: Math.round(totalContributed * 100) / 100,
      interest: Math.round((balance - totalContributed) * 100) / 100,
    })
  }
  return rows
}

// ─── Component ─────────────────────────────────────────────
const inputStyle = {
  width: '100%',
  border: '1.5px solid #2a2a2a',
  borderRadius: '10px',
  padding: '0.625rem 0.875rem',
  fontSize: '0.9375rem',
  color: '#ededed',
  background: '#222',
  outline: 'none',
}

export default function InteresCompuestoPage() {
  const [capital,  setCapital]  = useState(10000)
  const [monthly,  setMonthly]  = useState(500)
  const [rate,     setRate]     = useState(8)
  const [years,    setYears]    = useState(10)
  const [currency, setCurrency] = useState<'USD' | 'ARS'>('USD')
  const [focused,  setFocused]  = useState<string | null>(null)

  const data = useMemo(() => calcCompound(capital, monthly, rate, years), [capital, monthly, rate, years])
  const last = data[data.length - 1] ?? { balance: 0, contributed: 0, interest: 0 }

  const getFocus = (name: string) =>
    focused === name
      ? { ...inputStyle, borderColor: '#7c6ff7', boxShadow: '0 0 0 3px rgba(124,111,247,0.12)' }
      : inputStyle

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#ededed' }}>Interés Compuesto</h1>
        <p className="text-sm mt-0.5" style={{ color: '#666' }}>
          Proyectá el crecimiento de tus ahorros en el tiempo
        </p>
      </div>

      {/* Inputs */}
      <div className="rounded-2xl p-5 space-y-4" style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

          {/* Moneda */}
          <div className="col-span-2 md:col-span-4">
            <div className="flex rounded-xl overflow-hidden w-fit" style={{ border: '1.5px solid #2a2a2a' }}>
              {(['USD', 'ARS'] as const).map(c => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className="px-4 py-1.5 text-sm font-semibold transition-colors"
                  style={currency === c ? { background: '#7c6ff7', color: '#fff' } : { background: '#222', color: '#666' }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Capital inicial */}
          <div>
            <label className="block text-xs font-medium mb-1.5 flex items-center gap-1" style={{ color: '#999' }}>
              <DollarSign size={11} /> Capital inicial
            </label>
            <input
              type="number"
              value={capital}
              onChange={e => setCapital(Number(e.target.value))}
              onFocus={() => setFocused('capital')}
              onBlur={() => setFocused(null)}
              style={getFocus('capital')}
              min={0}
            />
          </div>

          {/* Aporte mensual */}
          <div>
            <label className="block text-xs font-medium mb-1.5 flex items-center gap-1" style={{ color: '#999' }}>
              <TrendingUp size={11} /> Aporte mensual
            </label>
            <input
              type="number"
              value={monthly}
              onChange={e => setMonthly(Number(e.target.value))}
              onFocus={() => setFocused('monthly')}
              onBlur={() => setFocused(null)}
              style={getFocus('monthly')}
              min={0}
            />
          </div>

          {/* Tasa anual */}
          <div>
            <label className="block text-xs font-medium mb-1.5 flex items-center gap-1" style={{ color: '#999' }}>
              <Percent size={11} /> Tasa anual (%)
            </label>
            <input
              type="number"
              value={rate}
              onChange={e => setRate(Number(e.target.value))}
              onFocus={() => setFocused('rate')}
              onBlur={() => setFocused(null)}
              style={getFocus('rate')}
              min={0}
              max={100}
              step={0.1}
            />
          </div>

          {/* Años */}
          <div>
            <label className="block text-xs font-medium mb-1.5 flex items-center gap-1" style={{ color: '#999' }}>
              <Calendar size={11} /> Plazo (años)
            </label>
            <input
              type="number"
              value={years}
              onChange={e => setYears(Math.min(50, Math.max(1, Number(e.target.value))))}
              onFocus={() => setFocused('years')}
              onBlur={() => setFocused(null)}
              style={getFocus('years')}
              min={1}
              max={50}
            />
          </div>
        </div>
      </div>

      {/* Result KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl p-4" style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}>
          <p className="text-xs mb-1" style={{ color: '#666' }}>Monto final</p>
          <p className="text-xl font-bold" style={{ color: '#4ade80' }}>{fmtFull(last.balance, currency)}</p>
        </div>
        <div className="rounded-xl p-4" style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}>
          <p className="text-xs mb-1" style={{ color: '#666' }}>Total aportado</p>
          <p className="text-xl font-bold" style={{ color: '#ededed' }}>{fmtFull(last.contributed, currency)}</p>
        </div>
        <div className="rounded-xl p-4" style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}>
          <p className="text-xs mb-1" style={{ color: '#666' }}>Intereses ganados</p>
          <p className="text-xl font-bold" style={{ color: '#a89efa' }}>{fmtFull(last.interest, currency)}</p>
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-2xl p-5" style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}>
        <h2 className="text-sm font-semibold mb-4" style={{ color: '#999' }}>Proyección de crecimiento</h2>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="gradBalance" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7c6ff7" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#7c6ff7" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gradContrib" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4ade80" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#4ade80" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
            <XAxis
              dataKey="year"
              tick={{ fontSize: 11, fill: '#555' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => `Año ${v}`}
              interval={Math.floor(years / 5)}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#555' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => fmt(v)}
              width={50}
            />
            <Tooltip
              contentStyle={{
                background: '#1e1e1e',
                border: '1px solid #2a2a2a',
                borderRadius: 10,
                fontSize: 12,
                color: '#ededed',
              }}
              formatter={(value: number, name: string) => [
                fmtFull(value, currency),
                name === 'balance' ? 'Total' : name === 'contributed' ? 'Aportado' : 'Intereses',
              ]}
              labelFormatter={v => `Año ${v}`}
            />
            <Area type="monotone" dataKey="contributed" stroke="#4ade80" strokeWidth={1.5} fill="url(#gradContrib)" />
            <Area type="monotone" dataKey="balance"     stroke="#7c6ff7" strokeWidth={2}   fill="url(#gradBalance)" />
          </AreaChart>
        </ResponsiveContainer>
        <div className="flex gap-4 mt-3">
          <div className="flex items-center gap-1.5 text-xs" style={{ color: '#666' }}>
            <div className="w-3 h-3 rounded-sm" style={{ background: '#7c6ff7' }} /> Monto total
          </div>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: '#666' }}>
            <div className="w-3 h-3 rounded-sm" style={{ background: '#4ade80' }} /> Aportes acumulados
          </div>
        </div>
      </div>

      {/* Tabla año a año */}
      <div className="rounded-2xl overflow-hidden" style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}>
        <div className="px-5 py-3.5" style={{ borderBottom: '1px solid #222' }}>
          <h2 className="text-sm font-semibold" style={{ color: '#999' }}>Proyección año a año</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid #1e1e1e' }}>
                {['Año', 'Total aportado', 'Intereses', 'Monto final'].map(h => (
                  <th key={h} className="text-left px-5 py-2.5 text-xs font-semibold" style={{ color: '#555' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr
                  key={row.year}
                  style={{
                    borderBottom: i < data.length - 1 ? '1px solid #1a1a1a' : 'none',
                    background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                  }}
                >
                  <td className="px-5 py-2.5 font-medium" style={{ color: '#888' }}>Año {row.year}</td>
                  <td className="px-5 py-2.5" style={{ color: '#ededed' }}>{fmtFull(row.contributed, currency)}</td>
                  <td className="px-5 py-2.5 font-medium" style={{ color: '#a89efa' }}>{fmtFull(row.interest, currency)}</td>
                  <td className="px-5 py-2.5 font-bold" style={{ color: '#4ade80' }}>{fmtFull(row.balance, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
