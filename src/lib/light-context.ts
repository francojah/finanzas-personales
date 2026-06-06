// Contexto financiero mínimo para endpoints de IA con presupuesto limitado.
// Objetivo: < 200 tokens de input por llamada.

import { subMonths, startOfMonth, endOfMonth, format } from 'date-fns'

export async function buildLightContext(supabase: any): Promise<string> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return ''

    const now   = new Date()
    const from  = format(startOfMonth(subMonths(now, 2)), 'yyyy-MM-dd')
    const to    = format(endOfMonth(now), 'yyyy-MM-dd')

    const [{ data: txs }, { data: positions }] = await Promise.all([
      supabase
        .from('transactions')
        .select('type, amount_ars, category:categories(name)')
        .gte('date', from).lte('date', to)
        .neq('type', 'transfer'),
      supabase
        .from('investment_positions')
        .select('current_price_usd, quantity, avg_purchase_price')
        .eq('is_active', true),
    ])

    const list = (txs ?? []) as any[]
    const income  = list.filter(t => t.type === 'income').reduce((s: number, t: any) => s + t.amount_ars, 0)
    const expense = list.filter(t => t.type === 'expense').reduce((s: number, t: any) => s + t.amount_ars, 0)
    const saving  = income > 0 ? Math.round((income - expense) / income * 100) : 0

    // Top 5 categorías de gasto
    const catMap: Record<string, number> = {}
    list.filter(t => t.type === 'expense').forEach((t: any) => {
      const cat = t.category?.name ?? 'Otros'
      catMap[cat] = (catMap[cat] ?? 0) + t.amount_ars
    })
    const topCats = Object.entries(catMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cat, amt]) => `${cat}:${Math.round(amt / 3 / 1000)}k`)
      .join(', ')

    const invUSD = ((positions ?? []) as any[]).reduce((s: number, p: any) => {
      return s + p.quantity * (p.current_price_usd ?? p.avg_purchase_price ?? 0)
    }, 0)

    // Formato ultra-compacto: ~80-100 tokens
    return [
      `Últimos 3 meses (ARS/mes promedio):`,
      `Ingresos:${Math.round(income/3/1000)}k Gastos:${Math.round(expense/3/1000)}k Ahorro:${saving}%`,
      topCats ? `Top gastos: ${topCats}` : '',
      invUSD > 0 ? `Inversiones: USD${Math.round(invUSD)}` : '',
    ].filter(Boolean).join('\n')
  } catch {
    return ''
  }
}
