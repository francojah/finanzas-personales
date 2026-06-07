'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Upload, FileText, Table, ChevronRight, ChevronLeft,
  Check, X, AlertCircle, Loader2, RefreshCw, Sparkles,
} from 'lucide-react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase/client'
import { useCategories } from '@/hooks/useCategories'
import { useAccounts } from '@/hooks/useAccounts'
import { useExchangeRate } from '@/hooks/useExchangeRate'
import { formatARS, formatUSD, cn } from '@/lib/utils'
import { extractTextFromPDF, detectBankAndParse } from '@/lib/pdf-parser'
import { suggestCategoriesBatch } from '@/lib/category-matcher'
import type { CategorySuggestion } from '@/lib/category-matcher'
import { toast } from 'sonner'
import { PlanGate } from '@/components/shared/PlanGate'

// ─── Tipos ────────────────────────────────────────────────────
interface RawRow { [key: string]: string }

interface ParsedTransaction {
  id: string
  date: string
  description: string
  amount: number
  type: 'income' | 'expense'
  currency: 'ARS' | 'USD'
  category_id: string
  subcategory_id: string
  account_id: string
  selected: boolean
  error?: string
  suggestion?: CategorySuggestion
}

interface ColumnMap {
  date: string; description: string; amount: string
  debit: string; credit: string; currency: string
  mode: 'single' | 'debit_credit'
}

const STEPS = ['Subir archivo', 'Mapear columnas', 'Revisar e importar']

const DATE_HINTS     = ['fecha', 'date', 'f.', 'f.operacion', 'periodo', 'dia']
const DESC_HINTS     = ['descripcion', 'concepto', 'detalle', 'description', 'movimiento', 'comercio', 'comprobante']
const AMOUNT_HINTS   = ['importe', 'monto', 'amount', 'valor', 'total']
const DEBIT_HINTS    = ['debito', 'debit', 'cargo', 'egreso', 'debe', 'salida']
const CREDIT_HINTS   = ['credito', 'credit', 'abono', 'ingreso', 'haber', 'entrada']
const CURRENCY_HINTS = ['moneda', 'currency', 'divisa']

function matchColumn(headers: string[], hints: string[]): string {
  return headers.find(h => hints.some(hint => h.toLowerCase().includes(hint))) ?? ''
}

function parseDate(raw: string): string {
  if (!raw) return new Date().toISOString().split('T')[0]
  raw = raw.trim()
  const dmyMatch = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/)
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch
    return `${y.length === 2 ? `20${y}` : y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`
  }
  if (/^(\d{4})-(\d{1,2})-(\d{1,2})/.test(raw)) return raw.slice(0, 10)
  const serial = parseFloat(raw)
  if (!isNaN(serial) && serial > 40000) {
    const date = XLSX.SSF.parse_date_code(serial)
    if (date) return `${date.y}-${String(date.m).padStart(2,'0')}-${String(date.d).padStart(2,'0')}`
  }
  return new Date().toISOString().split('T')[0]
}

function parseAmount(raw: string): number {
  if (!raw && raw !== 0 as any) return 0
  const str = String(raw).trim()
  if (!str) return 0

  // Detectar signo antes de limpiar
  const isNegative = str.includes('-')

  // Quitar todo excepto dígitos, coma y punto
  const cleaned = str.replace(/[^0-9.,]/g, '')
  if (!cleaned) return 0

  const lastComma = cleaned.lastIndexOf(',')
  const lastDot   = cleaned.lastIndexOf('.')

  let normalized: string

  if (lastComma > lastDot) {
    // Formato argentino/europeo: 83.250,00 → coma es decimal
    normalized = cleaned.replace(/\./g, '').replace(',', '.')
  } else if (lastDot > lastComma && lastComma !== -1) {
    // Formato anglosajón: 83,250.00 → punto es decimal
    normalized = cleaned.replace(/,/g, '')
  } else if (lastDot !== -1 && lastComma === -1) {
    // Solo punto: puede ser miles (83.250) o decimal (83.25)
    // Si hay exactamente 3 dígitos después del punto → miles; si no → decimal
    const afterDot = cleaned.substring(lastDot + 1)
    normalized = afterDot.length === 3 && !cleaned.startsWith('0')
      ? cleaned.replace('.', '')   // era miles
      : cleaned                    // era decimal
  } else if (lastComma !== -1 && lastDot === -1) {
    // Solo coma
    const afterComma = cleaned.substring(lastComma + 1)
    normalized = afterComma.length === 3
      ? cleaned.replace(',', '')   // era miles
      : cleaned.replace(',', '.')  // era decimal
  } else {
    normalized = cleaned
  }

  const value = parseFloat(normalized)
  return isNaN(value) ? 0 : Math.abs(value)
}

// Colores de confianza
const CONFIDENCE_STYLES = {
  high:   { color: 'var(--income)',    bg: 'var(--income-bg)',   label: '✦ Alta confianza' },
  medium: { color: '#fbbf24',          bg: 'rgba(251,191,36,0.1)', label: '✦ Sugerido' },
  low:    { color: 'var(--text-muted)', bg: 'var(--surface-elevated)', label: '✦ Posible' },
}

// ─── Componente principal ─────────────────────────────────────
export default function ImportPage() {
  return <PlanGate feature="import" featureLabel="Importar extracto"><ImportPageContent /></PlanGate>
}

function ImportPageContent() {
  const router   = useRouter()
  const supabase = createClient()
  const { categories } = useCategories()
  const { accounts }   = useAccounts()
  const { mep }        = useExchangeRate()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [step, setStep]                   = useState(0)
  const [isDragging, setIsDragging]       = useState(false)
  const [fileName, setFileName]           = useState('')
  const [fileType, setFileType]           = useState<'csv' | 'excel' | 'pdf'>('csv')
  const [rawRows, setRawRows]             = useState<RawRow[]>([])
  const [headers, setHeaders]             = useState<string[]>([])
  const [colMap, setColMap]               = useState<ColumnMap>({ date: '', description: '', amount: '', debit: '', credit: '', currency: '', mode: 'debit_credit' })
  const [defaultCurrency, setDefaultCurrency] = useState<'ARS' | 'USD'>('ARS')
  const [defaultAccount, setDefaultAccount]   = useState('')
  const [transactions, setTransactions]   = useState<ParsedTransaction[]>([])
  const [importing, setImporting]         = useState(false)
  const [pdfProcessing, setPdfProcessing] = useState(false)
  const [suggesting, setSuggesting]       = useState(false)
  const [detectedBank, setDetectedBank]   = useState('')
  const [rawPdfText, setRawPdfText]       = useState('')
  const [showRawText, setShowRawText]     = useState(false)

  // ── Auto-categorizar un batch de transacciones ───────────────
  async function applySuggestions(txs: ParsedTransaction[]): Promise<ParsedTransaction[]> {
    setSuggesting(true)
    try {
      const suggestions = await suggestCategoriesBatch(
        txs.map(t => ({ id: t.id, description: t.description, type: t.type })),
        categories,
        supabase,
      )
      return txs.map(tx => {
        const s = suggestions[tx.id]
        if (!s) return tx
        return {
          ...tx,
          category_id:    s.category_id,
          subcategory_id: s.subcategory_id,
          suggestion:     s,
        }
      })
    } finally {
      setSuggesting(false)
    }
  }

  // ── Paso 1: Procesar archivo ──────────────────────────────────
  async function processFile(file: File) {
    setFileName(file.name)
    const ext = file.name.split('.').pop()?.toLowerCase()

    if (ext === 'csv') {
      setFileType('csv')
      Papa.parse(file, {
        header: true, skipEmptyLines: true, encoding: 'UTF-8',
        complete: ({ data, meta }) => {
          const rows = data as RawRow[]
          setRawRows(rows); setHeaders(meta.fields ?? [])
          autoDetectColumns(meta.fields ?? [])
          setStep(1)
        },
        error: () => toast.error('Error al leer el CSV'),
      })
    } else if (['xlsx', 'xls'].includes(ext ?? '')) {
      setFileType('excel')
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target?.result, { type: 'array', cellDates: true })
          const ws = wb.Sheets[wb.SheetNames[0]]
          const rows = XLSX.utils.sheet_to_json<RawRow>(ws, { raw: false, defval: '' })
          const hdrs = Object.keys(rows[0] ?? {})
          setRawRows(rows); setHeaders(hdrs)
          autoDetectColumns(hdrs)
          setStep(1)
        } catch { toast.error('Error al leer el Excel') }
      }
      reader.readAsArrayBuffer(file)
    } else if (ext === 'pdf') {
      setFileType('pdf')
      setPdfProcessing(true)
      try {
        const text = await extractTextFromPDF(file)
        setRawPdfText(text)
        const { bank, transactions: detected } = detectBankAndParse(text)
        setDetectedBank(bank)
        if (detected.length === 0) {
          toast.error('No se detectaron movimientos en el PDF.')
          return
        }
        const parsed: ParsedTransaction[] = detected.map((tx, i) => ({
          id: `pdf-${i}`, date: tx.date, description: tx.description,
          amount: tx.amount, type: tx.type, currency: tx.currency,
          category_id: '', subcategory_id: '', account_id: defaultAccount,
          selected: tx.amount > 0,
          error: tx.amount === 0 ? 'Monto inválido' : undefined,
        }))
        const withSuggestions = await applySuggestions(parsed)
        setTransactions(withSuggestions)
        setStep(2)
      } catch (e: any) {
        const msgs: Record<string, string> = {
          PDF_NOT_INSTALLED: 'Ejecutá: npm install pdfjs-dist',
          PDF_NO_TEXT: 'PDF es una imagen escaneada — usá CSV.',
          PDF_PASSWORD: 'El PDF tiene contraseña. Quitala o usá CSV.',
          PDF_INVALID: 'No se pudo leer el PDF. Probá con CSV.',
        }
        toast.error(msgs[e?.message] ?? 'Error al leer el PDF.')
      } finally {
        setPdfProcessing(false)
      }
    } else {
      toast.error('Formato no soportado. Usá CSV, Excel o PDF.')
    }
  }

  function autoDetectColumns(hdrs: string[]) {
    const date = matchColumn(hdrs, DATE_HINTS)
    const description = matchColumn(hdrs, DESC_HINTS)
    const amount = matchColumn(hdrs, AMOUNT_HINTS)
    const debit = matchColumn(hdrs, DEBIT_HINTS)
    const credit = matchColumn(hdrs, CREDIT_HINTS)
    const currency = matchColumn(hdrs, CURRENCY_HINTS)
    setColMap({ date, description, amount, debit, credit, currency, mode: (debit || credit) ? 'debit_credit' : 'single' })
  }

  // ── Paso 2 → 3 ───────────────────────────────────────────────
  async function buildTransactions() {
    const parsed: ParsedTransaction[] = rawRows.map((row, i) => {
      let amount = 0, type: 'income' | 'expense' = 'expense'
      if (colMap.mode === 'debit_credit') {
        const d = parseAmount(row[colMap.debit] ?? '')
        const c = parseAmount(row[colMap.credit] ?? '')
        if (c > 0) { amount = c; type = 'income' } else { amount = d; type = 'expense' }
      } else {
        const raw = String(row[colMap.amount] ?? '').trim()
        amount = parseAmount(raw)
        // Negativo si tiene '-' en cualquier posición antes de los dígitos, o entre paréntesis
        const isNeg = /^[^0-9]*-/.test(raw) || /^\(/.test(raw)
        type = isNeg ? 'expense' : 'income'
      }
      let currency: 'ARS' | 'USD' = defaultCurrency
      if (colMap.currency && row[colMap.currency]) {
        const c = row[colMap.currency].toUpperCase()
        if (c.includes('USD') || c.includes('DOLAR') || c.includes('US$')) currency = 'USD'
      }
      return {
        id: `row-${i}`, date: parseDate(row[colMap.date] ?? ''),
        description: (row[colMap.description] ?? '').trim() || `Fila ${i + 1}`,
        amount, type, currency,
        category_id: '', subcategory_id: '', account_id: defaultAccount,
        selected: amount > 0,
        error: amount === 0 ? 'Monto inválido' : undefined,
      }
    })
    const withSuggestions = await applySuggestions(parsed)
    setTransactions(withSuggestions)
    setStep(2)
  }

  // ── Importar en lotes para evitar límite de payload ─────────
  async function handleImport() {
    const selected = transactions.filter(t => t.selected && !t.error)
    if (selected.length === 0) { toast.error('Seleccioná al menos un movimiento'); return }
    setImporting(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setImporting(false); return }

    const rate = mep ?? 1200
    const rows = selected.map(tx => ({
      user_id: user.id,
      type: tx.type,
      amount_original: tx.amount,
      currency_original: tx.currency,
      amount_ars: tx.currency === 'ARS' ? tx.amount : tx.amount * rate,
      amount_usd: tx.currency === 'USD' ? tx.amount : tx.amount / rate,
      exchange_rate: rate,
      exchange_rate_type: 'mep',
      description: tx.description,
      date: tx.date,
      category_id: tx.category_id || null,
      subcategory_id: tx.subcategory_id || null,
      account_id: tx.account_id || null,
      is_recurring: false,
    }))

    // Insertar en lotes de 100 para no superar el límite de Supabase
    const BATCH = 100
    let imported = 0
    let failed = 0

    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH)
      const { error } = await supabase.from('transactions').insert(batch)
      if (error) {
        console.error(`[import] batch ${i}-${i + BATCH} error:`, error.message)
        failed += batch.length
      } else {
        imported += batch.length
      }
    }

    setImporting(false)

    if (failed === 0) {
      toast.success(`✓ ${imported} movimientos importados correctamente`)
      router.push('/transactions')
    } else if (imported > 0) {
      toast.error(`Se importaron ${imported} pero fallaron ${failed}. Revisá los datos e intentá de nuevo.`)
    } else {
      toast.error('No se pudo importar. Revisá que las fechas y montos sean válidos.')
    }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [])

  const selectedCount = transactions.filter(t => t.selected && !t.error).length
  const suggestedCount = transactions.filter(t => t.suggestion).length
  const incomeCount  = transactions.filter(t => t.selected && t.type === 'income').length
  const expenseCount = transactions.filter(t => t.selected && t.type === 'expense').length

  function toggleAll(val: boolean) { setTransactions(ts => ts.map(t => ({ ...t, selected: t.error ? false : val }))) }
  function updateTx(id: string, u: Partial<ParsedTransaction>) { setTransactions(ts => ts.map(t => t.id === id ? { ...t, ...u } : t)) }
  function applyToAll(field: 'category_id' | 'account_id' | 'type', value: string) {
    setTransactions(ts => ts.map(t => t.selected ? { ...t, [field]: value } : t))
  }

  // ─── Estilos compartidos ──────────────────────────────────────
  const card = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '1rem' }
  const selectStyle: React.CSSProperties = {
    fontSize: 12, background: 'var(--surface-elevated)', color: 'var(--text-primary)',
    border: '1px solid var(--border)', borderRadius: 8, padding: '4px 28px 4px 8px',
    outline: 'none', appearance: 'none' as const,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center',
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Importar movimientos</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>CSV, Excel o PDF de tu banco o tarjeta</p>
      </div>

      {/* Steps */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center gap-2 flex-1">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={i < step ? { background: 'var(--income)', color: '#fff' }
                : i === step ? { background: 'var(--accent)', color: '#fff' }
                : { background: 'var(--surface-elevated)', color: 'var(--text-muted)' }}
            >
              {i < step ? <Check size={12} /> : i + 1}
            </div>
            <span className="text-xs font-medium hidden sm:block"
              style={{ color: i === step ? 'var(--text-primary)' : 'var(--text-faint)' }}>{label}</span>
            {i < STEPS.length - 1 && <div className="flex-1 h-px mx-1" style={{ background: 'var(--border)' }} />}
          </div>
        ))}
      </div>

      {/* ── PASO 1: Upload ──────────────────────────────────── */}
      {step === 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            {[
              { ext: 'PDF',  icon: FileText, desc: 'Resumen banco/tarjeta', color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
              { ext: 'CSV',  icon: FileText, desc: 'Exportá desde tu banco', color: 'var(--income)', bg: 'var(--income-bg)' },
              { ext: 'XLSX', icon: Table,    desc: 'Excel clásico',          color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' },
              { ext: 'XLS',  icon: Table,    desc: 'Excel antiguo',          color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' },
            ].map(({ ext, icon: Icon, desc, color, bg }) => (
              <div key={ext} className="rounded-xl p-3 text-center" style={card}>
                <div className="inline-flex p-2 rounded-lg mb-2" style={{ background: bg }}>
                  <Icon size={18} style={{ color }} />
                </div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>.{ext}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{desc}</p>
              </div>
            ))}
          </div>

          <div
            onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            onClick={() => !pdfProcessing && fileInputRef.current?.click()}
            className="rounded-2xl p-12 text-center transition-all cursor-pointer"
            style={{
              border: `2px dashed ${isDragging ? 'var(--accent)' : 'var(--border)'}`,
              background: isDragging ? 'var(--accent-bg)' : 'transparent',
            }}
          >
            {pdfProcessing ? (
              <>
                <Loader2 size={32} className="mx-auto mb-3 animate-spin" style={{ color: 'var(--accent)' }} />
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Leyendo PDF...</p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Extrayendo movimientos</p>
              </>
            ) : (
              <>
                <Upload size={32} className="mx-auto mb-3" style={{ color: isDragging ? 'var(--accent)' : 'var(--text-faint)' }} />
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Arrastrá tu archivo aquí</p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>o hacé click para seleccionarlo</p>
                <p className="text-xs mt-3" style={{ color: 'var(--text-faint)' }}>PDF, CSV, XLSX o XLS · Máx. 10MB</p>
              </>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls,.pdf" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f) }} />

          <div className="rounded-xl p-4" style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)' }}>
            <p className="text-xs font-semibold mb-1" style={{ color: '#fbbf24' }}>💡 ¿Cómo exportar?</p>
            <p className="text-xs" style={{ color: '#d97706' }}>
              En tu banco o plataforma buscá la sección de Movimientos o Historial y descargá el archivo en formato CSV, Excel o PDF.
            </p>
          </div>
        </div>
      )}

      {/* ── PASO 2: Mapear columnas ──────────────────────── */}
      {step === 1 && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>📄 {fileName}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{rawRows.length} filas · {headers.length} columnas</p>
            </div>
            <button onClick={() => setStep(0)} className="text-sm flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
              <RefreshCw size={13} /> Cambiar
            </button>
          </div>

          <div className="rounded-xl p-4 space-y-4" style={card}>
            <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Configuración</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Moneda por defecto</label>
                <select value={defaultCurrency} onChange={e => setDefaultCurrency(e.target.value as 'ARS' | 'USD')} className="input-base">
                  <option value="ARS">ARS — Pesos</option>
                  <option value="USD">USD — Dólares</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Cuenta destino</label>
                <select value={defaultAccount} onChange={e => setDefaultAccount(e.target.value)} className="input-base">
                  <option value="">Sin asignar</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Tipo de columnas de monto</label>
              <div className="flex rounded-xl overflow-hidden" style={{ border: '1.5px solid var(--border)' }}>
                {([['debit_credit', 'Débito y Crédito separados'], ['single', 'Una sola columna']] as const).map(([val, lbl]) => (
                  <button key={val} onClick={() => setColMap(m => ({ ...m, mode: val }))}
                    className="flex-1 py-2 text-xs font-medium transition-colors"
                    style={colMap.mode === val ? { background: 'var(--accent)', color: '#fff' } : { color: 'var(--text-muted)' }}
                  >{lbl}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl p-4 space-y-3" style={card}>
            <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Mapeo de columnas</h3>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Detectado automáticamente. Ajustá si es necesario.</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'date', label: 'Fecha' }, { key: 'description', label: 'Descripción' },
                ...(colMap.mode === 'debit_credit'
                  ? [{ key: 'debit', label: 'Débito (egreso)' }, { key: 'credit', label: 'Crédito (ingreso)' }]
                  : [{ key: 'amount', label: 'Importe' }]),
                { key: 'currency', label: 'Moneda (opcional)' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{label}</label>
                  <select value={(colMap as any)[key]} onChange={e => setColMap(m => ({ ...m, [key]: e.target.value }))}
                    className="input-base text-sm"
                    style={(colMap as any)[key] ? {} : { borderColor: '#fbbf24' }}
                  >
                    <option value="">— sin mapear —</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(0)} className="flex-1 py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
              style={{ background: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
              <ChevronLeft size={15} /> Atrás
            </button>
            <button onClick={buildTransactions} disabled={!colMap.date || !colMap.description || suggesting}
              className="flex-1 py-3 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: 'var(--accent)' }}>
              {suggesting ? <><Loader2 size={15} className="animate-spin" /> Categorizando con IA...</> : <>Continuar <ChevronRight size={15} /></>}
            </button>
          </div>
        </div>
      )}

      {/* ── PASO 3: Revisar ─────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-4">

          {/* Banner PDF */}
          {fileType === 'pdf' && (
            <div className="rounded-xl p-4 space-y-2" style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent-border)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--accent-text)' }}>📄 PDF procesado · {detectedBank}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{transactions.length} movimientos detectados</p>
                </div>
                <button onClick={() => setShowRawText(v => !v)} className="text-xs font-medium" style={{ color: 'var(--accent-icon)' }}>
                  {showRawText ? 'Ocultar texto' : 'Ver texto'}
                </button>
              </div>
              {showRawText && (
                <textarea readOnly value={rawPdfText}
                  className="w-full h-36 text-xs font-mono resize-none rounded-lg p-2"
                  style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }} />
              )}
            </div>
          )}

          {/* Banner auto-categorización */}
          {suggestedCount > 0 && (
            <div className="rounded-xl px-4 py-3 flex items-center gap-3"
              style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.15)' }}>
              <Sparkles size={16} style={{ color: 'var(--income)', flexShrink: 0 }} />
              <p className="text-sm" style={{ color: 'var(--income)' }}>
                <strong>{suggestedCount}</strong> movimientos categorizados automáticamente.
                Podés revisar y modificar cada uno.
              </p>
            </div>
          )}

          {/* KPIs */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Seleccionados', value: selectedCount, color: 'var(--text-primary)' },
              { label: 'Ingresos',      value: incomeCount,   color: 'var(--income)' },
              { label: 'Gastos',        value: expenseCount,  color: 'var(--expense)' },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-xl p-3 text-center" style={card}>
                <p className="text-xl font-bold" style={{ color }}>{value}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Acciones masivas */}
          <div className="rounded-xl p-4 space-y-3" style={card}>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Aplicar a todos los seleccionados</h3>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Tipo', onChange: (v: string) => applyToAll('type', v), options: [['', 'Sin cambio'], ['expense', 'Gasto'], ['income', 'Ingreso']] },
                { label: 'Categoría', onChange: (v: string) => applyToAll('category_id', v), options: [['', 'Sin cambio'], ...categories.map(c => [c.id, c.name])] },
                { label: 'Cuenta', onChange: (v: string) => applyToAll('account_id', v), options: [['', 'Sin cambio'], ...accounts.map(a => [a.id, a.name])] },
              ].map(({ label, onChange, options }) => (
                <div key={label}>
                  <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{label}</label>
                  <select onChange={e => onChange(e.target.value)} className="input-base text-xs" style={{ padding: '0.3rem 0.5rem' }}>
                    {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => toggleAll(true)} className="text-xs font-medium" style={{ color: 'var(--accent)' }}>Seleccionar todos</button>
              <span style={{ color: 'var(--border)' }}>·</span>
              <button onClick={() => toggleAll(false)} className="text-xs" style={{ color: 'var(--text-muted)' }}>Deseleccionar todos</button>
            </div>
          </div>

          {/* Lista transacciones */}
          <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--surface-elevated)' }}>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                {transactions.length} movimientos detectados
              </p>
            </div>
            <div className="divide-y max-h-[520px] overflow-y-auto" style={{ borderColor: 'var(--border-subtle)' }}>
              {transactions.map(tx => {
                const subs = categories.find(c => c.id === tx.category_id)?.subcategories?.filter(s => s.is_active) ?? []
                const confStyle = tx.suggestion ? CONFIDENCE_STYLES[tx.suggestion.confidence] : null

                return (
                  <div key={tx.id}
                    className="flex items-start gap-3 p-3 transition-colors"
                    style={{
                      opacity: tx.selected ? 1 : 0.4,
                      background: tx.error ? 'rgba(248,113,113,0.05)' : 'transparent',
                      borderBottom: '1px solid var(--border-subtle)',
                    }}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={() => updateTx(tx.id, { selected: !tx.selected })}
                      disabled={!!tx.error}
                      className="w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5 transition-all"
                      style={{
                        border: `2px solid ${tx.selected && !tx.error ? 'var(--accent)' : 'var(--border)'}`,
                        background: tx.selected && !tx.error ? 'var(--accent)' : 'transparent',
                      }}
                    >
                      {tx.selected && !tx.error && <Check size={11} className="text-white" />}
                    </button>

                    <div className="flex-1 min-w-0 space-y-1.5">
                      {/* Fecha + tipo */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs" style={{ color: 'var(--text-faint)' }}>{tx.date}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded font-medium"
                          style={tx.type === 'income'
                            ? { background: 'var(--income-bg)', color: 'var(--income)' }
                            : { background: 'var(--expense-bg)', color: 'var(--expense)' }}
                        >
                          {tx.type === 'income' ? 'Ingreso' : 'Gasto'}
                        </span>
                        <button
                          onClick={() => updateTx(tx.id, { type: tx.type === 'income' ? 'expense' : 'income' })}
                          className="text-[10px] underline" style={{ color: 'var(--text-faint)' }}
                        >cambiar</button>
                      </div>

                      {/* Descripción */}
                      <p className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>{tx.description}</p>

                      {tx.error && (
                        <p className="text-xs flex items-center gap-1" style={{ color: 'var(--expense)' }}>
                          <AlertCircle size={11} /> {tx.error}
                        </p>
                      )}

                      {/* Selectores */}
                      {tx.selected && !tx.error && (
                        <div className="flex gap-2 flex-wrap items-center">
                          {/* Badge de sugerencia */}
                          {confStyle && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-1"
                              style={{ background: confStyle.bg, color: confStyle.color }}>
                              <Sparkles size={9} />
                              {tx.suggestion?.source === 'history' ? 'Del historial' : tx.suggestion?.aiSuggested ? 'Claude IA' : 'Auto'}
                            </span>
                          )}

                          <select value={tx.category_id}
                            onChange={e => updateTx(tx.id, { category_id: e.target.value, subcategory_id: '', suggestion: undefined })}
                            style={selectStyle}
                          >
                            <option value="">Sin categoría</option>
                            {categories.filter(c => c.type === tx.type).map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>

                          {subs.length > 0 && (
                            <select value={tx.subcategory_id}
                              onChange={e => updateTx(tx.id, { subcategory_id: e.target.value })}
                              style={selectStyle}
                            >
                              <option value="">Sub concepto...</option>
                              {subs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                          )}

                          <select value={tx.account_id}
                            onChange={e => updateTx(tx.id, { account_id: e.target.value })}
                            style={selectStyle}
                          >
                            <option value="">Sin cuenta</option>
                            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Monto */}
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold"
                        style={{ color: tx.type === 'income' ? 'var(--income)' : 'var(--expense)' }}>
                        {tx.currency === 'USD' ? formatUSD(tx.amount) : formatARS(tx.amount)}
                      </p>
                      <p className="text-[10px]" style={{ color: 'var(--text-faint)' }}>{tx.currency}</p>
                    </div>

                  </div>
                )
              })}
            </div>
          </div>

          {/* Botones finales */}
          <div className="flex gap-3">
            <button onClick={() => setStep(fileType === 'pdf' ? 0 : 1)}
              className="flex-1 py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
              style={{ background: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
              <ChevronLeft size={15} /> Atrás
            </button>
            <button
              onClick={handleImport}
              disabled={importing || selectedCount === 0}
              className="flex-1 py-3 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: 'var(--accent)' }}
            >
              {importing
                ? <><Loader2 size={15} className="animate-spin" /> Importando...</>
                : selectedCount > 0
                  ? <>Importar {selectedCount} movimiento{selectedCount !== 1 ? 's' : ''} <ChevronRight size={15} /></>
                  : 'Seleccioná movimientos'
              }
            </button>
          </div>

        </div>
      )}

    </div>
  )
}