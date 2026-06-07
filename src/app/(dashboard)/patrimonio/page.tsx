'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, Building2, Car, Briefcase, Package, Wallet,
  TrendingUp, Bitcoin, Landmark, CreditCard, ChevronRight,
  ChevronDown, Trash2, Info,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useExchangeRate } from '@/hooks/useExchangeRate'
import { formatARS, formatUSD } from '@/lib/utils'
import { PlanGate } from '@/components/shared/PlanGate'
import type { PatrimonioAssetType } from '@/types/database'

// ── Configuración de tipos de activos físicos ────────────────
const ASSET_TYPE_CONFIG: Record<PatrimonioAssetType, { label: string; icon: typeof Building2; color: string; bg: string }> = {
  property: { label: 'Inmueble',  icon: Building2, color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  vehicle:  { label: 'Vehículo',  icon: Car,       color: '#fb923c', bg: 'rgba(251,146,60,0.12)'  },
  business: { label: 'Negocio',   icon: Briefcase, color: 'var(--accent-icon)', bg: 'var(--accent-bg)' },
  other:    { label: 'Otro bien', icon: Package,   color: 'var(--text-muted)', bg: 'var(--surface-elevated)' },
}

interface PhysicalAsset { id: string; name: string; type: PatrimonioAssetType; description: string | null; value: number; currency: 'ARS' | 'USD'; is_active: boolean }
interface Loan { id: string; name: string; lender: string | null; monthly_payment: number; total_installments: number | null; paid_installments: number; currency: 'ARS' | 'USD' }
interface AccountRow { id: string; name: string; type: string; currency: string; initial_balance: number; color: string }
interface InvPosition { id: string; account_id: string; quantity: number; avg_purchase_price: number; current_price_usd: number | null; asset_type: string; fixed_term_tna: number | null; fixed_term_start: string | null; fixed_term_end: string | null }
interface CreditCardRow { id: string; name: string; color: string; closing_day: number; due_day: number }

export default function PatrimonioPage() {
  return <PlanGate feature="patrimonio" featureLabel="Patrimonio"><PatrimonioContent /></PlanGate>
}

function PatrimonioContent() {
  const router = useRouter()
  const supabase = createClient()
  const { mep } = useExchangeRate()

  const [physicalAssets, setPhysicalAssets] = useState<PhysicalAsset[]>([])
  const [loans, setLoans] = useState<Loan[]>([])
  const [accounts, setAccounts] = useState<AccountRow[]>([])
  const [positions, setPositions] = useState<InvPosition[]>([])
  const [cardDebt, setCardDebt] = useState(0)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Secciones colapsables
  const [open, setOpen] = useState<Record<string, boolean>>({
    cuentas: true, inversiones: true, bienes: true,
    prestamos: true, tarjetas: true,
  })
  const toggle = (k: string) => setOpen(o => ({ ...o, [k]: !o[k] }))

  useEffect(() => { load() }, [mep])

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [
      { data: assets },
      { data: loansData },
      { data: accs },
      { data: txs },
      { data: invPos },
      { data: cards },
      { data: cardTxs },
    ] = await Promise.all([
      supabase.from('assets').select('*').eq('is_active', true).order('created_at', { ascending: false }),
      supabase.from('loans').select('*').eq('is_active', true),
      supabase.from('accounts').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('transactions').select('account_id, transfer_to_account_id, type, amount_ars, amount_usd').eq('user_id', user.id),
      supabase.from('investment_positions').select('*').eq('user_id', user.id).eq('is_active', true),
      supabase.from('credit_cards').select('*').eq('is_active', true),
      supabase.from('transactions').select('amount_ars').eq('user_id', user.id).eq('type', 'expense').not('credit_card_id', 'is', null)
        .gte('date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]),
    ])

    setPhysicalAssets((assets ?? []) as PhysicalAsset[])
    setLoans((loansData ?? []) as Loan[])
    setAccounts((accs ?? []) as AccountRow[])
    setPositions((invPos ?? []) as InvPosition[])
    setCardDebt((cardTxs ?? []).reduce((s: number, t: any) => s + t.amount_ars, 0))

    // Calcular saldos de cuentas
    const balMap = new Map<string, number>()
    for (const a of (accs ?? [])) balMap.set(a.id, a.initial_balance ?? 0)
    for (const tx of (txs ?? [])) {
      const acc = (accs ?? []).find((a: AccountRow) => a.id === tx.account_id)
      const isUSD = acc?.currency === 'USD' || acc?.currency === 'USDT'
      const amt = isUSD ? (tx.amount_usd ?? 0) : (tx.amount_ars ?? 0)
      if (tx.account_id && balMap.has(tx.account_id)) {
        const cur = balMap.get(tx.account_id)!
        if (tx.type === 'income') balMap.set(tx.account_id, cur + amt)
        if (tx.type === 'expense') balMap.set(tx.account_id, cur - amt)
        if (tx.type === 'transfer') balMap.set(tx.account_id, cur - amt)
      }
      if (tx.type === 'transfer' && tx.transfer_to_account_id && balMap.has(tx.transfer_to_account_id)) {
        const destAcc = (accs ?? []).find((a: AccountRow) => a.id === tx.transfer_to_account_id)
        const destUSD = destAcc?.currency === 'USD' || destAcc?.currency === 'USDT'
        const destAmt = destUSD ? (tx.amount_usd ?? 0) : (tx.amount_ars ?? 0)
        balMap.set(tx.transfer_to_account_id, (balMap.get(tx.transfer_to_account_id)!) + destAmt)
      }
    }
    // Agregar valor de inversiones a cuentas broker/crypto
    const mepRate = mep ?? 1200
    for (const pos of (invPos ?? []) as InvPosition[]) {
      if (!pos.account_id) continue
      const acc = (accs ?? []).find((a: AccountRow) => a.id === pos.account_id)
      if (!acc) continue
      const isUSDAccount = acc.currency === 'USD' || acc.currency === 'USDT'
      let valueUSD = pos.quantity * (pos.current_price_usd ?? pos.avg_purchase_price)
      if (pos.asset_type === 'fixed_term') {
        const days = pos.fixed_term_start && pos.fixed_term_end
          ? Math.max(0, Math.ceil((new Date(pos.fixed_term_end).getTime() - new Date(pos.fixed_term_start).getTime()) / 86400000)) : 0
        const totalARS = pos.quantity * pos.avg_purchase_price * (1 + ((pos.fixed_term_tna ?? 0) / 100) * (days / 365))
        valueUSD = totalARS / mepRate
      }
      balMap.set(pos.account_id, (balMap.get(pos.account_id) ?? 0) + (isUSDAccount ? valueUSD : valueUSD * mepRate))
    }

    // Guardar balances en accounts state para usarlos en render
    setAccounts(((accs ?? []) as AccountRow[]).map(a => ({ ...a, _balance: Math.round((balMap.get(a.id) ?? a.initial_balance ?? 0) * 100) / 100 } as any)))

    setLoading(false)
  }

  async function handleDeleteAsset(id: string) {
    if (!confirm('¿Eliminar este bien?')) return
    setDeleting(id)
    await supabase.from('assets').update({ is_active: false }).eq('id', id)
    await load()
    setDeleting(null)
  }

  // ── Cálculos ─────────────────────────────────────────────────
  const mepRate = mep ?? 1200

  function toUSD(value: number, currency: 'ARS' | 'USD'): number {
    return currency === 'USD' ? value : value / mepRate
  }

  // Cuentas bancarias/efectivo (sin inversiones)
  const liquidAccounts = (accounts as any[]).filter(a => ['bank', 'cash'].includes(a.type))
  const liquidUSD = liquidAccounts.reduce((s: number, a: any) => {
    const b = a._balance ?? a.initial_balance ?? 0
    return s + (a.currency === 'USD' || a.currency === 'USDT' ? b : b / mepRate)
  }, 0)

  // Inversiones
  const invUSD = positions.reduce((s, p) => {
    let v = p.quantity * (p.current_price_usd ?? p.avg_purchase_price)
    if (p.asset_type === 'fixed_term') {
      const days = p.fixed_term_start && p.fixed_term_end
        ? Math.max(0, Math.ceil((new Date(p.fixed_term_end).getTime() - new Date(p.fixed_term_start).getTime()) / 86400000)) : 0
      v = p.quantity * p.avg_purchase_price * (1 + ((p.fixed_term_tna ?? 0) / 100) * (days / 365)) / mepRate
    }
    return s + v
  }, 0)

  // Bienes físicos
  const physicalUSD = physicalAssets.reduce((s, a) => s + toUSD(a.value, a.currency), 0)

  // Total activos
  const totalAssetsUSD = liquidUSD + invUSD + physicalUSD

  // Pasivos
  const loansDebtUSD = loans.reduce((s, l) => {
    const rem = l.total_installments !== null
      ? Math.max(0, l.total_installments - l.paid_installments) * l.monthly_payment
      : l.monthly_payment * 12
    return s + toUSD(rem, l.currency)
  }, 0)
  const cardDebtUSD = cardDebt / mepRate
  const totalLiabilitiesUSD = loansDebtUSD + cardDebtUSD

  // Patrimonio neto
  const netWorthUSD = totalAssetsUSD - totalLiabilitiesUSD
  const netWorthARS = netWorthUSD * mepRate
  const freePct = totalAssetsUSD > 0 ? Math.max(0, Math.min(100, (netWorthUSD / totalAssetsUSD) * 100)) : 0

  if (loading) return (
    <div className="max-w-2xl mx-auto space-y-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'var(--surface)' }} />
      ))}
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto space-y-4">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Mi patrimonio</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Todo lo que tenés y todo lo que debés
          </p>
        </div>
        <button onClick={() => router.push('/patrimonio/new')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white shrink-0"
          style={{ background: 'var(--accent)' }}>
          <Plus size={15} /> Agregar bien
        </button>
      </div>

      {/* Card principal — Patrimonio Neto */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="p-5">
          <p className="text-xs font-bold tracking-widest mb-1" style={{ color: 'var(--text-faint)' }}>
            LO QUE REALMENTE ES TUYO
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-4xl font-black" style={{ color: netWorthUSD >= 0 ? 'var(--text-primary)' : 'var(--expense)' }}>
              {formatUSD(netWorthUSD)}
            </p>
            <div className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg"
              style={{ background: 'var(--surface-elevated)', color: 'var(--text-faint)' }}>
              <Info size={11} />
              <span>Activos − Deudas</span>
            </div>
          </div>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {formatARS(netWorthARS)}
            {mep && <span style={{ color: 'var(--text-faint)' }}> · MEP {formatARS(mep)}</span>}
          </p>
        </div>

        {/* Barra libre de deuda */}
        <div className="px-5 pb-4">
          <div className="flex justify-between text-xs mb-1.5">
            <span style={{ color: 'var(--income)' }}>Tuyo {freePct.toFixed(0)}%</span>
            <span style={{ color: 'var(--expense)' }}>Comprometido {(100 - freePct).toFixed(0)}%</span>
          </div>
          <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--expense-bg)' }}>
            <div className="h-full rounded-full transition-all"
              style={{ width: `${freePct}%`, background: freePct > 60 ? 'var(--income)' : freePct > 30 ? '#fbbf24' : 'var(--expense)' }} />
          </div>
        </div>

        {/* Resumen activos vs pasivos */}
        <div className="flex" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <div className="flex-1 px-5 py-3">
            <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--income)' }}>Lo que tenés</p>
            <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{formatUSD(totalAssetsUSD)}</p>
            <p className="text-xs" style={{ color: 'var(--text-faint)' }}>{formatARS(totalAssetsUSD * mepRate)}</p>
          </div>
          <div className="w-px" style={{ background: 'var(--border-subtle)' }} />
          <div className="flex-1 px-5 py-3">
            <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--expense)' }}>Lo que debés</p>
            <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{formatUSD(totalLiabilitiesUSD)}</p>
            <p className="text-xs" style={{ color: 'var(--text-faint)' }}>{formatARS(totalLiabilitiesUSD * mepRate)}</p>
          </div>
        </div>
      </div>

      {/* ── ACTIVOS ──────────────────────────────────────────── */}
      <SectionHeader
        label="Lo que tenés"
        total={formatUSD(totalAssetsUSD)}
        color="var(--income)"
        emoji="💰"
      />

      {/* Dinero y cuentas */}
      <Accordion
        id="cuentas" open={open.cuentas} onToggle={() => toggle('cuentas')}
        icon={Wallet} color="#60a5fa"
        label="Dinero en cuentas"
        subtitle="Saldo actual de tus bancos y billeteras"
        total={formatUSD(liquidUSD)}
        totalARS={formatARS(liquidUSD * mepRate)}
      >
        {liquidAccounts.length === 0 ? (
          <EmptyRow text="No tenés cuentas configuradas" link="/settings/accounts" linkText="Agregar cuenta" />
        ) : liquidAccounts.map((a: any) => {
          const bal = a._balance ?? a.initial_balance ?? 0
          const isUSD = a.currency === 'USD' || a.currency === 'USDT'
          const usd = isUSD ? bal : bal / mepRate
          return (
            <AssetRow key={a.id} color={a.color}
              name={a.name} subtitle={a.currency}
              valueUSD={formatUSD(usd)}
              valueARS={formatARS(usd * mepRate)} />
          )
        })}
      </Accordion>

      {/* Inversiones */}
      <Accordion
        id="inversiones" open={open.inversiones} onToggle={() => toggle('inversiones')}
        icon={TrendingUp} color="#10b981"
        label="Inversiones"
        subtitle="Acciones, crypto, plazos fijos y más"
        total={formatUSD(invUSD)}
        totalARS={formatARS(invUSD * mepRate)}
        linkTo="/investments"
      >
        {positions.length === 0 ? (
          <EmptyRow text="No tenés inversiones registradas" link="/investments/new" linkText="Agregar inversión" />
        ) : (
          <AssetRow
            icon={TrendingUp} color="#10b981"
            name={`${positions.length} posición${positions.length !== 1 ? 'es' : ''} activa${positions.length !== 1 ? 's' : ''}`}
            subtitle="Ver detalle en Inversiones"
            valueUSD={formatUSD(invUSD)}
            valueARS={formatARS(invUSD * mepRate)}
            onClick={() => router.push('/investments')}
          />
        )}
      </Accordion>

      {/* Bienes físicos */}
      <Accordion
        id="bienes" open={open.bienes} onToggle={() => toggle('bienes')}
        icon={Building2} color="#f59e0b"
        label="Bienes físicos"
        subtitle="Inmuebles, vehículos y otros"
        total={formatUSD(physicalUSD)}
        totalARS={formatARS(physicalUSD * mepRate)}
        action={{ label: '+ Agregar bien', onClick: () => router.push('/patrimonio/new') }}
      >
        {physicalAssets.length === 0 ? (
          <EmptyRow text="No tenés bienes físicos cargados" link="/patrimonio/new" linkText="Agregar inmueble, vehículo u otro bien" />
        ) : physicalAssets.map(asset => {
          const cfg = ASSET_TYPE_CONFIG[asset.type]
          const usd = toUSD(asset.value, asset.currency)
          return (
            <AssetRow key={asset.id}
              icon={cfg.icon} color={cfg.color}
              name={asset.name}
              subtitle={`${cfg.label}${asset.description ? ` · ${asset.description}` : ''}`}
              valueUSD={formatUSD(usd)}
              valueARS={formatARS(usd * mepRate)}
              onDelete={deleting === asset.id ? undefined : () => handleDeleteAsset(asset.id)}
            />
          )
        })}
      </Accordion>

      {/* ── PASIVOS ──────────────────────────────────────────── */}
      {totalLiabilitiesUSD > 0 && (
        <>
          <SectionHeader
            label="Lo que debés"
            total={formatUSD(totalLiabilitiesUSD)}
            color="var(--expense)"
            emoji="📋"
          />

          {/* Préstamos */}
          {loans.length > 0 && (
            <Accordion
              id="prestamos" open={open.prestamos} onToggle={() => toggle('prestamos')}
              icon={Landmark} color="#f87171"
              label="Préstamos"
              subtitle="Deuda restante de todos tus préstamos"
              total={formatUSD(loansDebtUSD)}
              totalARS={formatARS(loansDebtUSD * mepRate)}
              linkTo="/loans"
            >
              {loans.map(loan => {
                const rem = loan.total_installments !== null
                  ? Math.max(0, loan.total_installments - loan.paid_installments) * loan.monthly_payment
                  : loan.monthly_payment * 12
                const remUSD = toUSD(rem, loan.currency)
                const cuotas = loan.total_installments !== null
                  ? `${Math.max(0, loan.total_installments - loan.paid_installments)} cuotas restantes`
                  : 'Sin plazo definido'
                return (
                  <AssetRow key={loan.id}
                    icon={Landmark} color="#f87171"
                    name={loan.name}
                    subtitle={`${loan.lender ? loan.lender + ' · ' : ''}${cuotas}`}
                    valueUSD={formatUSD(remUSD)}
                    valueARS={formatARS(remUSD * mepRate)}
                    negative />
                )
              })}
            </Accordion>
          )}

          {/* Tarjetas */}
          {cardDebt > 0 && (
            <Accordion
              id="tarjetas" open={open.tarjetas} onToggle={() => toggle('tarjetas')}
              icon={CreditCard} color="#f87171"
              label="Tarjetas de crédito"
              subtitle="Gastos del mes actual sin pagar"
              total={formatUSD(cardDebtUSD)}
              totalARS={formatARS(cardDebt)}
              linkTo="/credit-cards"
            >
              <AssetRow
                icon={CreditCard} color="#f87171"
                name="Resumen del mes"
                subtitle="Total de consumos del período actual"
                valueUSD={formatUSD(cardDebtUSD)}
                valueARS={formatARS(cardDebt)}
                negative />
            </Accordion>
          )}
        </>
      )}

      {/* Estado vacío global */}
      {physicalAssets.length === 0 && positions.length === 0 && liquidAccounts.length === 0 && (
        <div className="rounded-2xl flex flex-col items-center justify-center py-16 text-center"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'var(--accent-bg)' }}>
            <Building2 size={24} style={{ color: 'var(--accent-icon)' }} />
          </div>
          <p className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Tu patrimonio está vacío</p>
          <p className="text-sm mb-5 max-w-xs" style={{ color: 'var(--text-muted)' }}>
            Agregá tu casa, auto, negocio, inversiones o cuentas bancarias para ver tu patrimonio neto.
          </p>
          <button onClick={() => router.push('/patrimonio/new')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'var(--accent)' }}>
            <Plus size={14} /> Agregar primer bien
          </button>
        </div>
      )}
    </div>
  )
}

// ── Sub-componentes ──────────────────────────────────────────

function SectionHeader({ label, total, color, emoji }: { label: string; total: string; color: string; emoji: string }) {
  return (
    <div className="flex items-center justify-between px-1">
      <div className="flex items-center gap-2">
        <span className="text-base">{emoji}</span>
        <span className="text-sm font-bold uppercase tracking-wide" style={{ color }}>{label}</span>
      </div>
      <span className="text-sm font-bold" style={{ color }}>{total}</span>
    </div>
  )
}

function Accordion({
  id, open, onToggle, icon: Icon, color, label, subtitle, total, totalARS,
  children, linkTo, action,
}: {
  id: string; open: boolean; onToggle: () => void
  icon: typeof Wallet; color: string
  label: string; subtitle: string; total: string; totalARS: string
  children: React.ReactNode
  linkTo?: string; action?: { label: string; onClick: () => void }
}) {
  const router = useRouter()
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <button onClick={onToggle} className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors"
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-hover)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: color + '18' }}>
          <Icon size={17} style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{label}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>
        </div>
        <div className="text-right shrink-0 mr-1">
          <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{total}</p>
          <p className="text-xs" style={{ color: 'var(--text-faint)' }}>{totalARS}</p>
        </div>
        {open
          ? <ChevronDown size={14} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
          : <ChevronRight size={14} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
        }
      </button>

      {open && (
        <div style={{ borderTop: '1px solid var(--border-subtle)' }}>
          {children}
          {(linkTo || action) && (
            <div className="px-4 py-2 flex gap-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              {linkTo && (
                <button onClick={() => router.push(linkTo)}
                  className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
                  Ver detalle →
                </button>
              )}
              {action && (
                <button onClick={action.onClick}
                  className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
                  {action.label}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function AssetRow({
  icon: Icon, color, name, subtitle, valueUSD, valueARS,
  negative, onDelete, onClick,
}: {
  icon?: typeof Wallet; color?: string
  name: string; subtitle?: string
  valueUSD: string; valueARS: string
  negative?: boolean; onDelete?: () => void; onClick?: () => void
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 transition-colors cursor-default"
      style={{ borderBottom: '1px solid var(--border-subtle)' }}
      onClick={onClick}
      onMouseEnter={e => onClick && (e.currentTarget.style.background = 'var(--surface-hover)')}
      onMouseLeave={e => onClick && (e.currentTarget.style.background = 'transparent')}>
      {color && (
        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{name}</p>
        {subtitle && <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>}
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-semibold tabular-nums"
          style={{ color: negative ? 'var(--expense)' : 'var(--text-primary)' }}>
          {negative ? '−' : ''}{valueUSD}
        </p>
        <p className="text-xs tabular-nums" style={{ color: 'var(--text-faint)' }}>{valueARS}</p>
      </div>
      {onDelete && (
        <button onClick={e => { e.stopPropagation(); onDelete() }}
          className="p-1.5 rounded-lg hover:text-red-400 transition-colors ml-1 shrink-0"
          style={{ color: 'var(--text-faint)' }}>
          <Trash2 size={13} />
        </button>
      )}
    </div>
  )
}

function EmptyRow({ text, link, linkText }: { text: string; link: string; linkText: string }) {
  const router = useRouter()
  return (
    <div className="px-4 py-4 flex items-center justify-between">
      <p className="text-xs" style={{ color: 'var(--text-faint)' }}>{text}</p>
      <button onClick={() => router.push(link)}
        className="text-xs font-medium ml-3 shrink-0" style={{ color: 'var(--accent)' }}>
        {linkText}
      </button>
    </div>
  )
}
