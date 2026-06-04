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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200">
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
                className={cn(
                  'transition-colors',
                  active ? 'text-indigo-600' : 'text-slate-400'
                )}
              />
              <span
                className={cn(
                  'text-[10px] font-medium transition-colors',
                  active ? 'text-indigo-600' : 'text-slate-400'
                )}
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
