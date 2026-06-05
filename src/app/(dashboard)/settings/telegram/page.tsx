'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Bot, Copy, Check, ExternalLink, CheckCircle2, AlertCircle, Terminal, RefreshCw, Unlink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type LinkStatus = 'loading' | 'linked' | 'unlinked'

export default function TelegramSettingsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [linkStatus, setLinkStatus] = useState<LinkStatus>('loading')
  const [linkedUsername, setLinkedUsername] = useState('')
  const [code, setCode] = useState('')
  const [codeExpiry, setCodeExpiry] = useState<Date | null>(null)
  const [generatingCode, setGeneratingCode] = useState(false)
  const [unlinking, setUnlinking] = useState(false)
  const [copied, setCopied] = useState(false)
  const [webhookStatus, setWebhookStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [webhookMsg, setWebhookMsg] = useState('')

  useEffect(() => { checkLinkStatus() }, [])

  async function checkLinkStatus() {
    setLinkStatus('loading')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('telegram_links').select('username, first_name').eq('user_id', user.id).single()
    if (data) {
      setLinkStatus('linked')
      setLinkedUsername(data.username ? `@${data.username}` : data.first_name ?? 'Vinculado')
    } else {
      setLinkStatus('unlinked')
    }
  }

  async function generateCode() {
    setGeneratingCode(true)
    const res = await fetch('/api/telegram/link-code', { method: 'POST' })
    const data = await res.json()
    if (data.already_linked) {
      await checkLinkStatus()
    } else if (data.code) {
      setCode(data.code)
      setCodeExpiry(new Date(data.expires_at))
    }
    setGeneratingCode(false)
  }

  async function unlink() {
    if (!confirm('¿Desvincular tu cuenta de Telegram?')) return
    setUnlinking(true)
    await fetch('/api/telegram/link-code', { method: 'DELETE' })
    setLinkStatus('unlinked')
    setCode('')
    setLinkedUsername('')
    setUnlinking(false)
  }

  function copyCode() {
    navigator.clipboard.writeText(`/link ${code}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function registerWebhook() {
    setWebhookStatus('loading')
    try {
      const res = await fetch(`/api/telegram/webhook?secret=${encodeURIComponent(process.env.NEXT_PUBLIC_TELEGRAM_WEBHOOK_SECRET ?? 'finanzapp-tg-2024')}`)
      const data = await res.json()
      if (res.ok && data.result?.ok) {
        setWebhookStatus('ok')
        setWebhookMsg('Webhook registrado correctamente')
      } else {
        setWebhookStatus('error')
        setWebhookMsg(data.result?.description ?? data.error ?? 'Error desconocido')
      }
    } catch {
      setWebhookStatus('error')
      setWebhookMsg('Error de red')
    }
  }

  const timeLeft = codeExpiry ? Math.max(0, Math.floor((codeExpiry.getTime() - Date.now()) / 1000)) : 0

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-xl"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <Bot size={20} style={{ color: '#38bdf8' }} />
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Bot de Telegram</h1>
        </div>
      </div>

      {/* Estado de vinculación */}
      {linkStatus === 'loading' ? (
        <div className="rounded-xl p-5 flex items-center gap-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <RefreshCw size={16} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Verificando estado...</span>
        </div>
      ) : linkStatus === 'linked' ? (
        <div className="rounded-xl p-5" style={{ background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.25)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={20} style={{ color: 'var(--income)' }} />
              <div>
                <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                  Cuenta vinculada
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{linkedUsername}</p>
              </div>
            </div>
            <button
              onClick={unlink}
              disabled={unlinking}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
              style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              <Unlink size={12} /> {unlinking ? 'Desvinculando...' : 'Desvincular'}
            </button>
          </div>

          <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(34,197,94,0.15)' }}>
            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>COMANDOS DISPONIBLES</p>
            <div className="space-y-1.5">
              {[
                ['15000 alquiler', 'Gasto $15.000'],
                ['+50000 sueldo',  'Ingreso $50.000'],
                ['USD 200 netflix','Gasto USD 200'],
                ['/saldo',         'Balance del mes'],
              ].map(([cmd, desc]) => (
                <div key={cmd} className="flex items-center gap-3">
                  <code className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--accent-bg)', color: 'var(--accent-icon)' }}>{cmd}</code>
                  <span className="text-xs" style={{ color: 'var(--text-faint)' }}>→ {desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Sin vincular */
        <div className="space-y-4">
          <div className="rounded-xl p-4" style={{ background: 'rgba(56,189,248,0.07)', border: '1px solid rgba(56,189,248,0.2)' }}>
            <p className="text-sm" style={{ color: '#38bdf8' }}>
              Vinculá tu cuenta para registrar gastos enviando un mensaje al bot desde el celular.
            </p>
          </div>

          {!code ? (
            <div className="rounded-xl p-5 space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ background: 'var(--accent)' }}>1</div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Generá tu código de vinculación</p>
              </div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Generá un código único de 10 minutos que vas a enviarle al bot.
              </p>
              <button
                onClick={generateCode}
                disabled={generatingCode}
                className="w-full py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60"
                style={{ background: 'var(--accent)' }}
              >
                {generatingCode ? 'Generando...' : 'Generar código'}
              </button>
            </div>
          ) : (
            <div className="rounded-xl p-5 space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ background: 'var(--accent)' }}>2</div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Enviá este mensaje al bot</p>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'var(--surface-elevated)' }}>
                <code className="flex-1 text-sm font-bold" style={{ color: 'var(--accent-icon)' }}>/link {code}</code>
                <button onClick={copyCode} className="p-1.5 rounded-lg" style={{ color: 'var(--text-muted)' }}>
                  {copied ? <Check size={14} style={{ color: 'var(--income)' }} /> : <Copy size={14} />}
                </button>
              </div>

              {timeLeft > 0 && (
                <p className="text-xs text-center" style={{ color: 'var(--text-faint)' }}>
                  Expira en {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')} minutos
                </p>
              )}

              <a
                href={`https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? 'tu_bot'}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: 'rgba(56,189,248,0.1)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.25)' }}
              >
                Abrir bot en Telegram <ExternalLink size={13} />
              </a>

              <button onClick={checkLinkStatus} className="w-full py-2 text-sm" style={{ color: 'var(--accent)' }}>
                ¿Ya lo enviaste? Verificar vinculación →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Registrar webhook (admin) */}
      <div className="rounded-xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Registrar webhook</p>
        <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
          Hacé esto una vez después de cada deploy para que Telegram sepa a dónde enviar los mensajes.
        </p>
        <button
          onClick={registerWebhook}
          disabled={webhookStatus === 'loading'}
          className="w-full py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60"
          style={{ background: 'var(--accent)' }}
        >
          {webhookStatus === 'loading' ? 'Registrando...' : 'Registrar webhook'}
        </button>
        {webhookStatus === 'ok' && (
          <div className="flex items-center gap-2 mt-2 text-sm rounded-xl px-3 py-2" style={{ background: 'var(--income-bg)', color: 'var(--income)' }}>
            <CheckCircle2 size={14} /> {webhookMsg}
          </div>
        )}
        {webhookStatus === 'error' && (
          <div className="flex items-center gap-2 mt-2 text-sm rounded-xl px-3 py-2" style={{ background: 'var(--expense-bg)', color: 'var(--expense)' }}>
            <AlertCircle size={14} /> {webhookMsg}
          </div>
        )}
      </div>
    </div>
  )
}
