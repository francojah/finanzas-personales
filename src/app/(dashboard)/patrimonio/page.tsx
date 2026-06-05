'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Building2, Car, Briefcase, Package, Trash2, TrendingUp } from 'lucide-react'
import { usePatrimonio } from '@/hooks/usePatrimonio'
import { formatARS, formatUSD } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { PatrimonioAssetType } from '@/types/database'

const TYPE_CONFIG: Record<PatrimonioAssetType, { label: string; icon: typeof Building2; color: string; bg: string }> = {
  property: { label: 'Inmueble',  icon: Building2, color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' },
  vehicle:  { label: 'Vehículo',  icon: Car,       color: '#fb923c', bg: 'rgba(251,146,60,0.1)' },
  business: { label: 'Negocio',   icon: Briefcase, color: 'var(--accent-icon)', bg: 'var(--accent-bg)' },
  other:    { label: 'Otro',      icon: Package,   color: 'var(--text-muted)', bg: 'var(--surface-elevated)' },
}

export default function PatrimonioPage() {
  const router = useRouter()
  const supabase = createClient()
  const { assets, loading, refetch } = usePatrimonio()
  const [deleting, setDeleting] = useState<string | null>(null)

  const totalUSD = assets.filter(a => a.currency === 'USD').reduce((s, a) => s + a.value, 0)
  const totalARS = assets.filter(a => a.currency === 'ARS').reduce((s, a) => s + a.value, 0)

  const byType = Object.entries(TYPE_CONFIG).map(([type, cfg]) => ({
    ...cfg, type,
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Patrimonio</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>Tus activos fuera del mercado financiero</p>
        </div>
        <button
          onClick={() => router.push('/patrimonio/new')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: 'var(--accent)' }}
        >
          <Plus size={15} /> Agregar
        </button>
      </div>

      {assets.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {totalUSD > 0 && (
            <div className="rounded-xl px-4 py-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={13} style={{ color: 'var(--accent-icon)' }} />
                <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Total en USD</span>
              </div>
              <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{formatUSD(totalUSD)}</p>
            </div>
          )}
          {totalARS > 0 && (
            <div className="rounded-xl px-4 py-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={13} style={{ color: 'var(--accent-icon)' }} />
                <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Total en ARS</span>
              </div>
              <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{formatARS(totalARS)}</p>
            </div>
          )}
        </div>
      )}

      {byType.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {byType.map(g => {
            const Icon = g.icon
            return (
              <div key={g.type} className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: g.bg }}>
                <Icon size={13} style={{ color: g.color }} />
                <span className="text-xs font-medium" style={{ color: g.color }}>{g.label} · {g.count}</span>
              </div>
            )
          })}
        </div>
      )}

      {assets.length === 0 ? (
        <div className="rounded-2xl flex flex-col items-center justify-center py-16 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--accent-bg)' }}>
            <Building2 size={22} style={{ color: 'var(--accent-icon)' }} />
          </div>
          <p className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Sin activos registrados</p>
          <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>Agregá tu casa, auto, negocio u otro bien</p>
          <button
            onClick={() => router.push('/patrimonio/new')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'var(--accent)' }}
          >
            <Plus size={14} /> Agregar activo
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {assets.map(asset => {
            const cfg = TYPE_CONFIG[asset.type as PatrimonioAssetType]
            const Icon = cfg.icon
            return (
              <div
                key={asset.id}
                className="flex items-center gap-4 rounded-xl px-4 py-3.5"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: cfg.bg }}>
                  <Icon size={17} style={{ color: cfg.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{asset.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {cfg.label}{asset.description ? ` · ${asset.description}` : ''}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                    {asset.currency === 'USD' ? formatUSD(asset.value) : formatARS(asset.value)}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{asset.currency}</p>
                </div>
                <button
                  onClick={() => handleDelete(asset.id)}
                  disabled={deleting === asset.id}
                  className="p-1.5 rounded-lg ml-1 shrink-0 hover:bg-red-500/10 transition-colors"
                  style={{ color: 'var(--text-faint)' }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
