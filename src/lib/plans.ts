// ============================================================
// PLANES — single source of truth para feature flags
// ============================================================

export type Plan = 'free' | 'premium'

export interface PlanFeatures {
  maxTransactions: number        // max transacciones visibles
  maxAccounts: number            // max cuentas bancarias
  maxCreditCards: number         // max tarjetas
  investments: boolean           // sección Inversiones
  patrimonio: boolean            // sección Patrimonio
  loans: boolean                 // sección Préstamos
  projects: boolean              // sección Metas
  people: boolean                // sección Cobros
  guru: boolean                  // Guru Financiero (IA)
  import: boolean                // Importar extracto bancario
  reporte: boolean               // Reporte mensual
  recurrentes: boolean           // Gastos recurrentes
  aiInsights: boolean            // Insights proactivos de IA
  aiCategorize: boolean          // Auto-categorización IA en import
  receiptScan: boolean           // Escaneo de tickets con Claude Vision
}

export const PLAN_FEATURES: Record<Plan, PlanFeatures> = {
  free: {
    maxTransactions: 50,
    maxAccounts:     1,
    maxCreditCards:  1,
    investments:     false,
    patrimonio:      false,
    loans:           false,
    projects:        false,
    people:          false,
    guru:            false,
    import:          false,
    reporte:         false,
    recurrentes:     false,
    aiInsights:      false,
    aiCategorize:    false,
    receiptScan:     false,
  },
  premium: {
    maxTransactions: Infinity,
    maxAccounts:     Infinity,
    maxCreditCards:  Infinity,
    investments:     true,
    patrimonio:      true,
    loans:           true,
    projects:        true,
    people:          true,
    guru:            true,
    import:          true,
    reporte:         true,
    recurrentes:     true,
    aiInsights:      true,
    aiCategorize:    true,
    receiptScan:     true,
  },
}

export function canUse(plan: Plan, feature: keyof PlanFeatures): boolean {
  const val = PLAN_FEATURES[plan][feature]
  if (typeof val === 'boolean') return val
  if (typeof val === 'number')  return val > 0
  return false
}

// Precio y descripción para el modal de upgrade
export const PREMIUM_PRICE_ARS = 5990
export const PREMIUM_PRICE_LABEL = '$5.990 / mes'

export const PREMIUM_FEATURES_LIST = [
  'Movimientos ilimitados',
  'Cuentas y tarjetas ilimitadas',
  'Inversiones y Patrimonio',
  'Metas de ahorro y Préstamos',
  'Guru Financiero con IA',
  'Importar extractos bancarios',
  'Escaneo de tickets con IA',
  'Reporte mensual PDF',
  'Gastos recurrentes',
  'Cobros entre personas',
]

// Features que tiene Free (para la comparativa)
export const FREE_FEATURES_LIST = [
  'Dashboard completo',
  'Hasta 50 movimientos',
  '1 cuenta bancaria',
  '1 tarjeta de crédito',
  'Calculadora de Interés Compuesto',
]
