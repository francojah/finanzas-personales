'use client'

import { TrendingUp, RefreshCw, Search, Command } from 'lucide-react'
import { formatARS } from '@/lib/utils'
import { useExchangeRate, formatK } from '@/hooks/useExchangeRate'

function RateChip({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center gap-1 text-xs">
      <span style={{ color: 'var(--text-secondary)', fontSize: 10 }}>{label}</span>
      <span className="font-semibold tabular-nums" style={{ color: color ?? 'var(--text-primary)' }}>{value}</span>
    </div>
  )
}

export function TopBar() {
  const { mep, ccl, blue, btc, loading, lastUpdate, refresh } = useExchangeRate()

  const timeLabel = lastUpdate
    ? lastUpdate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
    : null

  const fmtARS = (n: number) => formatARS(n).replace('$\xa0', '$').replace(/\s/g, '')

  return (
    <header
      className="px-4 md:px-6 py-2.5 flex items-center justify-between shrink-0"
      style={{ background: 'var(--surface-nav)', borderBottom: '1px solid var(--border-subtle)' }}
    >
      {/* Mobile logo */}
      <div className="md:hidden flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #f0b429, #d97706)', boxShadow: '0 0 8px rgba(240,180,41,0.3)' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
            <polyline points="16 7 22 7 22 13"/>
          </svg>
        </div>
        <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
          REGI<span style={{ color: '#f0b429' }}>$</span>TRATIO
        </span>
      </div>

      {/* Mobile search */}
      <button
        onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))}
        className="md:hidden p-2 rounded-lg" style={{ color: 'var(--text-muted)' }} title="Buscar">
        <Search size={18} />
      </button>

      <div className="hidden md:block" />

      <div className="flex items-center gap-2">
        {/* Search — desktop */}
        <button
          onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))}
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm"
          style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
          title="Búsqueda global (⌘K)">
          <Search size={13} />
          <span style={{ color: 'var(--text-faint)' }}>Buscar...</span>
          <span className="flex items-center gap-0.5 text-[10px] px-1 rounded" style={{ background: 'var(--border)', color: 'var(--text-faint)' }}>
            <Command size={9} />K
          </span>
        </button>

        {/* Barra de cotizaciones */}
        {mep ? (
          <div className="flex items-center gap-0 rounded-lg overflow-hidden"
            style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>

            {/* MEP — siempre visible, es el tipo de cambio principal */}
            <div className="flex items-center gap-1.5 px-3 py-1.5">
              <TrendingUp size={11} style={{ color: 'var(--accent)' }} />
              <RateChip label="MEP" value={fmtARS(mep)} color="var(--text-primary)" />
            </div>

            {/* CCL */}
            {ccl && (
              <div className="hidden lg:flex items-center px-3 py-1.5" style={{ borderLeft: '1px solid var(--border)' }}>
                <RateChip label="CCL" value={fmtARS(ccl)} />
              </div>
            )}

            {/* Blue */}
            {blue && (
              <div className="hidden sm:flex items-center px-3 py-1.5" style={{ borderLeft: '1px solid var(--border)' }}>
                <RateChip label="Blue" value={fmtARS(blue)} color={blue > mep ? 'var(--expense)' : 'var(--text-secondary)'} />
              </div>
            )}

            {/* BTC/USD */}
            {btc && (
              <div className="hidden lg:flex items-center px-3 py-1.5" style={{ borderLeft: '1px solid var(--border)' }}>
                <RateChip label="BTC" value={`$${formatK(btc)}`} color="#f0b429" />
              </div>
            )}

            {timeLabel && (
              <span className="hidden xl:inline text-[10px] px-2" style={{ color: 'var(--text-faint)' }}>{timeLabel}</span>
            )}
          </div>
        ) : (
          <div className="h-7 w-48 rounded-lg animate-pulse" style={{ background: 'var(--surface-elevated)' }} />
        )}

        <button onClick={refresh} disabled={loading}
          className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--text-muted)' }}
          title="Actualizar cotizaciones">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
    </header>
  )
}
