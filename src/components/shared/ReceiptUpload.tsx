'use client'

import { useState, useRef } from 'react'
import { Camera, X, ZoomIn, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface ReceiptUploadProps {
  value?: string | null          // URL actual del comprobante
  onChange: (url: string | null) => void
  disabled?: boolean
}

export function ReceiptUpload({ value, onChange, disabled }: ReceiptUploadProps) {
  const supabase = createClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten imágenes')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen no puede superar 5MB')
      return
    }

    // Preview inmediato
    const localUrl = URL.createObjectURL(file)
    setPreview(localUrl)
    setUploading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Sin sesión')

      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${user.id}/receipts/${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(path, file, { upsert: false })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('receipts')
        .getPublicUrl(path)

      onChange(urlData.publicUrl)
      toast.success('Comprobante subido')
    } catch (err: any) {
      toast.error(err.message ?? 'Error al subir comprobante')
      setPreview(null)
      onChange(null)
    } finally {
      setUploading(false)
    }
  }

  async function handleRemove() {
    setPreview(null)
    onChange(null)
  }

  const displayUrl = preview ?? value

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        Comprobante <span className="text-slate-400 font-normal">(opcional)</span>
      </label>

      {displayUrl ? (
        // Thumbnail con botón eliminar
        <div className="relative inline-block">
          <img
            src={displayUrl}
            alt="Comprobante"
            className="w-24 h-24 object-cover rounded-xl border border-slate-200 cursor-pointer"
            onClick={() => window.open(value ?? displayUrl, '_blank')}
          />
          {uploading && (
            <div className="absolute inset-0 bg-white/70 rounded-xl flex items-center justify-center">
              <Loader2 size={20} className="animate-spin text-indigo-600" />
            </div>
          )}
          {!uploading && (
            <>
              <button
                type="button"
                onClick={handleRemove}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 transition-colors"
              >
                <X size={12} />
              </button>
              <button
                type="button"
                onClick={() => window.open(value ?? displayUrl, '_blank')}
                className="absolute bottom-1 right-1 bg-black/40 text-white rounded-lg p-1 hover:bg-black/60 transition-colors"
              >
                <ZoomIn size={12} />
              </button>
            </>
          )}
        </div>
      ) : (
        // Drop zone / botón
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'flex items-center gap-2 px-4 py-3 border-2 border-dashed rounded-xl text-sm transition-colors w-full',
            'border-slate-200 text-slate-400 hover:border-indigo-300 hover:text-indigo-500',
            (disabled || uploading) && 'opacity-50 cursor-not-allowed'
          )}
        >
          {uploading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Camera size={16} />
          )}
          {uploading ? 'Subiendo...' : 'Agregar foto del comprobante'}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}
