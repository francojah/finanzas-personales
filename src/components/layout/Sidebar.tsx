'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, ArrowLeftRight, TrendingUp,
  Target, CreditCard, Users, Settings, LogOut,
  Upload, Building2, Percent,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const NAV = [
  { label: 'Dashboard',         href: '/',                  icon: LayoutDashboard },
  { label: 'Movimientos',       href: '/transactions',      icon: ArrowLeftRight  },
  { label: 'Inversiones',       href: '/investments',       icon: TrendingUp      },
  { label: 'Patrimonio',        href: '/patrimonio',        icon: Building2       },
  { label: 'Proyectos',         href: '/projects',          icon: Target          },
  { label: 'Tarjetas',          href: '/credit-cards',      icon: CreditCard      },
  { label: 'Cobros',            href: '/people',            icon: Users           },
  { label: 'Interés Compuesto', href: '/interes-compuesto', icon: Percent         },
  { label: 'Importar',          href: '/import',            icon: Upload          },
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
      style={{ background: '#111111', borderRight: '1px solid #222222' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5" style={{ borderBottom: '1px solid #1e1e1e' }}>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: 'linear-gradient(135deg, #f0b429 0%, #d97706 100%)',
            boxShadow: '0 0 10px rgba(240,180,41,0.25)',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="1" x2="12" y2="23"/>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
        </div>
        <div className="flex flex-col">
          <span className="font-semibold text-[15px]" style={{ color: '#ededed' }}>Finanzas</span>
          <span className="text-[10px] font-semibold tracking-[0.2em]" style={{ color: '#444' }}>JAH DEV</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {NAV.map(({ label, href, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn('flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all')}
              style={active
                ? { background: 'rgba(124,111,247,0.12)', color: '#c4b8ff', border: '1px solid rgba(124,111,247,0.15)' }
                : { color: '#888888', border: '1px solid transparent' }
              }
            >
              <Icon size={17} style={{ color: active ? '#a89efa' : '#555555' }} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="p-3 space-y-0.5" style={{ borderTop: '1px solid #1e1e1e' }}>
        <Link
          href="/settings"
          className={cn('flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all')}
          style={pathname.startsWith('/settings')
            ? { background: 'rgba(124,111,247,0.12)', color: '#c4b8ff', border: '1px solid rgba(124,111,247,0.15)' }
            : { color: '#888888', border: '1px solid transparent' }
          }
        >
          <Settings size={17} style={{ color: pathname.startsWith('/settings') ? '#a89efa' : '#555555' }} />
          Configuración
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:text-red-400"
          style={{ color: '#888888', border: '1px solid transparent' }}
        >
          <LogOut size={17} style={{ color: '#555555' }} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
