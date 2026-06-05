'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useExchangeRate, convertAmount } from '@/hooks/useExchangeRate'
import { useCategories } from '@/hooks/useCategories'
import { useAccounts } from '@/hooks/useAccounts'
import { useCreditCards } from '@/hooks/useCreditCards'
import { SplitExpenseSection } from '@/components/shared/SplitExpenseSection'
import { ReceiptUpload } from '@/components/shared/ReceiptUpload'
import { formatARS, formatUSD, cn } from '@/lib/utils'
import type { Subcategory } from '@/types/database'

interface Split {
  person_id: string
  mode: 'percent' | 'fixed'
  percent: string
  fixed_ars: string
}

const schema = z.object({
  type: z.enum(['expense', 'income', 'transfer']),
  amount: z.string().min(1, 'Ingresá un monto').refine(v => !isNaN(parseFloat(v)) && parseFloat(v) > 0, 'Monto inválido'),
  currency: z.enum(['ARS', 'USD']),
  exchange_rate_type: z.enum(['mep', 'ccl']),
  category_id: z.string().optional(),
  subcategory_id: z.string().optional(),
  account_id: z.string().optional(),
  credit_card_id: z.string().optional(),
  transfer_to_account_id: z.string().optional(),
  payment_method: z.enum(['account', 'credit_card']),
  description: z.string().optional(),
  date: z.string(),
  is_recurring: z.boolean().default(false),
  recurrence_frequency: z.enum(['weekly', 'monthly', 'yearly']).optional(),
  has_installments: z.boolean().default(false),
  total_installments: z.string().optional(),
})

type FormData = z.infer<typeof schema>

const TYPE_TABS = [
  { value: 'expense',  label: 'Gasto',        activeColor: 'var(--expense)',      activeBg: 'var(--expense-bg)'   },
  { value: 'income',   label: 'Ingreso',       activeColor: 'var(--income)',       activeBg: 'var(--income-bg)'    },
  { value: 'transfer', label: 'Transferencia', activeColor: 'var(--accent-icon)',  activeBg: 'var(--accent-bg)'    },
] as const

export default function NewTransactionPage() {
  const router = useRouter()
  const supabase = createClient()
  const { mep, ccl, loading: rateLoading, refresh } = useExchangeRate()
  const [convertedAmount, setConvertedAmount] = useState<{ ars: number; usd: number } | null>(null)
  const [subcategories, setSubcategories] = useState<Subcategory[]>([])
  const [splits, setSplits] = useState<Split[]>([])
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null)

  const { register, control, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: 'expense',
      currency: 'ARS',
      exchange_rate_type: 'mep',
      payment_method: 'account',
      date: new Date().toISOString().split('T')[0],
      is_recurring: false,
      has_installments: false,
    },
  })

  const watchType = watch('type')
  const watchCurrency = watch('currency')
  const watchAmount = watch('amount')
  const watchRateType = watch('exchange_rate_type')
  const watchCategoryId = watch('category_id')
  const watchPaymentMethod = watch('payment_method')
  const watchRecurring = watch('is_recurring')
  const watchInstallments = watch('has_installments')

  const categoryType = watchType === 'income' ? 'income' : 'expense'
  const { categories } = useCategories(watchType === 'transfer' ? undefined : categoryType)
  const { accounts } = useAccounts()
  const { cards } = useCreditCards()

  useEffect(() => {
    const amount = parseFloat(watchAmount)
    const rate = watchRateType === 'mep' ? mep : ccl
    if (!isNaN(amount) && amount > 0 && rate) {
      setConvertedAmount(convertAmount(amount, watchCurrency, rate))
    } else {
      setConvertedAmount(null)
    }
  }, [watchAmount, watchCurrency, watchRateType, mep, ccl])

  useEffect(() => {
    if (!watchCategoryId) { setSubcategories([]); return }
    const cat = categories.find(c => c.id === watchCategoryId)
    setSubcategories(cat?.subcategories?.filter(s => s.is_active) ?? [])
    setValue('subcategory_id', undefined)
  }, [watchCategoryId, categories])

  async function onSubmit(data: FormData) {
    const rate = data.exchange_rate_type === 'mep' ? mep : ccl
    if (!rate) { toast.error('No hay tipo de cambio disponible'); return }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Sesión expirada'); return }

    const amount = parseFloat(data.amount)
    const converted = convertAmount(amount, data.currency, rate)

    const payload = {
      user_id: user.id,
      type: data.type,
      amount_original: amount,
      currency_original: data.currency,
      amount_ars: converted.ars,
      amount_usd: converted.usd,
      exchange_rate: rate,
      exchange_rate_type: data.exchange_rate_type,
      category_id: data.category_id || null,
      subcategory_id: data.subcategory_id || null,
      account_id: data.payment_method === 'account' ? (data.account_id || null) : null,
      credit_card_id: data.payment_method === 'credit_card' ? (data.credit_card_id || null) : null,
      transfer_to_account_id: data.transfer_to_account_id || null,
      description: data.description || null,
      receipt_url: receiptUrl || null,
      date: data.date,
      is_recurring: data.is_recurring,
      recurrence_frequency: data.is_recurring ? data.recurrence_frequency : null,
      has_installments: data.has_installments,
      total_installments: data.has_installments ? parseInt(data.total_installments ?? '1') : null,
      current_installment: data.has_installments ? 1 : null,
    }

    const { data: tx, error } = await supabase
      .from('transactions')
      .insert(payload)
      .select()
      .single()

    if (error) {
      toast.error('Error al guardar el movimiento')
      console.warn(error)
      return
    }

    const validSplits = splits.filter(s => s.person_id)
    if (validSplits.length > 0 && tx) {
      for (const split of validSplits) {
        let splitARS = 0, splitUSD = 0
        if (split.mode === 'percent') {
          const pct = parseFloat(split.percent) / 100
          splitARS = converted.ars * pct
          splitUSD = converted.usd * pct
        } else {
          splitARS = parseFloat(split.fixed_ars) || 0
          splitUSD = rate > 0 ? splitARS / rate : 0
        }
        if (splitARS > 0) {
          await supabase.from('shared_expenses').insert({
            user_id: user.id,
            transaction_id: tx.id,
            person_id: split.person_id,
            description: data.description || `Gasto ${data.date}`,
            amount_ars: splitARS,
            amount_usd: splitUSD,
            status: 'pending',
          })
        }
      }
      toast.success(`Guardado · ${validSplits.length} cobro${validSplits.length > 1 ? 's' : ''} creado${validSplits.length > 1 ? 's' : ''} automáticamente`)
    } else {
      toast.success('Movimiento guardado')
    }

    router.push('/transactions')
    router.refresh()
  }

  const activeType = TYPE_TABS.find(t => t.value === watchType)!
  const currentRate = watchRateType === 'mep' ? mep : ccl
  const lbl = (text: string) => (
    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>{text}</label>
  )

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl transition-colors"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Nuevo movimiento</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* Tipo */}
        <div className="grid grid-cols-3 gap-2 p-1 rounded-xl" style={{ background: 'var(--surface-elevated)' }}>
          {TYPE_TABS.map(tab => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setValue('type', tab.value)}
              className="py-2 rounded-lg text-sm font-semibold transition-all"
              style={watchType === tab.value
                ? { background: 'var(--surface)', color: tab.activeColor, boxShadow: '0 1px 4px rgba(0,0,0,0.12)' }
                : { color: 'var(--text-muted)' }
              }
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Monto */}
        <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1">
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Monto</label>
              <input
                {...register('amount')}
                type="number" step="0.01" min="0" placeholder="0.00"
                className="w-full text-3xl font-bold outline-none bg-transparent"
                style={{ color: 'var(--text-primary)' }}
                inputMode="decimal"
              />
              {errors.amount && <p className="text-xs mt-1" style={{ color: 'var(--expense)' }}>{errors.amount.message}</p>}
            </div>
            <Controller control={control} name="currency" render={({ field }) => (
              <div className="flex rounded-xl overflow-hidden shrink-0" style={{ border: '1.5px solid var(--border)' }}>
                {(['ARS', 'USD'] as const).map(c => (
                  <button key={c} type="button" onClick={() => field.onChange(c)}
                    className="px-3 py-2 text-sm font-semibold transition-colors"
                    style={field.value === c
                      ? { background: 'var(--accent)', color: '#fff' }
                      : { color: 'var(--text-muted)' }
                    }>{c}</button>
                ))}
              </div>
            )} />
          </div>

          {convertedAmount && (
            <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {watchCurrency === 'ARS' ? `≈ ${formatUSD(convertedAmount.usd)}` : `≈ ${formatARS(convertedAmount.ars)}`}
              </span>
              <div className="flex items-center gap-1.5">
                <Controller control={control} name="exchange_rate_type" render={({ field }) => (
                  <div className="flex rounded-lg overflow-hidden text-xs" style={{ border: '1px solid var(--border)' }}>
                    {(['mep', 'ccl'] as const).map(r => (
                      <button key={r} type="button" onClick={() => field.onChange(r)}
                        className="px-2 py-1 font-medium uppercase transition-colors"
                        style={field.value === r
                          ? { background: 'var(--text-secondary)', color: 'var(--bg)' }
                          : { color: 'var(--text-faint)' }
                        }>{r}</button>
                    ))}
                  </div>
                )} />
                <span className="text-xs" style={{ color: 'var(--text-faint)' }}>
                  {currentRate ? formatARS(currentRate) : '...'}
                </span>
                <button type="button" onClick={refresh} className="p-1" style={{ color: 'var(--text-faint)' }}>
                  <RefreshCw size={11} className={rateLoading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Categoría */}
        {watchType !== 'transfer' && (
          <div className="grid grid-cols-2 gap-3">
            <div>{lbl('Categoría')}
              <select {...register('category_id')} className="input-base">
                <option value="">Seleccioná...</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>{lbl('Subcategoría')}
              <select {...register('subcategory_id')} className="input-base" disabled={!subcategories.length}>
                <option value="">Todas</option>
                {subcategories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* Pago */}
        {watchType !== 'transfer' ? (
          <div>
            {lbl('Pagado con')}
            <div className="flex rounded-xl overflow-hidden mb-2" style={{ border: '1.5px solid var(--border)' }}>
              {([['account', 'Cuenta'], ['credit_card', 'Tarjeta']] as const).map(([val, label]) => (
                <button key={val} type="button"
                  onClick={() => setValue('payment_method', val)}
                  className="flex-1 py-2 text-sm font-semibold transition-colors"
                  style={watchPaymentMethod === val
                    ? { background: 'var(--accent)', color: '#fff' }
                    : { color: 'var(--text-muted)' }
                  }>{label}</button>
              ))}
            </div>
            {watchPaymentMethod === 'account' ? (
              <select {...register('account_id')} className="input-base">
                <option value="">Seleccioná cuenta...</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            ) : (
              <div className="space-y-2">
                <select {...register('credit_card_id')} className="input-base">
                  <option value="">Seleccioná tarjeta...</option>
                  {cards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
                  <input type="checkbox" {...register('has_installments')} className="rounded" />
                  Compra en cuotas
                </label>
                {watchInstallments && (
                  <input {...register('total_installments')} type="number" min="2" max="60"
                    placeholder="Cantidad de cuotas" className="input-base" />
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div>{lbl('Desde')}
              <select {...register('account_id')} className="input-base">
                <option value="">Cuenta origen...</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>{lbl('Hacia')}
              <select {...register('transfer_to_account_id')} className="input-base">
                <option value="">Cuenta destino...</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* Fecha + descripción */}
        <div className="grid grid-cols-2 gap-3">
          <div>{lbl('Fecha')}<input {...register('date')} type="date" className="input-base" /></div>
          <div>{lbl('Descripción')}<input {...register('description')} type="text" placeholder="Opcional" className="input-base" /></div>
        </div>

        <ReceiptUpload value={receiptUrl} onChange={setReceiptUrl} disabled={isSubmitting} />

        {/* Recurrente */}
        {watchType !== 'transfer' && (
          <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" {...register('is_recurring')} className="w-4 h-4" style={{ accentColor: 'var(--accent)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Gasto / ingreso recurrente</span>
            </label>
            {watchRecurring && (
              <select {...register('recurrence_frequency')} className="input-base">
                <option value="monthly">Mensual</option>
                <option value="weekly">Semanal</option>
                <option value="yearly">Anual</option>
              </select>
            )}
          </div>
        )}

        {watchType === 'expense' && (
          <SplitExpenseSection
            amountARS={convertedAmount?.ars ?? 0}
            amountUSD={convertedAmount?.usd ?? 0}
            onChange={setSplits}
          />
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3.5 rounded-xl font-semibold text-white transition-opacity disabled:opacity-60"
          style={{ background: activeType.activeColor }}
        >
          {isSubmitting ? 'Guardando...' : `Guardar ${activeType.label}`}
        </button>

      </form>
    </div>
  )
}
