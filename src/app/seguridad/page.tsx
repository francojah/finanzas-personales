import Link from 'next/link'
import { Shield, Lock, Eye, Server, Zap, Check } from 'lucide-react'

const SECTIONS = [
  {
    icon: Lock,
    title: 'Cifrado en tránsito y en reposo',
    body: 'Toda comunicación entre tu dispositivo y nuestros servidores usa TLS 1.3 (HTTPS). Tus datos en la base de datos están cifrados con AES-256 a través de Supabase, una plataforma de infraestructura de nivel enterprise.',
  },
  {
    icon: Eye,
    title: 'No accedemos a tu banco',
    body: 'REGI$TRATIO no se conecta a ningún banco ni plataforma financiera. Vos sos quien carga los datos manualmente o importa un archivo CSV/Excel/PDF. Nunca pedimos credenciales bancarias.',
  },
  {
    icon: Server,
    title: 'Aislamiento de datos por usuario',
    body: 'Cada usuario solo puede ver y modificar sus propios datos. Esto se garantiza mediante Row Level Security (RLS) en la base de datos: incluso si alguien obtuviera acceso a la base, no podría leer datos de otro usuario.',
  },
  {
    icon: Shield,
    title: 'Headers de seguridad HTTP',
    body: 'La app implementa headers de seguridad estándar: X-Frame-Options, Content-Security-Policy, Strict-Transport-Security (HSTS), X-Content-Type-Options y Permissions-Policy para prevenir ataques comunes como clickjacking y XSS.',
  },
  {
    icon: Zap,
    title: 'Rate limiting en APIs',
    body: 'Las API routes sensibles (como el Guru Financiero y el procesamiento de pagos) tienen límites de velocidad para prevenir abuso y ataques de fuerza bruta.',
  },
]

export default function SeguridadPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}>

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-4xl mx-auto">
        <Link href="/welcome" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f0b429, #d97706)' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
              <polyline points="16 7 22 7 22 13"/>
            </svg>
          </div>
          <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>REGI<span style={{ color: '#f0b429' }}>$</span>TRATIO</span>
        </Link>
        <Link href="/auth/register" className="text-sm font-semibold px-4 py-2 rounded-xl text-white" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
          Empezar gratis
        </Link>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-12">

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <Shield size={28} style={{ color: 'var(--accent-icon)' }} />
          </div>
          <h1 className="text-3xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>Seguridad y privacidad</h1>
          <p className="text-base max-w-xl mx-auto" style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Tus datos financieros son sensibles. Acá explicamos exactamente cómo los protegemos,
            sin tecnicismos innecesarios.
          </p>
        </div>

        {/* Puntos clave */}
        <div className="grid grid-cols-3 gap-3 mb-10">
          {['Datos cifrados', 'Sin acceso bancario', 'Sin publicidad'].map(t => (
            <div key={t} className="rounded-xl p-4 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <Check size={18} className="mx-auto mb-2" style={{ color: 'var(--income)' }} />
              <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{t}</p>
            </div>
          ))}
        </div>

        {/* Secciones */}
        <div className="space-y-4">
          {SECTIONS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--accent-bg)' }}>
                  <Icon size={18} style={{ color: 'var(--accent-icon)' }} />
                </div>
                <div>
                  <h2 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{title}</h2>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>{body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Contacto */}
        <div className="mt-10 rounded-2xl p-6 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>¿Tenés una pregunta de seguridad?</p>
          <a href="mailto:francojah@gmail.com" className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
            francojah@gmail.com
          </a>
        </div>

      </div>
    </div>
  )
}
