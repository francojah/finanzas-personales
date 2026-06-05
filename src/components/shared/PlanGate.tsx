'use client'

import { useState } from 'react'
import { Lock, Sparkles } from 'lucide-react'
import { usePlan } from '@/hooks/usePlan'
import { UpgradeModal } from './UpgradeModal'
import type { PlanFeatures } from '@/lib/plans'

interface Props {
  feature: keyof PlanFeatures
  featureLabel: string             // nombre legible, ej: "Inversiones"
  children: React.ReactNode
  mode?: 'block' | 'overlay'       // block = reemplaza el contenido, overlay = pone encima
}

// Bloquea una sección entera si el usuario no tiene acceso
export function PlanGate({ feature, featureLabel, children, mode = 'block' }: Props) {
  const { features, loading } = usePlan()
  const [showUpgrade, setShowUpgrade] = useState(false)

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
    </div>
  )

  const hasAccess = typeof features[feature] === 'boolean'
    ? features[feature] as boolean
    : (features[feature] as number) > 0

  if (hasAccess) return <>{children}</>

  if (mode === 'overlay') {
    return (
      <div className="relative">
        <div className="pointer-events-none select-none" style={{ filter: 'blur(4px)', opacity: 0.4 }}>
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <PaywallCard featureLabel={featureLabel} onUpgrade={() => setShowUpgrade(true)} />
        </div>
        <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} feature={featureLabel} />
      </div>
    )
  }

  return (
    <>
      <PaywallCard featureLabel={featureLabel} onUpgrade={() => setShowUpgrade(true)} fullPage />
      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} feature={featureLabel} />
    </>
  )
}

function PaywallCard({ featureLabel, onUpgrade, fullPage }: {
  featureLabel: string
  onUpgrade: () => void
  fullPage?: boolean
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center rounded-2xl p-10 ${fullPage ? 'max-w-sm mx-auto mt-16' : 'w-72'}`}
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))', border: '1px solid rgba(99,102,241,0.3)' }}
      >
        <Lock size={22} style={{ color: '#818cf8' }} />
      </div>

      <h2 className="text-base font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
        {featureLabel}
      </h2>
      <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
        Esta función está disponible en el plan Premium.
      </p>

      <button
        onClick={onUpgrade}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white"
        style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', boxShadow: '0 4px 15px rgba(99,102,241,0.35)' }}
      >
        <Sparkles size={15} />
        Ver planes
      </button>
    </div>
  )
}
