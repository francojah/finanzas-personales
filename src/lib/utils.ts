import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ────────────────────────────────────────────────
// Formateo de moneda
// ────────────────────────────────────────────────

// Separador de miles: punto | Decimal: coma | Sin decimales — formato Argentina
const AR_FORMAT = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 })

export function formatARS(amount: number): string {
  return `$ ${AR_FORMAT.format(Math.round(amount))}`
}

export function formatUSD(amount: number): string {
  return `USD ${AR_FORMAT.format(Math.round(amount))}`
}

export function formatCurrency(amount: number, currency: 'ARS' | 'USD' | string): string {
  if (currency === 'ARS') return formatARS(amount)
  if (currency === 'USD') return formatUSD(amount)
  return `${currency} ${AR_FORMAT.format(Math.round(amount))}`
}

export function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${Math.round(value)}%`
}

// ────────────────────────────────────────────────
// Formateo de fechas
// ────────────────────────────────────────────────

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, "d 'de' MMMM yyyy", { locale: es })
}

export function formatDateShort(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'dd/MM/yyyy')
}

export function formatMonth(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'MMMM yyyy', { locale: es })
}

// ────────────────────────────────────────────────
// Conversión de monedas
// ────────────────────────────────────────────────

export function convertToARS(amountUSD: number, exchangeRate: number): number {
  return amountUSD * exchangeRate
}

export function convertToUSD(amountARS: number, exchangeRate: number): number {
  return amountARS / exchangeRate
}

// ────────────────────────────────────────────────
// Helpers de inversiones
// ────────────────────────────────────────────────

export function calculateReturn(currentPrice: number, avgPurchasePrice: number): number {
  return ((currentPrice - avgPurchasePrice) / avgPurchasePrice) * 100
}

export function calculatePositionValue(quantity: number, currentPrice: number): number {
  return quantity * currentPrice
}

export function calculatePnL(
  quantity: number,
  currentPrice: number,
  avgPurchasePrice: number
): number {
  return quantity * (currentPrice - avgPurchasePrice)
}

// ────────────────────────────────────────────────
// Helpers generales
// ────────────────────────────────────────────────

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
