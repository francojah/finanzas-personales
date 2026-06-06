'use client'

import { useEffect, useState } from 'react'
import { Sparkles, TrendingUp, TrendingDown, PiggyBank, AlertTriangle, RefreshCw, Lock } from 'lucide-react'
import Link from 'next/link'

interface Insight {
  type: 'saving' | 'spending' | 'investment' | 'debt' | 'alert'
  title: string
  body: string
}

const TYPE_CONFIG = {
  saving:     { icon: PiggyBank,    color: '#10b981', bg: 'rgba(16,185,129,0.08)'  },
  spending:   { icon: TrendingDown, color: '#f97316', bg: 'rgba(249,115,22,0.08)'  },
  investment: { icon: TrendingUp,   color: '#6366f1', bg: 'rgba(99,102,241,0.08)'  },
  debt:       { icon: AlertTriangle,color: '#ef4444', bg: 'rgba(239,68,68,0.08)'   },
  alert:      { icon: AlertTriangle,color: '#f0b429', bg: 'rgba(240,180,41,0.08)'  },
}

// Cache en localStorage con TTL de 24h para no llamar a la API repetidamente
const LS_KEY = 'rgt_insights_v1'
const CACHE_TTL = 24 * 60 * 60 * 1000

function readCache(): { insights: Insight[]; ts: number } | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (Date.now() - data.ts > CACHE_TTL) { localStorage.removeItem(LS_KEY); return null }
    return data
  } catch { return null }
}

function writeCache(insights: Insight[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify({ insights, ts: Date.now() })) } catch {}
}

export function AIInsights() {
  const [insights, setInsights]         = useState<Insight[]>([])
  const [loading, setLoading]           = useState(true)
  const [upgradeRequired, setUpgrade]   = useState(false)
  const [lastUpdate, setLastUpdate]     = useState<Date | null>(null)
  const [fromCache, setFromCache]       = useState(false)

  useEffect(() => { loadInsights(false) }, [])

  async function loadInsights(force = false) {
    setLoading(true)
    try {
      if (!force) {
        const cached = readCache()
        if (cached) {
          setInsights(cached.insights)
          setLastUpdate(new Date(cached.ts))
          setFromCache(true)
          setLoading(false)
          return
        }
      }

      const res = await fetch('/api/ai-insights')
      if (!res.ok) throw new Error()
      const data = await res.json()

      if (data.upgradeRequired) { setUpgrade(true); return }

      setInsights(data.insights ?? [])
      setLastUpdate(new Date())
      setFromCache(data.cached ?? false)
      if (!data.cached) writeCache(data.insights ?? [])
    } catch {
      setInsights([])
    } finally {
      setLoading(false)
    }
  }

  if (upgradeRequired) return (
    <div className="rounded-2xl p-5 flex flex-col items-center justify-center text-center gap-3"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', minHeight: 120 }}>
      <Lock size={20} style={{ color: 'var(--text-faint)' }} />
      <div>
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Insights de IA</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Disponible en Premium</p>
      </div>
      <Link href="/settings" className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white"
        style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
        Ver Premium →
      </Link>
    </div>
  )

  if (loading) return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2 mb-4">
        <Sparkles size={14} style={{ color: '#8b5cf6' }} />
        <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Insights de IA</span>
      </div>
      <div className="space-y-3">
        {[1,2].map(i => <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: 'var(--surface-elevated)' }} />)}
      </div>
    </div>
  )

  if (!insights.length) return null

  return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles size={14} style={{ color: '#8b5cf6' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Insights de IA</span>
          {fromCache && lastUpdate && (
            <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>
              · {lastUpdate.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}
            </span>
          )}
        </div>
        {!fromCache ? null : (
          <button onClick={() => loadInsights(true)} title="Actualizar (1 vez por día)"
            className="p-1.5 rounded-lg" style={{ color: 'var(--text-faint)' }}>
            <RefreshCw size={12} />
          </button>
        )}
      </div>

      <div className="space-y-2.5">
        {insights.map((ins, i) => {
          const cfg = TYPE_CONFIG[ins.type] ?? TYPE_CONFIG.alert
          const Icon = cfg.icon
          return (
            <div key={i} className="flex items-start gap-3 rounded-xl p-3" style={{ background: cfg.bg }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: cfg.color + '20' }}>
                <Icon size={14} style={{ color: cfg.color }} />
              </div>
              <div>
                <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>{ins.title}</p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{ins.body}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
