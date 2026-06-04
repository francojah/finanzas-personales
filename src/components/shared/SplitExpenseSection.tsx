'use client'

import { useState, useEffect } from 'react'
import { Users, Percent, DollarSign } from 'lucide-react'
import { usePeople } from '@/hooks/usePeople'
import { formatARS, formatUSD, cn } from '@/lib/utils'

interface Split {
  person_id: string
  mode: 'percent' | 'fixed'
  percent: string
  fixed_ars: string
}

interface SplitExpenseSectionProps {
  amountARS: number
  amountUSD: number
  onChange: (splits: Split[]) => void
}

export function SplitExpenseSection({ amountARS, amountUSD, onChange }: SplitExpenseSectionProps) {
  const { people } = usePeople()
  const [enabled, setEnabled] = useState(false)
  const [splits, setSplits] = useState<Split[]>([{
    person_id: '', mode: 'percent', percent: '50', fixed_ars: '',
  }])

  useEffect(() => {
    if (enabled) onChange(splits)
    else onChange([])
  }, [enabled, splits])

  function updateSplit(i: number, update: Partial<Split>) {
    setSplits(s => s.map((sp, idx) => idx === i ? { ...sp, ...update } : sp))
  }

  function addSplit() {
    setSplits(s => [...s, { person_id: '', mode: 'percent', percent: '50', fixed_ars: '' }])
  }

  function removeSplit(i: number) {
    setSplits(s => s.filter((_, idx) => idx !== i))
  }

  // Calcular monto que le corresponde a cada persona
  function calcAmount(split: Split): { ars: number; usd: number } {
    if (split.mode === 'percent') {
      const pct = parseFloat(split.percent) / 100
      return { ars: amountARS * pct, usd: amountUSD * pct }
    } else {
      const ars = parseFloat(split.fixed_ars) || 0
      return { ars, usd: amountUSD > 0 && amountARS > 0 ? ars * (amountUSD / amountARS) : 0 }
    }
  }

  return (
    <div className="card !p-4 space-y-3">
      {/* Toggle */}
      <label className="flex items-center gap-3 cursor-pointer">
        <div
          onClick={() => setEnabled(e => !e)}
          className={cn(
            'w-10 h-6 rounded-full transition-colors relative shrink-0',
            enabled ? 'bg-indigo-600' : 'bg-slate-200'
          )}
        >
          <div className={cn(
            'absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform',
            enabled ? 'translate-x-5' : 'translate-x-1'
          )} />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
            <Users size={14} className="text-slate-400" /> Dividir este gasto
          </p>
          <p className="text-xs text-slate-400">Asigná a alguien lo que te debe pagar</p>
        </div>
      </label>

      {/* Configuración de splits */}
      {enabled && (
        <div className="space-y-3 pt-1">
          {splits.map((split, i) => {
            const calc = calcAmount(split)
            return (
              <div key={i} className="bg-slate-50 rounded-xl p-3 space-y-2">
                {/* Persona */}
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Persona</label>
                  <select
                    value={split.person_id}
                    onChange={e => updateSplit(i, { person_id: e.target.value })}
                    className="input-base text-sm"
                  >
                    <option value="">Seleccioná...</option>
                    {people.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  {people.length === 0 && (
                    <p className="text-xs text-amber-500 mt-1">
                      No hay personas. Agregá una en <a href="/people" className="underline">Cobros</a>.
                    </p>
                  )}
                </div>

                {/* Modo: porcentaje o fijo */}
                <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                  {([
                    ['percent', 'Porcentaje', Percent],
                    ['fixed',   'Monto fijo', DollarSign],
                  ] as const).map(([val, lbl, Icon]) => (
                    <button key={val} type="button"
                      onClick={() => updateSplit(i, { mode: val })}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium transition-colors',
                        split.mode === val ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'
                      )}>
                      <Icon size={11} /> {lbl}
                    </button>
                  ))}
                </div>

                {/* Input según modo */}
                {split.mode === 'percent' ? (
                  <div className="relative">
                    <input
                      value={split.percent}
                      onChange={e => updateSplit(i, { percent: e.target.value })}
                      type="number" min="1" max="100" step="1"
                      placeholder="50"
                      className="input-base pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
                  </div>
                ) : (
                  <input
                    value={split.fixed_ars}
                    onChange={e => updateSplit(i, { fixed_ars: e.target.value })}
                    type="number" min="0"
                    placeholder="Monto en ARS"
                    className="input-base"
                  />
                )}

                {/* Preview del monto */}
                {split.person_id && (amountARS > 0 || parseFloat(split.fixed_ars) > 0) && (
                  <div className="bg-indigo-50 rounded-lg px-3 py-2 flex items-center justify-between">
                    <span className="text-xs text-indigo-600 font-medium">
                      {people.find(p => p.id === split.person_id)?.name} debe:
                    </span>
                    <div className="text-right">
                      <span className="text-sm font-bold text-indigo-700">{formatARS(calc.ars)}</span>
                      {calc.usd > 0 && (
                        <span className="text-xs text-indigo-400 ml-2">{formatUSD(calc.usd)}</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Quitar split */}
                {splits.length > 1 && (
                  <button type="button" onClick={() => removeSplit(i)}
                    className="text-xs text-red-400 hover:text-red-600 hover:underline">
                    Quitar
                  </button>
                )}
              </div>
            )
          })}

          <button type="button" onClick={addSplit}
            className="text-xs text-indigo-600 hover:underline font-medium">
            + Agregar otra persona
          </button>
        </div>
      )}
    </div>
  )
}
