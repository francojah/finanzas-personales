'use client'

import { useEffect, useState } from 'react'
import { Sparkles, TrendingUp, TrendingDown, PiggyBank, AlertTriangle, RefreshCw } from 'lucide-react'

interface Insight {
  type: 'saving' | 'spending' | 'investment' | 'debt' | 'alert'
  title: string
  body: string
  priority: 'high' | 'medium' | 'low'
}

const TYPE_CONFIG = {
  saving:     { icon: PiggyBank,    color: '#10b981', bg: 'rgba(16,185,129,0.08)'  },
  spending:   { icon: TrendingDown, color: '#f97316', bg: 'rgba(249,115,22,0.08)'  },
  investment: { icon: TrendingUp,   color: '#6366f1', bg: 'rgba(99,102,241,0.08)'  },
  debt:       { icon: AlertTriangle,color: '#ef4444', bg: 'rgba(239,68,68,0.08)'   },
  alert:      { icon: AlertTriangle,color: '#f0b429', bg: 'rgba(240,180,41,0.08)'  },
}

const CACHE_KEY = 'ai_insights_cache'
const CACHE_TTL = 6 * 60 * 60 * 1000 // 6 horas

export function AIInsights() {
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading]   = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  useEffect(() => { loadInsights(false) }, [])

  async function loadInsights(force = false) {
    setLoading(true)
    try {
      // Cache en memoria de sesión (no localStorage)
      if (!force) {
        const raw = sessionStorage.getItem(CACHE_KEY)
        if (raw) {
          const cached = JSON.parse(raw)
          if (Date.now() - cached.ts < CACHE_TTL) {
            setInsights(cached.insights)
            setLastUpdate(new Date(cached.ts))
            setLoading(false)
            return
          }
        }
      }

      const res = await fetch('/api/ai-insights')
      if (!res.ok) throw new Error()
      const { insights: data } = await res.json()
      setInsights(data)
      setLastUpdate(new Date())
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ insights: data, ts: Date.now() }))
    } catch {
      setInsights([])
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2 mb-4">
        <Sparkles size={14} style={{ color: '#8b5cf6' }} />
        <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Insights de IA</span>
      </div>
      <div className="space-y-3">
        {[1,2,3].map(i => <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: 'var(--surface-elevated)' }} />)}
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
          {lastUpdate && (
            <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>
              · {lastUpdate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <button
          onClick={() => loadInsights(true)}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: 'var(--text-faint)' }}
          title="Actualizar insights"
        >
          <RefreshCw size={12} />
        </button>
      </div>

      <div className="space-y-3">
        {insights.map((ins, i) => {
          const cfg = TYPE_CONFIG[ins.type] ?? TYPE_CONFIG.alert
          const Icon = cfg.icon
          return (
            <div key={i} className="flex items-start gap-3 rounded-xl p-3" style={{ background: cfg.bg }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: cfg.color + '20' }}>
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
