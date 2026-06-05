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
    } catch {
      // silencioso
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRates()
  }, [])

  return (
    <header
      className="px-4 md:px-6 py-3 flex items-center justify-between shrink-0"
      style={{
        background: '#0e0e18',
        borderBottom: '1px solid #1a1a28',
      }}
    >
      {/* Mobile: logo */}
      <div className="md:hidden flex items-center gap-2">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #f0b429 0%, #e09820 100%)',
            boxShadow: '0 0 8px rgba(240,180,41,0.3)',
          }}
        >
          <span className="text-white text-xs font-bold">$</span>
        </div>
        <span className="font-bold text-sm" style={{ color: '#e2e2f0' }}>Finanzas</span>
        <span className="text-[9px] font-semibold tracking-widest" style={{ color: '#3a3a55' }}>JAH</span>
      </div>

      {/* Desktop: placeholder */}
      <div className="hidden md:block" />

      {/* Tipo de cambio */}
      <div className="flex items-center gap-3">
        {rates.mep ? (
          <div
            className="flex items-center gap-2 rounded-xl px-3 py-1.5"
            style={{
              background: 'rgba(124, 111, 247, 0.08)',
              border: '1px solid rgba(124, 111, 247, 0.15)',
            }}
          >
            <TrendingUp size={13} style={{ color: '#7c6ff7' }} />
            <div className="flex items-center gap-2 text-xs">
              <span style={{ color: '#4a4a65' }}>MEP</span>
              <span className="font-semibold" style={{ color: '#e2e2f0' }}>{formatARS(rates.mep)}</span>
              {rates.lastUpdate && (
                <span className="hidden sm:inline" style={{ color: '#3a3a55' }}>· {rates.lastUpdate}</span>
              )}
            </div>
          </div>
        ) : (
          <div
            className="h-8 w-32 rounded-xl animate-pulse"
            style={{ background: '#1a1a28' }}
          />
        )}

        <button
          onClick={fetchRates}
          disabled={loading}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: '#3a3a55' }}
          title="Actualizar tipo de cambio"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
    </header>
  )
}
