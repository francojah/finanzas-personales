import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// Cliente admin (service role) — solo server-side, nunca expuesto al cliente
function getAdminClient() {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key  = process.env.SUPABASE_SERVICE_ROLE_KEY!
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY no configurada')
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

// Valida la firma que MP envía en el header x-signature
function validateSignature(req: NextRequest, body: string): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET
  if (!secret) return true // sin secret configurado, saltar validación (solo en desarrollo)

  const signature  = req.headers.get('x-signature') ?? ''
  const requestId  = req.headers.get('x-request-id') ?? ''
  const tsMatch    = signature.match(/ts=(\d+)/)
  const v1Match    = signature.match(/v1=([a-f0-9]+)/)
  if (!tsMatch || !v1Match) return false

  const ts      = tsMatch[1]
  const v1      = v1Match[1]
  const dataId  = JSON.parse(body)?.data?.id ?? ''
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts}`
  const expected  = crypto.createHmac('sha256', secret).update(manifest).digest('hex')
  return expected === v1
}

// Obtiene el detalle completo del preapproval (suscripción) desde la API de MP
async function getPreapproval(preapprovalId: string) {
  const res = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
    headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
  })
  if (!res.ok) throw new Error(`MP API error: ${res.status}`)
  return res.json()
}

// Busca el user_id en Supabase por email
async function findUserByEmail(email: string): Promise<string | null> {
  const supabase = getAdminClient()
  const { data } = await supabase.auth.admin.listUsers()
  const user = data?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase())
  return user?.id ?? null
}

// Activa o desactiva premium según el estado de la suscripción
async function syncPlan(userId: string, preapproval: any) {
  const supabase  = getAdminClient()
  const isActive  = preapproval.status === 'authorized'
  const nextDate  = preapproval.next_payment_date
    ? new Date(preapproval.next_payment_date)
    : null
  // Sumar 3 días de gracia al next_payment_date por si el webhook llega tarde
  const expiresAt = nextDate
    ? new Date(nextDate.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString()
    : null

  if (isActive) {
    await supabase.rpc('activate_premium', {
      p_user_id:    userId,
      p_expires_at: expiresAt,
    })
  } else {
    await supabase.rpc('deactivate_premium', { p_user_id: userId })
  }

  // Upsert en tabla subscriptions para tener el historial
  await supabase.from('subscriptions').upsert({
    user_id:               userId,
    mp_subscription_id:    preapproval.id,
    mp_payer_email:        preapproval.payer_email,
    mp_plan_id:            preapproval.preapproval_plan_id,
    status:                isActive ? 'active' : preapproval.status,
    started_at:            preapproval.date_created,
    next_payment_date:     preapproval.next_payment_date ?? null,
    amount:                preapproval.auto_recurring?.transaction_amount ?? null,
    currency:              preapproval.auto_recurring?.currency_id ?? 'ARS',
    updated_at:            new Date().toISOString(),
  }, { onConflict: 'mp_subscription_id' })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()

    // Validar firma MP
    if (!validateSignature(req, body)) {
      console.warn('[MP webhook] Firma inválida')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = JSON.parse(body)
    console.log('[MP webhook] Recibido:', payload.type, payload.action)

    // Solo procesamos eventos de suscripciones
    if (payload.type !== 'subscription_preapproval') {
      return NextResponse.json({ ok: true })
    }

    const preapprovalId = payload.data?.id
    if (!preapprovalId) {
      return NextResponse.json({ error: 'Sin preapproval id' }, { status: 400 })
    }

    // Obtener detalle completo desde MP
    const preapproval = await getPreapproval(preapprovalId)
    const payerEmail  = preapproval.payer_email
    if (!payerEmail) {
      console.warn('[MP webhook] Sin payer_email en preapproval', preapprovalId)
      return NextResponse.json({ error: 'Sin email' }, { status: 400 })
    }

    // Buscar usuario en Supabase
    const userId = await findUserByEmail(payerEmail)
    if (!userId) {
      console.warn('[MP webhook] Usuario no encontrado para email:', payerEmail)
      // Respondemos 200 para que MP no reintente — el usuario puede no estar registrado aún
      return NextResponse.json({ ok: true, note: 'user not found' })
    }

    // Sincronizar plan
    await syncPlan(userId, preapproval)
    console.log('[MP webhook] Plan sincronizado para usuario:', userId, '→', preapproval.status)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[MP webhook] Error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// MP también hace GET para verificar que el endpoint existe
export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'mp-webhook' })
}
