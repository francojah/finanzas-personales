import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

// BCRA variable 4 = UVA (Unidad de Valor Adquisitivo)
// Publica el valor de lunes a viernes. Usamos una ventana de 10 días para cubrir fines de semana y feriados.
export async function GET() {
  try {
    const today = new Date()
    const from  = new Date(today)
    from.setDate(today.getDate() - 10)

    const fmt = (d: Date) => d.toISOString().split('T')[0]
    const url = `https://api.bcra.gob.ar/estadisticas/v2/datosvariable/4/${fmt(from)}/${fmt(today)}`

    const res = await fetch(url, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 3600 }, // cache 1 hora — el BCRA publica una vez por día
    })

    if (!res.ok) throw new Error(`BCRA ${res.status}`)

    const json = await res.json()
    const results: { fecha: string; valor: number }[] = json?.results ?? []

    if (!results.length) throw new Error('Sin datos')

    // Ordenar por fecha desc y tomar el más reciente
    results.sort((a, b) => b.fecha.localeCompare(a.fecha))
    const latest = results[0]

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
