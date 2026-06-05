'use client'

import { useChat } from 'ai/react'
import { useEffect, useRef, useState } from 'react'
import { Send, Sparkles, User, RefreshCw, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Prompts sugeridos ─────────────────────────────────────────
const SUGGESTED = [
  { emoji: '📉', text: '¿En qué estoy gastando más de lo necesario?' },
  { emoji: '💰', text: '¿Cuánto debería estar ahorrando por mes?' },
  { emoji: '📈', text: '¿Cómo está mi portafolio de inversiones?' },
  { emoji: '🎯', text: 'Dame un plan para mejorar mis finanzas' },
  { emoji: '🏠', text: '¿Conviene que invierta más en patrimonio?' },
  { emoji: '💳', text: '¿Cómo optimizo mis gastos fijos mensuales?' },
]

// ── Markdown simple: negritas y listas ───────────────────────
function renderMessage(text: string) {
  const lines = text.split('\n')
  return lines.map((line, i) => {
    // Línea vacía
    if (!line.trim()) return <div key={i} className="h-2" />

    // Renderizar **bold** inline
    const renderBold = (s: string) => {
      const parts = s.split(/(\*\*[^*]+\*\*)/g)
      return parts.map((p, j) =>
        p.startsWith('**') && p.endsWith('**')
          ? <strong key={j} style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{p.slice(2, -2)}</strong>
          : p
      )
    }

    // Lista con bullet
    if (/^[•\-\*]\s/.test(line.trim())) {
      return (
        <div key={i} className="flex gap-2 items-start">
          <span className="mt-0.5 shrink-0" style={{ color: 'var(--accent-icon)' }}>•</span>
          <span>{renderBold(line.replace(/^[•\-\*]\s/, ''))}</span>
        </div>
      )
    }
    // Lista numerada
    if (/^\d+\.\s/.test(line.trim())) {
      const [num, ...rest] = line.trim().split(/\.\s+/)
      return (
        <div key={i} className="flex gap-2 items-start">
          <span className="shrink-0 font-bold text-xs mt-0.5 w-4 text-right" style={{ color: 'var(--accent-icon)' }}>{num}.</span>
          <span>{renderBold(rest.join('. '))}</span>
        </div>
      )
    }

    return <p key={i}>{renderBold(line)}</p>
  })
}

export default function GuruPage() {
  const bottomRef   = useRef<HTMLDivElement>(null)
  const inputRef    = useRef<HTMLTextAreaElement>(null)
  const [atBottom, setAtBottom] = useState(true)
  const scrollRef   = useRef<HTMLDivElement>(null)

  const {
    messages, input, handleInputChange, handleSubmit,
    isLoading, error, reload, setInput,
  } = useChat({ api: '/api/chat' })

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (atBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isLoading, atBottom])

  function handleScroll() {
    const el = scrollRef.current
    if (!el) return
    const diff = el.scrollHeight - el.scrollTop - el.clientHeight
    setAtBottom(diff < 60)
  }

  function submitSuggested(text: string) {
    setInput(text)
    setTimeout(() => {
      const form = document.getElementById('chat-form') as HTMLFormElement
      form?.requestSubmit()
    }, 50)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const form = document.getElementById('chat-form') as HTMLFormElement
      form?.requestSubmit()
    }
  }

  const isEmpty = messages.length === 0

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-w-2xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-3 mb-4 shrink-0">
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
          style={{
            background: 'linear-gradient(135deg, var(--gold) 0%, #d97706 100%)',
            boxShadow: '0 0 16px var(--gold-shadow)',
          }}
        >
          <Sparkles size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Guru Financiero</h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Asesor IA personalizado con tus datos reales
          </p>
        </div>
      </div>

      {/* Chat area */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto space-y-4 pb-4 pr-1"
      >
        {/* Empty state */}
        {isEmpty && (
          <div className="pt-4 space-y-6">
            {/* Welcome */}
            <div
              className="rounded-2xl p-6 text-center"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <div
                className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4"
                style={{
                  background: 'linear-gradient(135deg, var(--gold) 0%, #d97706 100%)',
                  boxShadow: '0 0 20px var(--gold-shadow)',
                }}
              >
                <Sparkles size={28} className="text-white" />
              </div>
              <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                ¡Hola! Soy tu Guru Financiero
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Analicé tu perfil financiero completo — tus ingresos, gastos, inversiones y patrimonio.
                Haceme cualquier pregunta y te doy recomendaciones personalizadas con tus números reales.
              </p>
            </div>

            {/* Suggested prompts */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-3 px-1"
                style={{ color: 'var(--text-faint)' }}>
                Preguntas sugeridas
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SUGGESTED.map(({ emoji, text }) => (
                  <button
                    key={text}
                    onClick={() => submitSuggested(text)}
                    className="text-left rounded-xl px-4 py-3 text-sm transition-all"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent-border)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                  >
                    <span className="mr-2">{emoji}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{text}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((m) => {
          const isUser = m.role === 'user'
          return (
            <div key={m.id} className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
              {/* Avatar */}
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                style={isUser
                  ? { background: 'var(--accent-bg)', border: '1px solid var(--accent-border)' }
                  : { background: 'linear-gradient(135deg, var(--gold) 0%, #d97706 100%)', boxShadow: '0 0 8px var(--gold-shadow)' }
                }
              >
                {isUser
                  ? <User size={14} style={{ color: 'var(--accent-icon)' }} />
                  : <Sparkles size={14} className="text-white" />
                }
              </div>

              {/* Bubble */}
              <div
                className="max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed space-y-1"
                style={isUser
                  ? {
                      background: 'var(--accent-bg)',
                      border: '1px solid var(--accent-border)',
                      color: 'var(--text-primary)',
                      borderTopRightRadius: 4,
                    }
                  : {
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-secondary)',
                      borderTopLeftRadius: 4,
                    }
                }
              >
                {isUser
                  ? <p>{m.content}</p>
                  : <div className="space-y-1">{renderMessage(m.content)}</div>
                }
              </div>
            </div>
          )
        })}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex gap-3 items-start">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, var(--gold) 0%, #d97706 100%)' }}
            >
              <Sparkles size={14} className="text-white" />
            </div>
            <div
              className="rounded-2xl px-4 py-3 flex items-center gap-2"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTopLeftRadius: 4 }}
            >
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full animate-bounce"
                    style={{ background: 'var(--gold)', animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Analizando tu perfil...</span>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-xl p-4 flex items-center justify-between"
            style={{ background: 'var(--expense-bg)', border: '1px solid rgba(248,113,113,0.2)' }}>
            <p className="text-sm" style={{ color: 'var(--expense)' }}>
              Error al conectar con el Guru. Verificá que tenés configurada la API key.
            </p>
            <button onClick={() => reload()}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--expense)' }}>
              <RefreshCw size={14} />
            </button>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Scroll to bottom button */}
      {!atBottom && (
        <div className="flex justify-center mb-2">
          <button
            onClick={() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); setAtBottom(true) }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
            style={{ background: 'var(--accent-bg)', color: 'var(--accent-icon)', border: '1px solid var(--accent-border)' }}
          >
            <ChevronDown size={13} /> Ir al final
          </button>
        </div>
      )}

      {/* Input */}
      <form
        id="chat-form"
        onSubmit={handleSubmit}
        className="shrink-0 flex gap-2 items-end"
      >
        <div
          className="flex-1 flex items-end gap-2 rounded-2xl px-4 py-3"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Preguntame sobre tus finanzas..."
            rows={1}
            className="flex-1 bg-transparent outline-none resize-none text-sm leading-relaxed"
            style={{
              color: 'var(--text-primary)',
              maxHeight: 120,
              minHeight: 24,
            }}
            onInput={e => {
              const el = e.currentTarget
              el.style.height = 'auto'
              el.style.height = Math.min(el.scrollHeight, 120) + 'px'
            }}
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all disabled:opacity-40"
          style={{ background: 'var(--accent)' }}
        >
          <Send size={16} className="text-white" style={{ transform: 'translateX(1px)' }} />
        </button>
      </form>

      <p className="text-center text-[10px] mt-2 shrink-0" style={{ color: 'var(--text-faint)' }}>
        Basado en tus datos reales · Enter para enviar · Shift+Enter para nueva línea
      </p>
    </div>
  )
}
