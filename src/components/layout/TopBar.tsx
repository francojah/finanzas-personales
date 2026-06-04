'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, RefreshCw } from 'lucide-react'
import { formatARS } from '@/lib/utils'

interface ExchangeRate {
  mep: number | null
  ccl: number | null
  lastUpdate: string | null
}

export function TopBar() {
  const [rates, setRates] = useState<ExchangeRate>({ mep: null, ccl: null, lastUpdate: null })
  const [loading, setLoading] = useState(false)

  async function fetchRates() {
    setLoading(true)
    try {
      // API pública argentina de tipo de cambio
      const res = await fetch('https://api.bluelytics.com.ar/v2/latest')
      const data = await res.json()
      setRates({
        mep: data.blue?.value_sell ?? null,         // aproximación — reemplazar con API MEP real
        ccl: data.blue?.value_sell ?? null,
        lastUpdate: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
      })
    } catch {
      // silencioso — no bloquea la UI
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRates()
  }, [])

  return (
    <header className="bg-white border-b border-slate-200 px-4 md:px-6 py-3 flex items-center justify-between shrink-0">
      {/* Mobile: logo */}
      <div className="md:hidden flex items-center gap-2">
        <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
          <span className="text-white text-xs font-bold">$</span>
        </div>
        <span className="font-bold text-slate-900 text-sm">Finanzas</span>
      </div>

      {/* Desktop: título vacío (el sidebar tiene el logo) */}
      <div className="hidden md:block" />

      {/* Tipo de cambio */}
      <div className="flex items-center gap-3">
        {rates.mep ? (
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <TrendingUp size={13} className="text-indigo-500" />
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500">MEP</span>
              <span className="font-semibold text-slate-800">{formatARS(rates.mep)}</span>
              {rates.lastUpdate && (
                <span className="text-slate-400 hidden sm:inline">· {rates.lastUpdate}</span>
              )}
            </div>
          </div>
        ) : (
          <div className="h-8 w-32 bg-slate-100 rounded-xl animate-pulse" />
        )}

        <button
          onClick={fetchRates}
          disabled={loading}
          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          title="Actualizar tipo de cambio"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
    </header>
  )
}
