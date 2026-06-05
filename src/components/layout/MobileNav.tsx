'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ArrowLeftRight, TrendingUp, Sparkles, Menu } from 'lucide-react'

const MOBILE_NAV = [
  { label: 'Inicio',      href: '/',            icon: LayoutDashboard, gold: false },
  { label: 'Movimientos', href: '/transactions', icon: ArrowLeftRight,  gold: false },
  { label: 'Inversiones', href: '/investments',  icon: TrendingUp,      gold: false },
  { label: 'Guru',        href: '/guru',         icon: Sparkles,        gold: true  },
  { label: 'Más',         href: '/settings',     icon: Menu,            gold: false },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: 'var(--surface-nav)',
        borderTop: '1px solid var(--border)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div className="flex items-center justify-around px-2 py-1 pb-safe">
        {MOBILE_NAV.map(({ label, href, icon: Icon, gold }: any) => {
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
      </div>
    </nav>
  )
}
