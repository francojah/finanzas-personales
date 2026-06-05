'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, ArrowLeftRight, TrendingUp,
  Target, CreditCard, Users, Settings, LogOut,
  Upload,
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
  { label: 'Importar',     href: '/import',       icon: Upload           },
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
    <aside
      className="hidden md:flex flex-col w-60 shrink-0"
      style={{
        background: '#101018',
        borderRight: '1px solid #1e1e2e',
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-5 py-5"
        style={{ borderBottom: '1px solid #1a1a28' }}
      >
        {/* $ badge */}
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: 'linear-gradient(135deg, #f0b429 0%, #e09820 100%)',
            boxShadow: '0 0 12px rgba(240,180,41,0.35)',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="1" x2="12" y2="23"/>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
        </div>
        {/* JAH brand */}
        <div className="flex flex-col">
          <span className="font-bold text-[15px]" style={{ color: '#e2e2f0' }}>Finanzas</span>
          <span className="text-[10px] font-semibold tracking-widest" style={{ color: '#3a3a55' }}>JAH DEV</span>
        </div>
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
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
              )}
              style={active ? {
                background: 'rgba(124, 111, 247, 0.12)',
                color: '#a89efa',
                boxShadow: 'inset 0 0 0 1px rgba(124, 111, 247, 0.2)',
              } : {
                color: '#6b6b85',
              }}
            >
              <Icon
                size={18}
                style={{ color: active ? '#7c6ff7' : '#3a3a55' }}
              />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div
        className="p-3 space-y-0.5"
        style={{ borderTop: '1px solid #1a1a28' }}
      >
        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
          )}
          style={pathname.startsWith('/settings') ? {
            background: 'rgba(124, 111, 247, 0.12)',
            color: '#a89efa',
            boxShadow: 'inset 0 0 0 1px rgba(124, 111, 247, 0.2)',
          } : {
            color: '#6b6b85',
          }}
        >
          <Settings
            size={18}
            style={{ color: pathname.startsWith('/settings') ? '#7c6ff7' : '#3a3a55' }}
          />
          Configuración
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
          style={{ color: '#6b6b85' }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.color = '#f25c7a'
            ;(e.currentTarget as HTMLElement).style.background = 'rgba(242, 92, 122, 0.08)'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.color = '#6b6b85'
            ;(e.currentTarget as HTMLElement).style.background = 'transparent'
          }}
        >
          <LogOut size={18} style={{ color: '#3a3a55' }} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
