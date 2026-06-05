'use client'

import { X, Check, Sparkles, Zap } from 'lucide-react'
import { PREMIUM_PRICE_LABEL, PREMIUM_FEATURES_LIST, FREE_FEATURES_LIST } from '@/lib/plans'

interface Props {
  open: boolean
  onClose: () => void
  feature?: string   // nombre de la feature que intentó usar, ej: "Inversiones"
}

export function UpgradeModal({ open, onClose, feature }: Props) {
  if (!open) return null

  function handleUpgrade() {
    const base  = process.env.NEXT_PUBLIC_MP_CHECKOUT_URL
      ?? `https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_plan_id=${process.env.NEXT_PUBLIC_MP_PLAN_ID}`
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin
    const url = `${base}&back_url=${encodeURIComponent(appUrl + '/upgrade/success')}`
    window.location.href = url
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        {/* Header con gradiente */}
        <div
          className="px-6 pt-6 pb-5 relative"
          style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)' }}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}
          >
            <X size={15} />
          </button>

          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-xl" style={{ background: 'rgba(240,180,41,0.2)' }}>
              <Sparkles size={18} style={{ color: '#f0b429' }} />
            </div>
            <span className="text-xs font-bold tracking-widest" style={{ color: '#f0b429' }}>PREMIUM</span>
          </div>

          {feature ? (
            <>
              <h2 className="text-xl font-bold text-white mb-1">
                {feature} es Premium
              </h2>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>
                Desbloqueá todas las funciones por {PREMIUM_PRICE_LABEL}
              </p>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold text-white mb-1">
                Pasate a Premium
              </h2>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>
                Control total de tus finanzas por {PREMIUM_PRICE_LABEL}
              </p>
            </>
          )}
        </div>

        {/* Comparativa */}
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {/* Free */}
            <div className="rounded-xl p-4" style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
              <p className="text-xs font-bold mb-3" style={{ color: 'var(--text-muted)' }}>GRATIS</p>
              <div className="space-y-2">
                {FREE_FEATURES_LIST.map(f => (
                  <div key={f} className="flex items-start gap-2">
                    <Check size={13} className="mt-0.5 shrink-0" style={{ color: 'var(--text-muted)' }} />
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Premium */}
            <div
              className="rounded-xl p-4 relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.12) 100%)', border: '1px solid rgba(99,102,241,0.35)' }}
            >
              <p className="text-xs font-bold mb-3" style={{ color: '#818cf8' }}>PREMIUM</p>
              <div className="space-y-2">
                {PREMIUM_FEATURES_LIST.map(f => (
                  <div key={f} className="flex items-start gap-2">
                    <Check size={13} className="mt-0.5 shrink-0" style={{ color: '#818cf8' }} />
                    <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={handleUpgrade}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', boxShadow: '0 4px 20px rgba(99,102,241,0.4)' }}
          >
            <Zap size={16} />
            Activar Premium — {PREMIUM_PRICE_LABEL}
          </button>

          <p className="text-center text-xs" style={{ color: 'var(--text-faint)' }}>
            Débito automático vía MercadoPago · Cancelá cuando quieras
          </p>
        </div>
      </div>
    </div>
  )
}
