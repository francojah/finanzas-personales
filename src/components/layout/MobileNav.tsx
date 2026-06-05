'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, ArrowLeftRight, TrendingUp, Target, Menu,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const MOBILE_NAV = [
  { label: 'Inicio',       href: '/',             icon: LayoutDashboard },
  { label: 'Movimientos',  href: '/transactions', icon: ArrowLeftRight   },
  { label: 'Inversiones',  href: '/investments',  icon: TrendingUp       },
  { label: 'Proyectos',    href: '/projects',     icon: Target           },
  { label: 'Más',          href: '/settings',     icon: Menu             },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: 'rgba(14, 14, 22, 0.95)',
        borderTop: '1px solid #1e1e2e',
        backdropFilter: 'blur(20px)',
      }}
    >
      <div className="flex items-center justify-around px-2 py-1 pb-safe">
        {MOBILE_NAV.map(({ label, href, icon: Icon }) => {
          const active = href === '/'
            ? pathname === '/'
            : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-0.5 px-3 py-2 min-w-[52px]"
            >
              <Icon
                size={22}
                className={cn('transition-colors')}
                style={{ color: active ? '#7c6ff7' : '#3a3a55' }}
              />
              <span
                className={cn('text-[10px] font-medium transition-colors')}
                style={{ color: active ? '#7c6ff7' : '#4a4a65' }}
              >
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
