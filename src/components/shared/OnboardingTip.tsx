'use client'

import { X, Sparkles } from 'lucide-react'
import { useOnboardingTip } from '@/hooks/useOnboardingTip'

interface Props {
  tipId: string
  title: string
  description: string
  cta?: { label: string; href: string }
  accent?: boolean   // true = resaltar como Premium
}

export function OnboardingTip({ tipId, title, description, cta, accent = false }: Props) {
  const { visible, dismiss } = useOnboardingTip(tipId)

  if (!visible) return null

  return (
    <div
      className="rounded-xl p-4 flex items-start gap-3 mb-5 animate-in fade-in slide-in-from-top-2 duration-300"
      style={accent
        ? { background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.08))', border: '1px solid rgba(99,102,241,0.25)' }
        : { background: 'var(--surface)', border: '1px solid var(--border)' }
      }
    >
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: accent ? 'rgba(99,102,241,0.15)' : 'var(--accent-bg)' }}
      >
        <Sparkles size={15} style={{ color: accent ? '#818cf8' : 'var(--accent-icon)' }} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>{title}</p>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{description}</p>
        {cta && (
          <a
            href={cta.href}
            className="inline-block mt-2 text-xs font-semibold"
            style={{ color: accent ? '#818cf8' : 'var(--accent)' }}
          >
            {cta.label} →
          </a>
        )}
      </div>

      <button
        onClick={dismiss}
        className="p-1 rounded-lg shrink-0 transition-colors"
        style={{ color: 'var(--text-faint)' }}
        title="Cerrar"
      >
        <X size={14} />
      </button>
    </div>
  )
}
