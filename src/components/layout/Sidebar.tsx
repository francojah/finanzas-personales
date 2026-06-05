'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, ArrowLeftRight, TrendingUp,
  Target, CreditCard, Users, Settings, LogOut,
  Upload, Building2, Percent, Sparkles, Repeat, FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ThemeSelector } from './ThemeSelector'

const NAV = [
  { label: 'Dashboard',         href: '/',                  icon: LayoutDashboard },
  { label: 'Movimientos',       href: '/transactions',      icon: ArrowLeftRight  },
  { label: 'Inversiones',       href: '/investments',       icon: TrendingUp      },
  { label: 'Patrimonio',        href: '/patrimonio',        icon: Building2       },
  { label: 'Proyectos',         href: '/projects',          icon: Target          },
  { label: 'Tarjetas',          href: '/credit-cards',      icon: CreditCard      },
  { label: 'Cobros',            href: '/people',            icon: Users           },
  { label: 'Interés Compuesto', href: '/interes-compuesto', icon: Percent   },
  { label: 'Recurrentes',       href: '/recurrentes',       icon: Repeat    },
  { label: 'Importar',          href: '/import',            icon: Upload    },
  { label: 'Reporte mensual',   href: '/reporte',           icon: FileText  },
  { label: 'Guru Financiero',   href: '/guru',              icon: Sparkles, gold: true },
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
      style={{ background: 'var(--surface-nav)', borderRight: '1px solid var(--border-subtle)' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'linear-gradient(135deg, var(--gold) 0%, #d97706 100%)', boxShadow: '0 0 10px var(--gold-shadow)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="1" x2="12" y2="23"/>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
        </div>
        <div className="flex flex-col">
          <span className="font-semibold text-[15px]" style={{ color: 'var(--text-primary)' }}>Finanzas</span>
          <span className="text-[10px] font-semibold tracking-[0.2em]" style={{ color: 'var(--text-faint)' }}>JAH DEV</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {NAV.map(({ label, href, icon: Icon, gold }: any) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          const goldColor = '#f0b429'
          return (
            <Link
              key={href}
              href={href}
              className={cn('flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all')}
              style={active
                ? { background: gold ? 'rgba(240,180,41,0.1)' : 'var(--accent-bg)', color: gold ? goldColor : 'var(--accent-text)', border: `1px solid ${gold ? 'rgba(240,180,41,0.25)' : 'var(--accent-border)'}` }
                : { color: gold ? 'rgba(240,180,41,0.7)' : 'var(--text-secondary)', border: '1px solid transparent' }
              }
            >
              <Icon size={17} style={{ color: active ? (gold ? goldColor : 'var(--accent-icon)') : (gold ? 'rgba(240,180,41,0.6)' : 'var(--text-muted)') }} />
              {label}
              {gold && !active && (
                <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(240,180,41,0.12)', color: goldColor }}>
                  IA
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Theme selector */}
      <ThemeSelector />

      {/* Bottom */}
      <div className="p-3 space-y-0.5" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <Link
          href="/settings"
          className={cn('flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all')}
          style={pathname.startsWith('/settings')
            ? { background: 'var(--accent-bg)', color: 'var(--accent-text)', border: '1px solid var(--accent-border)' }
            : { color: 'var(--text-secondary)', border: '1px solid transparent' }
          }
        >
          <Settings size={17} style={{ color: pathname.startsWith('/settings') ? 'var(--accent-icon)' : 'var(--text-muted)' }} />
          Configuración
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:text-red-400"
          style={{ color: 'var(--text-secondary)', border: '1px solid transparent' }}
        >
          <LogOut size={17} style={{ color: 'var(--text-muted)' }} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
