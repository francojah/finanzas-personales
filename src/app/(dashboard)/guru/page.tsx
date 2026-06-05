'use client'

import { useEffect, useRef } from 'react'
import { Send, Sparkles, User, RefreshCw, ChevronDown, RotateCcw } from 'lucide-react'
import { useStreamingChat } from '@/hooks/useStreamingChat'

const SUGGESTED = [
  { emoji: '📉', text: '¿En qué estoy gastando más de lo necesario?' },
  { emoji: '💰', text: '¿Cuánto debería estar ahorrando por mes?' },
  { emoji: '📈', text: '¿Cómo está mi portafolio de inversiones?' },
  { emoji: '🎯', text: 'Dame un plan para mejorar mis finanzas' },
  { emoji: '🏠', text: '¿Conviene que invierta más en patrimonio?' },
  { emoji: '💳', text: '¿Cómo optimizo mis gastos fijos mensuales?' },
]

function renderMessage(text: string) {
  return text.split('\n').map((line, i) => {
    if (!line.trim()) return <div key={i} className="h-2" />
    const renderBold = (s: string) =>
      s.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
        p.startsWith('**') && p.endsWith('**')
          ? <strong key={j} style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{p.slice(2, -2)}</strong>
          : p
      )
    if (/^[•\-\*]\s/.test(line.trim())) return (
      <div key={i} className="flex gap-2 items-start">
        <span className="mt-0.5 shrink-0" style={{ color: 'var(--accent-icon)' }}>•</span>
        <span>{renderBold(line.replace(/^[•\-\*]\s/, ''))}</span>
      </div>
    )
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
  const { messages, input, setInput, isLoading, error, sendMessage, reload, clearMessages } = useStreamingChat()
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  function submit(text?: string) { sendMessage(text ?? input) }
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() }
  }

  const isEmpty = messages.length === 0

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--gold) 0%, #d97706 100%)', boxShadow: '0 0 16px var(--gold-shadow)' }}>
            <Sparkles size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Guru Financiero</h1>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>IA con tus datos reales</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button onClick={clearMessages} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg" style={{ color: 'var(--text-muted)', background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <RotateCcw size={12} /> Nueva conversación
          </button>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pb-4 pr-1">
        {isEmpty && (
          <div className="pt-4 space-y-5">
            <div className="rounded-2xl p-6 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'linear-gradient(135deg, var(--gold) 0%, #d97706 100%)', boxShadow: '0 0 20px var(--gold-shadow)' }}>
                <Sparkles size={28} className="text-white" />
              </div>
              <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>¡Hola! Soy tu Guru Financiero</h2>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Analicé tu perfil financiero completo. Haceme cualquier pregunta y te doy recomendaciones personalizadas.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SUGGESTED.map(({ emoji, text }) => (
                <button key={text} onClick={() => submit(text)}
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
        )}

        {messages.map(m => {
          const isUser = m.role === 'user'
          return (
            <div key={m.id} className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                style={isUser
                  ? { background: 'var(--accent-bg)', border: '1px solid var(--accent-border)' }
                  : { background: 'linear-gradient(135deg, var(--gold) 0%, #d97706 100%)' }
                }>
                {isUser ? <User size={14} style={{ color: 'var(--accent-icon)' }} /> : <Sparkles size={14} className="text-white" />}
              </div>
              <div className="max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed space-y-1"
                style={isUser
                  ? { background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', color: 'var(--text-primary)', borderTopRightRadius: 4 }
                  : { background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderTopLeftRadius: 4 }
                }>
                {isUser ? <p>{m.content}</p> : <div className="space-y-1">{renderMessage(m.content)}</div>}
                {!isUser && isLoading && m === messages[messages.length - 1] && (
                  <span className="inline-block w-0.5 h-4 ml-0.5 animate-pulse align-middle" style={{ background: 'var(--accent-icon)' }} />
                )}
              </div>
            </div>
          )
        })}

        {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="flex gap-3 items-start">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, var(--gold) 0%, #d97706 100%)' }}>
              <Sparkles size={14} className="text-white" />
            </div>
            <div className="rounded-2xl px-4 py-3 flex items-center gap-2"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTopLeftRadius: 4 }}>
              <div className="flex gap-1">
                {[0,1,2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                    style={{ background: 'var(--gold)', animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Analizando...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-xl p-4 flex items-center justify-between"
            style={{ background: 'var(--expense-bg)', border: '1px solid rgba(248,113,113,0.2)' }}>
            <p className="text-sm" style={{ color: 'var(--expense)' }}>Error al conectar. Verificá la API key en Vercel.</p>
            <button onClick={reload} className="p-1.5 rounded-lg ml-3 shrink-0" style={{ color: 'var(--expense)' }}>
              <RefreshCw size={14} />
            </button>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={e => { e.preventDefault(); submit() }} className="shrink-0 flex gap-2 items-end">
        <div className="flex-1 flex items-end gap-2 rounded-2xl px-4 py-3"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <textarea
            value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
            placeholder="Preguntame sobre tus finanzas..."
            rows={1} className="flex-1 bg-transparent outline-none resize-none text-sm leading-relaxed"
            style={{ color: 'var(--text-primary)', maxHeight: 120, minHeight: 24 }}
            onInput={e => { const el = e.currentTarget; el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 120) + 'px' }}
          />
        </div>
        <button type="submit" disabled={isLoading || !input.trim()}
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 disabled:opacity-40"
          style={{ background: 'var(--accent)' }}>
          <Send size={16} className="text-white" style={{ transform: 'translateX(1px)' }} />
        </button>
      </form>
      <p className="text-center text-[10px] mt-2 shrink-0" style={{ color: 'var(--text-faint)' }}>
        Enter para enviar · Shift+Enter para nueva línea
      </p>
    </div>
  )
}
