'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Building2, Car, Briefcase, Package } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const schema = z.object({
  name:        z.string().min(1, 'Requerido'),
  type:        z.enum(['property', 'vehicle', 'business', 'other']),
  description: z.string().optional(),
  value:       z.coerce.number().positive('Debe ser mayor a 0'),
  currency:    z.enum(['USD', 'ARS']),
})
type FormData = z.infer<typeof schema>

const TYPE_OPTIONS = [
  { value: 'property', label: 'Inmueble',  icon: Building2, hint: 'Casa, depto, terreno' },
  { value: 'vehicle',  label: 'Vehículo',  icon: Car,       hint: 'Auto, moto, camión' },
  { value: 'business', label: 'Negocio',   icon: Briefcase, hint: 'Empresa, participación' },
  { value: 'other',    label: 'Otro',      icon: Package,   hint: 'Arte, joyas, etc.' },
]

export default function NewAssetPage() {
  const router = useRouter()
  const supabase = createClient()

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'property', currency: 'USD' },
  })

  const selectedType     = watch('type')
  const selectedCurrency = watch('currency')

  async function onSubmit(data: FormData) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('assets').insert({
      user_id: user.id, name: data.name, type: data.type,
      description: data.description || null, value: data.value, currency: data.currency,
    })
    if (error) { toast.error('Error al guardar'); return }
    toast.success('Activo agregado')
    router.push('/patrimonio')
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Nuevo activo</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Registrá un bien de tu patrimonio</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Tipo de activo</label>
          <div className="grid grid-cols-2 gap-2">
            {TYPE_OPTIONS.map(opt => {
              const Icon = opt.icon
              const active = selectedType === opt.value
              return (
                <button
                  key={opt.value} type="button"
                  onClick={() => setValue('type', opt.value as FormData['type'])}
                  className="flex items-start gap-3 p-3 rounded-xl text-left transition-all"
                  style={{
                    background: active ? 'var(--accent-bg)' : 'var(--surface)',
                    border: `1.5px solid ${active ? 'var(--accent-border)' : 'var(--border)'}`,
                  }}
                >
                  <Icon size={18} style={{ color: active ? 'var(--accent-icon)' : 'var(--text-muted)', marginTop: 1 }} />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: active ? 'var(--accent-text)' : 'var(--text-primary)' }}>{opt.label}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{opt.hint}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Nombre</label>
          <input {...register('name')} placeholder='"Casa en Mar del Plata"' className="input-base" />
          {errors.name && <p className="text-xs mt-1" style={{ color: 'var(--expense)' }}>{errors.name.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            Descripción <span style={{ color: 'var(--text-faint)' }}>(opcional)</span>
          </label>
          <input {...register('description')} placeholder='"3 ambientes, balcón"' className="input-base" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Valor estimado</label>
          <div className="flex gap-2">
            <div className="flex rounded-xl overflow-hidden shrink-0" style={{ border: '1.5px solid var(--border)' }}>
              {(['USD', 'ARS'] as const).map(c => (
                <button key={c} type="button" onClick={() => setValue('currency', c)}
                  className="px-3 py-2 text-sm font-semibold transition-colors"
                  style={selectedCurrency === c
                    ? { background: 'var(--accent)', color: '#fff' }
                    : { background: 'var(--surface)', color: 'var(--text-muted)' }
                  }
                >
                  {c}
                </button>
              ))}
            </div>
            <input {...register('value')} type="number" step="0.01" placeholder="0.00" className="input-base" />
          </div>
          {errors.value && <p className="text-xs mt-1" style={{ color: 'var(--expense)' }}>{errors.value.message}</p>}
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => router.back()}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
          >
            Cancelar
          </button>
          <button type="submit" disabled={isSubmitting}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: 'var(--accent)' }}
          >
            {isSubmitting && <Loader2 size={15} className="animate-spin" />}
            Guardar activo
          </button>
        </div>
      </form>
    </div>
  )
}
