import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ── Config ────────────────────────────────────────────────────
const BOT_TOKEN     = process.env.TELEGRAM_BOT_TOKEN ?? ''
const ALLOWED_IDS   = (process.env.TELEGRAM_ALLOWED_CHAT_IDS ?? '').split(',').map(s => s.trim()).filter(Boolean)
const SUPABASE_USER = process.env.TELEGRAM_SUPABASE_USER_ID ?? ''
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET ?? ''

const API = `https://api.telegram.org/bot${BOT_TOKEN}`

// ── Supabase admin (service role) ─────────────────────────────
function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

// ── Telegram helpers ──────────────────────────────────────────
async function sendMessage(chatId: number | string, text: string) {
  await fetch(`${API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  })
}

async function getTelegramFileUrl(fileId: string): Promise<string | null> {
  const res = await fetch(`${API}/getFile?file_id=${fileId}`)
  const data = await res.json()
  const path = data?.result?.file_path
  return path ? `https://api.telegram.org/file/bot${BOT_TOKEN}/${path}` : null
}

// ── Parsear texto ─────────────────────────────────────────────
// Soporta: "15000 alquiler", "+50000 sueldo", "1.500,50 coto", "USD 200 netflix"
function parseText(text: string): {
  amount: number
  description: string
  type: 'income' | 'expense'
  currency: 'ARS' | 'USD'
} | null {
  text = text.trim()

  let currency: 'ARS' | 'USD' = 'ARS'
  if (/\busd\b/i.test(text)) {
    currency = 'USD'
    text = text.replace(/\busd\b/gi, '').trim()
  }

  const m = text.match(/^([+-]?)\s*([\d.,]+)\s*(.*)$/)
  if (!m) return null

  const [, sign, raw, desc] = m
  // Normalizar formato argentino "1.500,50" → "1500.50"
  const normalized = /^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(raw)
    ? raw.replace(/\./g, '').replace(',', '.')
    : raw.replace(',', '.')

  const amount = parseFloat(normalized)
  if (isNaN(amount) || amount <= 0) return null

  return {
    amount,
    description: desc.trim(),
    type: sign === '+' ? 'income' : 'expense',
    currency,
  }
}

// ── Subir imagen a Supabase Storage ──────────────────────────
async function uploadReceipt(fileUrl: string): Promise<string | null> {
  try {
    const res = await fetch(fileUrl)
    if (!res.ok) return null
    const blob = await res.blob()
    const ext = fileUrl.split('.').pop()?.split('?')[0] ?? 'jpg'
    const path = `${SUPABASE_USER}/receipts/tg_${Date.now()}.${ext}`
    const supabase = adminSupabase()
    const { error } = await supabase.storage
      .from('receipts')
      .upload(path, blob, { contentType: blob.type || 'image/jpeg' })
    if (error) return null
    return supabase.storage.from('receipts').getPublicUrl(path).data.publicUrl
  } catch {
    return null
  }
}

// ── Crear transacción ─────────────────────────────────────────
async function createTransaction(p: {
  amount: number
  type: 'income' | 'expense'
  currency: 'ARS' | 'USD'
  description: string
  receipt_url: string | null
}) {
  const supabase = adminSupabase()

  let rate = 1200
  try {
    const r = await fetch('https://api.bluelytics.com.ar/v2/latest')
    const d = await r.json()
    rate = d.blue?.value_sell ?? d.oficial?.value_sell ?? 1200
  } catch {}

  const amount_ars = p.currency === 'ARS' ? p.amount : p.amount * rate
  const amount_usd = p.currency === 'USD' ? p.amount : p.amount / rate

  const { error } = await supabase.from('transactions').insert({
    user_id: SUPABASE_USER,
    type: p.type,
    amount_original: p.amount,
    currency_original: p.currency,
    amount_ars,
    amount_usd,
    exchange_rate: rate,
    exchange_rate_type: 'blue',
    description: p.description || null,
    receipt_url: p.receipt_url,
    date: new Date().toISOString().split('T')[0],
    is_recurring: false,
    has_installments: false,
  })
  return !error
}

function fmtARS(n: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', maximumFractionDigits: 0,
  }).format(n)
}

// ── POST: recibir updates de Telegram ────────────────────────
export async function POST(req: NextRequest) {
  if (WEBHOOK_SECRET) {
    const token = req.headers.get('x-telegram-bot-api-secret-token')
    if (token !== WEBHOOK_SECRET) return NextResponse.json({ ok: false }, { status: 401 })
  }
  if (!BOT_TOKEN) return NextResponse.json({ ok: true })

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ ok: true }) }

  const msg = body?.message
  if (!msg) return NextResponse.json({ ok: true })

  const chatId = msg.chat?.id
  if (ALLOWED_IDS.length > 0 && !ALLOWED_IDS.includes(String(chatId))) {
    await sendMessage(chatId, '⛔ No tenés acceso a este bot.')
    return NextResponse.json({ ok: true })
  }
  if (!SUPABASE_USER) {
    await sendMessage(chatId, '⚠️ Bot sin configurar. Completá <code>TELEGRAM_SUPABASE_USER_ID</code>.')
    return NextResponse.json({ ok: true })
  }

  const text = (msg.text ?? msg.caption ?? '').trim()
  const photo = msg.photo as any[] | undefined
  const document = msg.document as any | undefined

  // /start o /help
  if (text === '/start' || text === '/help' || text === '/ayuda') {
    await sendMessage(chatId, `💰 <b>Finanzapp Bot</b>

Tu Chat ID: <code>${chatId}</code>
Guardalo en Configuración → Bot de Telegram.

<b>Registrar movimientos:</b>
• <code>15000 alquiler</code> → gasto $15.000
• <code>+50000 sueldo</code> → ingreso $50.000
• <code>USD 200 netflix</code> → gasto USD 200
• Foto con caption → sube comprobante y registra

<b>Consultas:</b>
• <code>/saldo</code> → balance del mes actual
• <code>/ayuda</code> → este mensaje`)
    return NextResponse.json({ ok: true })
  }

  // /saldo — balance del mes actual
  if (text === '/saldo') {
    try {
      const supabase = adminSupabase()
      const now = new Date()
      const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
      const to = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${lastDay}`

      const { data: txs } = await supabase
        .from('transactions')
        .select('type, amount_ars')
        .eq('user_id', SUPABASE_USER)
        .neq('type', 'transfer')
        .gte('date', from)
        .lte('date', to)

      const income  = (txs ?? []).filter((t: any) => t.type === 'income').reduce((s: number, t: any) => s + t.amount_ars, 0)
      const expense = (txs ?? []).filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + t.amount_ars, 0)
      const balance = income - expense
      const month = now.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })

      await sendMessage(chatId, `📊 <b>Balance de ${month}</b>

💚 Ingresos: ${fmtARS(income)}
❤️ Gastos: ${fmtARS(expense)}
${balance >= 0 ? '✅' : '⚠️'} Balance: ${fmtARS(balance)}`)
    } catch {
      await sendMessage(chatId, '❌ Error al consultar el saldo.')
    }
    return NextResponse.json({ ok: true })
  }

  // Foto o documento
  if (photo || document) {
    const fileId = photo ? photo[photo.length - 1].file_id : document.file_id
    const fileUrl = await getTelegramFileUrl(fileId)
    const receiptUrl = fileUrl ? await uploadReceipt(fileUrl) : null
    const parsed = text ? parseText(text) : null

    if (parsed && parsed.amount > 0) {
      const ok = await createTransaction({ ...parsed, receipt_url: receiptUrl })
      const sign = parsed.type === 'income' ? '+' : '-'
      const sym = parsed.currency === 'USD' ? `USD ${parsed.amount.toFixed(2)}` : fmtARS(parsed.amount)
      await sendMessage(chatId, ok
        ? `✅ <b>${parsed.type === 'income' ? 'Ingreso' : 'Gasto'} registrado</b>\n💰 ${sign}${sym}${parsed.description ? `\n📝 ${parsed.description}` : ''}${receiptUrl ? '\n📎 Comprobante guardado' : ''}`
        : '❌ Error al guardar. Revisá la app.')
    } else if (receiptUrl) {
      await createTransaction({ amount: 0, type: 'expense', currency: 'ARS', description: text || 'Comprobante', receipt_url: receiptUrl })
      await sendMessage(chatId, `📎 Comprobante subido.\n⚠️ Sin monto detectado — editá el movimiento en la app.\n\nTip: agregá el monto en el caption: <code>15000 descripción</code>`)
    } else {
      await sendMessage(chatId, '❌ No se pudo procesar la imagen.')
    }
    return NextResponse.json({ ok: true })
  }

  // Texto puro
  if (text) {
    const parsed = parseText(text)
    if (!parsed) {
      await sendMessage(chatId, `❓ No entendí. Formato:\n• <code>15000 descripción</code>\n• <code>+50000 ingreso</code>\n• <code>USD 200 dólares</code>\n\nO enviá /help`)
      return NextResponse.json({ ok: true })
    }
    const ok = await createTransaction({ ...parsed, receipt_url: null })
    const sign = parsed.type === 'income' ? '+' : '-'
    const sym = parsed.currency === 'USD' ? `USD ${parsed.amount.toFixed(2)}` : fmtARS(parsed.amount)
    const today = new Date().toLocaleDateString('es-AR')
    await sendMessage(chatId, ok
      ? `✅ <b>${parsed.type === 'income' ? 'Ingreso' : 'Gasto'} registrado</b>\n💰 ${sign}${sym}${parsed.description ? `\n📝 ${parsed.description}` : ''}\n📅 ${today}`
      : '❌ Error al guardar. Revisá la configuración.')
  }

  return NextResponse.json({ ok: true })
}

// GET: registrar webhook (llamar una vez desde el navegador)
export async function GET(req: NextRequest) {
  const secret = new URL(req.url).searchParams.get('secret')
  if (!secret || secret !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!BOT_TOKEN) return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN no configurado' }, { status: 400 })

  const base = process.env.NEXT_PUBLIC_APP_URL ?? req.headers.get('origin') ?? ''
  const webhookUrl = `${base}/api/telegram/webhook`

  const res = await fetch(`${API}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: WEBHOOK_SECRET || undefined,
      allowed_updates: ['message'],
    }),
  })
  return NextResponse.json({ webhook_url: webhookUrl, result: await res.json() })
}
