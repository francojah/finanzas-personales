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

const labelStyle = { color: '#999' }
const inputStyle = {
  width: '100%',
  border: '1.5px solid #2a2a2a',
  borderRadius: '10px',
  padding: '0.625rem 0.875rem',
  fontSize: '0.9375rem',
  color: '#ededed',
  background: '#222',
  outline: 'none',
}

export default function NewAssetPage() {
  const router = useRouter()
  const supabase = createClient()
  const [focusedInput, setFocusedInput] = useState<string | null>(null)

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'property', currency: 'USD' },
  })

  const selectedType = watch('type')
  const selectedCurrency = watch('currency')

  async function onSubmit(data: FormData) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('assets').insert({
      user_id:     user.id,
      name:        data.name,
      type:        data.type,
      description: data.description || null,
      value:       data.value,
      currency:    data.currency,
    })

    if (error) { toast.error('Error al guardar'); return }
    toast.success('Activo agregado')
    router.push('/patrimonio')
  }

  const getFocusStyle = (name: string) =>
    focusedInput === name
      ? { ...inputStyle, borderColor: '#7c6ff7', boxShadow: '0 0 0 3px rgba(124,111,247,0.12)' }
      : inputStyle

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-1" style={{ color: '#ededed' }}>Nuevo activo</h1>
      <p className="text-sm mb-6" style={{ color: '#666' }}>Registrá un bien de tu patrimonio</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* Tipo */}
        <div>
          <label className="block text-sm font-medium mb-2" style={labelStyle}>Tipo de activo</label>
          <div className="grid grid-cols-2 gap-2">
            {TYPE_OPTIONS.map(opt => {
              const Icon = opt.icon
              const active = selectedType === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setValue('type', opt.value as FormData['type'])}
                  className="flex items-start gap-3 p-3 rounded-xl text-left transition-all"
                  style={{
                    background: active ? 'rgba(124,111,247,0.1)' : '#1a1a1a',
                    border: `1.5px solid ${active ? 'rgba(124,111,247,0.4)' : '#2a2a2a'}`,
                  }}
                >
                  <Icon size={18} style={{ color: active ? '#a89efa' : '#555', marginTop: 1 }} />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: active ? '#c4b8ff' : '#ededed' }}>{opt.label}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#555' }}>{opt.hint}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Nombre */}
        <div>
          <label className="block text-sm font-medium mb-1.5" style={labelStyle}>Nombre</label>
          <input
            {...register('name')}
            placeholder='ej. "Casa en Mar del Plata"'
            style={getFocusStyle('name')}
            onFocus={() => setFocusedInput('name')}
            onBlur={() => setFocusedInput(null)}
          />
          {errors.name && <p className="text-xs mt-1" style={{ color: '#f87171' }}>{errors.name.message}</p>}
        </div>

        {/* Descripción */}
        <div>
          <label className="block text-sm font-medium mb-1.5" style={labelStyle}>Descripción <span style={{ color: '#555' }}>(opcional)</span></label>
          <input
            {...register('description')}
            placeholder='ej. "3 ambientes, balcón"'
            style={getFocusStyle('description')}
            onFocus={() => setFocusedInput('description')}
            onBlur={() => setFocusedInput(null)}
          />
        </div>

        {/* Valor + Moneda */}
        <div>
          <label className="block text-sm font-medium mb-1.5" style={labelStyle}>Valor estimado</label>
          <div className="flex gap-2">
            {/* Moneda toggle */}
            <div className="flex rounded-xl overflow-hidden shrink-0" style={{ border: '1.5px solid #2a2a2a' }}>
              {(['USD', 'ARS'] as const).map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setValue('currency', c)}
                  className="px-3 py-2 text-sm font-semibold transition-colors"
                  style={selectedCurrency === c
                    ? { background: '#7c6ff7', color: '#fff' }
                    : { background: '#1a1a1a', color: '#666' }
                  }
                >
                  {c}
                </button>
              ))}
            </div>
            <input
              {...register('value')}
              type="number"
              step="0.01"
              placeholder="0.00"
              style={getFocusStyle('value')}
              onFocus={() => setFocusedInput('value')}
              onBlur={() => setFocusedInput(null)}
            />
          </div>
          {errors.value && <p className="text-xs mt-1" style={{ color: '#f87171' }}>{errors.value.message}</p>}
        </div>

        {/* Botones */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors"
            style={{ background: '#1a1a1a', color: '#888', border: '1px solid #2a2a2a' }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: '#7c6ff7' }}
          >
            {isSubmitting && <Loader2 size={15} className="animate-spin" />}
            Guardar activo
          </button>
        </div>

      </form>
    </div>
  )
}
