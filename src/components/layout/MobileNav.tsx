'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ArrowLeftRight, TrendingUp, Building2, Menu } from 'lucide-react'

const MOBILE_NAV = [
  { label: 'Inicio',      href: '/',            icon: LayoutDashboard },
  { label: 'Movimientos', href: '/transactions', icon: ArrowLeftRight  },
  { label: 'Inversiones', href: '/investments',  icon: TrendingUp      },
  { label: 'Patrimonio',  href: '/patrimonio',   icon: Building2       },
  { label: 'Más',         href: '/settings',     icon: Menu            },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: 'rgba(17,17,17,0.97)',
        borderTop: '1px solid #222',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div className="flex items-center justify-around px-2 py-1 pb-safe">
        {MOBILE_NAV.map(({ label, href, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-0.5 px-3 py-2 min-w-[52px]"
            >
              <Icon size={22} style={{ color: active ? '#a89efa' : '#555555' }} />
              <span className="text-[10px] font-medium" style={{ color: active ? '#c4b8ff' : '#666666' }}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
