export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0a0a12 0%, #0e0b1e 50%, #0a0a12 100%)' }}>

      {/* Ambient glow orbs */}
      <div
        className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(124,111,247,0.08) 0%, transparent 70%)' }}
      />
      <div
        className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(240,180,41,0.06) 0%, transparent 70%)' }}
      />

      <div className="w-full max-w-sm relative z-10">

        {/* Logo section */}
        <div className="text-center mb-8">
          {/* $ Icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 relative"
            style={{
              background: 'linear-gradient(135deg, #f0b429 0%, #e09820 100%)',
              boxShadow: '0 0 24px rgba(240,180,41,0.4), 0 0 48px rgba(240,180,41,0.15), 0 4px 16px rgba(0,0,0,0.4)'
            }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23"/>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>

          {/* App name */}
          <h1 className="text-2xl font-bold mb-1" style={{ color: '#e2e2f0' }}>
            Finanzas
          </h1>
          <p className="text-sm" style={{ color: '#5a5a75' }}>
            Tu gestor financiero personal
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-6"
          style={{
            background: 'rgba(20, 20, 32, 0.9)',
            border: '1px solid rgba(124, 111, 247, 0.15)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.04) inset'
          }}
        >
          {children}
        </div>

        {/* JAH brand mark */}
        <div className="text-center mt-6 flex items-center justify-center gap-2">
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            {/* JAH SVG logo */}
            <svg width="28" height="16" viewBox="0 0 56 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* J */}
              <path d="M4 3h5v10c0 2.2-1.8 4-4 4H4" stroke="#7c6ff7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              {/* A */}
              <path d="M14 17L18 3l4 14M15.5 12h5" stroke="#7c6ff7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              {/* H */}
              <path d="M27 3v14M37 3v14M27 10h10" stroke="#7c6ff7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-xs font-semibold tracking-widest" style={{ color: '#4a4a65' }}>
              DEV
            </span>
          </div>
        </div>

      </div>
    </div>
  )
}
