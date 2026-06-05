'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ArrowUpCircle, ArrowDownCircle, TrendingUp, Building2, X, Command } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatARS, formatUSD } from '@/lib/utils'

interface Result {
  id: string
  type: 'transaction' | 'investment' | 'asset'
  title: string
  subtitle: string
  amount?: string
  href: string
  color?: string
  txType?: 'income' | 'expense'
}

let debounceTimer: ReturnType<typeof setTimeout>

export function GlobalSearch() {
  const router  = useRouter()
  const supabase = createClient()
  const [open, setOpen]     = useState(false)
  const [query, setQuery]   = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Keyboard shortcut Cmd/Ctrl+K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(o => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setQuery('')
      setResults([])
      setSelected(0)
    }
  }, [open])

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return }
    setLoading(true)

    const pattern = `%${q}%`
    const [txRes, invRes, assetRes] = await Promise.all([
      supabase.from('transactions')
        .select('id, description, type, amount_ars, amount_usd, currency_original, date, category:categories(name,color)')
        .or(`description.ilike.${pattern}`)
        .neq('type', 'transfer')
        .order('date', { ascending: false })
        .limit(5),
      supabase.from('investment_positions')
        .select('id, name, ticker, asset_type, quantity, current_price_usd, avg_purchase_price')
        .or(`name.ilike.${pattern},ticker.ilike.${pattern}`)
        .eq('is_active', true)
        .limit(4),
      supabase.from('assets')
        .select('id, name, type, value, currency')
        .ilike('name', pattern)
        .eq('is_active', true)
        .limit(3),
    ])

    const out: Result[] = []

    ;(txRes.data ?? []).forEach((t: any) => {
      const isIncome = t.type === 'income'
      const amount   = t.currency_original === 'USD' ? formatUSD(t.amount_usd) : formatARS(t.amount_ars)
      out.push({
        id: t.id, type: 'transaction',
        title: t.description || (t.category as any)?.name || 'Sin descripción',
        subtitle: `${(t.category as any)?.name ?? ''} · ${t.date}`,
        amount: `${isIncome ? '+' : '-'}${amount}`,
        href: `/transactions/${t.id}`,
        color: (t.category as any)?.color,
        txType: t.type,
      })
    })

    ;(invRes.data ?? []).forEach((p: any) => {
      const price = p.current_price_usd ?? p.avg_purchase_price
      out.push({
        id: p.id, type: 'investment',
        title: p.name,
        subtitle: `${p.ticker ? p.ticker + ' · ' : ''}${p.quantity} unidades`,
        amount: formatUSD(p.quantity * price),
        href: `/investments/${p.id}`,
      })
    })

    ;(assetRes.data ?? []).forEach((a: any) => {
      out.push({
        id: a.id, type: 'asset',
        title: a.name,
        subtitle: a.type,
        amount: a.currency === 'USD' ? formatUSD(a.value) : formatARS(a.value),
        href: '/patrimonio',
      })
    })

    setResults(out)
    setSelected(0)
    setLoading(false)
  }, [])

  function handleInput(q: string) {
    setQuery(q)
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => search(q), 250)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)) }
    if (e.key === 'Enter' && results[selected]) navigate(results[selected])
  }

  function navigate(r: Result) {
    setOpen(false)
    router.push(r.href)
  }

  if (!open) return (
    <button
      onClick={() => setOpen(true)}
      className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm"
      style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
      title="Búsqueda global (⌘K)"
    >
      <Search size={13} />
      <span>Buscar...</span>
      <span className="flex items-center gap-0.5 text-[10px] px-1 rounded" style={{ background: 'var(--border)', color: 'var(--text-faint)' }}>
        <Command size={9} />K
      </span>
    </button>
  )

  const TYPE_LABELS = { transaction: 'Movimiento', investment: 'Inversión', asset: 'Patrimonio' }
  const grouped = ['transaction', 'investment', 'asset'].map(type => ({
    type, items: results.filter(r => r.type === type),
  })).filter(g => g.items.length > 0)

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] px-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setOpen(false)}>
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 32px 80px rgba(0,0,0,0.5)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <Search size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => handleInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar movimientos, inversiones, activos..."
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: 'var(--text-primary)' }}
          />
          {loading && (
            <div className="w-4 h-4 rounded-full border-2 animate-spin shrink-0" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
          )}
          <button onClick={() => setOpen(false)} style={{ color: 'var(--text-faint)' }}>
            <X size={15} />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {query.length < 2 && (
            <div className="px-4 py-8 text-center">
              <Search size={28} className="mx-auto mb-2" style={{ color: 'var(--text-faint)' }} />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Escribí al menos 2 caracteres</p>
            </div>
          )}

          {query.length >= 2 && !loading && results.length === 0 && (
            <div className="px-4 py-8 text-center">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Sin resultados para "{query}"</p>
            </div>
          )}

          {grouped.map(({ type, items }) => (
            <div key={type}>
              <div className="px-4 py-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-faint)' }}>
                  {TYPE_LABELS[type as keyof typeof TYPE_LABELS]}
                </span>
              </div>
              {items.map((r, i) => {
                const globalIdx = results.indexOf(r)
                const isSelected = globalIdx === selected
                const Icon = r.type === 'transaction'
                  ? (r.txType === 'income' ? ArrowUpCircle : ArrowDownCircle)
                  : r.type === 'investment' ? TrendingUp : Building2
                const iconColor = r.type === 'transaction'
                  ? (r.txType === 'income' ? 'var(--income)' : 'var(--expense)')
                  : r.type === 'investment' ? 'var(--accent-icon)' : '#60a5fa'

                return (
                  <button
                    key={r.id}
                    onClick={() => navigate(r)}
                    onMouseEnter={() => setSelected(globalIdx)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                    style={{ background: isSelected ? 'var(--surface-elevated)' : 'transparent' }}
                  >
                    <Icon size={18} style={{ color: iconColor, flexShrink: 0 }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{r.title}</p>
                      <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{r.subtitle}</p>
                    </div>
                    {r.amount && (
                      <span className="text-sm font-semibold shrink-0" style={{
                        color: r.type === 'transaction'
                          ? (r.txType === 'income' ? 'var(--income)' : 'var(--expense)')
                          : 'var(--text-primary)'
                      }}>
                        {r.amount}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 flex items-center gap-3 text-[10px]" style={{ borderTop: '1px solid var(--border-subtle)', color: 'var(--text-faint)' }}>
          <span>↑↓ navegar</span>
          <span>↵ seleccionar</span>
          <span>Esc cerrar</span>
        </div>
      </div>
    </div>
  )
}
