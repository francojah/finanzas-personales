'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Repeat, ChevronRight, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatARS } from '@/lib/utils'
import { format, startOfMonth, endOfMonth } from 'date-fns'

interface PendingRecurring {
  id: string
  description: string
  amount_ars: number
  type: 'income' | 'expense'
  recurrence_frequency: string
}

export function RecurringBanner() {
  const router = useRouter()
  const supabase = createClient()
  const [pending, setPending] = useState<PendingRecurring[]>([])
  const [generating, setGenerating] = useState(false)

  useEffect(() => { checkPending() }, [])

  async function checkPending() {
    const now   = new Date()
    const from  = format(startOfMonth(now), 'yyyy-MM-dd')
    const to    = format(endOfMonth(now),   'yyyy-MM-dd')

    // Traer todas las transacciones recurrentes base (sin parent)
    const { data: templates } = await supabase
      .from('transactions')
      .select('id, description, amount_ars, type, recurrence_frequency, category_id, account_id, currency_original, amount_original, amount_usd, exchange_rate')
      .eq('is_recurring', true)
      .is('parent_transaction_id', null)
      .neq('type', 'transfer')

    if (!templates || templates.length === 0) return

    // Ver cuáles ya tienen una instancia este mes
    const { data: generated } = await supabase
      .from('transactions')
      .select('parent_transaction_id')
      .gte('date', from)
      .lte('date', to)
      .not('parent_transaction_id', 'is', null)
      .in('parent_transaction_id', templates.map(t => t.id))

    const generatedParentIds = new Set((generated ?? []).map((g: any) => g.parent_transaction_id))

    const missing = templates.filter(t => !generatedParentIds.has(t.id)) as PendingRecurring[]
    setPending(missing)
  }

  async function generateAll() {
    setGenerating(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const today = format(new Date(), 'yyyy-MM-dd')

    // Re-fetch templates para tener todos los campos
    const { data: templates } = await supabase
      .from('transactions')
      .select('*')
      .eq('is_recurring', true)
      .is('parent_transaction_id', null)
      .neq('type', 'transfer')

    const toInsert = (templates ?? [])
      .filter((t: any) => pending.some(p => p.id === t.id))
      .map((t: any) => ({
        user_id:            user.id,
        type:               t.type,
        amount_original:    t.amount_original,
        currency_original:  t.currency_original,
        amount_ars:         t.amount_ars,
        amount_usd:         t.amount_usd,
        exchange_rate:      t.exchange_rate,
        exchange_rate_type: t.exchange_rate_type,
        category_id:        t.category_id,
        account_id:         t.account_id,
        credit_card_id:     t.credit_card_id,
        description:        t.description,
        date:               today,
        is_recurring:       false,
        parent_transaction_id: t.id,
      }))

    if (toInsert.length > 0) {
      await supabase.from('transactions').insert(toInsert)
    }

    setPending([])
    setGenerating(false)
  }

  if (pending.length === 0) return null

  return (
    <div
      className="rounded-xl p-4 flex items-start gap-3"
      style={{ background: 'rgba(124,111,247,0.06)', border: '1px solid var(--accent-border)' }}
    >
      <Repeat size={16} style={{ color: 'var(--accent-icon)', marginTop: 2, flexShrink: 0 }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: 'var(--accent-text)' }}>
          {pending.length} transacción{pending.length > 1 ? 'es' : ''} recurrente{pending.length > 1 ? 's' : ''} pendiente{pending.length > 1 ? 's' : ''}
        </p>
        <p className="text-xs mt-0.5 mb-2" style={{ color: 'var(--text-muted)' }}>
          {pending.slice(0, 3).map(p => p.description || 'Sin descripción').join(', ')}
          {pending.length > 3 ? ` y ${pending.length - 3} más` : ''}
        </p>
        <div className="flex gap-2">
          <button
            onClick={generateAll}
            disabled={generating}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-white"
            style={{ background: 'var(--accent)' }}
          >
            {generating ? <Loader2 size={11} className="animate-spin" /> : <Repeat size={11} />}
            Generar para este mes
          </button>
          <button
            onClick={() => router.push('/recurrentes')}
            className="flex items-center gap-1 text-xs font-medium"
            style={{ color: 'var(--accent-icon)' }}
          >
            Ver todas <ChevronRight size={11} />
          </button>
        </div>
      </div>
    </div>
  )
}
