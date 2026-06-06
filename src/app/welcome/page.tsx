import Link from 'next/link'
import { Check, TrendingUp, Sparkles, Shield, BarChart3, Target, CreditCard, Landmark, MessageCircle, DollarSign, ChevronDown } from 'lucide-react'
import { PREMIUM_PRICE_LABEL, FREE_FEATURES_LIST, PREMIUM_FEATURES_LIST } from '@/lib/plans'

function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const dims = size === 'lg' ? 'w-10 h-10' : size === 'md' ? 'w-8 h-8' : 'w-6 h-6'
  const icon = size === 'lg' ? 18 : size === 'md' ? 14 : 10
  const text = size === 'lg' ? 'text-xl' : size === 'md' ? 'text-base' : 'text-sm'
  return (
    <div className="flex items-center gap-2.5">
      <div className={`${dims} rounded-xl flex items-center justify-center shrink-0`}
        style={{ background: 'linear-gradient(135deg, #f0b429, #d97706)', boxShadow: '0 0 16px rgba(240,180,41,0.35)' }}>
        <svg width={icon} height={icon} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
          <polyline points="16 7 22 7 22 13"/>
        </svg>
      </div>
      <span className={`font-black tracking-tight ${text}`} style={{ color: 'var(--text-primary)' }}>
        REGI<span style={{ color: '#f0b429' }}>$</span>TRATIO
      </span>
    </div>
  )
}

const PAIN_POINTS = [
  'Llegás a fin de mes sin saber en qué gastaste tu plata',
  'Tenés inversiones en varios lugares y no ves el total real',
  'Olvidás cuotas de préstamos y terminás pagando de más',
]

const STEPS = [
  { num: '01', title: 'Registrá', desc: 'Cargá gastos e ingresos en segundos. Por monto, categoría y moneda. También desde Telegram sin abrir la app.' },
  { num: '02', title: 'Visualizá', desc: 'Dashboards en tiempo real con tu balance, inversiones, préstamos y patrimonio total en ARS y USD.' },
  { num: '03', title: 'Mejorá', desc: 'El Guru Financiero con IA analiza tus datos y te da recomendaciones concretas para mejorar mes a mes.' },
]

const FEATURES = [
  { icon: BarChart3,     color: '#6366f1', bg: 'rgba(99,102,241,0.1)',  title: 'Control de gastos e ingresos',   desc: 'Registrá cada movimiento en ARS o USD. Categorías, etiquetas, comprobantes y reportes mensuales.' },
  { icon: TrendingUp,   color: '#10b981', bg: 'rgba(16,185,129,0.1)',  title: 'Portfolio de inversiones',        desc: 'Acciones, CEDEARs, crypto, plazos fijos y dólares físicos. Todo valorizado al tipo de cambio del día.' },
  { icon: Target,       color: '#f0b429', bg: 'rgba(240,180,41,0.1)',  title: 'Metas de ahorro',                 desc: 'Creá objetivos con fecha y monto. Visualizá tu progreso y cuánto apartar por mes para llegar.' },
  { icon: Sparkles,     color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)',  title: 'Guru Financiero con IA',          desc: 'Analiza tus gastos, detecta patrones y te da consejos personalizados en lenguaje natural.' },
  { icon: MessageCircle,color: '#06b6d4', bg: 'rgba(6,182,212,0.1)',   title: 'Bot de Telegram',                 desc: 'Registrá un gasto con un mensaje de texto desde Telegram, sin abrir la app.' },
  { icon: DollarSign,   color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  title: 'Multi-moneda con dólar blue',     desc: 'Cotizaciones en tiempo real: blue, MEP y CCL. Tu patrimonio siempre valuado correctamente.' },
  { icon: CreditCard,   color: '#ec4899', bg: 'rgba(236,72,153,0.1)',  title: 'Gastos recurrentes y cuotas',     desc: 'Seguimiento de suscripciones, cuotas de tarjeta y gastos fijos. Sin sorpresas a fin de mes.' },
  { icon: Landmark,     color: '#14b8a6', bg: 'rgba(20,184,166,0.1)',  title: 'Préstamos con calendario',        desc: 'Registrá préstamos, marcá pagos y visualizá cuánto te falta cancelar. Alertas incluidas.' },
]

const FAQS = [
  { q: '¿Necesito conectar mi cuenta bancaria?', a: 'No. REGI$TRATIO nunca accede a tu banco. Vos cargás lo que querés, cuando querés. También podés importar desde CSV, Excel o PDF.' },
  { q: '¿Cómo funciona el dólar blue/MEP?', a: 'Traemos cotizaciones en tiempo real desde fuentes públicas. Podés registrar en ARS o USD y el sistema convierte con el tipo de cambio que elijas.' },
  { q: '¿El bot de Telegram es difícil de configurar?', a: 'Para nada. Desde Configuración generás un código, se lo mandás al bot y listo. En menos de 2 minutos podés registrar gastos con un mensaje de texto.' },
  { q: '¿Puedo usar la app sin pagar?', a: 'Sí. El plan gratuito incluye transacciones ilimitadas, inversiones y reportes básicos. Premium agrega el Guru con IA, importación avanzada y más.' },
]

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <details className="group border-b" style={{ borderColor: 'var(--border)' }}>
      <summary className="flex items-center justify-between py-5 cursor-pointer list-none gap-4">
        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{q}</span>
        <ChevronDown size={16} className="shrink-0 transition-transform group-open:rotate-180" style={{ color: 'var(--text-muted)' }} />
      </summary>
      <p className="pb-5 text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>{a}</p>
    </details>
  )
}

export default function WelcomePage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}>

      {/* NAV */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 max-w-6xl mx-auto" style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
        <Logo />
        <div className="flex items-center gap-3">
          <Link href="/auth/login" className="text-sm font-medium px-4 py-2 rounded-xl" style={{ color: 'var(--text-secondary)' }}>
            Iniciar sesión
          </Link>
          <Link href="/auth/register" className="text-sm font-semibold px-5 py-2.5 rounded-xl text-white" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 4px 16px rgba(99,102,241,0.35)' }}>
            Empezar gratis
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="max-w-5xl mx-auto px-6 pt-16 pb-24 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-8" style={{ background: 'rgba(240,180,41,0.1)', color: '#f0b429', border: '1px solid rgba(240,180,41,0.2)' }}>
          ✦ Gratis para siempre · Premium desde {PREMIUM_PRICE_LABEL}
        </div>
        <h1 className="text-5xl md:text-6xl font-black leading-tight mb-6 tracking-tight">
          Dejá de adivinar<br />
          <span style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #f0b429)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            a dónde se va tu plata
          </span>
        </h1>
        <p className="text-xl mb-10 max-w-2xl mx-auto leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          Gastos, inversiones, préstamos y metas de ahorro en un solo lugar. Con cotización del dólar en tiempo real y un Guru Financiero con IA.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap mb-6">
          <Link href="/auth/register" className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-white font-bold text-base" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 8px 32px rgba(99,102,241,0.45)' }}>
            Empezar gratis — sin tarjeta
          </Link>
          <Link href="/auth/login" className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-semibold text-base" style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
            Ya tengo cuenta →
          </Link>
        </div>
        <p className="text-xs mb-14" style={{ color: 'var(--text-faint)' }}>Sin tarjeta de crédito · Configuración en 2 minutos</p>
        <div className="flex items-center justify-center gap-8 flex-wrap py-6 px-8 rounded-2xl mx-auto max-w-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          {[{ label: 'Transacciones', value: 'Ilimitadas' }, { label: 'Monedas', value: 'ARS + USD' }, { label: 'Bot Telegram', value: 'Incluido' }].map(({ label, value }) => (
            <div key={label} className="text-center">
              <div className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{value}</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--text-faint)' }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* PAIN POINTS */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>¿Te suena familiar?</h2>
          <p style={{ color: 'var(--text-muted)' }}>Si respondés sí a alguna, REGI$TRATIO es para vos.</p>
        </div>
        <div className="space-y-4">
          {PAIN_POINTS.map(point => (
            <div key={point} className="flex items-start gap-4 rounded-2xl px-6 py-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'rgba(239,68,68,0.1)' }}>
                <span style={{ color: '#ef4444', fontSize: 12, fontWeight: 700 }}>✕</span>
              </div>
              <p className="text-base" style={{ color: 'var(--text-secondary)' }}>{point}</p>
            </div>
          ))}
        </div>
      </section>

      {/* STEPS */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>Así de simple funciona</h2>
          <p style={{ color: 'var(--text-muted)' }}>De cero a tener el control de tus finanzas en minutos.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {STEPS.map(({ num, title, desc }) => (
            <div key={num} className="rounded-2xl p-7" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="text-5xl font-black mb-4 leading-none" style={{ color: 'rgba(99,102,241,0.2)' }}>{num}</div>
              <h3 className="font-bold text-lg mb-2" style={{ color: 'var(--text-primary)' }}>{title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>Todo lo que necesitás</h2>
          <p style={{ color: 'var(--text-muted)' }}>Sin hojas de Excel. Sin apps de 50 pantallas. Solo lo que importa.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map(({ icon: Icon, color, bg, title, desc }) => (
            <div key={title} className="rounded-2xl p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: bg }}>
                <Icon size={20} style={{ color }} />
              </div>
              <h3 className="font-semibold mb-2 text-sm" style={{ color: 'var(--text-primary)' }}>{title}</h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>Planes simples</h2>
          <p style={{ color: 'var(--text-muted)' }}>Empezá gratis. Pasate a Premium cuando quieras.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-5">
          <div className="rounded-2xl p-7" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-xs font-bold tracking-widest mb-3" style={{ color: 'var(--text-faint)' }}>GRATIS</p>
            <p className="text-4xl font-black mb-1" style={{ color: 'var(--text-primary)' }}>$0</p>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Para siempre</p>
            <ul className="space-y-3 mb-8">
              {FREE_FEATURES_LIST.map(f => (
                <li key={f} className="flex items-center gap-2.5">
                  <Check size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{f}</span>
                </li>
              ))}
            </ul>
            <Link href="/auth/register" className="block text-center w-full py-3 rounded-xl font-semibold text-sm" style={{ border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
              Empezar gratis
            </Link>
          </div>
          <div className="rounded-2xl p-7 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.07), rgba(139,92,246,0.07))', border: '1.5px solid rgba(99,102,241,0.4)' }}>
            <div className="absolute top-4 right-4 text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ background: 'rgba(240,180,41,0.15)', color: '#f0b429' }}>
              RECOMENDADO
            </div>
            <p className="text-xs font-bold tracking-widest mb-3" style={{ color: '#818cf8' }}>PREMIUM</p>
            <p className="text-4xl font-black mb-1" style={{ color: 'var(--text-primary)' }}>{PREMIUM_PRICE_LABEL}</p>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Cancelá cuando quieras</p>
            <ul className="space-y-3 mb-8">
              {PREMIUM_FEATURES_LIST.map(f => (
                <li key={f} className="flex items-center gap-2.5">
                  <Check size={14} style={{ color: '#818cf8', flexShrink: 0 }} />
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{f}</span>
                </li>
              ))}
            </ul>
            <Link href="/auth/register" className="block text-center w-full py-3 rounded-xl font-bold text-sm text-white" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 4px 20px rgba(99,102,241,0.35)' }}>
              Activar Premium
            </Link>
          </div>
        </div>
      </section>

      {/* SEGURIDAD */}
      <section className="max-w-3xl mx-auto px-6 py-10">
        <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: 'rgba(16,185,129,0.1)' }}>
            <Shield size={26} style={{ color: '#10b981' }} />
          </div>
          <h3 className="font-bold text-lg mb-2" style={{ color: 'var(--text-primary)' }}>Tus datos están seguros</h3>
          <p className="text-sm max-w-md mx-auto mb-6" style={{ color: 'var(--text-muted)', lineHeight: 1.7 }}>
            REGI$TRATIO nunca accede a tu banco. Solo registrás lo que vos cargás manualmente o importás desde un archivo. Todo cifrado en tránsito y en reposo.
          </p>
          <div className="flex items-center justify-center gap-8 flex-wrap">
            {['Datos cifrados', 'Sin acceso bancario', 'Sin publicidad'].map(t => (
              <div key={t} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-faint)' }}>
                <Check size={12} style={{ color: '#10b981' }} />
                {t}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-2xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-10" style={{ color: 'var(--text-primary)' }}>Preguntas frecuentes</h2>
        <div>
          {FAQS.map(({ q, a }) => <FaqItem key={q} q={q} a={a} />)}
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <div className="rounded-3xl p-12 text-center relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.1), rgba(240,180,41,0.05))', border: '1px solid rgba(99,102,241,0.25)' }}>
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.15) 0%, transparent 70%)' }} />
          <div className="relative">
            <div className="flex justify-center mb-6"><Logo size="lg" /></div>
            <h2 className="text-3xl font-black mb-3" style={{ color: 'var(--text-primary)' }}>Empezá hoy, gratis</h2>
            <p className="mb-8" style={{ color: 'var(--text-muted)' }}>En 2 minutos tenés tu primera cuenta configurada.</p>
            <Link href="/auth/register" className="inline-flex items-center gap-2 px-10 py-4 rounded-2xl text-white font-bold text-base" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 8px 32px rgba(99,102,241,0.45)' }}>
              Crear cuenta gratis →
            </Link>
            <p className="text-xs mt-4" style={{ color: 'var(--text-faint)' }}>Sin tarjeta · Sin compromisos · Cancelá cuando quieras</p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t px-6 py-8 mt-4" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <Logo size="sm" />
          <div className="flex items-center gap-6 text-xs" style={{ color: 'var(--text-faint)' }}>
            <Link href="/auth/login" style={{ color: 'var(--text-faint)' }}>Iniciar sesión</Link>
            <Link href="/auth/register" style={{ color: 'var(--text-faint)' }}>Registrarse</Link>
            <Link href="/seguridad" style={{ color: 'var(--text-faint)' }}>Seguridad</Link>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-faint)' }}>© 2026 REGI$TRATIO · by JAH DEV</p>
        </div>
      </footer>

    </div>
  )
}
