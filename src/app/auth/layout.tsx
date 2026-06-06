const FEATURES = [
  'Movimientos, presupuesto y categorías',
  'Inversiones, patrimonio y metas de ahorro',
  'Guru Financiero con IA para tus dudas',
  'Importá extractos de cualquier plataforma',
  'Préstamos, tarjetas y gastos recurrentes',
]

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>

      {/* ── Panel izquierdo (solo desktop) ─────────────────── */}
      <div
        className="hidden lg:flex flex-col justify-between w-[480px] shrink-0 p-10"
        style={{ background: 'linear-gradient(160deg, #0f0b1e 0%, #1a1035 50%, #0f172a 100%)' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, #f0b429 0%, #d97706 100%)', boxShadow: '0 0 20px rgba(240,180,41,0.3)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
              <polyline points="16 7 22 7 22 13"/>
            </svg>
          </div>
          <span className="text-lg font-bold text-white tracking-tight">REGI<span style={{ color: '#fde68a' }}>$</span>TRATIO</span>
        </div>

        {/* Hero copy */}
        <div>
          <h1 className="text-4xl font-bold leading-tight mb-4" style={{ color: '#fff' }}>
            Tomá el control<br />de tu plata hoy
          </h1>
          <p className="text-base mb-10" style={{ color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
            Todo tu dinero en un lugar. Sin Excel, sin lío.
          </p>

          <ul className="space-y-4">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-3">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(240,180,41,0.15)', border: '1px solid rgba(240,180,41,0.3)' }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#f0b429" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <span className="text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Social proof */}
        <div className="flex items-center gap-3">
          <div className="flex">
            {['F','M','S','A'].map((l, i) => (
              <div
                key={l}
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white border-2"
                style={{
                  background: ['#6366f1','#8b5cf6','#ec4899','#f0b429'][i],
                  borderColor: '#1a1035',
                  marginLeft: i === 0 ? 0 : -8,
                  zIndex: 4 - i,
                  position: 'relative',
                }}
              >
                {l}
              </div>
            ))}
          </div>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Sumate a quienes ya controlan su plata
          </p>
        </div>
      </div>

      {/* ── Panel derecho (formulario) ──────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative">

        {/* Glow de fondo */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at center top, var(--accent-bg) 0%, transparent 70%)' }}
        />

        {/* Logo mobile (solo visible en pantallas chicas) */}
        <div className="lg:hidden flex flex-col items-center mb-8">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
            style={{ background: 'linear-gradient(135deg, #f0b429 0%, #d97706 100%)', boxShadow: '0 0 20px rgba(240,180,41,0.25)' }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
              <polyline points="16 7 22 7 22 13"/>
            </svg>
          </div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>REGI<span style={{ color: '#f0b429' }}>$</span>TRATIO</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Tu gestor financiero personal</p>
        </div>

        {/* Card del formulario */}
        <div className="w-full max-w-sm relative z-10">
          <div
            className="rounded-2xl p-7"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
            }}
          >
            {children}
          </div>

          {/* Seguridad */}
          <div className="flex items-center justify-center gap-2 mt-5">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-faint)' }}>
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <span className="text-xs" style={{ color: 'var(--text-faint)' }}>
              Tus datos están cifrados y protegidos
            </span>
          </div>

          {/* Brand footer */}
          <div className="flex items-center justify-center gap-2 mt-4">
            <span className="text-xs font-bold tracking-widest" style={{ color: 'var(--text-faint)' }}>
              REGI<span style={{ color: '#f0b429' }}>$</span>TRATIO
            </span>
          </div>
        </div>
      </div>

    </div>
  )
}
