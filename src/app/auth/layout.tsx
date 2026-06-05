export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: '#0f0f0f' }}
    >
      {/* Glow sutil centrado */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center top, rgba(124,111,247,0.07) 0%, transparent 70%)' }}
      />

      <div className="w-full max-w-sm relative z-10">

        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{
              background: 'linear-gradient(135deg, #f0b429 0%, #d97706 100%)',
              boxShadow: '0 0 20px rgba(240,180,41,0.3)',
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23"/>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: '#ededed' }}>Finanzas</h1>
          <p className="text-sm mt-1" style={{ color: '#666666' }}>Tu gestor financiero personal</p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-6"
          style={{
            background: '#1a1a1a',
            border: '1px solid #2a2a2a',
            boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
          }}
        >
          {children}
        </div>

        {/* JAH brand */}
        <div className="flex items-center justify-center gap-2 mt-6">
          <svg width="32" height="18" viewBox="0 0 64 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* J */}
            <path d="M4 3h6v10c0 2.2-1.8 4-4 4H5" stroke="#444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            {/* A */}
            <path d="M16 17L20 3l4 14M17.5 12h5" stroke="#444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            {/* H */}
            <path d="M30 3v14M40 3v14M30 10h10" stroke="#444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="text-xs tracking-[0.2em] font-medium" style={{ color: '#444' }}>DEV</span>
        </div>

      </div>
    </div>
  )
}
