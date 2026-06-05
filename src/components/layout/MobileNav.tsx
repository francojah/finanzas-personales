'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, ArrowLeftRight, TrendingUp, Sparkles,
  MoreHorizontal, X, Building2, Target, Users, Percent,
  FileText, Landmark, CreditCard, Lock,
} from 'lucide-react'
import { usePlan } from '@/hooks/usePlan'

const PRIMARY_NAV = [
  { label: 'Inicio',      href: '/',            icon: LayoutDashboard, gold: false },
  { label: 'Movimientos', href: '/transactions', icon: ArrowLeftRight,  gold: false },
  { label: 'Inversiones', href: '/investments',  icon: TrendingUp,      gold: false },
  { label: 'Guru',        href: '/guru',         icon: Sparkles,        gold: true  },
]

const MORE_SECTIONS = [
  {
    title: 'FINANZAS',
    items: [
      { label: 'Tarjetas',   href: '/credit-cards',     icon: CreditCard, premium: false },
      { label: 'Préstamos',  href: '/loans',             icon: Landmark,   premium: true  },
    ],
  },
  {
    title: 'ACTIVOS',
    items: [
      { label: 'Patrimonio', href: '/patrimonio',        icon: Building2,  premium: true  },
      { label: 'Metas',      href: '/projects',          icon: Target,     premium: true  },
    ],
  },
  {
    title: 'HERRAMIENTAS',
    items: [
      { label: 'Interés Compuesto', href: '/interes-compuesto', icon: Percent,  premium: false },
      { label: 'Reporte mensual',   href: '/reporte',            icon: FileText, premium: true  },
    ],
  },
  {
    title: 'PERSONAS',
    items: [
      { label: 'Cobros', href: '/people', icon: Users, premium: true },
    ],
  },
]

// Note: "Proyectos" renamed to "Metas" in sidebar — mobile nav keeps same 5 items

export function MobileNav() {
  const pathname = usePathname()
  const { isPremium } = usePlan()
  const [showMore, setShowMore] = useState(false)

  return (
    <>
      {/* Bottom bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50"
        style={{ background: 'var(--surface-nav)', borderTop: '1px solid var(--border)', backdropFilter: 'blur(12px)' }}
      >
        <div className="flex items-center justify-around px-2 py-1 pb-safe">
          {PRIMARY_NAV.map(({ label, href, icon: Icon, gold }) => {
            const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
            const activeColor = gold ? '#f0b429' : 'var(--accent-icon)'
            const inactiveColor = gold ? 'rgba(240,180,41,0.5)' : 'var(--text-muted)'
            return (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center gap-0.5 px-3 py-2 min-w-[52px]"
              >
                <Icon size={22} style={{ color: active ? activeColor : inactiveColor }} />
                <span className="text-[10px] font-medium" style={{ color: active ? activeColor : inactiveColor }}>
                  {label}
                </span>
              </Link>
            )
          })}

          {/* Más button */}
          <button
            onClick={() => setShowMore(true)}
            className="flex flex-col items-center gap-0.5 px-3 py-2 min-w-[52px]"
          >
            <MoreHorizontal size={22} style={{ color: showMore ? 'var(--accent-icon)' : 'var(--text-muted)' }} />
            <span className="text-[10px] font-medium" style={{ color: showMore ? 'var(--accent-icon)' : 'var(--text-muted)' }}>
              Más
            </span>
          </button>
        </div>
      </nav>

      {/* Drawer "Más" */}
      {showMore && (
        <div className="md:hidden fixed inset-0 z-50 flex items-end" onClick={() => setShowMore(false)}>
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          />
          <div
            className="relative w-full rounded-t-2xl p-5 pb-10 max-h-[75vh] overflow-y-auto"
            style={{ background: 'var(--surface-nav)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: 'var(--border)' }} />

            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Más secciones</p>
              <button onClick={() => setShowMore(false)} className="p-1.5 rounded-lg" style={{ color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <div className="space-y-5">
              {MORE_SECTIONS.map(section => (
                <div key={section.title}>
                  <p className="text-[10px] font-bold tracking-[0.12em] mb-2 px-1" style={{ color: 'var(--text-faint)' }}>
                    {section.title}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {section.items.map(({ label, href, icon: Icon, premium }) => {
                      const locked = premium && !isPremium
                      const active = pathname.startsWith(href)
                      return (
                        <Link
                          key={href}
                          href={href}
                          onClick={() => setShowMore(false)}
                          className="flex items-center gap-3 px-3 py-3 rounded-xl"
                          style={active
                            ? { background: 'var(--accent-bg)', border: '1px solid var(--accent-border)' }
                            : { background: 'var(--surface)', border: '1px solid var(--border)' }
                          }
                        >
                          <Icon
                            size={18}
                            style={{ color: active ? 'var(--accent-icon)' : locked ? 'var(--text-faint)' : 'var(--text-muted)', flexShrink: 0 }}
                          />
                          <span
                            className="text-sm font-medium flex-1"
                            style={{ color: active ? 'var(--accent-text)' : locked ? 'var(--text-faint)' : 'var(--text-secondary)' }}
                          >
                            {label}
                          </span>
                          {locked && <Lock size={11} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
