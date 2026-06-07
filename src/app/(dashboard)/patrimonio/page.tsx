'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, Building2, Car, Briefcase, Package, Wallet,
  TrendingUp, Landmark, CreditCard, ChevronRight, ChevronDown, Trash2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useExchangeRate } from '@/hooks/useExchangeRate'
import { formatARS, formatUSD } from '@/lib/utils'
import { PlanGate } from '@/components/shared/PlanGate'
import type { PatrimonioAssetType } from '@/types/database'

const ASSET_TYPE_CONFIG: Record<PatrimonioAssetType, { label: string; icon: typeof Building2; color: string }> = {
  property: { label: 'Inmueble',  icon: Building2, color: '#60a5fa' },
  vehicle:  { label: 'Vehículo',  icon: Car,       color: '#fb923c' },
  business: { label: 'Negocio',   icon: Briefcase, color: '#a78bfa' },
  other:    { label: 'Otro bien', icon: Package,   color: '#94a3b8' },
}

interface PhysicalAsset { id: string; name: string; type: PatrimonioAssetType; description: string | null; value: number; currency: 'ARS' | 'USD' }
interface Loan { id: string; name: string; lender: string | null; monthly_payment: number; total_installments: number | null; paid_installments: number; currency: 'ARS' | 'USD' }

export default function PatrimonioPage() {
  return <PlanGate feature="patrimonio" featureLabel="Patrimonio"><PatrimonioContent /></PlanGate>
}

function PatrimonioContent() {
  const router = useRouter()
  const supabase = createClient()
  const { mep } = useExchangeRate()

  const [physicalAssets, setPhysicalAssets] = useState<PhysicalAsset[]>([])
  const [loans, setLoans] = useState<Loan[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [positions, setPositions] = useState<any[]>([])
  const [cardDebt, setCardDebt] = useState(0)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [open, setOpen] = useState<Record<string, boolean>>({
    cuentas: false, inversiones: false, bienes: false, prestamos: false, tarjetas: false,
  })
  const toggle = (k: string) => setOpen(o => ({ ...o, [k]: !o[k] }))

  useEffect(() => { load() }, [mep])

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [
      { data: assets }, { data: loansData }, { data: accs }, { data: txs },
      { data: invPos }, { data: cardTxs },
    ] = await Promise.all([
      supabase.from('assets').select('*').eq('is_active', true).order('created_at', { ascending: false }),
      supabase.from('loans').select('*').eq('is_active', true),
      supabase.from('accounts').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('transactions').select('account_id, transfer_to_account_id, type, amount_ars, amount_usd').eq('user_id', user.id),
      supabase.from('investment_positions').select('*').eq('user_id', user.id).eq('is_active', true),
      supabase.from('transactions').select('amount_ars').eq('user_id', user.id).eq('type', 'expense')
        .not('credit_card_id', 'is', null)
        .gte('date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]),
    ])

    setPhysicalAssets((assets ?? []) as PhysicalAsset[])
    setLoans((loansData ?? []) as Loan[])
    setCardDebt((cardTxs ?? []).reduce((s: number, t: any) => s + t.amount_ars, 0))

    const mepRate = mep ?? 1200
    const balMap = new Map<string, number>()
    for (const a of (accs ?? [])) balMap.set(a.id, a.initial_balance ?? 0)

    for (const tx of (txs ?? [])) {
      const acc = (accs ?? []).find((a: any) => a.id === tx.account_id)
      const isUSD = acc?.currency === 'USD' || acc?.currency === 'USDT'
      const amt = isUSD ? (tx.amount_usd ?? 0) : (tx.amount_ars ?? 0)
      if (tx.account_id && balMap.has(tx.account_id)) {
        const cur = balMap.get(tx.account_id)!
        if (tx.type === 'income') balMap.set(tx.account_id, cur + amt)
        if (tx.type === 'expense') balMap.set(tx.account_id, cur - amt)
        if (tx.type === 'transfer') balMap.set(tx.account_id, cur - amt)
      }
      if (tx.type === 'transfer' && tx.transfer_to_account_id && balMap.has(tx.transfer_to_account_id)) {
        const destAcc = (accs ?? []).find((a: any) => a.id === tx.transfer_to_account_id)
        const destUSD = destAcc?.currency === 'USD' || destAcc?.currency === 'USDT'
        const destAmt = destUSD ? (tx.amount_usd ?? 0) : (tx.amount_ars ?? 0)
        balMap.set(tx.transfer_to_account_id, (balMap.get(tx.transfer_to_account_id)!) + destAmt)
      }
    }
    for (const pos of (invPos ?? [])) {
      if (!pos.account_id) continue
      const acc = (accs ?? []).find((a: any) => a.id === pos.account_id)
      if (!acc) continue
      const isUSDAccount = acc.currency === 'USD' || acc.currency === 'USDT'
      let valueUSD = pos.quantity * (pos.current_price_usd ?? pos.avg_purchase_price)
      if (pos.asset_type === 'fixed_term') {
        const days = pos.fixed_term_start && pos.fixed_term_end
          ? Math.max(0, Math.ceil((new Date(pos.fixed_term_end).getTime() - new Date(pos.fixed_term_start).getTime()) / 86400000)) : 0
        valueUSD = pos.quantity * pos.avg_purchase_price * (1 + ((pos.fixed_term_tna ?? 0) / 100) * (days / 365)) / mepRate
      }
      balMap.set(pos.account_id, (balMap.get(pos.account_id) ?? 0) + (isUSDAccount ? valueUSD : valueUSD * mepRate))
    }

    setAccounts(((accs ?? []) as any[]).map(a => ({ ...a, _balance: Math.round((balMap.get(a.id) ?? a.initial_balance ?? 0) * 100) / 100 })))
    setPositions((invPos ?? []) as any[])
    setLoading(false)
  }

  async function handleDeleteAsset(id: string) {
    if (!confirm('¿Eliminar este bien?')) return
    setDeleting(id)
    await supabase.from('assets').update({ is_active: false }).eq('id', id)
    await load()
    setDeleting(null)
  }

  const mepRate = mep ?? 1200
  const toUSD = (v: number, c: 'ARS' | 'USD') => c === 'USD' ? v : v / mepRate

  const liquidAccounts = accounts.filter(a => ['bank', 'cash'].includes(a.type))
  const liquidUSD = liquidAccounts.reduce((s, a) => {
    const b = a._balance ?? 0
    return s + (a.currency === 'USD' || a.currency === 'USDT' ? b : b / mepRate)
  }, 0)

  const invUSD = positions.reduce((s: number, p: any) => {
    let v = p.quantity * (p.current_price_usd ?? p.avg_purchase_price)
    if (p.asset_type === 'fixed_term') {
      const days = p.fixed_term_start && p.fixed_term_end
        ? Math.max(0, Math.ceil((new Date(p.fixed_term_end).getTime() - new Date(p.fixed_term_start).getTime()) / 86400000)) : 0
      v = p.quantity * p.avg_purchase_price * (1 + ((p.fixed_term_tna ?? 0) / 100) * (days / 365)) / mepRate
    }
    return s + v
  }, 0)

  const physicalUSD = physicalAssets.reduce((s, a) => s + toUSD(a.value, a.currency), 0)
  const totalAssetsUSD = liquidUSD + invUSD + physicalUSD

  const loansDebtUSD = loans.reduce((s, l) => {
    const rem = l.total_installments !== null
      ? Math.max(0, l.total_installments - l.paid_installments) * l.monthly_payment
      : l.monthly_payment * 12
    return s + toUSD(rem, l.currency)
  }, 0)
  const cardDebtUSD = cardDebt / mepRate
  const totalLiabilitiesUSD = loansDebtUSD + cardDebtUSD
  const netWorthUSD = totalAssetsUSD - totalLiabilitiesUSD
  const netWorthARS = netWorthUSD * mepRate
  const freePct = totalAssetsUSD > 0 ? Math.max(0, Math.min(100, (netWorthUSD / totalAssetsUSD) * 100)) : 100
  const barColor = freePct > 70 ? 'var(--income)' : freePct > 40 ? '#fbbf24' : 'var(--expense)'

  if (loading) return (
    <div className="max-w-2xl mx-auto space-y-3">
      {[...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'var(--surface)' }} />)}
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto space-y-4">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Mi patrimonio</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>Todo lo que tenés menos lo que debés</p>
        </div>
        <button onClick={() => router.push('/patrimonio/new')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white shrink-0"
          style={{ background: 'var(--accent)' }}>
          <Plus size={15} /> Agregar bien
        </button>
      </div>

      {/* Card patrimonio neto */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="p-5 pb-3">
          <p className="text-xs font-bold tracking-widest mb-2" style={{ color: 'var(--text-faint)' }}>PATRIMONIO NETO</p>
          <p className="text-4xl font-black" style={{ color: netWorthUSD >= 0 ? 'var(--text-primary)' : 'var(--expense)' }}>
            {formatUSD(netWorthUSD)}
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {formatARS(netWorthARS)}
            {mep && <span style={{ color: 'var(--text-faint)' }}> · MEP {formatARS(mep)}</span>}
          </p>
          <p className="text-xs mt-2" style={{ color: 'var(--text-faint)' }}>
            Si hoy vendieras todo y pagaras tus deudas, te quedarían {formatUSD(netWorthUSD)}.
          </p>
        </div>

        {/* Barra progreso */}
        <div className="px-5 pb-3">
          <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-faint)' }}>
            <span style={{ color: barColor }}>Libre {Math.round(freePct)}%</span>
            {totalLiabilitiesUSD > 0 && <span style={{ color: 'var(--expense)' }}>Comprometido {Math.round(100 - freePct)}%</span>}
          </div>
          <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-elevated)' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${freePct}%`, background: barColor }} />
          </div>
        </div>

        {/* Bienes vs Deudas */}
        <div className="flex" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <div className="flex-1 px-5 py-3">
            <div className="flex items-center gap-1.5 mb-0.5">
              <div className="w-2 h-2 rounded-full" style={{ background: 'var(--income)' }} />
              <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Tus bienes</p>
            </div>
            <p className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{formatUSD(totalAssetsUSD)}</p>
            <p className="text-xs" style={{ color: 'var(--text-faint)' }}>{formatARS(totalAssetsUSD * mepRate)}</p>
          </div>
          <div className="w-px" style={{ background: 'var(--border-subtle)' }} />
          <div className="flex-1 px-5 py-3">
            <div className="flex items-center gap-1.5 mb-0.5">
              <div className="w-2 h-2 rounded-full" style={{ background: totalLiabilitiesUSD > 0 ? 'var(--expense)' : 'var(--income)' }} />
              <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Tus deudas</p>
            </div>
            {totalLiabilitiesUSD > 0 ? (
              <>
                <p className="text-base font-bold" style={{ color: 'var(--expense)' }}>{formatUSD(totalLiabilitiesUSD)}</p>
                <p className="text-xs" style={{ color: 'var(--text-faint)' }}>{formatARS(totalLiabilitiesUSD * mepRate)}</p>
              </>
            ) : (
              <p className="text-sm font-semibold" style={{ color: 'var(--income)' }}>Sin deudas 🎉</p>
            )}
          </div>
        </div>
      </div>

      {/* ── BIENES ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: 'var(--income)' }} />
          <span className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--income)' }}>Tus bienes</span>
        </div>
        <span className="text-xs font-bold" style={{ color: 'var(--income)' }}>{formatUSD(totalAssetsUSD)}</span>
      </div>

      {/* Dinero en cuentas */}
      <AccordionSection
        id="cuentas" open={open.cuentas} onToggle={() => toggle('cuentas')}
        icon={Wallet} color="#60a5fa"
        label="Dinero en cuentas"
        hint="Bancos, billeteras y efectivo"
        total={formatUSD(liquidUSD)} totalSub={formatARS(liquidUSD * mepRate)}
      >
        {liquidAccounts.length === 0
          ? <EmptyHint text="No tenés cuentas" link="/settings/accounts" linkText="Agregar cuenta" />
          : liquidAccounts.map((a: any) => {
              const b = a._balance ?? 0
              const isUSD = a.currency === 'USD' || a.currency === 'USDT'
              const usd = isUSD ? b : b / mepRate
              return <Row key={a.id} dot={a.color} name={a.name} sub={a.currency}
                val={formatUSD(usd)} valSub={formatARS(usd * mepRate)} />
            })}
      </AccordionSection>

      {/* Inversiones */}
      <AccordionSection
        id="inversiones" open={open.inversiones} onToggle={() => toggle('inversiones')}
        icon={TrendingUp} color="#10b981"
        label="Inversiones"
        hint="Acciones, crypto, plazos fijos"
        total={formatUSD(invUSD)} totalSub={formatARS(invUSD * mepRate)}
        link={{ label: 'Ver inversiones', to: '/investments' }}
      >
        {positions.length === 0
          ? <EmptyHint text="Sin inversiones" link="/investments/new" linkText="Agregar posición" />
          : <Row icon={TrendingUp} color="#10b981"
              name={`${positions.length} posición${positions.length !== 1 ? 'es' : ''} activa${positions.length !== 1 ? 's' : ''}`}
              sub="Ver detalle completo →"
              val={formatUSD(invUSD)} valSub={formatARS(invUSD * mepRate)}
              onClick={() => router.push('/investments')} />
        }
      </AccordionSection>

      {/* Bienes físicos */}
      <AccordionSection
        id="bienes" open={open.bienes} onToggle={() => toggle('bienes')}
        icon={Building2} color="#f59e0b"
        label="Propiedades y otros bienes"
        hint="Inmuebles, vehículos, negocios"
        total={formatUSD(physicalUSD)} totalSub={formatARS(physicalUSD * mepRate)}
        action={{ label: '+ Agregar', onClick: () => router.push('/patrimonio/new') }}
      >
        {physicalAssets.length === 0
          ? <EmptyHint text="No cargaste bienes físicos" link="/patrimonio/new" linkText="Agregar inmueble, auto u otro bien" />
          : physicalAssets.map(asset => {
              const cfg = ASSET_TYPE_CONFIG[asset.type]
              const usd = toUSD(asset.value, asset.currency)
              return (
                <Row key={asset.id} icon={cfg.icon} color={cfg.color}
                  name={asset.name} sub={`${cfg.label}${asset.description ? ` · ${asset.description}` : ''}`}
                  val={formatUSD(usd)} valSub={formatARS(usd * mepRate)}
                  onDelete={deleting === asset.id ? undefined : () => handleDeleteAsset(asset.id)} />
              )
            })}
      </AccordionSection>

      {/* ── DEUDAS ────────────────────────────────────────────── */}
      {totalLiabilitiesUSD > 0 && (
        <>
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: 'var(--expense)' }} />
              <span className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--expense)' }}>Tus deudas</span>
            </div>
            <span className="text-xs font-bold" style={{ color: 'var(--expense)' }}>{formatUSD(totalLiabilitiesUSD)}</span>
          </div>

          {loans.length > 0 && (
            <AccordionSection
              id="prestamos" open={open.prestamos} onToggle={() => toggle('prestamos')}
              icon={Landmark} color="#f87171"
              label="Préstamos"
              hint="Deuda restante de todos tus créditos"
              total={formatUSD(loansDebtUSD)} totalSub={formatARS(loansDebtUSD * mepRate)}
              link={{ label: 'Ver préstamos', to: '/loans' }}
              negative
            >
              {loans.map(loan => {
                const rem = loan.total_installments !== null
                  ? Math.max(0, loan.total_installments - loan.paid_installments) * loan.monthly_payment
                  : loan.monthly_payment * 12
                const remUSD = toUSD(rem, loan.currency)
                const cuotas = loan.total_installments !== null
                  ? `${Math.max(0, loan.total_installments - loan.paid_installments)} cuotas restantes`
                  : 'Sin plazo definido'
                return <Row key={loan.id} icon={Landmark} color="#f87171"
                  name={loan.name} sub={`${loan.lender ? loan.lender + ' · ' : ''}${cuotas}`}
                  val={formatUSD(remUSD)} valSub={formatARS(remUSD * mepRate)} negative />
              })}
            </AccordionSection>
          )}

          {cardDebt > 0 && (
            <AccordionSection
              id="tarjetas" open={open.tarjetas} onToggle={() => toggle('tarjetas')}
              icon={CreditCard} color="#f87171"
              label="Tarjetas de crédito"
              hint="Consumos del mes sin pagar"
              total={formatUSD(cardDebtUSD)} totalSub={formatARS(cardDebt)}
              link={{ label: 'Ver tarjetas', to: '/credit-cards' }}
              negative
            >
              <Row icon={CreditCard} color="#f87171"
                name="Resumen del mes actual"
                sub="Total de consumos del período"
                val={formatUSD(cardDebtUSD)} valSub={formatARS(cardDebt)} negative />
            </AccordionSection>
          )}
        </>
      )}

      {/* Estado vacío */}
      {physicalAssets.length === 0 && positions.length === 0 && liquidAccounts.length === 0 && (
        <div className="rounded-2xl flex flex-col items-center py-16 text-center"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--accent-bg)' }}>
            <Building2 size={24} style={{ color: 'var(--accent-icon)' }} />
          </div>
          <p className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Tu patrimonio está vacío</p>
          <p className="text-sm mb-5 max-w-xs" style={{ color: 'var(--text-muted)' }}>
            Agregá tu casa, auto, negocio u otros bienes para ver tu patrimonio neto real.
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

// ── Acordeón ─────────────────────────────────────────────────
function AccordionSection({
  id, open, onToggle, icon: Icon, color, label, hint, total, totalSub,
  children, link, action, negative,
}: {
  id: string; open: boolean; onToggle: () => void
  icon: typeof Wallet; color: string
  label: string; hint: string; total: string; totalSub: string
  children: React.ReactNode
  link?: { label: string; to: string }; action?: { label: string; onClick: () => void }
  negative?: boolean
}) {
  const router = useRouter()
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <button onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-hover)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: color + '18' }}>
          <Icon size={17} style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{label}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{hint}</p>
        </div>
        <div className="text-right shrink-0 mr-2">
          <p className="text-sm font-bold" style={{ color: negative ? 'var(--expense)' : 'var(--text-primary)' }}>
            {negative ? '−' : ''}{total}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-faint)' }}>{totalSub}</p>
        </div>
        {open
          ? <ChevronDown size={13} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
          : <ChevronRight size={13} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />}
      </button>

      {open && (
        <div style={{ borderTop: '1px solid var(--border-subtle)' }}>
          {children}
          {(link || action) && (
            <div className="px-4 py-2.5 flex gap-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              {link && <button onClick={() => router.push(link.to)} className="text-xs font-medium" style={{ color: 'var(--accent)' }}>{link.label} →</button>}
              {action && <button onClick={action.onClick} className="text-xs font-medium" style={{ color: 'var(--accent)' }}>{action.label}</button>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Fila de item ─────────────────────────────────────────────
function Row({ icon: Icon, dot, color, name, sub, val, valSub, negative, onDelete, onClick }: {
  icon?: typeof Wallet; dot?: string; color?: string
  name: string; sub?: string; val: string; valSub?: string
  negative?: boolean; onDelete?: () => void; onClick?: () => void
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 transition-colors"
      style={{ borderBottom: '1px solid var(--border-subtle)', cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
      onMouseEnter={e => onClick && (e.currentTarget.style.background = 'var(--surface-hover)')}
      onMouseLeave={e => onClick && (e.currentTarget.style.background = 'transparent')}>
      {dot && <div className="w-2 h-2 rounded-full shrink-0" style={{ background: dot }} />}
      {Icon && !dot && (
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: (color ?? '#60a5fa') + '18' }}>
          <Icon size={14} style={{ color: color ?? '#60a5fa' }} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{name}</p>
        {sub && <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-semibold tabular-nums" style={{ color: negative ? 'var(--expense)' : 'var(--text-primary)' }}>
          {negative ? '−' : ''}{val}
        </p>
        {valSub && <p className="text-xs tabular-nums" style={{ color: 'var(--text-faint)' }}>{valSub}</p>}
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

// ── Estado vacío de sección ───────────────────────────────────
function EmptyHint({ text, link, linkText }: { text: string; link: string; linkText: string }) {
  const router = useRouter()
  return (
    <div className="px-4 py-3.5 flex items-center justify-between">
      <p className="text-xs" style={{ color: 'var(--text-faint)' }}>{text}</p>
      <button onClick={() => router.push(link)} className="text-xs font-medium ml-3 shrink-0" style={{ color: 'var(--accent)' }}>
        {linkText}
      </button>
    </div>
  )
}
