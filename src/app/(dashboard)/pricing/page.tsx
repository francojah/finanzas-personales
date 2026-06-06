'use client'

import { Check, Zap, Sparkles, Shield, RefreshCw, Star } from 'lucide-react'
import { usePlan } from '@/hooks/usePlan'
import { FREE_FEATURES_LIST, PREMIUM_FEATURES_LIST, PREMIUM_PRICE_LABEL } from '@/lib/plans'

export default function PricingPage() {
  const { isPremium } = usePlan()

  function handleUpgrade() {
    const base   = process.env.NEXT_PUBLIC_MP_CHECKOUT_URL
      ?? `https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_plan_id=${process.env.NEXT_PUBLIC_MP_PLAN_ID}`
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin
    window.location.href = `${base}&back_url=${encodeURIComponent(appUrl + '/upgrade/success')}`
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-4">

      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-2"
          style={{ background: 'rgba(240,180,41,0.12)', color: '#f0b429' }}>
          <Sparkles size={12} /> PLANES
        </div>
        <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Controlá tus finanzas al 100%
        </h1>
        <p className="text-base" style={{ color: 'var(--text-muted)' }}>
          Empezá gratis y pasate a Premium cuando quieras.
        </p>
        {/* Price anchor */}
        <p className="text-sm pt-1" style={{ color: 'var(--text-faint)' }}>
          Premium vale lo mismo que 2 cafés por mes 🧉
        </p>
      </div>

      {/* Cards */}
      <div className="grid md:grid-cols-2 gap-4">

        {/* FREE */}
        <div className="rounded-2xl p-6 space-y-5"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div>
            <p className="text-xs font-bold tracking-widest mb-1" style={{ color: 'var(--text-faint)' }}>GRATIS</p>
            <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>$0</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Para siempre</p>
          </div>

          <div className="space-y-2.5">
            {FREE_FEATURES_LIST.map(f => (
              <div key={f} className="flex items-start gap-2.5">
                <Check size={15} className="mt-0.5 shrink-0" style={{ color: 'var(--text-muted)' }} />
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{f}</span>
              </div>
            ))}
          </div>

          <div className="pt-2">
            {!isPremium ? (
              <div className="w-full py-2.5 rounded-xl text-sm font-semibold text-center"
                style={{ background: 'var(--surface-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                Plan actual
              </div>
            ) : (
              <div className="w-full py-2.5 rounded-xl text-sm text-center" style={{ color: 'var(--text-faint)' }}>
                —
              </div>
            )}
          </div>
        </div>

        {/* PREMIUM */}
        <div className="rounded-2xl p-6 space-y-5 relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.08) 100%)',
            border: '1.5px solid rgba(99,102,241,0.4)',
          }}>

          {/* Badge */}
          <div className="absolute top-4 right-4 text-[10px] font-bold px-2 py-1 rounded-full"
            style={{ background: 'rgba(240,180,41,0.15)', color: '#f0b429' }}>
            RECOMENDADO
          </div>

          <div>
            <p className="text-xs font-bold tracking-widest mb-1" style={{ color: '#818cf8' }}>PREMIUM</p>
            <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{PREMIUM_PRICE_LABEL}</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Débito automático · Cancelá cuando quieras</p>
          </div>

          <div className="space-y-2.5">
            {PREMIUM_FEATURES_LIST.map(f => (
              <div key={f} className="flex items-start gap-2.5">
                <Check size={15} className="mt-0.5 shrink-0" style={{ color: '#818cf8' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{f}</span>
              </div>
            ))}
          </div>

          <div className="pt-2">
            {isPremium ? (
              <div className="w-full py-2.5 rounded-xl text-sm font-semibold text-center"
                style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }}>
                ✓ Plan activo
              </div>
            ) : (
              <button
                onClick={handleUpgrade}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 4px 20px rgba(99,102,241,0.35)' }}
              >
                <Zap size={15} /> Activar Premium
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Trust badges */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Shield,     text: 'Pago seguro vía MercadoPago' },
          { icon: Zap,        text: 'Activación inmediata' },
          { icon: RefreshCw,  text: 'Cancelá cuando quieras' },
        ].map(({ icon: Icon, text }) => (
          <div key={text} className="flex flex-col items-center gap-2 p-4 rounded-xl text-center"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <Icon size={18} style={{ color: 'var(--text-muted)' }} />
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{text}</p>
          </div>
        ))}
      </div>

      {/* Garantía */}
      <div className="rounded-2xl p-5 flex items-start gap-4"
        style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'rgba(16,185,129,0.1)' }}>
          <Star size={18} style={{ color: '#10b981' }} />
        </div>
        <div>
          <p className="text-sm font-bold mb-0.5" style={{ color: 'var(--text-primary)' }}>
            Sin riesgo — probalo 7 días
          </p>
          <p className="text-xs leading-5" style={{ color: 'var(--text-muted)' }}>
            Si en los primeros 7 días no estás satisfecho, te devolvemos el importe sin preguntas. Escribinos desde Configuración.
          </p>
        </div>
      </div>

      {/* FAQ rápido */}
      <div className="rounded-2xl p-5 space-y-4"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Preguntas frecuentes</p>
        {[
          { q: '¿Cómo se cobra?', a: 'Débito automático mensual a través de MercadoPago. Podés cancelar en cualquier momento desde tu cuenta de MercadoPago.' },
          { q: '¿Pierdo mis datos si cancelo?', a: 'No. Tus datos siguen disponibles en el plan gratuito. Solo perdés acceso a las funciones Premium.' },
          { q: '¿Puedo probar Premium antes de pagar?', a: 'El plan gratuito te permite explorar la app. Si querés probar todas las funciones, tenés 7 días de garantía desde tu primer pago.' },
        ].map(({ q, a }) => (
          <div key={q} className="pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{q}</p>
            <p className="text-xs leading-5" style={{ color: 'var(--text-muted)' }}>{a}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
