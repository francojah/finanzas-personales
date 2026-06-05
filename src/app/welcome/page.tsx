import Link from 'next/link'
import { Check, TrendingUp, Sparkles, Shield, Zap, BarChart3, Target, CreditCard, Landmark } from 'lucide-react'
import { PREMIUM_PRICE_LABEL, FREE_FEATURES_LIST, PREMIUM_FEATURES_LIST } from '@/lib/plans'

const FEATURES = [
  {
    icon: BarChart3,
    title: 'Control total de gastos',
    desc: 'Registrá cada movimiento, organizalo por categorías y visualizá en qué se va tu plata mes a mes.',
  },
  {
    icon: TrendingUp,
    title: 'Inversiones en un vistazo',
    desc: 'Acciones, CEDEARs, crypto, plazos fijos y dólares físicos. Todo tu portfolio en un solo lugar.',
  },
  {
    icon: Target,
    title: 'Metas de ahorro',
    desc: 'Creá objetivos concretos — vacaciones, auto, fondo de emergencia — y seguí tu progreso.',
  },
  {
    icon: Sparkles,
    title: 'Guru Financiero con IA',
    desc: 'Preguntale cualquier cosa sobre tus finanzas. Analiza tus gastos y te da recomendaciones personalizadas.',
  },
  {
    icon: CreditCard,
    title: 'Tarjetas y recurrentes',
    desc: 'Seguimiento de vencimientos, cuotas pendientes y gastos fijos mensuales sin sorpresas.',
  },
  {
    icon: Landmark,
    title: 'Préstamos con seguimiento',
    desc: 'Registrá tus préstamos, pagá cuotas y visualizá cuánto te falta cancelar.',
  },
]

export default function WelcomePage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}>

      {/* ── NAV ─────────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #f0b429, #d97706)', boxShadow: '0 0 12px rgba(240,180,41,0.3)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
              <polyline points="16 7 22 7 22 13"/>
            </svg>
          </div>
          <span className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Finanzapp</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/auth/login"
            className="text-sm font-medium px-4 py-2 rounded-xl transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            Iniciar sesión
          </Link>
          <Link
            href="/auth/register"
            className="text-sm font-semibold px-4 py-2 rounded-xl text-white"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          >
            Empezar gratis
          </Link>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center">
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-6"
          style={{ background: 'rgba(240,180,41,0.1)', color: '#f0b429', border: '1px solid rgba(240,180,41,0.2)' }}
        >
          <Zap size={12} /> Gratis para siempre · Premium desde {PREMIUM_PRICE_LABEL}
        </div>

        <h1
          className="text-5xl font-bold leading-tight mb-6"
          style={{ color: 'var(--text-primary)' }}
        >
          Tomá el control de<br />tu plata, de verdad
        </h1>
        <p className="text-xl mb-10 max-w-2xl mx-auto" style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Todo lo que necesitás para entender tu dinero: gastos, inversiones,
          préstamos y metas de ahorro en un solo lugar.
        </p>

        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link
            href="/auth/register"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-white font-bold text-base transition-all active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 8px 30px rgba(99,102,241,0.4)' }}
          >
            Empezar gratis — sin tarjeta
          </Link>
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-base"
            style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
          >
            Ya tengo cuenta →
          </Link>
        </div>

        <p className="text-xs mt-4" style={{ color: 'var(--text-faint)' }}>
          Sin tarjeta de crédito · Configuración en 2 minutos
        </p>
      </section>

      {/* ── FEATURES ────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
            Todo lo que necesitás
          </h2>
          <p className="text-base" style={{ color: 'var(--text-muted)' }}>
            Sin hojas de Excel. Sin apps de 50 pantallas. Solo lo que importa.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-2xl p-6"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{ background: 'var(--accent-bg)' }}
              >
                <Icon size={19} style={{ color: 'var(--accent-icon)' }} />
              </div>
              <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRICING ─────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
            Planes simples
          </h2>
          <p className="text-base" style={{ color: 'var(--text-muted)' }}>
            Empezá gratis. Pasate a Premium cuando quieras.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {/* FREE */}
          <div
            className="rounded-2xl p-7"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <p className="text-xs font-bold tracking-widest mb-3" style={{ color: 'var(--text-faint)' }}>GRATIS</p>
            <p className="text-4xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>$0</p>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Para siempre</p>
            <ul className="space-y-3 mb-8">
              {FREE_FEATURES_LIST.map(f => (
                <li key={f} className="flex items-center gap-2.5">
                  <Check size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{f}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/auth/register"
              className="block text-center w-full py-3 rounded-xl font-semibold text-sm"
              style={{ border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            >
              Empezar gratis
            </Link>
          </div>

          {/* PREMIUM */}
          <div
            className="rounded-2xl p-7 relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(139,92,246,0.06))',
              border: '1.5px solid rgba(99,102,241,0.35)',
            }}
          >
            <div
              className="absolute top-4 right-4 text-[10px] font-bold px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(240,180,41,0.15)', color: '#f0b429' }}
            >
              RECOMENDADO
            </div>
            <p className="text-xs font-bold tracking-widest mb-3" style={{ color: '#818cf8' }}>PREMIUM</p>
            <p className="text-4xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{PREMIUM_PRICE_LABEL}</p>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Débito automático · Cancelá cuando quieras</p>
            <ul className="space-y-3 mb-8">
              {PREMIUM_FEATURES_LIST.map(f => (
                <li key={f} className="flex items-center gap-2.5">
                  <Check size={15} style={{ color: '#818cf8', flexShrink: 0 }} />
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{f}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/auth/register"
              className="block text-center w-full py-3 rounded-xl font-bold text-sm text-white"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 4px 20px rgba(99,102,241,0.3)' }}
            >
              Activar Premium
            </Link>
          </div>
        </div>
      </section>

      {/* ── TRUST / SEGURIDAD ───────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 py-12">
        <div
          className="rounded-2xl p-8 text-center"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <Shield size={28} className="mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
          <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            Tus datos están seguros
          </h3>
          <p className="text-sm max-w-md mx-auto" style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Finanzapp nunca accede a tu banco. Solo registrás lo que vos cargás manualmente
            o importás desde un archivo. Todo cifrado en tránsito y en reposo.
          </p>
          <div className="flex items-center justify-center gap-8 mt-6 flex-wrap">
            {['Datos cifrados', 'Sin acceso bancario', 'Sin publicidad'].map(t => (
              <div key={t} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-faint)' }}>
                <Check size={12} style={{ color: 'var(--income)' }} />
                {t}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER CTA ──────────────────────────────────────── */}
      <section className="max-w-2xl mx-auto px-6 py-16 text-center">
        <h2 className="text-3xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          Empezá hoy, gratis
        </h2>
        <p className="mb-8" style={{ color: 'var(--text-muted)' }}>
          En 2 minutos tenés tu primera cuenta configurada.
        </p>
        <Link
          href="/auth/register"
          className="inline-flex items-center gap-2 px-10 py-4 rounded-xl text-white font-bold text-base"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 8px 30px rgba(99,102,241,0.4)' }}
        >
          Crear cuenta gratis →
        </Link>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <footer
        className="border-t px-6 py-8"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #f0b429, #d97706)' }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
                <polyline points="16 7 22 7 22 13"/>
              </svg>
            </div>
            <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Finanzapp</span>
            <span className="text-xs tracking-widest" style={{ color: 'var(--text-faint)' }}>by JAH DEV</span>
          </div>
          <div className="flex items-center gap-6 text-xs" style={{ color: 'var(--text-faint)' }}>
            <Link href="/auth/login" style={{ color: 'var(--text-faint)' }}>Iniciar sesión</Link>
            <Link href="/auth/register" style={{ color: 'var(--text-faint)' }}>Registrarse</Link>
            <Link href="/pricing" style={{ color: 'var(--text-faint)' }}>Precios</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
