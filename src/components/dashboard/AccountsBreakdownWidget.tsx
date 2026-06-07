'use client'

import { useState, useEffect } from 'react'
import { Wallet, TrendingUp, Bitcoin, ChevronDown, ChevronRight, Coins } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatARS, formatUSD } from '@/lib/utils'
import type { Account } from '@/types/database'

interface AccountWithBalance extends Account {
  balance: number
}

const GROUPS = [
  {
    key: 'liquid',
    label: 'Bancos y Billeteras',
    types: ['bank', 'cash'],
    icon: Wallet,
    color: '#60a5fa',
    bg: 'rgba(96,165,250,0.1)',
  },
  {
    key: 'broker',
    label: 'Inversiones',
    types: ['broker'],
    icon: TrendingUp,
    color: '#10b981',
    bg: 'rgba(16,185,129,0.1)',
  },
  {
    key: 'crypto',
    label: 'Crypto',
    types: ['crypto'],
    icon: Bitcoin,
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.1)',
  },
  {
    key: 'savings',
    label: 'Ahorros',
    types: ['savings'],
    icon: Coins,
    color: '#8b5cf6',
    bg: 'rgba(139,92,246,0.1)',
  },
]

function fmtBalance(acc: AccountWithBalance) {
  const isUSD = acc.currency === 'USD' || acc.currency === 'USDT'
  return isUSD ? formatUSD(acc.balance) : formatARS(acc.balance)
}

export function AccountsBreakdownWidget() {
  const supabase = createClient()
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string[]>([])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: accs }, { data: txs }, { data: positions }] = await Promise.all([
        supabase.from('accounts').select('*').eq('is_active', true).order('sort_order').order('created_at'),
        supabase.from('transactions')
          .select('account_id, transfer_to_account_id, type, amount_ars, amount_usd')
          .eq('user_id', user.id),
        supabase.from('investment_positions')
          .select('account_id, quantity, avg_purchase_price, current_price_usd, asset_type, fixed_term_tna, fixed_term_start, fixed_term_end')
          .eq('user_id', user.id)
          .eq('is_active', true),
      ])

      if (!accs) { setLoading(false); return }

      // Intentar obtener MEP del localStorage (lo guarda el hook useExchangeRate)
      let mep = 1200
      try {
        const stored = localStorage.getItem('exchangeRates')
        if (stored) { const r = JSON.parse(stored); if (r.mep) mep = r.mep }
      } catch {}

      // Mapa: account_id → balance acumulado
      const balMap = new Map<string, number>()
      for (const a of accs) balMap.set(a.id, a.initial_balance ?? 0)

      // Sumar valor de posiciones de inversión por cuenta
      for (const pos of positions ?? []) {
        if (!pos.account_id) continue
        const acc = accs.find(a => a.id === pos.account_id)
        if (!acc) continue
        const isUSDAccount = acc.currency === 'USD' || acc.currency === 'USDT'

        let valueUSD = pos.quantity * (pos.current_price_usd ?? pos.avg_purchase_price)
        // Plazo fijo: valor en ARS
        if (pos.asset_type === 'fixed_term') {
          const days = pos.fixed_term_start && pos.fixed_term_end
            ? Math.max(0, Math.ceil((new Date(pos.fixed_term_end).getTime() - new Date(pos.fixed_term_start).getTime()) / 86400000))
            : 0
          const totalARS = pos.quantity * pos.avg_purchase_price * (1 + ((pos.fixed_term_tna ?? 0) / 100) * (days / 365))
          valueUSD = totalARS / mep
        }

        const addValue = isUSDAccount ? valueUSD : valueUSD * mep
        balMap.set(pos.account_id, (balMap.get(pos.account_id) ?? 0) + addValue)
      }

      for (const tx of txs ?? []) {
        const acc = accs.find(a => a.id === tx.account_id)
        const isUSD = acc?.currency === 'USD' || acc?.currency === 'USDT'
        const amount = isUSD ? (tx.amount_usd ?? 0) : (tx.amount_ars ?? 0)

        if (tx.account_id && balMap.has(tx.account_id)) {
          const cur = balMap.get(tx.account_id)!
          if (tx.type === 'income')   balMap.set(tx.account_id, cur + amount)
          if (tx.type === 'expense')  balMap.set(tx.account_id, cur - amount)
          if (tx.type === 'transfer') balMap.set(tx.account_id, cur - amount)
        }

        // Transferencia entrante
        if (tx.type === 'transfer' && tx.transfer_to_account_id && balMap.has(tx.transfer_to_account_id)) {
          const destAcc = accs.find(a => a.id === tx.transfer_to_account_id)
          const destUSD = destAcc?.currency === 'USD' || destAcc?.currency === 'USDT'
          const destAmount = destUSD ? (tx.amount_usd ?? 0) : (tx.amount_ars ?? 0)
          balMap.set(tx.transfer_to_account_id, (balMap.get(tx.transfer_to_account_id)!) + destAmount)
        }
      }

      setAccounts(accs.map(a => ({
        ...a,
        balance: Math.round((balMap.get(a.id) ?? a.initial_balance ?? 0) * 100) / 100,
      })))
      setLoading(false)
    }
    load()
  }, [])

  const toggle = (key: string) =>
    setExpanded(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])

  if (loading) return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="h-4 w-24 rounded animate-pulse" style={{ background: 'var(--surface-elevated)' }} />
      </div>
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-11 mx-4 my-2 rounded-lg animate-pulse" style={{ background: 'var(--surface-elevated)' }} />
      ))}
    </div>
  )

  if (accounts.length === 0) return null

  const visibleGroups = GROUPS.filter(g => accounts.some(a => g.types.includes(a.type)))

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Mis cuentas</p>
        <Link href="/settings/accounts" className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
          Gestionar
        </Link>
      </div>

      {visibleGroups.map((group, gi) => {
        const groupAccs = accounts.filter(a => group.types.includes(a.type))
        const isOpen = expanded.includes(group.key)
        const Icon = group.icon
        const isLast = gi === visibleGroups.length - 1

        // Total del grupo en ARS (solo para grupos homogéneos en moneda)
        const allSameCurrency = groupAccs.every(a => a.currency === groupAccs[0].currency)
        const groupTotal = allSameCurrency
          ? groupAccs.reduce((s, a) => s + a.balance, 0)
          : null
        const isUSD = groupAccs[0]?.currency === 'USD' || groupAccs[0]?.currency === 'USDT'

        return (
          <div key={group.key} style={{ borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)' }}>

            {/* Grupo header */}
            <button
              className="w-full flex items-center gap-3 px-4 py-3 transition-colors"
              onClick={() => toggle(group.key)}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: group.bg }}>
                <Icon size={13} style={{ color: group.color }} />
              </div>

              <span className="flex-1 text-left text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                {group.label}
              </span>

              {/* Total del grupo si aplica */}
              {groupTotal !== null && !isOpen && (
                <span className="text-xs font-semibold tabular-nums mr-1" style={{ color: 'var(--text-primary)' }}>
                  {isUSD ? formatUSD(groupTotal) : formatARS(groupTotal)}
                </span>
              )}

              {isOpen
                ? <ChevronDown size={14} style={{ color: 'var(--text-faint)' }} />
                : <ChevronRight size={14} style={{ color: 'var(--text-faint)' }} />
              }
            </button>

            {/* Cuentas del grupo */}
            {isOpen && (
              <div style={{ background: 'var(--surface-elevated)', borderTop: '1px solid var(--border-subtle)' }}>
                {groupAccs.map((acc, ai) => (
                  <div
                    key={acc.id}
                    className="flex items-center gap-3 px-5 py-2.5"
                    style={{ borderBottom: ai < groupAccs.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}
                  >
                    {/* Dot color de cuenta */}
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: acc.color }} />

                    <span className="flex-1 text-sm" style={{ color: 'var(--text-primary)' }}>
                      {acc.name}
                    </span>

                    <span className="text-xs mr-1.5" style={{ color: 'var(--text-faint)' }}>
                      {acc.currency}
                    </span>

                    <span
                      className="text-sm font-semibold tabular-nums"
                      style={{ color: acc.balance >= 0 ? 'var(--text-primary)' : 'var(--expense)' }}
                    >
                      {fmtBalance(acc)}
                    </span>
                  </div>
                ))}

                {/* Subtotal si hay más de una cuenta */}
                {groupAccs.length > 1 && groupTotal !== null && (
                  <div className="flex items-center justify-between px-5 py-2"
                    style={{ borderTop: '1px solid var(--border-subtle)' }}>
                    <span className="text-xs" style={{ color: 'var(--text-faint)' }}>Total</span>
                    <span className="text-sm font-bold tabular-nums" style={{ color: group.color }}>
                      {isUSD ? formatUSD(groupTotal) : formatARS(groupTotal)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
