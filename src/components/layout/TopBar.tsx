'use client'

import { TrendingUp, RefreshCw, Search, Command } from 'lucide-react'
import { formatARS } from '@/lib/utils'
import { useExchangeRate } from '@/hooks/useExchangeRate'

export function TopBar() {
  const { mep, blue, loading, lastUpdate, refresh } = useExchangeRate()

  const timeLabel = lastUpdate
    ? lastUpdate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
    : null

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

      {/* Mobile search icon */}
      <button
        onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))}
        className="md:hidden p-2 rounded-lg transition-colors"
        style={{ color: 'var(--text-muted)' }}
        title="Buscar"
      >
        <Search size={18} />
      </button>

      <div className="hidden md:block" />

      {/* Search + cotizaciones */}
      <div className="flex items-center gap-2">

        {/* Search */}
        <button
          onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))}
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm"
          style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
          title="Búsqueda global (⌘K)"
        >
          <Search size={13} />
          <span style={{ color: 'var(--text-faint)' }}>Buscar...</span>
          <span className="flex items-center gap-0.5 text-[10px] px-1 rounded" style={{ background: 'var(--border)', color: 'var(--text-faint)' }}>
            <Command size={9} />K
          </span>
        </button>

        {/* Cotizaciones */}
        {mep ? (
          <div
            className="flex items-center gap-3 rounded-lg px-3 py-1.5"
            style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)' }}
          >
            <TrendingUp size={12} style={{ color: 'var(--accent)' }} />

            {/* MEP */}
            <div className="flex items-center gap-1.5 text-xs">
              <span style={{ color: 'var(--text-faint)' }}>MEP</span>
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{formatARS(mep)}</span>
            </div>

            {/* Blue — solo desktop, si difiere más del 1% del MEP */}
            {blue && Math.abs(blue - mep) / mep > 0.01 && (
              <div className="hidden sm:flex items-center gap-1.5 text-xs" style={{ borderLeft: '1px solid var(--border)', paddingLeft: '0.75rem' }}>
                <span style={{ color: 'var(--text-faint)' }}>Blue</span>
                <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>{formatARS(blue)}</span>
              </div>
            )}

            {timeLabel && (
              <span className="text-[10px] hidden md:inline" style={{ color: 'var(--text-faint)' }}>{timeLabel}</span>
            )}
          </div>
        ) : (
          <div className="h-7 w-36 rounded-lg animate-pulse" style={{ background: 'var(--surface-elevated)' }} />
        )}

        <button
          onClick={refresh}
          disabled={loading}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: 'var(--text-muted)' }}
          title="Actualizar cotización"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
    </header>
  )
}
