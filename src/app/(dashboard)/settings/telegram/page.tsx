'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Bot, Copy, Check, ExternalLink, AlertCircle, CheckCircle2, Terminal } from 'lucide-react'
import { cn } from '@/lib/utils'

type Status = 'idle' | 'loading' | 'ok' | 'error'

export default function TelegramSettingsPage() {
  const router = useRouter()
  const [copied, setCopied] = useState<string | null>(null)
  const [webhookStatus, setWebhookStatus] = useState<Status>('idle')
  const [webhookMsg, setWebhookMsg] = useState('')
  const [tunnelOption, setTunnelOption] = useState<'ngrok' | 'cloudflare' | 'deploy'>('ngrok')

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  async function registerWebhook() {
    setWebhookStatus('loading')
    setWebhookMsg('')
    const secret = prompt('Ingresa el valor de TELEGRAM_WEBHOOK_SECRET que configuraste:')
    if (!secret) { setWebhookStatus('idle'); return }
    try {
      const res = await fetch(`/api/telegram/webhook?secret=${encodeURIComponent(secret)}`)
      const data = await res.json()
      if (res.ok && data.result?.ok) {
        setWebhookStatus('ok')
        setWebhookMsg(`Webhook registrado: ${data.webhook_url}`)
      } else {
        setWebhookStatus('error')
        setWebhookMsg(data.result?.description ?? data.error ?? 'Error desconocido')
      }
    } catch {
      setWebhookStatus('error')
      setWebhookMsg('Error de red')
    }
  }

  const envVars = [
    { key: 'TELEGRAM_BOT_TOKEN',        desc: 'Token del bot (de @BotFather)',                      example: '123456789:AAF...' },
    { key: 'TELEGRAM_WEBHOOK_SECRET',   desc: 'String aleatorio para validar requests',             example: 'mi-secreto-123' },
    { key: 'TELEGRAM_ALLOWED_CHAT_IDS', desc: 'Tu Chat ID (lo obtenés en el paso 4)',              example: '123456789' },
    { key: 'TELEGRAM_SUPABASE_USER_ID', desc: 'Tu User ID de Supabase (Authentication -> Users)',  example: 'xxxxxxxx-xxxx-...' },
    { key: 'SUPABASE_SERVICE_ROLE_KEY', desc: 'Service Role Key (Supabase -> Project Settings -> API)', example: 'eyJhbGci...' },
    { key: 'NEXT_PUBLIC_APP_URL',       desc: 'URL publica de tu app (tunnel o deploy)',           example: 'https://xxxx.ngrok-free.app' },
  ]

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 rounded-xl"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <Bot size={20} style={{ color: '#38bdf8' }} />
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Bot de Telegram</h1>
        </div>
      </div>

      <div className="rounded-xl p-4 mb-5" style={{ background: 'rgba(56,189,248,0.07)', border: '1px solid rgba(56,189,248,0.2)' }}>
        <p className="text-sm" style={{ color: '#38bdf8' }}>
          Registrá gastos enviando un mensaje desde el celular sin abrir la app.
          También podés adjuntar fotos de comprobantes directamente.
        </p>
      </div>

      <div className="space-y-4">

        {/* Paso 1 */}
        <div className="rounded-xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ background: 'var(--accent)' }}>1</div>
            <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Crear el bot en Telegram</h2>
          </div>
          <div className="text-sm space-y-2" style={{ color: 'var(--text-secondary)' }}>
            <p>Busca <strong>@BotFather</strong> en Telegram. Envia <code className="bg-slate-100 px-1 rounded">/newbot</code>, elige nombre y username. Guarda el Token que te devuelve.</p>
            <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-indigo-600 font-medium hover:underline">
              Abrir @BotFather <ExternalLink size={13} />
            </a>
          </div>
        </div>

        {/* Paso 2 */}
        <div className="rounded-xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ background: 'var(--accent)' }}>2</div>
            <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Exponer la app con una URL publica</h2>
          </div>
          <p className="text-sm text-slate-500 mb-3">Telegram necesita HTTPS para enviar mensajes. Elegis como:</p>

          <div className="flex rounded-xl overflow-hidden mb-4" style={{ border: '1.5px solid var(--border)' }}>
            {(['ngrok', 'cloudflare', 'deploy'] as const).map((opt, i) => {
              const labels: Record<string, string> = { ngrok: 'ngrok', cloudflare: 'Cloudflare', deploy: 'Deploy' }
              const descs: Record<string, string> = { ngrok: 'Facil, para pruebas', cloudflare: 'Gratis y permanente', deploy: 'Railway / Render' }
              return (
                <button key={opt} onClick={() => setTunnelOption(opt)}
                  className={cn('flex-1 py-2 px-2 text-xs font-medium transition-colors text-center',
                    tunnelOption === opt ? 'bg-indigo-600 text-white' : ''
                  )}>
                  <div>{labels[opt]}</div>
                  <div className={cn('text-[10px] mt-0.5', tunnelOption === opt ? 'text-indigo-200' : 'text-slate-400')}>{descs[opt]}</div>
                </button>
              )
            })}
          </div>

          {tunnelOption === 'ngrok' && (
            <div className="text-sm space-y-2" style={{ color: 'var(--text-secondary)' }}>
              <p>Instala ngrok desde <a href="https://ngrok.com/download" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">ngrok.com/download</a>, luego con la app corriendo ejecuta:</p>
              <div className="flex items-center bg-slate-900 text-green-400 rounded-lg px-3 py-2 font-mono text-xs gap-2">
                <Terminal size={12} className="shrink-0" />
                <span>ngrok http 3000</span>
                <button onClick={() => copy('ngrok http 3000', 'ngrok')} className="ml-auto text-slate-400 hover:text-white">
                  {copied === 'ngrok' ? <Check size={12} /> : <Copy size={12} />}
                </button>
              </div>
              <p>Copia la URL <code className="bg-slate-100 px-1 rounded">https://xxxx.ngrok-free.app</code> y pegala en <code className="bg-slate-100 px-1 rounded">NEXT_PUBLIC_APP_URL</code>.</p>
              <p className="text-amber-700 bg-amber-50 rounded-xl px-3 py-2 text-xs">La URL cambia cada vez que reinicias ngrok — hay que re-registrar el webhook.</p>
            </div>
          )}

          {tunnelOption === 'cloudflare' && (
            <div className="text-sm space-y-2" style={{ color: 'var(--text-secondary)' }}>
              <p>Instala cloudflared:</p>
              <div className="flex items-center bg-slate-900 text-green-400 rounded-lg px-3 py-2 font-mono text-xs gap-2">
                <Terminal size={12} className="shrink-0" />
                <span>brew install cloudflared</span>
                <button onClick={() => copy('brew install cloudflared', 'cf1')} className="ml-auto text-slate-400 hover:text-white">
                  {copied === 'cf1' ? <Check size={12} /> : <Copy size={12} />}
                </button>
              </div>
              <p>Luego con la app corriendo:</p>
              <div className="flex items-center bg-slate-900 text-green-400 rounded-lg px-3 py-2 font-mono text-xs gap-2">
                <Terminal size={12} className="shrink-0" />
                <span>cloudflared tunnel --url http://localhost:3000</span>
                <button onClick={() => copy('cloudflared tunnel --url http://localhost:3000', 'cf2')} className="ml-auto text-slate-400 hover:text-white">
                  {copied === 'cf2' ? <Check size={12} /> : <Copy size={12} />}
                </button>
              </div>
              <p className="text-green-700 bg-green-50 rounded-xl px-3 py-2 text-xs">La URL es permanente mientras el proceso este corriendo.</p>
            </div>
          )}

          {tunnelOption === 'deploy' && (
            <div className="text-sm space-y-2" style={{ color: 'var(--text-secondary)' }}>
              <p>Deploya la app para tener una URL fija sin depender del server local:</p>
              {[
                { name: 'Railway', url: 'https://railway.app', desc: 'Deploy con un click desde GitHub. Plan gratis disponible.' },
                { name: 'Render',  url: 'https://render.com',  desc: 'Soporta Next.js directamente. Plan free con sleep automatico.' },
                { name: 'Fly.io',  url: 'https://fly.io',      desc: 'Muy estable. Plan free generoso.' },
              ].map(p => (
                <a key={p.name} href={p.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-between px-4 py-3 rounded-xl border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors group">
                  <div>
                    <p className="font-semibold text-slate-800 group-hover:text-indigo-700">{p.name}</p>
                    <p className="text-xs text-slate-400">{p.desc}</p>
                  </div>
                  <ExternalLink size={14} className="text-slate-300 group-hover:text-indigo-400" />
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Paso 3 */}
        <div className="rounded-xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ background: 'var(--accent)' }}>3</div>
            <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Configurar variables de entorno</h2>
          </div>
          <p className="text-sm text-slate-500 mb-3">Agrega estas lineas a tu <code className="bg-slate-100 px-1 rounded">.env.local</code> y reinicia el servidor:</p>
          <div className="space-y-2">
            {envVars.map(v => (
              <div key={v.key} className="rounded-xl px-4 py-3" style={{ background: 'var(--surface-elevated)' }}>
                <div className="flex items-center justify-between gap-2">
                  <code className="text-xs font-bold" style={{ color: 'var(--accent-icon)' }}>{v.key}</code>
                  <button onClick={() => copy(v.key, v.key)} className="text-slate-400 hover:text-slate-600 shrink-0">
                    {copied === v.key ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1">{v.desc}</p>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">ej: {v.example}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Paso 4 */}
        <div className="rounded-xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ background: 'var(--accent)' }}>4</div>
            <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Obtener tu Chat ID</h2>
          </div>
          <div className="text-sm space-y-2" style={{ color: 'var(--text-secondary)' }}>
            <p>Con todo configurado, abre tu bot en Telegram y envia:</p>
            <code className="block bg-slate-100 rounded-lg px-3 py-2 text-indigo-700 font-mono">/start</code>
            <p>El bot responde con tu Chat ID. Copialo y pegalo en <code className="bg-slate-100 px-1 rounded">TELEGRAM_ALLOWED_CHAT_IDS</code> del <code>.env.local</code> y reinicia el server.</p>
          </div>
        </div>

        {/* Paso 5 */}
        <div className="rounded-xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ background: 'var(--accent)' }}>5</div>
            <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Registrar el webhook</h2>
          </div>
          <div className="space-y-3">
            <p className="text-sm text-slate-600">Con la URL publica activa y las variables configuradas:</p>
            <button onClick={registerWebhook} disabled={webhookStatus === 'loading'}
              className="w-full py-2.5 rounded-xl text-white text-sm font-semibold transition-colors disabled:opacity-60" style={{ background: 'var(--accent)' }}>
              {webhookStatus === 'loading' ? 'Registrando...' : 'Registrar webhook'}
            </button>
            {webhookStatus === 'ok' && (
              <div className="flex items-start gap-2 text-sm text-green-700 bg-green-50 rounded-xl px-3 py-2.5">
                <CheckCircle2 size={15} className="shrink-0 mt-0.5" />
                <span>{webhookMsg}</span>
              </div>
            )}
            {webhookStatus === 'error' && (
              <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 rounded-xl px-3 py-2.5">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>{webhookMsg}</span>
              </div>
            )}
          </div>
        </div>

        {/* Uso */}
        <div className="rounded-xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-7 h-7 rounded-full bg-green-500 text-white text-sm font-bold flex items-center justify-center shrink-0">✓</div>
            <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Como usarlo</h2>
          </div>
          <div className="space-y-1.5">
            {[
              ['15000 alquiler',        'Gasto $15.000'],
              ['+50000 sueldo',         'Ingreso $50.000'],
              ['USD 200 netflix',       'Gasto USD 200'],
              ['foto + "15000 coto"',   'Sube comprobante + registra gasto'],
              ['foto sola',             'Solo sube el comprobante'],
            ].map(([msg, desc]) => (
              <div key={msg} className="flex items-center gap-3">
                <code className="px-2 py-1 rounded text-xs font-mono shrink-0" style={{ background: 'var(--accent-bg)', color: 'var(--accent-icon)' }}>{msg}</code>
                <span className="text-xs" style={{ color: 'var(--text-faint)' }}>{'-> '}{desc}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
