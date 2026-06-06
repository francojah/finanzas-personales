import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        background: '#0f0f0f',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        position: 'relative',
      }}
    >
      {/* Fondo radial sutil */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(99,102,241,0.18) 0%, transparent 70%)',
      }} />

      {/* Contenido */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, position: 'relative' }}>

        {/* Logo */}
        <div style={{
          width: 80, height: 80, borderRadius: 20,
          background: 'linear-gradient(135deg, #f0b429, #d97706)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 40px rgba(240,180,41,0.4)',
        }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
            <polyline points="16 7 22 7 22 13"/>
          </svg>
        </div>

        {/* Nombre */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          <span style={{ fontSize: 64, fontWeight: 900, color: '#ededed', letterSpacing: '-2px' }}>REGI</span>
          <span style={{ fontSize: 64, fontWeight: 900, color: '#f0b429', letterSpacing: '-2px' }}>$</span>
          <span style={{ fontSize: 64, fontWeight: 900, color: '#ededed', letterSpacing: '-2px' }}>TRATIO</span>
        </div>

        {/* Tagline */}
        <p style={{ fontSize: 26, color: '#999999', margin: 0, textAlign: 'center', maxWidth: 600 }}>
          Tu gestor de finanzas personales
        </p>

        {/* Pills */}
        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          {['Gastos e ingresos', 'Inversiones', 'IA financiera', 'Dólar blue'].map(tag => (
            <div key={tag} style={{
              background: 'rgba(99,102,241,0.15)',
              border: '1px solid rgba(99,102,241,0.3)',
              borderRadius: 999, padding: '6px 16px',
              fontSize: 16, color: '#a89efa',
            }}>
              {tag}
            </div>
          ))}
        </div>
      </div>
    </div>,
    { ...size }
  )
}
