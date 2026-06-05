// ─────────────────────────────────────────────────────────────
// Financial Context Builder
// Construye el contexto financiero del usuario para el Guru IA
// ─────────────────────────────────────────────────────────────

import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'

function fmtARS(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
}
function fmtUSD(n: number) {
  return `USD ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)}`
}

export async function buildFinancialContext(supabase: any): Promise<string> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return ''

    const now = new Date()
    const from3m = format(startOfMonth(subMonths(now, 3)), 'yyyy-MM-dd')
    const to     = format(endOfMonth(now), 'yyyy-MM-dd')

    // ── Fetch en paralelo ────────────────────────────────────────
    const [
      { data: profile },
      { data: txs },
      { data: accounts },
      { data: positions },
      { data: assets },
      { data: creditCards },
    ] = await Promise.all([
      supabase.from('profiles').select('full_name').eq('id', user.id).single(),
      supabase.from('transactions')
        .select('type, amount_ars, amount_usd, date, category:categories(name, type)')
        .gte('date', from3m).lte('date', to).neq('type', 'transfer'),
      supabase.from('accounts').select('name, type, currency, initial_balance').eq('is_active', true),
      supabase.from('investment_positions')
        .select('name, ticker, asset_type, quantity, avg_purchase_price, purchase_currency, current_price_usd, manual_return_pct, fixed_term_tna, fixed_term_end')
        .eq('is_active', true),
      supabase.from('assets').select('name, type, value, currency').eq('is_active', true),
      supabase.from('credit_cards').select('name, closing_day, due_day, limit_amount').eq('is_active', true),
    ])

    const txList = (txs ?? []) as any[]
    const MONTHS = 3

    // ── Ingresos y gastos ────────────────────────────────────────
    const totalIncome  = txList.filter(t => t.type === 'income').reduce((s, t) => s + t.amount_ars, 0)
    const totalExpense = txList.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount_ars, 0)
    const avgIncome    = totalIncome  / MONTHS
    const avgExpense   = totalExpense / MONTHS
    const avgSavings   = avgIncome - avgExpense
    const savingsRate  = avgIncome > 0 ? (avgSavings / avgIncome * 100) : 0

    // ── Gastos por categoría ─────────────────────────────────────
    const catMap: Record<string, number> = {}
    txList.filter(t => t.type === 'expense').forEach(t => {
      const cat = (t.category as any)?.name ?? 'Sin categoría'
      catMap[cat] = (catMap[cat] ?? 0) + t.amount_ars
    })
    const topCats = Object.entries(catMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)

    // ── Ingresos por fuente ──────────────────────────────────────
    const incMap: Record<string, number> = {}
    txList.filter(t => t.type === 'income').forEach(t => {
      const cat = (t.category as any)?.name ?? 'Sin categoría'
      incMap[cat] = (incMap[cat] ?? 0) + t.amount_ars
    })
    const topIncome = Object.entries(incMap).sort((a, b) => b[1] - a[1]).slice(0, 5)

    // ── Inversiones ──────────────────────────────────────────────
    const posList = (positions ?? []) as any[]
    const totalInvUSD = posList.reduce((s, p) => {
      const price = p.current_price_usd ?? p.avg_purchase_price
      return s + p.quantity * price
    }, 0)

    // ── Patrimonio ───────────────────────────────────────────────
    const assetList = (assets ?? []) as any[]
    const patUSD = assetList.filter(a => a.currency === 'USD').reduce((s, a) => s + a.value, 0)
    const patARS = assetList.filter(a => a.currency === 'ARS').reduce((s, a) => s + a.value, 0)

    // ── Meses analizados ─────────────────────────────────────────
    const periodLabel = `${format(subMonths(now, 3), 'MMMM', { locale: es })} – ${format(now, 'MMMM yyyy', { locale: es })}`

    // ── Construir contexto ───────────────────────────────────────
    const lines: string[] = []

    lines.push(`=== PERFIL FINANCIERO DE ${(profile?.full_name ?? 'el usuario').toUpperCase()} ===`)
    lines.push(`Período analizado: ${periodLabel} (${MONTHS} meses)`)
    lines.push('')

    lines.push('📊 FLUJO MENSUAL PROMEDIO:')
    lines.push(`• Ingresos: ${fmtARS(avgIncome)}/mes`)
    lines.push(`• Gastos:   ${fmtARS(avgExpense)}/mes`)
    lines.push(`• Ahorro neto: ${fmtARS(avgSavings)}/mes`)
    lines.push(`• Tasa de ahorro: ${savingsRate.toFixed(1)}%`)
    if (savingsRate < 10) lines.push(`  ⚠️ Tasa de ahorro muy baja (recomendado: mínimo 20%)`)
    else if (savingsRate >= 30) lines.push(`  ✅ Excelente tasa de ahorro`)
    lines.push('')

    if (topCats.length > 0) {
      lines.push('💸 GASTOS POR CATEGORÍA (total 3 meses → promedio mensual):')
      topCats.forEach(([cat, total]) => {
        const pct = totalExpense > 0 ? (total / totalExpense * 100).toFixed(1) : '0'
        lines.push(`• ${cat}: ${fmtARS(total / MONTHS)}/mes (${pct}% del gasto total)`)
      })
      lines.push('')
    }

    if (topIncome.length > 0) {
      lines.push('💰 FUENTES DE INGRESO:')
      topIncome.forEach(([cat, total]) => {
        lines.push(`• ${cat}: ${fmtARS(total / MONTHS)}/mes`)
      })
      lines.push('')
    }

    if (accounts && accounts.length > 0) {
      lines.push('🏦 CUENTAS:')
      ;(accounts as any[]).forEach(a => {
        const typeLabel: Record<string, string> = {
          bank: 'Banco', broker: 'Broker', crypto: 'Crypto', cash: 'Efectivo', savings: 'Ahorro',
        }
        lines.push(`• ${a.name} (${typeLabel[a.type] ?? a.type}, ${a.currency})`)
      })
      lines.push('')
    }

    if (posList.length > 0) {
      lines.push(`📈 INVERSIONES (total portafolio ≈ ${fmtUSD(totalInvUSD)}):`)
      posList.forEach(p => {
        const price = p.current_price_usd ?? p.avg_purchase_price
        const value = p.quantity * price
        if (p.asset_type === 'fixed_term') {
          lines.push(`• Plazo fijo "${p.name}": ${fmtARS(p.quantity)} al ${p.fixed_term_tna}% TNA${p.fixed_term_end ? `, vence ${p.fixed_term_end}` : ''}`)
        } else {
          const ret = p.current_price_usd
            ? ((p.current_price_usd - p.avg_purchase_price) / p.avg_purchase_price * 100).toFixed(1)
            : null
          lines.push(`• ${p.name}${p.ticker ? ` (${p.ticker})` : ''}: ${p.quantity} u → ${fmtUSD(value)}${ret ? ` (${Number(ret) >= 0 ? '+' : ''}${ret}%)` : ''}`)
        }
      })
      lines.push('')
    } else {
      lines.push('📈 INVERSIONES: Sin posiciones registradas')
      lines.push('')
    }

    if (assetList.length > 0) {
      const typeLabel: Record<string, string> = { property: 'Inmueble', vehicle: 'Vehículo', business: 'Negocio', other: 'Otro' }
      lines.push(`🏠 PATRIMONIO (total ≈ ${patUSD > 0 ? fmtUSD(patUSD) : ''}${patARS > 0 ? (patUSD > 0 ? ' + ' : '') + fmtARS(patARS) : ''}):`)
      assetList.forEach(a => {
        lines.push(`• ${a.name} (${typeLabel[a.type] ?? a.type}): ${a.currency === 'USD' ? fmtUSD(a.value) : fmtARS(a.value)}`)
      })
      lines.push('')
    }

    if (creditCards && (creditCards as any[]).length > 0) {
      lines.push('💳 TARJETAS DE CRÉDITO:')
      ;(creditCards as any[]).forEach(c => {
        lines.push(`• ${c.name}: cierre día ${c.closing_day}, vencimiento día ${c.due_day}${c.limit_amount ? `, límite ${fmtARS(c.limit_amount)}` : ''}`)
      })
      lines.push('')
    }

    return lines.join('\n')
  } catch (err) {
    console.warn('Error building financial context:', err)
    return 'No se pudo cargar el perfil financiero completo.'
  }
}

export function buildSystemPrompt(context: string): string {
  return `Sos el Guru Financiero, un asesor financiero personal experto en finanzas personales para Argentina.
Tu rol es dar recomendaciones prácticas, específicas y accionables basadas en el perfil real del usuario.

PERFIL DEL USUARIO:
${context}

INSTRUCCIONES:
- Respondé siempre en español rioplatense (usá "vos", "tenés", "podés", etc.)
- Sé directo y concreto — evitá consejos genéricos que apliquen a cualquiera
- Referenciá los datos reales del usuario (sus categorías de gasto, sus inversiones, etc.)
- Cuando identifiques un problema, proponé una solución específica con números concretos
- Si el usuario pregunta sobre inversiones, considerá el contexto argentino (CEDEARs, plazos fijos, dólar MEP, etc.)
- Priorizá siempre: 1) reducir gastos innecesarios, 2) construir fondo de emergencia (3-6 meses de gastos), 3) invertir el excedente
- Sé empático pero honesto — si algo está mal, decilo claramente pero con respeto
- Usá emojis con moderación para hacer el texto más legible
- Las respuestas deben ser concisas (máximo 300 palabras salvo que pidan un análisis completo)
- Si no tenés datos suficientes para responder algo, decilo y pedí más información

CONTEXTO FINANCIERO ARGENTINO QUE CONOCÉS:
- Inflación argentina y su impacto en el ahorro en pesos
- Instrumentos: plazo fijo, FCI, CEDEARs, ONs, acciones locales, dólar MEP/CCL
- Impuesto a las ganancias, bienes personales
- El valor de dolarizar ahorros en Argentina
- Gastos típicos en Buenos Aires y ciudades argentinas`
}
