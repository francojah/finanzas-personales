'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Building2, Car, Briefcase, Package, Trash2 } from 'lucide-react'
import { usePatrimonio } from '@/hooks/usePatrimonio'
import { useExchangeRate } from '@/hooks/useExchangeRate'
import { formatARS, formatUSD } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { PatrimonioAssetType } from '@/types/database'
import { PlanGate } from '@/components/shared/PlanGate'

const TYPE_CONFIG: Record<PatrimonioAssetType, { label: string; icon: typeof Building2; color: string; bg: string }> = {
  property: { label: 'Inmueble',  icon: Building2, color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' },
  vehicle:  { label: 'Vehículo',  icon: Car,       color: '#fb923c', bg: 'rgba(251,146,60,0.1)'  },
  business: { label: 'Negocio',   icon: Briefcase, color: 'var(--accent-icon)', bg: 'var(--accent-bg)' },
  other:    { label: 'Otro',      icon: Package,   color: 'var(--text-muted)',  bg: 'var(--surface-elevated)' },
}

export default function PatrimonioPage() {
  return <PlanGate feature="patrimonio" featureLabel="Patrimonio"><PatrimonioPageContent /></PlanGate>
}

function PatrimonioPageContent() {
  const router = useRouter()
  const supabase = createClient()
  const { assets, loading, refetch } = usePatrimonio()
  const { mep } = useExchangeRate()
  const [deleting, setDeleting] = useState<string | null>(null)

  // Convertir cada activo a USD y ARS usando MEP
  function toUSD(value: number, currency: 'USD' | 'ARS'): number {
    if (currency === 'USD') return value
    return mep ? value / mep : 0
  }
  function toARS(value: number, currency: 'USD' | 'ARS'): number {
    if (currency === 'ARS') return value
    return mep ? value * mep : 0
  }

  const totalUSD = assets.reduce((s, a) => s + toUSD(a.value, a.currency as 'USD' | 'ARS'), 0)
  const totalARS = assets.reduce((s, a) => s + toARS(a.value, a.currency as 'USD' | 'ARS'), 0)

  const byType = (Object.keys(TYPE_CONFIG) as PatrimonioAssetType[]).map(type => ({
    ...TYPE_CONFIG[type], type,
    count: assets.filter(a => a.type === type).length,
  })).filter(g => g.count > 0)

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este activo?')) return
    setDeleting(id)
    await supabase.from('assets').update({ is_active: false }).eq('id', id)
    await refetch()
    setDeleting(null)
  }

  if (loading) return (
    <div className="max-w-2xl mx-auto space-y-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'var(--surface)' }} />
      ))}
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Patrimonio</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>Activos fuera del mercado financiero</p>
        </div>
        <button
          onClick={() => router.push('/patrimonio/new')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: 'var(--accent)' }}
        >
          <Plus size={15} /> Agregar
        </button>
      </div>

      {/* Total card + breakdown por tipo */}
      {assets.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="p-5">
            <p className="text-xs font-bold tracking-widest mb-3" style={{ color: 'var(--text-faint)' }}>PATRIMONIO TOTAL</p>
            <p className="text-4xl font-black mb-1" style={{ color: 'var(--text-primary)' }}>{formatUSD(totalUSD)}</p>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {formatARS(totalARS)}
              {mep && <span style={{ color: 'var(--text-faint)' }}> · MEP {formatARS(mep)}</span>}
            </p>
          </div>

          {byType.length > 0 && (
            <div className="flex" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              {byType.map((g, i) => {
                const Icon = g.icon
                const typeTotal = assets
                  .filter(a => a.type === g.type)
                  .reduce((s, a) => s + toUSD(a.value, a.currency as 'USD' | 'ARS'), 0)
                const pct = totalUSD > 0 ? (typeTotal / totalUSD) * 100 : 0
                return (
                  <div key={g.type} className="flex-1 px-4 py-3 text-center"
                    style={{ borderLeft: i > 0 ? '1px solid var(--border-subtle)' : 'none' }}>
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      <Icon size={12} style={{ color: g.color }} />
                      <span className="text-xs font-semibold" style={{ color: g.color }}>{g.label}</span>
                    </div>
                    <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{formatUSD(typeTotal)}</p>
                    <p className="text-xs" style={{ color: 'var(--text-faint)' }}>{pct.toFixed(0)}%</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Lista */}
      {assets.length === 0 ? (
        <div className="rounded-2xl flex flex-col items-center justify-center py-16 text-center"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'var(--accent-bg)' }}>
            <Building2 size={22} style={{ color: 'var(--accent-icon)' }} />
          </div>
          <p className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Sin activos registrados</p>
          <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>Agregá tu casa, auto, negocio u otro bien</p>
          <button
            onClick={() => router.push('/patrimonio/new')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'var(--accent)' }}>
            <Plus size={14} /> Agregar activo
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {assets.map(asset => {
            const cfg      = TYPE_CONFIG[asset.type as PatrimonioAssetType]
            const Icon     = cfg.icon
            const cur      = asset.currency as 'USD' | 'ARS'
            const valueUSD = toUSD(asset.value, cur)
            const valueARS = toARS(asset.value, cur)
            const weightPct = totalUSD > 0 ? (valueUSD / totalUSD) * 100 : 0

            return (
              <div key={asset.id} className="rounded-xl overflow-hidden"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: cfg.bg }}>
                    <Icon size={18} style={{ color: cfg.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{asset.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {cfg.label}{asset.description ? ` · ${asset.description}` : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{formatUSD(valueUSD)}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatARS(valueARS)}</p>
                  </div>
                  <div className="flex items-center gap-1 ml-1 shrink-0">
                    <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                      style={{ background: cfg.bg, color: cfg.color }}>
                      {weightPct.toFixed(0)}%
                    </span>
                    <button onClick={() => handleDelete(asset.id)} disabled={deleting === asset.id}
                      className="p-1.5 rounded-lg hover:text-red-400 transition-colors"
                      style={{ color: 'var(--text-faint)' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                {/* Barra de peso visual */}
                <div className="h-0.5 mx-4 mb-2 rounded-full" style={{ background: 'var(--border-subtle)' }}>
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${weightPct}%`, background: cfg.color }} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
