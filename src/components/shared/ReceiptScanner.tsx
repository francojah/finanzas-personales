'use client'

import { useState, useRef, useCallback } from 'react'
import { Camera, X, ZoomIn, Loader2, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { ScanResult } from '@/app/api/scan-receipt/route'

export interface ScannedData {
  amount: number | null
  currency: 'ARS' | 'USD'
  description: string
  date: string | null
  type: 'expense' | 'income'
  receiptUrl: string | null
}

interface Props {
  receiptUrl?: string | null
  onReceiptUrl: (url: string | null) => void
  onScanned?: (data: ScannedData) => void   // callback con datos extraídos
  isPremium?: boolean
  disabled?: boolean
}

// Comprime imagen a máximo 800px y quality 0.7 para reducir tokens (~60-80% menos)
async function compressImage(file: File, maxPx = 800): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const canvas = document.createElement('canvas')
      let { width, height } = img
      if (width > maxPx || height > maxPx) {
        if (width > height) { height = Math.round(height * maxPx / width); width = maxPx }
        else { width = Math.round(width * maxPx / height); height = maxPx }
      }
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)
      const base64 = canvas.toDataURL('image/jpeg', 0.75).split(',')[1]
      URL.revokeObjectURL(url)
      resolve({ base64, mimeType: 'image/jpeg' })
    }
    img.onerror = reject
    img.src = url
  })
}

export function ReceiptScanner({ receiptUrl, onReceiptUrl, onScanned, isPremium, disabled }: Props) {
  const supabase = createClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview]       = useState<string | null>(null)
  const [uploading, setUploading]   = useState(false)
  const [scanning, setScanning]     = useState(false)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)

  const displayUrl = preview ?? receiptUrl

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) { toast.error('Solo imágenes'); return }
    if (file.size > 10 * 1024 * 1024) { toast.error('Máximo 10MB'); return }

    const localUrl = URL.createObjectURL(file)
    setPreview(localUrl)
    setPendingFile(file)
    setScanResult(null)

    // Subir a Supabase automáticamente
    setUploading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Sin sesión')
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${user.id}/receipts/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('receipts').upload(path, file)
      if (error) throw error
      const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(path)
      onReceiptUrl(urlData.publicUrl)
    } catch (e: any) {
      toast.error('Error al subir imagen')
    } finally {
      setUploading(false)
    }
  }, [supabase, onReceiptUrl])

  const handleScan = useCallback(async () => {
    if (!pendingFile) return
    if (!isPremium) { toast.error('El escaneo con IA es exclusivo de Premium'); return }

    setScanning(true)
    try {
      const { base64, mimeType } = await compressImage(pendingFile)
      const res = await fetch('/api/scan-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mimeType }),
      })

      if (res.status === 403) { toast.error('Función exclusiva de Premium'); return }
      if (!res.ok) throw new Error('scan_failed')

      const { result } = await res.json() as { result: ScanResult }
      setScanResult(result)

      if (onScanned) {
        onScanned({
          amount: result.amount,
          currency: result.currency,
          description: result.description || result.merchant,
          date: result.date,
          type: result.type,
          receiptUrl: receiptUrl ?? null,
        })
      }

      const msg = result.confidence === 'high'
        ? `✅ Detectado: ${result.merchant} — ${result.amount ? `$${result.amount.toLocaleString('es-AR')}` : 'monto no legible'}`
        : `⚠️ Detectado con incertidumbre — revisá los datos`
      toast.success(msg, { duration: 4000 })
    } catch {
      toast.error('No se pudo leer el ticket — intentá con mejor iluminación')
    } finally {
      setScanning(false)
    }
  }, [pendingFile, isPremium, onScanned, receiptUrl])

  const handleRemove = () => {
    setPreview(null)
    setPendingFile(null)
    setScanResult(null)
    onReceiptUrl(null)
  }

  return (
    <div>
      <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
        Ticket / Comprobante
        {isPremium && <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(139,92,246,0.12)', color: '#8b5cf6' }}>IA</span>}
        <span className="ml-1 font-normal" style={{ color: 'var(--text-faint)' }}>(opcional)</span>
      </label>

      {displayUrl ? (
        <div className="space-y-2">
          {/* Thumbnail */}
          <div className="relative inline-flex items-start gap-3">
            <div className="relative">
              <img src={displayUrl} alt="Ticket"
                className="w-24 h-24 object-cover rounded-xl cursor-pointer"
                style={{ border: '1px solid var(--border)' }}
                onClick={() => window.open(receiptUrl ?? displayUrl, '_blank')}
              />
              {(uploading || scanning) && (
                <div className="absolute inset-0 rounded-xl flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.45)' }}>
                  <Loader2 size={20} className="animate-spin text-white" />
                </div>
              )}
              {!uploading && !scanning && (
                <>
                  <button type="button" onClick={handleRemove}
                    className="absolute -top-2 -right-2 rounded-full p-0.5 text-white"
                    style={{ background: '#ef4444' }}>
                    <X size={12} />
                  </button>
                  <button type="button" onClick={() => window.open(receiptUrl ?? displayUrl, '_blank')}
                    className="absolute bottom-1 right-1 rounded-lg p-1"
                    style={{ background: 'rgba(0,0,0,0.4)', color: 'white' }}>
                    <ZoomIn size={12} />
                  </button>
                </>
              )}
            </div>

            {/* Scan button + result */}
            <div className="flex flex-col gap-2 justify-center py-1">
              {isPremium && !scanning && !scanResult && (
                <button type="button" onClick={handleScan} disabled={uploading}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white transition-all"
                  style={{ background: 'linear-gradient(135deg,#8b5cf6,#6366f1)', opacity: uploading ? 0.5 : 1 }}>
                  <Sparkles size={12} />
                  Escanear con IA
                </button>
              )}
              {scanning && (
                <div className="flex items-center gap-1.5 text-xs" style={{ color: '#8b5cf6' }}>
                  <Loader2 size={12} className="animate-spin" />
                  Leyendo ticket...
                </div>
              )}
              {scanResult && (
                <div className="rounded-xl px-3 py-2 text-xs space-y-0.5"
                  style={{ background: scanResult.confidence === 'high' ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)', border: `1px solid ${scanResult.confidence === 'high' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}` }}>
                  <div className="flex items-center gap-1 font-semibold mb-1"
                    style={{ color: scanResult.confidence === 'high' ? '#10b981' : '#f59e0b' }}>
                    {scanResult.confidence === 'high'
                      ? <CheckCircle2 size={11} />
                      : <AlertCircle size={11} />}
                    {scanResult.confidence === 'high' ? 'Datos extraídos' : 'Revisar datos'}
                  </div>
                  {scanResult.merchant && <p style={{ color: 'var(--text-primary)' }}><span style={{ color: 'var(--text-muted)' }}>Comercio:</span> {scanResult.merchant}</p>}
                  {scanResult.amount && <p style={{ color: 'var(--text-primary)' }}><span style={{ color: 'var(--text-muted)' }}>Monto:</span> ${scanResult.amount.toLocaleString('es-AR')} {scanResult.currency}</p>}
                  {scanResult.date && <p style={{ color: 'var(--text-primary)' }}><span style={{ color: 'var(--text-muted)' }}>Fecha:</span> {scanResult.date}</p>}
                  <button type="button" onClick={handleScan}
                    className="text-[10px] underline mt-1" style={{ color: 'var(--text-faint)' }}>
                    Volver a escanear
                  </button>
                </div>
              )}
              {!isPremium && (
                <p className="text-[10px]" style={{ color: 'var(--text-faint)' }}>Escaneo IA disponible en Premium</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <button type="button" disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm w-full transition-colors"
          style={{ border: '2px dashed var(--border)', color: 'var(--text-faint)' }}>
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
          {uploading ? 'Subiendo...' : isPremium ? 'Sacar foto o subir comprobante (con escaneo IA)' : 'Agregar comprobante'}
        </button>
      )}

      <input ref={inputRef} type="file" accept="image/*" capture="environment"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}
