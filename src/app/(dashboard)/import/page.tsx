'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Upload, FileText, Table, ChevronRight, ChevronLeft,
  Check, X, AlertCircle, Loader2, RefreshCw,
} from 'lucide-react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase/client'
import { useCategories } from '@/hooks/useCategories'
import { useAccounts } from '@/hooks/useAccounts'
import { useExchangeRate } from '@/hooks/useExchangeRate'
import { formatARS, formatUSD, cn } from '@/lib/utils'
import { extractTextFromPDF, detectBankAndParse } from '@/lib/pdf-parser'
import { toast } from 'sonner'

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
}

interface ColumnMap {
  date: string
  description: string
  amount: string
  debit: string
  credit: string
  currency: string
  mode: 'single' | 'debit_credit'
}

const STEPS = ['Subir archivo', 'Mapear columnas', 'Revisar e importar']

// ─── Auto-detect column names ─────────────────────────────────
const DATE_HINTS    = ['fecha', 'date', 'f.', 'f.operacion', 'periodo', 'dia']
const DESC_HINTS    = ['descripcion', 'concepto', 'detalle', 'description', 'movimiento', 'comercio', 'comprobante']
const AMOUNT_HINTS  = ['importe', 'monto', 'amount', 'valor', 'total']
const DEBIT_HINTS   = ['debito', 'debit', 'cargo', 'egreso', 'debe', 'salida']
const CREDIT_HINTS  = ['credito', 'credit', 'abono', 'ingreso', 'haber', 'entrada']
const CURRENCY_HINTS = ['moneda', 'currency', 'divisa']

function matchColumn(headers: string[], hints: string[]): string {
  return headers.find(h =>
    hints.some(hint => h.toLowerCase().includes(hint))
  ) ?? ''
}

// Parsear fecha en múltiples formatos
function parseDate(raw: string): string {
  if (!raw) return new Date().toISOString().split('T')[0]
  raw = raw.trim()

  // DD/MM/YYYY o DD-MM-YYYY
  const dmyMatch = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/)
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch
    const year = y.length === 2 ? `20${y}` : y
    return `${year}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`
  }

  // YYYY-MM-DD
  const isoMatch = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (isoMatch) return raw.slice(0, 10)

  // Excel serial number
  const serial = parseFloat(raw)
  if (!isNaN(serial) && serial > 40000) {
    const date = XLSX.SSF.parse_date_code(serial)
    if (date) return `${date.y}-${String(date.m).padStart(2,'0')}-${String(date.d).padStart(2,'0')}`
  }

  return new Date().toISOString().split('T')[0]
}

// Parsear monto: acepta "1.234,56" o "1234.56" o "-1234"
function parseAmount(raw: string): number {
  if (!raw) return 0
  raw = raw.trim().replace(/\s/g, '')
  // Formato argentino: punto como miles, coma como decimal
  if (/^\d{1,3}(\.\d{3})*(,\d+)?$/.test(raw)) {
    raw = raw.replace(/\./g, '').replace(',', '.')
  } else {
    raw = raw.replace(/,/g, '')
  }
  return Math.abs(parseFloat(raw) || 0)
}

// ─── Componente principal ─────────────────────────────────────
export default function ImportPage() {
  const router = useRouter()
  const supabase = createClient()
  const { categories } = useCategories()
  const { accounts } = useAccounts()
  const { mep } = useExchangeRate()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [fileName, setFileName] = useState('')
  const [fileType, setFileType] = useState<'csv' | 'excel' | 'pdf'>('csv')
  const [rawRows, setRawRows] = useState<RawRow[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [colMap, setColMap] = useState<ColumnMap>({
    date: '', description: '', amount: '', debit: '', credit: '', currency: '',
    mode: 'debit_credit',
  })
  const [defaultCurrency, setDefaultCurrency] = useState<'ARS' | 'USD'>('ARS')
  const [defaultAccount, setDefaultAccount] = useState('')
  const [transactions, setTransactions] = useState<ParsedTransaction[]>([])
  const [importing, setImporting] = useState(false)
  const [pdfProcessing, setPdfProcessing] = useState(false)
  const [detectedBank, setDetectedBank] = useState('')
  const [rawPdfText, setRawPdfText] = useState('')
  const [showRawText, setShowRawText] = useState(false)

  // ── Paso 1: Procesar archivo ──────────────────────────────────
  async function processFile(file: File) {
    setFileName(file.name)
    const ext = file.name.split('.').pop()?.toLowerCase()

    if (ext === 'csv') {
      setFileType('csv')
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        encoding: 'UTF-8',
        complete: ({ data, meta }) => {
          const rows = data as RawRow[]
          setRawRows(rows)
          setHeaders(meta.fields ?? [])
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
          setRawRows(rows)
          setHeaders(hdrs)
          autoDetectColumns(hdrs)
          setStep(1)
        } catch {
          toast.error('Error al leer el Excel')
        }
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
          toast.error('No se detectaron movimientos en el PDF. Verificá el texto extraído.')
          setPdfProcessing(false)
          return
        }

        // Convertir directamente a ParsedTransaction y saltar al paso 3
        const parsed: ParsedTransaction[] = detected.map((tx, i) => ({
          id: `pdf-${i}`,
          date: tx.date,
          description: tx.description,
          amount: tx.amount,
          type: tx.type,
          currency: tx.currency,
          category_id: '',
          subcategory_id: '',
          account_id: defaultAccount,
          selected: tx.amount > 0,
          error: tx.amount === 0 ? 'Monto inválido' : undefined,
        }))

        setTransactions(parsed)
        setStep(2) // PDF salta directo al paso 3
      } catch (e: any) {
        console.warn('Error procesando PDF:', e)
        if (e?.message === 'PDF_NOT_INSTALLED') {
          toast.error('Ejecutá: npm install pdfjs-dist en la terminal')
        } else if (e?.message === 'PDF_NO_TEXT') {
          toast.error('El PDF es una imagen escaneada — no tiene texto. Usá CSV.')
        } else if (e?.message === 'PDF_PASSWORD') {
          toast.error('El PDF tiene contraseña. Quitala antes de subirlo o usá CSV.')
        } else if (e?.message === 'PDF_INVALID') {
          toast.error('No se pudo leer el PDF. Puede estar dañado o tener protección. Probá con CSV.')
        } else {
          toast.error('Error al leer el PDF. Probá exportar como CSV desde tu banco.')
        }
      } finally {
        setPdfProcessing(false)
      }
    } else {
      toast.error('Formato no soportado. Usá CSV, Excel o PDF.')
    }
  }

  function autoDetectColumns(hdrs: string[]) {
    const date        = matchColumn(hdrs, DATE_HINTS)
    const description = matchColumn(hdrs, DESC_HINTS)
    const amount      = matchColumn(hdrs, AMOUNT_HINTS)
    const debit       = matchColumn(hdrs, DEBIT_HINTS)
    const credit      = matchColumn(hdrs, CREDIT_HINTS)
    const currency    = matchColumn(hdrs, CURRENCY_HINTS)
    const mode        = (debit || credit) ? 'debit_credit' : 'single'
    setColMap({ date, description, amount, debit, credit, currency, mode })
  }

  // ── Paso 2 → 3: Parsear con el mapeo ────────────────────────
  function buildTransactions() {
    const parsed: ParsedTransaction[] = rawRows.map((row, i) => {
      let amount = 0
      let type: 'income' | 'expense' = 'expense'

      if (colMap.mode === 'debit_credit') {
        const debitVal  = parseAmount(row[colMap.debit] ?? '')
        const creditVal = parseAmount(row[colMap.credit] ?? '')
        if (creditVal > 0) { amount = creditVal; type = 'income' }
        else               { amount = debitVal;  type = 'expense' }
      } else {
        const raw = (row[colMap.amount] ?? '').trim()
        const negative = raw.startsWith('-')
        amount = parseAmount(raw)
        type = negative ? 'expense' : 'income'
      }

      // Moneda: de columna o default
      let currency: 'ARS' | 'USD' = defaultCurrency
      if (colMap.currency && row[colMap.currency]) {
        const c = row[colMap.currency].toUpperCase()
        if (c.includes('USD') || c.includes('DOLAR') || c.includes('US$')) currency = 'USD'
        else currency = 'ARS'
      }

      return {
        id: `row-${i}`,
        date: parseDate(row[colMap.date] ?? ''),
        description: (row[colMap.description] ?? '').trim() || `Fila ${i + 1}`,
        amount,
        type,
        currency,
        category_id: '',
        subcategory_id: '',
        account_id: defaultAccount,
        selected: amount > 0,
        error: amount === 0 ? 'Monto inválido' : undefined,
      }
    })
    setTransactions(parsed)
    setStep(2)
  }

  // ── Paso 3: Importar ─────────────────────────────────────────
  async function handleImport() {
    const selected = transactions.filter(t => t.selected && !t.error)
    if (selected.length === 0) { toast.error('Seleccioná al menos un movimiento'); return }

    setImporting(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const rate = mep ?? 1

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
    }))

    const { error } = await supabase.from('transactions').insert(rows)

    if (error) {
      toast.error('Error al importar')
      console.warn(error)
    } else {
      toast.success(`✓ ${selected.length} movimientos importados`)
      router.push('/transactions')
    }
    setImporting(false)
  }

  // ── Drag & Drop ───────────────────────────────────────────────
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [])

  // ── Helpers UI ────────────────────────────────────────────────
  const selectedCount = transactions.filter(t => t.selected && !t.error).length
  const incomeCount   = transactions.filter(t => t.selected && t.type === 'income').length
  const expenseCount  = transactions.filter(t => t.selected && t.type === 'expense').length

  function toggleAll(val: boolean) {
    setTransactions(ts => ts.map(t => ({ ...t, selected: t.error ? false : val })))
  }

  function updateTx(id: string, updates: Partial<ParsedTransaction>) {
    setTransactions(ts => ts.map(t => t.id === id ? { ...t, ...updates } : t))
  }

  function applyToAll(field: 'category_id' | 'account_id' | 'type', value: string) {
    setTransactions(ts => ts.map(t => t.selected ? { ...t, [field]: value } : t))
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Importar movimientos</h1>
        <p className="text-sm text-slate-400 mt-1">Subí un CSV o Excel de tu banco o tarjeta</p>
      </div>

      {/* Steps */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center gap-2 flex-1">
            <div className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
              i < step ? 'bg-green-500 text-white' :
              i === step ? 'bg-indigo-600 text-white' :
              'bg-slate-200 text-slate-400'
            )}>
              {i < step ? <Check size={12} /> : i + 1}
            </div>
            <span className={cn('text-xs font-medium hidden sm:block',
              i === step ? 'text-slate-800' : 'text-slate-400'
            )}>{label}</span>
            {i < STEPS.length - 1 && <div className="flex-1 h-px bg-slate-200 mx-1" />}
          </div>
        ))}
      </div>

      {/* ── PASO 1: Upload ──────────────────────────────────────── */}
      {step === 0 && (
        <div className="space-y-4">
          {/* Formatos soportados */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { ext: 'PDF',  icon: FileText, desc: 'Resumen de banco/tarjeta', color: 'text-red-600 bg-red-50'   },
              { ext: 'CSV',  icon: FileText, desc: 'Exportá desde tu banco',   color: 'text-green-600 bg-green-50' },
              { ext: 'XLSX', icon: Table,    desc: 'Excel clásico',             color: 'text-blue-600 bg-blue-50'  },
              { ext: 'XLS',  icon: Table,    desc: 'Excel antiguo',             color: 'text-blue-600 bg-blue-50'  },
            ].map(({ ext, icon: Icon, desc, color }) => (
              <div key={ext} className="card !p-3 text-center">
                <div className={cn('inline-flex p-2 rounded-lg mb-2', color)}>
                  <Icon size={18} />
                </div>
                <p className="text-sm font-semibold text-slate-700">.{ext}</p>
                <p className="text-xs text-slate-400">{desc}</p>
              </div>
            ))}
          </div>

          {/* Drag & drop */}
          <div
            onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            onClick={() => !pdfProcessing && fileInputRef.current?.click()}
            className={cn(
              'border-2 border-dashed rounded-2xl p-12 text-center transition-all',
              pdfProcessing ? 'cursor-wait opacity-60' : 'cursor-pointer',
              isDragging ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            )}
          >
            {pdfProcessing ? (
              <>
                <Loader2 size={32} className="mx-auto mb-3 text-indigo-500 animate-spin" />
                <p className="font-semibold text-slate-600">Leyendo PDF...</p>
                <p className="text-sm text-slate-400 mt-1">Extrayendo movimientos, puede tomar unos segundos</p>
              </>
            ) : (
              <>
                <Upload size={32} className={cn('mx-auto mb-3', isDragging ? 'text-indigo-500' : 'text-slate-300')} />
                <p className="font-semibold text-slate-600">Arrastrá tu archivo aquí</p>
                <p className="text-sm text-slate-400 mt-1">o hacé click para seleccionarlo</p>
                <p className="text-xs text-slate-300 mt-3">PDF, CSV, XLSX o XLS · Máx. 10MB</p>
              </>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls,.pdf"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f) }}
          />

          {/* Tips */}
          <div className="card !p-4 bg-amber-50 border-amber-100">
            <p className="text-xs font-semibold text-amber-700 mb-2">💡 Cómo exportar desde tu banco</p>
            <ul className="text-xs text-amber-700 space-y-1">
              <li><strong>Galicia:</strong> Mi Cuenta → Movimientos → Exportar → CSV</li>
              <li><strong>Balanz:</strong> Reportes → Movimientos de cuenta → Descargar Excel</li>
              <li><strong>Binance:</strong> Billetera → Historial de transacciones → Exportar</li>
              <li><strong>eToro:</strong> Portfolio → Historial → Exportar a Excel</li>
            </ul>
          </div>
        </div>
      )}

      {/* ── PASO 2: Mapear columnas ─────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-700">📄 {fileName}</p>
              <p className="text-xs text-slate-400">{rawRows.length} filas detectadas · {headers.length} columnas</p>
            </div>
            <button onClick={() => setStep(0)} className="text-sm text-slate-400 hover:text-slate-600 flex items-center gap-1">
              <RefreshCw size={13} /> Cambiar archivo
            </button>
          </div>

          {/* Configuración global */}
          <div className="card !p-4 space-y-4">
            <h3 className="font-semibold text-slate-700">Configuración</h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Moneda por defecto</label>
                <select value={defaultCurrency} onChange={e => setDefaultCurrency(e.target.value as 'ARS' | 'USD')} className="input-base">
                  <option value="ARS">ARS — Pesos</option>
                  <option value="USD">USD — Dólares</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Cuenta destino</label>
                <select value={defaultAccount} onChange={e => setDefaultAccount(e.target.value)} className="input-base">
                  <option value="">Sin asignar</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-2">Tipo de columnas de monto</label>
              <div className="flex rounded-xl border border-slate-200 overflow-hidden">
                {([
                  ['debit_credit', 'Débito y Crédito separados'],
                  ['single',       'Una sola columna de importe'],
                ] as const).map(([val, lbl]) => (
                  <button key={val} onClick={() => setColMap(m => ({ ...m, mode: val }))}
                    className={cn('flex-1 py-2 text-xs font-medium transition-colors',
                      colMap.mode === val ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'
                    )}>{lbl}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Mapeo de columnas */}
          <div className="card !p-4 space-y-3">
            <h3 className="font-semibold text-slate-700">Mapeo de columnas</h3>
            <p className="text-xs text-slate-400">El sistema detectó el mapeo automáticamente. Ajustá si es necesario.</p>

            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'date',        label: 'Fecha'       },
                { key: 'description', label: 'Descripción' },
                ...(colMap.mode === 'debit_credit'
                  ? [{ key: 'debit', label: 'Débito (egreso)' }, { key: 'credit', label: 'Crédito (ingreso)' }]
                  : [{ key: 'amount', label: 'Importe' }]
                ),
                { key: 'currency', label: 'Moneda (opcional)' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
                  <select
                    value={(colMap as any)[key]}
                    onChange={e => setColMap(m => ({ ...m, [key]: e.target.value }))}
                    className={cn('input-base text-sm', !(colMap as any)[key] && 'border-amber-300')}
                  >
                    <option value="">— sin mapear —</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Preview primeras 3 filas */}
          {rawRows.length > 0 && (
            <div className="card !p-4">
              <h3 className="font-semibold text-slate-700 mb-3">Preview (primeras 3 filas)</h3>
              <div className="overflow-x-auto">
                <table className="text-xs w-full">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-100">
                      {[colMap.date, colMap.description,
                        ...(colMap.mode === 'debit_credit' ? [colMap.debit, colMap.credit] : [colMap.amount])
                      ].filter(Boolean).map(col => (
                        <th key={col} className="text-left py-1.5 pr-4 font-medium">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rawRows.slice(0, 3).map((row, i) => (
                      <tr key={i} className="border-b border-slate-50">
                        {[colMap.date, colMap.description,
                          ...(colMap.mode === 'debit_credit' ? [colMap.debit, colMap.credit] : [colMap.amount])
                        ].filter(Boolean).map(col => (
                          <td key={col} className="py-1.5 pr-4 text-slate-600 max-w-[150px] truncate">{row[col]}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => setStep(0)}
              className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-2">
              <ChevronLeft size={15} /> Atrás
            </button>
            <button onClick={buildTransactions}
              disabled={!colMap.date || !colMap.description}
              className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
              Continuar <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* ── PASO 3: Revisar e importar ───────────────────────────── */}
      {step === 2 && (
        <div className="space-y-4">

          {/* Banner PDF */}
          {fileType === 'pdf' && (
            <div className="card !p-4 bg-blue-50 border-blue-100 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-blue-700">
                    📄 PDF procesado · {detectedBank}
                  </p>
                  <p className="text-xs text-blue-500">
                    {transactions.length} movimientos detectados automáticamente
                  </p>
                </div>
                <button onClick={() => setShowRawText(v => !v)}
                  className="text-xs text-blue-600 hover:underline font-medium">
                  {showRawText ? 'Ocultar texto' : 'Ver texto extraído'}
                </button>
              </div>
              {showRawText && (
                <textarea
                  readOnly
                  value={rawPdfText}
                  className="w-full h-40 text-xs font-mono bg-white border border-blue-200 rounded-lg p-2 resize-none text-slate-600"
                />
              )}
              <p className="text-xs text-blue-400">
                ⚠ La calidad depende del formato del PDF. Revisá cada movimiento antes de importar.
              </p>
            </div>
          )}

          {/* Resumen */}
          <div className="grid grid-cols-3 gap-3">
            <div className="card !p-3 text-center">
              <p className="text-xl font-bold text-slate-900">{selectedCount}</p>
              <p className="text-xs text-slate-400">Seleccionados</p>
            </div>
            <div className="card !p-3 text-center">
              <p className="text-xl font-bold text-green-600">{incomeCount}</p>
              <p className="text-xs text-slate-400">Ingresos</p>
            </div>
            <div className="card !p-3 text-center">
              <p className="text-xl font-bold text-red-500">{expenseCount}</p>
              <p className="text-xs text-slate-400">Gastos</p>
            </div>
          </div>

          {/* Acciones masivas */}
          <div className="card !p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-700">Aplicar a todos los seleccionados</h3>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Tipo</label>
                <select onChange={e => applyToAll('type', e.target.value)} className="input-base text-xs !py-1.5">
                  <option value="">Sin cambio</option>
                  <option value="expense">Gasto</option>
                  <option value="income">Ingreso</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Categoría</label>
                <select onChange={e => applyToAll('category_id', e.target.value)} className="input-base text-xs !py-1.5">
                  <option value="">Sin cambio</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Cuenta</label>
                <select onChange={e => applyToAll('account_id', e.target.value)} className="input-base text-xs !py-1.5">
                  <option value="">Sin cambio</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => toggleAll(true)} className="text-xs text-indigo-600 hover:underline">Seleccionar todos</button>
              <span className="text-slate-300">·</span>
              <button onClick={() => toggleAll(false)} className="text-xs text-slate-400 hover:underline">Deseleccionar todos</button>
            </div>
          </div>

          {/* Lista de transacciones */}
          <div className="card !p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                {transactions.length} movimientos detectados
              </p>
            </div>
            <div className="divide-y divide-slate-50 max-h-[480px] overflow-y-auto">
              {transactions.map(tx => (
                <div key={tx.id} className={cn(
                  'flex items-start gap-3 p-3 transition-colors',
                  !tx.selected && 'opacity-40',
                  tx.error && 'bg-red-50'
                )}>
                  {/* Checkbox */}
                  <button
                    onClick={() => updateTx(tx.id, { selected: !tx.selected })}
                    disabled={!!tx.error}
                    className={cn(
                      'w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors',
                      tx.selected && !tx.error ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'
                    )}
                  >
                    {tx.selected && !tx.error && <Check size={11} className="text-white" />}
                  </button>

                  {/* Info */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-slate-400">{tx.date}</span>
                      <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium',
                        tx.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      )}>
                        {tx.type === 'income' ? 'Ingreso' : 'Gasto'}
                      </span>
                      <button
                        onClick={() => updateTx(tx.id, { type: tx.type === 'income' ? 'expense' : 'income' })}
                        className="text-[10px] text-slate-400 hover:text-indigo-600 underline"
                      >
                        cambiar
                      </button>
                    </div>
                    <p className="text-sm text-slate-700 truncate">{tx.description}</p>
                    {tx.error && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle size={11} /> {tx.error}
                      </p>
                    )}
                    {/* Selectores inline */}
                    {tx.selected && !tx.error && (
                      <div className="flex gap-2 flex-wrap">
                        <select
                          value={tx.category_id}
                          onChange={e => updateTx(tx.id, { category_id: e.target.value, subcategory_id: '' })}
                          className="text-xs border border-slate-200 rounded-lg px-2 py-1 outline-none focus:border-indigo-400 bg-white"
                        >
                          <option value="">Sin categoría</option>
                          {categories
                            .filter(c => c.type === tx.type)
                            .map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        {(() => {
                          const subs = categories.find(c => c.id === tx.category_id)?.subcategories?.filter(s => s.is_active) ?? []
                          return subs.length > 0 ? (
                            <select
                              value={tx.subcategory_id}
                              onChange={e => updateTx(tx.id, { subcategory_id: e.target.value })}
                              className="text-xs border border-slate-200 rounded-lg px-2 py-1 outline-none focus:border-indigo-400 bg-white"
                            >
                              <option value="">Sub concepto...</option>
                              {subs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                          ) : null
                        })()}
                        <select
                          value={tx.account_id}
                          onChange={e => updateTx(tx.id, { account_id: e.target.value })}
                          className="text-xs border border-slate-200 rounded-lg px-2 py-1 outline-none focus:border-indigo-400 bg-white"
                        >
                          <option value="">Sin cuenta</option>
                          {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Monto */}
                  <div className="text-right shrink-0">
                    <p className={cn('text-sm font-bold',
                      tx.type === 'income' ? 'text-green-600' : 'text-red-500'
                    )}>
                      {tx.currency === 'USD' ? formatUSD(tx.amount) : formatARS(tx.amount)}
                    </p>
                    <p className="text-[10px] text-slate-400">{tx.currency}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-3">
            <button onClick={() => setStep(1)}
              className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-2">
              <ChevronLeft size={15} /> Atrás
            </button>
            <button
              onClick={handleImport}
              disabled={importing || selectedCount === 0}
              className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {importing
                ? <><Loader2 size={15} className="animate-spin" /> Importando...</>
                : <><Check size={15} /> Importar {selectedCount} movimientos</>
              }
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
