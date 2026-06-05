'use client'

import { useState, useEffect, useRef } from 'react'
import { Sparkles, X, Send, User, RefreshCw, Maximize2, RotateCcw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useStreamingChat } from '@/hooks/useStreamingChat'

// ── Prompts sugeridos (compactos para el drawer) ──────────────
const SUGGESTED = [
  '¿En qué estoy gastando de más?',
  '¿Cuánto debería ahorrar?',
  'Analizá mis inversiones',
  'Dame un plan de mejora',
]

// ── Markdown simple ──────────────────────────────────────────
function renderMessage(text: string) {
  return text.split('\n').map((line, i) => {
    if (!line.trim()) return <div key={i} className="h-1.5" />
    const renderBold = (s: string) =>
      s.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
        p.startsWith('**') && p.endsWith('**')
          ? <strong key={j} style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{p.slice(2, -2)}</strong>
          : p
      )
    if (/^[•\-\*]\s/.test(line.trim())) return (
      <div key={i} className="flex gap-1.5 items-start">
        <span className="shrink-0 mt-0.5" style={{ color: 'var(--accent-icon)' }}>•</span>
        <span>{renderBold(line.replace(/^[•\-\*]\s/, ''))}</span>
      </div>
    )
    return <p key={i}>{renderBold(line)}</p>
  })
}

export function GuruFloatingButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [showPulse, setShowPulse] = useState(true)
  const { messages, input, setInput, isLoading, error, sendMessage, reload, clearMessages } = useStreamingChat()
  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLTextAreaElement>(null)

  // Detener pulse al primer click
  useEffect(() => {
    if (open) setShowPulse(false)
  }, [open])

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Focus input al abrir
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 300)
  }, [open])

  // Cerrar con Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function submit(text?: string) { sendMessage(text ?? input) }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() }
  }

  const isEmpty = messages.length === 0

  return (
    <>
      {/* Backdrop móvil */}
      {open && (
        <div
          className="fixed inset-0 z-[90] md:hidden"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className="fixed bottom-0 right-0 z-[95] flex flex-col"
        style={{
          width: 'min(420px, 100vw)',
          height: open ? 'min(600px, 85vh)' : 0,
          transition: 'height 0.3s cubic-bezier(0.4,0,0.2,1)',
          overflow: 'hidden',
          borderRadius: open ? '20px 20px 0 0' : 0,
          background: 'var(--surface)',
          border: open ? '1px solid var(--border)' : 'none',
          borderBottom: 'none',
          boxShadow: open ? '0 -8px 40px rgba(0,0,0,0.4)' : 'none',
          // Desktop: al lado del botón flotante
          bottom: open ? 80 : 0,
          marginRight: 16,
          marginBottom: 0,
        }}
      >
        {open && (
          <>
            {/* Header del drawer */}
            <div className="flex items-center gap-3 px-4 py-3 shrink-0" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'linear-gradient(135deg, var(--gold) 0%, #d97706 100%)', boxShadow: '0 0 10px var(--gold-shadow)' }}
              >
                <Sparkles size={15} className="text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Guru Financiero</p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>IA con tus datos reales</p>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <button
                    onClick={() => clearMessages()}
                    title="Nueva conversación"
                    className="p-1.5 rounded-lg transition-colors"
                    style={{ color: 'var(--text-faint)' }}
                  >
                    <RotateCcw size={13} />
                  </button>
                )}
                <button
                  onClick={() => { setOpen(false); router.push('/guru') }}
                  title="Abrir en pantalla completa"
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: 'var(--text-faint)' }}
                >
                  <Maximize2 size={13} />
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: 'var(--text-faint)' }}
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
              {isEmpty ? (
                <div className="space-y-3">
                  <p className="text-xs text-center py-2" style={{ color: 'var(--text-muted)' }}>
                    ¿En qué te puedo ayudar hoy?
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {SUGGESTED.map(text => (
                      <button
                        key={text}
                        onClick={() => submit(text)}
                        className="text-left rounded-xl px-3 py-2.5 text-xs transition-all leading-snug"
                        style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent-border)')}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                      >
                        {text}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map(m => {
                  const isUser = m.role === 'user'
                  return (
                    <div key={m.id} className={`flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div
                        className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                        style={isUser
                          ? { background: 'var(--accent-bg)', border: '1px solid var(--accent-border)' }
                          : { background: 'linear-gradient(135deg, var(--gold) 0%, #d97706 100%)' }
                        }
                      >
                        {isUser
                          ? <User size={11} style={{ color: 'var(--accent-icon)' }} />
                          : <Sparkles size={11} className="text-white" />
                        }
                      </div>
                      <div
                        className="max-w-[82%] rounded-xl px-3 py-2 text-xs leading-relaxed space-y-1"
                        style={isUser
                          ? { background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', color: 'var(--text-primary)', borderTopRightRadius: 4 }
                          : { background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderTopLeftRadius: 4 }
                        }
                      >
                        {isUser
                          ? <p>{m.content}</p>
                          : <div className="space-y-0.5">{renderMessage(m.content)}</div>
                        }
                        {!isUser && isLoading && m === messages[messages.length - 1] && (
                          <span className="inline-block w-0.5 h-3 ml-0.5 animate-pulse align-middle" style={{ background: 'var(--accent-icon)' }} />
                        )}
                      </div>
                    </div>
                  )
                })
              )}

              {/* Typing indicator */}
              {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
                <div className="flex gap-2 items-start">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: 'linear-gradient(135deg, var(--gold) 0%, #d97706 100%)' }}>
                    <Sparkles size={11} className="text-white" />
                  </div>
                  <div className="rounded-xl px-3 py-2 flex items-center gap-1.5"
                    style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', borderTopLeftRadius: 4 }}>
                    {[0,1,2].map(i => (
                      <div key={i} className="w-1 h-1 rounded-full animate-bounce"
                        style={{ background: 'var(--gold)', animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <div className="rounded-xl p-2.5 flex items-center justify-between"
                  style={{ background: 'var(--expense-bg)', border: '1px solid rgba(248,113,113,0.2)' }}>
                  <p className="text-xs" style={{ color: 'var(--expense)' }}>Error al conectar</p>
                  <button onClick={reload} className="p-1 rounded" style={{ color: 'var(--expense)' }}>
                    <RefreshCw size={11} />
                  </button>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-3 pb-3 shrink-0">
              <div className="flex gap-2 items-end rounded-xl px-3 py-2.5" style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Preguntame algo..."
                  rows={1}
                  className="flex-1 bg-transparent outline-none resize-none text-xs leading-relaxed"
                  style={{ color: 'var(--text-primary)', maxHeight: 80, minHeight: 18 }}
                  onInput={e => {
                    const el = e.currentTarget
                    el.style.height = 'auto'
                    el.style.height = Math.min(el.scrollHeight, 80) + 'px'
                  }}
                />
                <button
                  type="button"
                  onClick={() => submit()}
                  disabled={isLoading || !input.trim()}
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 disabled:opacity-40"
                  style={{ background: 'var(--accent)' }}
                >
                  <Send size={12} className="text-white" style={{ transform: 'translateX(0.5px)' }} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Botón flotante */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed z-[96] flex items-center justify-center rounded-full transition-all"
        style={{
          width: 52,
          height: 52,
          bottom: 84, // sobre el mobile nav
          right: 16,
          background: open
            ? 'var(--surface-elevated)'
            : 'linear-gradient(135deg, var(--gold) 0%, #d97706 100%)',
          boxShadow: open
            ? '0 4px 12px rgba(0,0,0,0.3)'
            : '0 4px 20px var(--gold-shadow), 0 0 0 0 rgba(240,180,41,0)',
          animation: showPulse ? 'guru-pulse 2s ease-in-out infinite' : 'none',
        }}
        title="Guru Financiero"
      >
        {open
          ? <X size={20} style={{ color: 'var(--text-secondary)' }} />
          : <Sparkles size={22} className="text-white" />
        }

        {/* Badge "IA" */}
        {!open && (
          <span
            className="absolute -top-0.5 -right-0.5 text-[9px] font-bold px-1 rounded-full"
            style={{ background: 'var(--accent)', color: '#fff', lineHeight: '14px' }}
          >
            IA
          </span>
        )}
      </button>

      {/* Keyframes del pulse */}
      <style>{`
        @keyframes guru-pulse {
          0%, 100% { box-shadow: 0 4px 20px rgba(240,180,41,0.4), 0 0 0 0 rgba(240,180,41,0.4); }
          50%       { box-shadow: 0 4px 20px rgba(240,180,41,0.4), 0 0 0 10px rgba(240,180,41,0); }
        }
      `}</style>
    </>
  )
}
