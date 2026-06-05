'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, RefreshCw, Search, Command } from 'lucide-react'
import { formatARS } from '@/lib/utils'

interface ExchangeRate { mep: number | null; ccl: number | null; lastUpdate: string | null }

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
      style={{ background: 'var(--surface-nav)', borderBottom: '1px solid var(--border-subtle)' }}
    >
      {/* Mobile logo */}
      <div className="md:hidden flex items-center gap-2">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, var(--gold), #d97706)', boxShadow: '0 0 8px var(--gold-shadow)' }}
        >
          <span className="text-white text-xs font-bold">$</span>
        </div>
        <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Finanzas</span>
        <span className="text-[9px] font-bold tracking-[0.2em]" style={{ color: 'var(--text-faint)' }}>JAH</span>
      </div>
      <div className="hidden md:block" />

      <div className="flex items-center gap-3">
        {/* Search button — triggers GlobalSearch modal */}
        <button
          onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))}
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors"
          style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
          title="Búsqueda global (⌘K)"
        >
          <Search size={13} />
          <span style={{ color: 'var(--text-faint)' }}>Buscar...</span>
          <span className="flex items-center gap-0.5 text-[10px] px-1 rounded" style={{ background: 'var(--border)', color: 'var(--text-faint)' }}>
            <Command size={9} />K
          </span>
        </button>
      </div>

      <div className="flex items-center gap-2">
        {rates.mep ? (
          <div
            className="flex items-center gap-2 rounded-lg px-3 py-1.5"
            style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent-border)' }}
          >
            <TrendingUp size={12} style={{ color: 'var(--accent)' }} />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>MEP</span>
            <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{formatARS(rates.mep)}</span>
            {rates.lastUpdate && (
              <span className="text-xs hidden sm:inline" style={{ color: 'var(--text-faint)' }}>· {rates.lastUpdate}</span>
            )}
          </div>
        ) : (
          <div className="h-7 w-28 rounded-lg animate-pulse" style={{ background: 'var(--surface-elevated)' }} />
        )}
        <button
          onClick={fetchRates}
          disabled={loading}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: 'var(--text-muted)' }}
          title="Actualizar"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
    </header>
  )
}
