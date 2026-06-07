import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

// BCRA API v4.0 — variable 31 = UVA (Unidad de Valor Adquisitivo, base 31.3.16=14.05)
// La API v2 fue deprecada el 01/06/2025. La v4 usa query params y respuesta anidada en results[0].detalle
export async function GET() {
  try {
    const today = new Date()
    const from  = new Date(today)
    from.setDate(today.getDate() - 10) // ventana de 10 días cubre fines de semana y feriados

    const fmt = (d: Date) => d.toISOString().split('T')[0]
    const url = `https://api.bcra.gob.ar/estadisticas/v4.0/monetarias/31?desde=${fmt(from)}&hasta=${fmt(today)}`

    const res = await fetch(url, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 3600 }, // cache 1 hora — el BCRA publica una vez por día
    })

    if (!res.ok) throw new Error(`BCRA ${res.status}`)

    const json = await res.json()
    // v4 response: { results: [{ idVariable: 31, detalle: [{fecha, valor}] }] }
    const detalle: { fecha: string; valor: number }[] = json?.results?.[0]?.detalle ?? []

    if (!detalle.length) throw new Error('Sin datos')

    // detalle viene ordenado desc — el primero es el más reciente
    const latest = detalle[0]

    return NextResponse.json({
      value: latest.valor,
      date:  latest.fecha,
      source: 'BCRA',
    })
  } catch (e: any) {
    console.error('[uva] error:', e?.message)
    return NextResponse.json({ error: 'No se pudo obtener el valor UVA' }, { status: 502 })
  }
}
