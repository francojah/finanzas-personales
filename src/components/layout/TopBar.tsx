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
      const res = await fetch('https://api.bluelytics.com.ar/v2/latest')
      const data = await res.json()
      setRates({
        mep: data.blue?.value_sell ?? null,
        ccl: data.blue?.value_sell ?? null,
        lastUpdate: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
      })
    } catch { /* silencioso */ }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchRates() }, [])

  return (
    <header
      className="px-4 md:px-6 py-3 flex items-center justify-between shrink-0"
      style={{ background: '#111111', borderBottom: '1px solid #1e1e1e' }}
    >
      {/* Mobile logo */}
      <div className="md:hidden flex items-center gap-2">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #f0b429, #d97706)', boxShadow: '0 0 8px rgba(240,180,41,0.2)' }}
        >
          <span className="text-white text-xs font-bold">$</span>
        </div>
        <span className="font-semibold text-sm" style={{ color: '#ededed' }}>Finanzas</span>
        <span className="text-[9px] font-bold tracking-[0.2em]" style={{ color: '#444' }}>JAH</span>
      </div>

      <div className="hidden md:block" />

      {/* Tipo de cambio */}
      <div className="flex items-center gap-2">
        {rates.mep ? (
          <div
            className="flex items-center gap-2 rounded-lg px-3 py-1.5"
            style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}
          >
            <TrendingUp size={12} style={{ color: '#7c6ff7' }} />
            <span className="text-xs" style={{ color: '#666' }}>MEP</span>
            <span className="text-xs font-semibold" style={{ color: '#ededed' }}>{formatARS(rates.mep)}</span>
            {rates.lastUpdate && (
              <span className="text-xs hidden sm:inline" style={{ color: '#444' }}>· {rates.lastUpdate}</span>
            )}
          </div>
        ) : (
          <div className="h-7 w-28 rounded-lg animate-pulse" style={{ background: '#1a1a1a' }} />
        )}
        <button
          onClick={fetchRates}
          disabled={loading}
          className="p-1.5 rounded-lg transition-colors hover:bg-white/5"
          style={{ color: '#555' }}
          title="Actualizar"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
    </header>
  )
}
