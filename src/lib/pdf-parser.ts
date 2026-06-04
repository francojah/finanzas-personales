// ─────────────────────────────────────────────────────────────
// PDF Parser — extrae texto y detecta transacciones bancarias
// ─────────────────────────────────────────────────────────────

export interface DetectedTransaction {
  date: string
  description: string
  amount: number
  type: 'income' | 'expense'
  currency: 'ARS' | 'USD'
  raw: string
}

// ── Extraer texto de un PDF usando PDF.js ─────────────────────
// Reconstruye líneas usando coordenadas x,y para preservar el
// orden correcto de tablas multi-columna.
export async function extractTextFromPDF(file: File): Promise<string> {
  let pdfjsLib: any

  try {
    pdfjsLib = await import('pdfjs-dist')
  } catch {
    throw new Error('PDF_NOT_INSTALLED')
  }

  const version = pdfjsLib.version
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`

  const arrayBuffer = await file.arrayBuffer()

  let pdf: any
  try {
    pdf = await pdfjsLib.getDocument({ data: arrayBuffer, password: '' }).promise
  } catch (err: any) {
    if (err?.name === 'PasswordException' || err?.message?.includes('password')) {
      throw new Error('PDF_PASSWORD')
    }
    throw new Error('PDF_INVALID')
  }

  let fullText = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()

    // ── Reconstruir líneas usando coordenadas x,y ──────────────
    interface TextItem { x: number; y: number; str: string }
    const items: TextItem[] = []

    for (const item of content.items) {
      if (!('str' in item) || !item.str.trim()) continue
      const x = item.transform[4]
      const y = item.transform[5]
      items.push({ x, y, str: item.str })
    }

    // Agrupar por línea: items con y dentro de ±3px son la misma línea
    const lineMap = new Map<number, TextItem[]>()
    for (const item of items) {
      let matched: number | null = null
      for (const key of lineMap.keys()) {
        if (Math.abs(item.y - key) <= 3) { matched = key; break }
      }
      const bucket = matched !== null ? matched : item.y
      if (!lineMap.has(bucket)) lineMap.set(bucket, [])
      lineMap.get(bucket)!.push(item)
    }

    // Ordenar líneas de arriba hacia abajo (y mayor = más arriba en PDF)
    const sortedLines = [...lineMap.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([, items]) => items.sort((a, b) => a.x - b.x).map(i => i.str).join(' '))

    fullText += sortedLines.join('\n') + '\n'
  }

  if (!fullText.trim()) throw new Error('PDF_NO_TEXT')
  return fullText
}

// ── Helpers ───────────────────────────────────────────────────

function parseArgAmount(raw: string): number {
  if (!raw) return 0
  raw = raw.trim()
  const negative = raw.startsWith('-')
  // "1.234,56" → 1234.56
  raw = raw.replace(/^-/, '').replace(/\./g, '').replace(',', '.')
  const val = parseFloat(raw) || 0
  return negative ? -val : val
}

function normDateDDMMYY(raw: string): string {
  // DD/MM/YY → YYYY-MM-DD
  const m = raw.match(/^(\d{2})\/(\d{2})\/(\d{2})$/)
  if (m) return `20${m[3]}-${m[2]}-${m[1]}`
  // DD/MM/YYYY
  const m2 = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (m2) return `${m2[3]}-${m2[2]}-${m2[1]}`
  return new Date().toISOString().split('T')[0]
}

// ── Parser Galicia caja de ahorro / cuenta corriente ──────────
//
// Formato por línea:
//   DD/MM/YY  TIPO [ORIGEN]  [+/-MONTO]  [SALDO]
// Seguido de líneas de detalle (descripción, CUIL, banco, etc.)
//
function parseGalicia(text: string): DetectedTransaction[] {
  // Limpiar encabezados de página que se repiten
  let clean = text
    .replace(/Resumen de Caja de Ahorro en Pesos\s+Página \d+ \/ \d+\s+\S+/g, '')
    .replace(/Resumen de Caja de Ahorro en Pesos\s*/g, '')
    .replace(/Fecha\s+Descripción\s+Origen\s+Crédito\s+Débito\s+Saldo\s*/g, '')
    .replace(/Resumen de Cuenta Corriente.*\n/g, '')

  const results: DetectedTransaction[] = []
  const lines = clean.split('\n')

  // Línea de entrada: DD/MM/YY + texto + monto + saldo
  // El monto puede ser negativo (débito) o positivo (crédito)
  const ENTRY_RE = /^(\d{2}\/\d{2}\/\d{2})\s+(.+?)\s+([-\d.,]{4,})\s+([\d.,]{4,})\s*$/

  let i = 0
  while (i < lines.length) {
    const line = lines[i].trim()
    const m = ENTRY_RE.exec(line)
    if (m) {
      const [raw, dateRaw, mainDesc, amountRaw] = m

      // Recolectar líneas de continuación para enriquecer descripción
      const extras: string[] = []
      let j = i + 1
      while (j < lines.length) {
        const nxt = lines[j].trim()
        if (!nxt || ENTRY_RE.test(lines[j])) break
        // Ignorar: CBUs largos, CLAVEs, "VARIOS", "BANCO DE GALICIA Y B"
        if (/^\d{8,}$/.test(nxt)) { j++; continue }
        if (['VARIOS', 'BANCO DE GALICIA Y B', 'BANCO DE GALICIA'].includes(nxt)) { j++; continue }
        extras.push(nxt)
        j++
      }
      i = j

      const amount = parseArgAmount(amountRaw)
      const type: 'income' | 'expense' = amount >= 0 ? 'income' : 'expense'

      // Descripción: tipo principal + primer detalle relevante
      const detail = extras.find(e => /[a-zA-Z]/.test(e) && !/^\d+$/.test(e))
      const description = detail
        ? `${mainDesc.trim()}: ${detail}`
        : mainDesc.trim()

      results.push({
        date: normDateDDMMYY(dateRaw),
        description,
        amount: Math.abs(amount),
        type,
        currency: 'ARS',
        raw,
      })
    } else {
      i++
    }
  }

  return results
}

// ── Parser genérico (CSV-style, tarjetas, otros bancos) ───────
function parseGeneric(text: string): DetectedTransaction[] {
  const results: DetectedTransaction[] = []
  const lines = text.split('\n')

  // Detectar si hay columnas débito/crédito separadas
  const hasDual = /d[eé]bito.{0,40}cr[eé]dito/i.test(text) ||
                  /cargo.{0,40}abono/i.test(text)

  for (const line of lines) {
    if (line.trim().length < 8) continue

    const dateM = line.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/)
    if (!dateM) continue

    const dateRaw = dateM[1]
    const [d, mo, y] = dateRaw.split(/[\/\-]/)
    const year = y.length === 2 ? `20${y}` : y
    const date = `${year}-${mo.padStart(2,'0')}-${d.padStart(2,'0')}`

    const amounts = [...line.matchAll(/([-\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?)/g)]
      .map(m => parseArgAmount(m[1]))
      .filter(a => Math.abs(a) >= 1)

    if (amounts.length === 0) continue

    const afterDate = line.slice(dateM.index! + dateM[0].length)
    const descM = afterDate.match(/^\s*(.{3,60?}?)\s+[-\d]/)
    const description = descM?.[1]?.trim() || afterDate.trim().slice(0, 60)
    if (!description) continue

    let amount = amounts[0]
    let type: 'income' | 'expense'

    if (hasDual && amounts.length >= 2) {
      type = amounts[1] !== 0 ? 'income' : 'expense'
      amount = amounts[1] !== 0 ? amounts[1] : amounts[0]
    } else {
      const dl = description.toLowerCase()
      type = amount < 0 || dl.match(/compra|débito|debito|cargo|pago/) ? 'expense' : 'income'
    }

    const currency: 'ARS' | 'USD' =
      line.includes('USD') || line.includes('U$S') || line.includes('US$') ? 'USD' : 'ARS'

    results.push({ date, description, amount: Math.abs(amount), type, currency, raw: line })
  }

  return results
}

// ── Auto-detectar banco y parsear ─────────────────────────────
export function detectBankAndParse(text: string): {
  bank: string
  transactions: DetectedTransaction[]
} {
  const tl = text.toLowerCase()

  if (tl.includes('galicia') || tl.includes('caja de ahorro en pesos')) {
    return { bank: 'Banco Galicia', transactions: parseGalicia(text) }
  }
  if (tl.includes('santander')) {
    return { bank: 'Santander', transactions: parseGeneric(text) }
  }
  if (tl.includes('bbva') || tl.includes('frances')) {
    return { bank: 'BBVA', transactions: parseGeneric(text) }
  }
  if (tl.includes('macro')) {
    return { bank: 'Banco Macro', transactions: parseGeneric(text) }
  }
  if (tl.includes('naranja')) {
    return { bank: 'Naranja X', transactions: parseGeneric(text) }
  }
  if (tl.includes('balanz')) {
    return { bank: 'Balanz', transactions: parseGeneric(text) }
  }

  // Intentar Galicia si tiene el patrón DD/MM/YY con montos
  const hasGaliciaPattern = /\d{2}\/\d{2}\/\d{2}\s+\w+.*[-\d.,]{5,}/m.test(text)
  if (hasGaliciaPattern) {
    const txs = parseGalicia(text)
    if (txs.length > 0) return { bank: 'Banco (auto-detectado)', transactions: txs }
  }

  return { bank: 'Genérico', transactions: parseGeneric(text) }
}
