// ============================================================
// NAVEGACIÓN — define todas las rutas y el menú de la app
// ============================================================

export interface NavItem {
  label: string
  href: string
  icon: string
  badge?: string
}

export const NAV_ITEMS: NavItem[] = [
  // FINANZAS
  { label: 'Dashboard',       href: '/',                icon: 'layout-dashboard' },
  { label: 'Movimientos',     href: '/transactions',    icon: 'arrow-left-right' },
  { label: 'Tarjetas',        href: '/credit-cards',    icon: 'credit-card'      },
  { label: 'Préstamos',       href: '/loans',           icon: 'landmark'         },
  // ACTIVOS
  { label: 'Inversiones',     href: '/investments',     icon: 'trending-up'      },
  { label: 'Patrimonio',      href: '/patrimonio',      icon: 'building-2'       },
  { label: 'Metas',           href: '/projects',        icon: 'target'           },
  // HERRAMIENTAS
  { label: 'Interés Compuesto', href: '/interes-compuesto', icon: 'percent'     },
  { label: 'Reporte mensual', href: '/reporte',         icon: 'file-text'        },
  { label: 'Guru Financiero', href: '/guru',            icon: 'sparkles', badge: 'IA' },
  // PERSONAS
  { label: 'Cobros',          href: '/people',          icon: 'users'            },
  // GENERAL
  { label: 'Configuración',   href: '/settings',        icon: 'settings'         },
]

// Solo los 5 más importantes para el nav mobile (bottom bar)
export const MOBILE_NAV_ITEMS: NavItem[] = [
  { label: 'Inicio',          href: '/',                icon: 'layout-dashboard' },
  { label: 'Movimientos',     href: '/transactions',    icon: 'arrow-left-right' },
  { label: 'Inversiones',     href: '/investments',     icon: 'trending-up'      },
  { label: 'Metas',           href: '/projects',        icon: 'target'           },
  { label: 'Más',             href: '/settings',        icon: 'menu'             },
]

// ============================================================
// RUTAS DE LA APP
// ============================================================
//
// /                          → Dashboard
// /transactions              → Listado de movimientos
// /transactions/new          → Nuevo movimiento (modal/page)
// /transactions/[id]         → Detalle de movimiento
//
// /investments               → Portfolio consolidado
// /investments/[id]          → Detalle de posición
// /investments/new           → Nueva posición
//
// /projects                  → Listado de proyectos
// /projects/new              → Nuevo proyecto
// /projects/[id]             → Detalle de proyecto
//
// /credit-cards              → Resumen de tarjetas
// /credit-cards/[id]         → Detalle de tarjeta (resumen mensual, cuotas)
//
// /people                    → Cobros pendientes por persona
// /people/[id]               → Detalle de persona (lo que debe)
//
// /settings                  → Configuración general
// /settings/categories       → CRUD de categorías y subcategorías
// /settings/accounts         → CRUD de cuentas
// /settings/credit-cards     → CRUD de tarjetas de crédito
// /settings/people           → CRUD de personas
// /settings/exchange-rates   → Tipo de cambio manual / preferencias
// /settings/alerts           → Configuración de alertas
//
// /auth/login                → Login
// /auth/register             → Registro
