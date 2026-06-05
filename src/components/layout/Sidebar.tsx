'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, ArrowLeftRight, TrendingUp,
  Target, CreditCard, Users, Settings, LogOut,
  Building2, Percent, Sparkles, FileText, Landmark, Lock, Zap, Shield, PiggyBank,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ThemeSelector } from './ThemeSelector'
import { usePlan } from '@/hooks/usePlan'
import type { PlanFeatures } from '@/lib/plans'

interface NavItem {
  label: string
  href: string
  icon: any
  gold?: boolean
  premiumFeature?: keyof PlanFeatures  // si está definido, se muestra lock en Free
}

interface NavGroup {
  title: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'FINANZAS',
    items: [
      { label: 'Dashboard',   href: '/',             icon: LayoutDashboard },
      { label: 'Movimientos', href: '/transactions', icon: ArrowLeftRight  },
      { label: 'Tarjetas',      href: '/credit-cards', icon: CreditCard  },
      { label: 'Préstamos',    href: '/loans',        icon: Landmark,    premiumFeature: 'loans'    },
      { label: 'Presupuesto',  href: '/budget',       icon: PiggyBank   },
    ],
  },
  {
    title: 'ACTIVOS',
    items: [
      { label: 'Inversiones', href: '/investments', icon: TrendingUp, premiumFeature: 'investments' },
      { label: 'Patrimonio',  href: '/patrimonio',  icon: Building2,  premiumFeature: 'patrimonio'  },
      { label: 'Metas',       href: '/projects',    icon: Target,     premiumFeature: 'projects'    },
    ],
  },
  {
    title: 'HERRAMIENTAS',
    items: [
      { label: 'Interés Compuesto', href: '/interes-compuesto', icon: Percent   },
      { label: 'Reporte mensual',   href: '/reporte',           icon: FileText,  premiumFeature: 'reporte' },
      { label: 'Guru Financiero',   href: '/guru',              icon: Sparkles,  gold: true, premiumFeature: 'guru' },
    ],
  },
  {
    title: 'PERSONAS',
    items: [
      { label: 'Cobros', href: '/people', icon: Users, premiumFeature: 'people' },
    ],
  },
]

function NavLink({ label, href, icon: Icon, gold, premiumFeature, pathname, isPremium }: NavItem & { pathname: string; isPremium: boolean }) {
  const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
  const locked = !!premiumFeature && !isPremium
  const goldColor = '#f0b429'

  return (
    <Link
      href={href}
      className={cn('flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all')}
      style={active
        ? { background: gold ? 'rgba(240,180,41,0.1)' : 'var(--accent-bg)', color: gold ? goldColor : 'var(--accent-text)', border: `1px solid ${gold ? 'rgba(240,180,41,0.25)' : 'var(--accent-border)'}` }
        : { color: locked ? 'var(--text-faint)' : gold ? 'rgba(240,180,41,0.7)' : 'var(--text-secondary)', border: '1px solid transparent' }
      }
    >
      <Icon size={17} style={{ color: active ? (gold ? goldColor : 'var(--accent-icon)') : locked ? 'var(--text-faint)' : (gold ? 'rgba(240,180,41,0.6)' : 'var(--text-muted)') }} />
      <span className="flex-1">{label}</span>
      {locked && (
        <Lock size={11} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
      )}
      {gold && !active && !locked && (
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
          style={{ background: 'rgba(240,180,41,0.12)', color: goldColor }}>
          IA
        </span>
      )}
    </Link>
  )
}

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '').split(',').map(e => e.trim().toLowerCase())

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { isPremium } = usePlan()
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? null))
  }, [])

  const isAdmin = !!userEmail && ADMIN_EMAILS.includes(userEmail.toLowerCase())

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
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
            <polyline points="16 7 22 7 22 13"/>
          </svg>
        </div>
        <div className="flex flex-col">
          <span className="font-semibold text-[15px]" style={{ color: 'var(--text-primary)' }}>Finanzapp</span>
          <span className="text-[10px] font-semibold tracking-[0.2em]" style={{ color: 'var(--text-faint)' }}>JAH DEV</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 overflow-y-auto space-y-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.title}>
            <p className="px-3 mb-1 text-[10px] font-bold tracking-[0.12em]" style={{ color: 'var(--text-faint)' }}>
              {group.title}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink key={item.href} {...item} pathname={pathname} isPremium={isPremium} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Upgrade banner — solo en Free */}
      {!isPremium && (
        <div className="mx-3 mb-1">
          <button
            onClick={() => router.push('/pricing')}
            className="w-full rounded-xl p-3 text-left transition-all"
            style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.12) 100%)', border: '1px solid rgba(99,102,241,0.25)' }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Zap size={13} style={{ color: '#818cf8' }} />
              <span className="text-xs font-bold" style={{ color: '#818cf8' }}>Activar Premium</span>
            </div>
            <p className="text-[11px]" style={{ color: 'var(--text-faint)' }}>
              Desbloqueá todas las funciones
            </p>
          </button>
        </div>
      )}

      {/* Theme selector */}
      <ThemeSelector />

      {/* Bottom */}
      <div className="p-3 space-y-0.5" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        {isAdmin && (
          <Link
            href="/admin"
            className={cn('flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all')}
            style={pathname.startsWith('/admin')
              ? { background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }
              : { color: 'var(--text-secondary)', border: '1px solid transparent' }
            }
          >
            <Shield size={17} style={{ color: pathname.startsWith('/admin') ? '#818cf8' : 'var(--text-muted)' }} />
            Admin
          </Link>
        )}
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
