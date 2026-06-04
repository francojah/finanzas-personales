'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { startOfMonth, endOfMonth, format, addDays, parseISO, isBefore, isAfter } from 'date-fns'
import { es } from 'date-fns/locale'
import { formatARS } from '@/lib/utils'
import type { AlertType } from '@/types/database'

export interface ActiveAlert {
  id: string
  type: AlertType
  message: string
  severity: 'warning' | 'danger'
}

export function useAlerts() {
  const supabase = createClient()
  const [alerts, setAlerts] = useState<ActiveAlert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    evaluate()
  }, [])

  async function evaluate() {
    setLoading(true)
    const active: ActiveAlert[] = []

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Cargar configuración de alertas del usuario
      const { data: settings } = await supabase
        .from('alert_settings')
        .select('*')
        .eq('user_id', user.id)

      // Si no hay settings, usamos defaults habilitados
      const getSetting = (type: AlertType) => {
        const s = settings?.find(s => s.type === type)
        return { enabled: s ? s.is_enabled : true, daysBefore: s?.days_before ?? 3 }
      }

      const now = new Date()
      const today = format(now, 'yyyy-MM-dd')

      // ── 1. Gasto > Ingreso (mes actual) ──────────────────
      const setting1 = getSetting('expense_over_income')
      if (setting1.enabled) {
        const monthStart = format(startOfMonth(now), 'yyyy-MM-dd')
        const monthEnd   = format(endOfMonth(now),   'yyyy-MM-dd')
        const { data: txs } = await supabase
          .from('transactions')
          .select('type, amount_ars')
          .gte('date', monthStart)
          .lte('date', monthEnd)
          .neq('type', 'transfer')

        const income  = (txs ?? []).filter(t => t.type === 'income').reduce((s, t) => s + t.amount_ars, 0)
        const expense = (txs ?? []).filter(t => t.type === 'expense').reduce((s, t) => s + t.amount_ars, 0)

        if (income > 0 && expense > income) {
          active.push({
            id: 'expense_over_income',
            type: 'expense_over_income',
            message: `Este mes gastás ${formatARS(expense - income)} más de lo que ganás`,
            severity: 'danger',
          })
        }
      }

      // ── 2. Vencimiento de tarjeta de crédito ─────────────
      const setting2 = getSetting('credit_card_due')
      if (setting2.enabled) {
        const { data: cards } = await supabase
          .from('credit_cards')
          .select('id, name, due_day')
          .eq('user_id', user.id)
          .eq('is_active', true)

        const dayOfMonth = now.getDate()
        const daysInMonth = endOfMonth(now).getDate()

        for (const card of cards ?? []) {
          const daysUntilDue = card.due_day >= dayOfMonth
            ? card.due_day - dayOfMonth
            : daysInMonth - dayOfMonth + card.due_day

          if (daysUntilDue <= setting2.daysBefore) {
            active.push({
              id: `credit_card_due_${card.id}`,
              type: 'credit_card_due',
              message: `Vence ${card.name} ${daysUntilDue === 0 ? 'hoy' : `en ${daysUntilDue} día${daysUntilDue > 1 ? 's' : ''}`}`,
              severity: daysUntilDue <= 1 ? 'danger' : 'warning',
            })
          }
        }
      }

      // ── 3. Plazo fijo próximo a vencer ───────────────────
      const setting3 = getSetting('fixed_term_maturity')
      if (setting3.enabled) {
        const cutoff = format(addDays(now, setting3.daysBefore), 'yyyy-MM-dd')
        const { data: positions } = await supabase
          .from('investment_positions')
          .select('id, name, fixed_term_end, quantity, avg_purchase_price')
          .eq('user_id', user.id)
          .eq('asset_type', 'fixed_term')
          .eq('is_active', true)
          .not('fixed_term_end', 'is', null)
          .lte('fixed_term_end', cutoff)
          .gte('fixed_term_end', today)

        for (const pos of positions ?? []) {
          const end = parseISO(pos.fixed_term_end!)
          const daysLeft = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          const capital = pos.quantity * pos.avg_purchase_price
          active.push({
            id: `fixed_term_${pos.id}`,
            type: 'fixed_term_maturity',
            message: `Plazo fijo "${pos.name}" vence ${daysLeft <= 0 ? 'hoy' : `en ${daysLeft} día${daysLeft > 1 ? 's' : ''}`} · ${formatARS(capital)}`,
            severity: daysLeft <= 1 ? 'danger' : 'warning',
          })
        }
      }

      // ── 4. Deudas pendientes vencidas ────────────────────
      const setting4 = getSetting('pending_debt_overdue')
      if (setting4.enabled) {
        const { data: debts } = await supabase
          .from('shared_expenses')
          .select('id, description, amount_ars, due_date, person:people(name)')
          .eq('user_id', user.id)
          .in('status', ['pending', 'partial'])
          .not('due_date', 'is', null)
          .lt('due_date', today)

        for (const debt of debts ?? []) {
          const personName = (debt.person as any)?.name ?? 'alguien'
          active.push({
            id: `debt_${debt.id}`,
            type: 'pending_debt_overdue',
            message: `${personName} te debe ${formatARS(debt.amount_ars)} — "${debt.description}" (vencido)`,
            severity: 'warning',
          })
        }
      }
    } catch (e) {
      console.warn('Error evaluando alertas:', e)
    } finally {
      setLoading(false)
    }

    setAlerts(active)
  }

  return { alerts, loading, refresh: evaluate }
}
