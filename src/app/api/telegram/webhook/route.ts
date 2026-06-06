import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ── Config ────────────────────────────────────────────────────
const BOT_TOKEN      = process.env.TELEGRAM_BOT_TOKEN ?? ''
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET ?? ''
const API            = `https://api.telegram.org/bot${BOT_TOKEN}`

// ── Supabase admin ────────────────────────────────────────────
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

// ── Buscar usuario vinculado por chat_id ──────────────────────
async function getUserByChatId(chatId: string): Promise<string | null> {
  const { data } = await adminSupabase()
    .from('telegram_links')
    .select('user_id')
    .eq('chat_id', chatId)
    .single()
  return data?.user_id ?? null
}

// ── Parsear texto ─────────────────────────────────────────────
function parseText(text: string): {
  amount: number; description: string
  type: 'income' | 'expense'; currency: 'ARS' | 'USD'
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
  const normalized = /^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(raw)
    ? raw.replace(/\./g, '').replace(',', '.')
    : raw.replace(',', '.')
  const amount = parseFloat(normalized)
  if (isNaN(amount) || amount <= 0) return null
  return { amount, description: desc.trim(), type: sign === '+' ? 'income' : 'expense', currency }
}

// ── Subir comprobante a Storage ───────────────────────────────
async function uploadReceipt(fileUrl: string, userId: string): Promise<string | null> {
  try {
    const res = await fetch(fileUrl)
    if (!res.ok) return null
    const blob = await res.blob()
    const ext = fileUrl.split('.').pop()?.split('?')[0] ?? 'jpg'
    const path = `${userId}/receipts/tg_${Date.now()}.${ext}`
    const supabase = adminSupabase()
    const { error } = await supabase.storage.from('receipts').upload(path, blob, { contentType: blob.type || 'image/jpeg' })
    if (error) return null
    return supabase.storage.from('receipts').getPublicUrl(path).data.publicUrl
  } catch { return null }
}

// ── Obtener tipo de cambio ────────────────────────────────────
async function getRate(): Promise<number> {
  try {
    const r = await fetch('https://dolarapi.com/v1/dolares/blue')
    const d = await r.json()
    return d?.venta ?? 1200
  } catch { return 1200 }
}

// ── Crear transacción ─────────────────────────────────────────
async function createTransaction(userId: string, p: {
  amount: number; type: 'income' | 'expense'
  currency: 'ARS' | 'USD'; description: string; receipt_url: string | null
}) {
  const rate = await getRate()
  const amount_ars = p.currency === 'ARS' ? p.amount : p.amount * rate
  const amount_usd = p.currency === 'USD' ? p.amount : p.amount / rate
  const { error } = await adminSupabase().from('transactions').insert({
    user_id: userId, type: p.type,
    amount_original: p.amount, currency_original: p.currency,
    amount_ars, amount_usd, exchange_rate: rate, exchange_rate_type: 'blue',
    description: p.description || null, receipt_url: p.receipt_url,
    date: new Date().toISOString().split('T')[0],
    is_recurring: false, has_installments: false,
  })
  return !error
}

function fmtARS(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
}

// ── POST: recibir updates de Telegram ────────────────────────
export async function POST(req: NextRequest) {
  // Validar secret — si no está configurado en Vercel, saltar la validación
  if (WEBHOOK_SECRET) {
    const token = req.headers.get('x-telegram-bot-api-secret-token')
    if (token !== WEBHOOK_SECRET) {
      console.error('[TG] 401 — token recibido:', token, '— esperado:', WEBHOOK_SECRET)
      return NextResponse.json({ ok: false }, { status: 401 })
    }
  }
  if (!BOT_TOKEN) return NextResponse.json({ ok: true })

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ ok: true }) }

  const msg = body?.message
  if (!msg) return NextResponse.json({ ok: true })

  // Wrap general para evitar crashes silenciosos
  try {

  const chatId    = String(msg.chat?.id)
  const firstName = msg.from?.first_name ?? ''
  const username  = msg.from?.username ?? ''
  const text      = (msg.text ?? msg.caption ?? '').trim()
  const photo     = msg.photo as any[] | undefined
  const document  = msg.document as any | undefined

  // ── /start ─────────────────────────────────────────────────
  if (text === '/start' || text === '/ayuda' || text === '/help') {
    const userId = await getUserByChatId(chatId)
    if (userId) {
      await sendMessage(chatId, `💰 <b>REGI$TRATIO Bot</b>

Hola, ${firstName}! Tu cuenta está vinculada ✅

<b>Registrar movimientos:</b>
• <code>15000 alquiler</code> → gasto $15.000
• <code>+50000 sueldo</code> → ingreso $50.000
• <code>USD 200 netflix</code> → gasto USD 200
• Foto con caption → comprobante + registra

<b>Consultas:</b>
• <code>/saldo</code> → balance del mes
• <code>/desvincular</code> → desconectar cuenta`)
    } else {
      await sendMessage(chatId, `💰 <b>REGI$TRATIO Bot</b>

Tu Chat ID es: <code>${chatId}</code>

Para vincular tu cuenta de REGI$TRATIO:
1. Entrá a la app → Configuración → Bot de Telegram
2. Generá un código de vinculación
3. Enviámelo acá con: <code>/link TU-CODIGO</code>`)
    }
    return NextResponse.json({ ok: true })
  }

  // ── /link CODIGO ────────────────────────────────────────────
  if (text.startsWith('/link ')) {
    const code = text.slice(6).trim().toUpperCase()
    const supabase = adminSupabase()

    // Buscar código válido
    const { data: linkCode } = await supabase
      .from('telegram_link_codes')
      .select('user_id, expires_at')
      .eq('code', code)
      .single()

    if (!linkCode) {
      await sendMessage(chatId, '❌ Código inválido. Generá uno nuevo desde la app.')
      return NextResponse.json({ ok: true })
    }
    if (new Date(linkCode.expires_at) < new Date()) {
      await supabase.from('telegram_link_codes').delete().eq('code', code)
      await sendMessage(chatId, '⏰ El código expiró. Generá uno nuevo desde la app.')
      return NextResponse.json({ ok: true })
    }

    // Vincular chat_id ↔ user_id
    await supabase.from('telegram_links').upsert({
      user_id: linkCode.user_id, chat_id: chatId,
      username: username || null, first_name: firstName || null,
    }, { onConflict: 'user_id' })

    // Eliminar código usado
    await supabase.from('telegram_link_codes').delete().eq('code', code)

    await sendMessage(chatId, `✅ <b>¡Cuenta vinculada!</b>

Hola, ${firstName}! Ya podés registrar gastos e ingresos desde acá.

Escribí <code>/ayuda</code> para ver todos los comandos.`)
    return NextResponse.json({ ok: true })
  }

  // ── /desvincular ────────────────────────────────────────────
  if (text === '/desvincular') {
    await adminSupabase().from('telegram_links').delete().eq('chat_id', chatId)
    await sendMessage(chatId, '🔓 Cuenta desvinculada. Podés vincular otra cuenta cuando quieras.')
    return NextResponse.json({ ok: true })
  }

  // Para el resto de comandos, el usuario debe estar vinculado
  const userId = await getUserByChatId(chatId)

  if (!userId) {
    await sendMessage(chatId, `⚠️ Tu cuenta no está vinculada.

1. Entrá a REGI$TRATIO → Configuración → Bot de Telegram
2. Generá un código y envialo con <code>/link TU-CODIGO</code>`)
    return NextResponse.json({ ok: true })
  }

  // ── /saldo ──────────────────────────────────────────────────
  if (text === '/saldo') {
    try {
      const now = new Date()
      const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
      const to = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${lastDay}`
      const { data: txs } = await adminSupabase()
        .from('transactions').select('type, amount_ars')
        .eq('user_id', userId).neq('type', 'transfer')
        .gte('date', from).lte('date', to)
      const income  = (txs ?? []).filter((t: any) => t.type === 'income').reduce((s: number, t: any) => s + t.amount_ars, 0)
      const expense = (txs ?? []).filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + t.amount_ars, 0)
      const balance = income - expense
      const month = now.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
      await sendMessage(chatId, `📊 <b>Balance de ${month}</b>

💚 Ingresos:  ${fmtARS(income)}
❤️ Gastos:    ${fmtARS(expense)}
${balance >= 0 ? '✅' : '⚠️'} Balance:    ${fmtARS(balance)}`)
    } catch {
      await sendMessage(chatId, '❌ Error al consultar el saldo.')
    }
    return NextResponse.json({ ok: true })
  }

  // ── Foto / documento ────────────────────────────────────────
  if (photo || document) {
    const fileId   = photo ? photo[photo.length - 1].file_id : document.file_id
    const fileUrl  = await getTelegramFileUrl(fileId)
    const receipt  = fileUrl ? await uploadReceipt(fileUrl, userId) : null
    const parsed   = text ? parseText(text) : null
    if (parsed && parsed.amount > 0) {
      const ok  = await createTransaction(userId, { ...parsed, receipt_url: receipt })
      const sym = parsed.currency === 'USD' ? `USD ${parsed.amount.toFixed(2)}` : fmtARS(parsed.amount)
      await sendMessage(chatId, ok
        ? `✅ <b>${parsed.type === 'income' ? 'Ingreso' : 'Gasto'} registrado</b>\n💰 ${parsed.type === 'income' ? '+' : '-'}${sym}${parsed.description ? `\n📝 ${parsed.description}` : ''}${receipt ? '\n📎 Comprobante guardado' : ''}`
        : '❌ Error al guardar.')
    } else if (receipt) {
      await createTransaction(userId, { amount: 0, type: 'expense', currency: 'ARS', description: text || 'Comprobante', receipt_url: receipt })
      await sendMessage(chatId, `📎 Comprobante subido.\n⚠️ Sin monto — editalo en la app.\n\nTip: <code>15000 descripción</code>`)
    } else {
      await sendMessage(chatId, '❌ No se pudo procesar la imagen.')
    }
    return NextResponse.json({ ok: true })
  }

  // ── Texto libre ─────────────────────────────────────────────
  if (text) {
    const parsed = parseText(text)
    if (!parsed) {
      await sendMessage(chatId, `❓ No entendí. Formato:\n• <code>15000 descripción</code>\n• <code>+50000 ingreso</code>\n• <code>USD 200 dólares</code>\n\nO escribí /ayuda`)
      return NextResponse.json({ ok: true })
    }
    const ok  = await createTransaction(userId, { ...parsed, receipt_url: null })
    const sym = parsed.currency === 'USD' ? `USD ${parsed.amount.toFixed(2)}` : fmtARS(parsed.amount)
    await sendMessage(chatId, ok
      ? `✅ <b>${parsed.type === 'income' ? 'Ingreso' : 'Gasto'}</b>\n💰 ${parsed.type === 'income' ? '+' : '-'}${sym}${parsed.description ? `\n📝 ${parsed.description}` : ''}\n📅 ${new Date().toLocaleDateString('es-AR')}`
      : '❌ Error al guardar.')
  }

  return NextResponse.json({ ok: true })
}

// ── GET: registrar webhook ────────────────────────────────────
export async function GET(req: NextRequest) {
  const secret = new URL(req.url).searchParams.get('secret')
  if (!secret || secret !== WEBHOOK_SECRET) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!BOT_TOKEN) return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN no configurado' }, { status: 400 })
  const base = process.env.NEXT_PUBLIC_APP_URL ?? req.headers.get('origin') ?? ''
  const res  = await fetch(`${API}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: `${base}/api/telegram/webhook`,
      secret_token: WEBHOOK_SECRET || undefined,
      allowed_updates: ['message'],
    }),
  })
  return NextResponse.json({ result: await res.json() })
}
