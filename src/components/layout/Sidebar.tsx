'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, ArrowLeftRight, TrendingUp,
  Target, CreditCard, Users, Settings, LogOut,
  DollarSign, Upload,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const NAV = [
  { label: 'Dashboard',    href: '/',             icon: LayoutDashboard },
  { label: 'Movimientos',  href: '/transactions', icon: ArrowLeftRight   },
  { label: 'Inversiones',  href: '/investments',  icon: TrendingUp       },
  { label: 'Proyectos',    href: '/projects',     icon: Target           },
  { label: 'Tarjetas',     href: '/credit-cards', icon: CreditCard       },
  { label: 'Cobros',       href: '/people',       icon: Users            },
  { label: 'Importar',    href: '/import',       icon: Upload           },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <aside className="hidden md:flex flex-col w-60 bg-white border-r border-slate-200 shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-100">
        <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0">
          <DollarSign size={18} className="text-white" />
        </div>
        <span className="font-bold text-slate-900 text-[15px]">Finanzas</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5">
        {NAV.map(({ label, href, icon: Icon }) => {
          const active = href === '/'
            ? pathname === '/'
            : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                active
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              )}
            >
              <Icon size={18} className={active ? 'text-indigo-600' : 'text-slate-400'} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t border-slate-100 space-y-0.5">
        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
            pathname.startsWith('/settings')
              ? 'bg-indigo-50 text-indigo-700'
              : 'text-slate-600 hover:bg-slate-50'
          )}
        >
          <Settings size={18} className={pathname.startsWith('/settings') ? 'text-indigo-600' : 'text-slate-400'} />
          Configuración
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut size={18} className="text-slate-400" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
