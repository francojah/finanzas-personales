import Link from 'next/link'

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 text-center"
      style={{ background: 'var(--bg)' }}
    >
      {/* Logo */}
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
        style={{ background: 'linear-gradient(135deg, #f0b429, #d97706)', boxShadow: '0 0 24px rgba(240,180,41,0.3)' }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
          <polyline points="16 7 22 7 22 13"/>
        </svg>
      </div>

      {/* Error */}
      <p className="text-7xl font-black mb-2" style={{ color: 'var(--text-faint)', letterSpacing: '-0.04em' }}>404</p>
      <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
        Página no encontrada
      </h1>
      <p className="text-sm max-w-xs mb-8" style={{ color: 'var(--text-muted)' }}>
        La página que buscás no existe o fue movida. Revisá la URL o volvé al inicio.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/"
          className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
          style={{ background: 'var(--accent)' }}
        >
          Ir al dashboard
        </Link>
        <Link
          href="/welcome"
          className="px-6 py-2.5 rounded-xl text-sm font-medium"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
        >
          Página de inicio
        </Link>
      </div>

      <p className="text-xs mt-10" style={{ color: 'var(--text-faint)' }}>
        REGI<span style={{ color: '#f0b429' }}>$</span>TRATIO
      </p>
    </div>
  )
}
