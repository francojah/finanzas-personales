'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

const schema = z.object({
  full_name: z.string().min(2, 'Ingresá tu nombre'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  confirm_password: z.string(),
  terms: z.literal(true, { errorMap: () => ({ message: 'Debés aceptar los términos para continuar' }) }),
}).refine((d) => d.password === d.confirm_password, {
  message: 'Las contraseñas no coinciden',
  path: ['confirm_password'],
})
type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()
  const [showPassword, setShowPassword] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: { data: { full_name: data.full_name } },
    })
    if (error) { toast.error(error.message); return }
    toast.success('¡Cuenta creada! Revisá tu email para confirmar.')
    router.push('/auth/login')
  }

  return (
    <>
      <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Creá tu cuenta gratis</h2>
      <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Sin tarjeta de crédito requerida</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Nombre completo</label>
          <input {...register('full_name')} type="text" placeholder="Franco" className="input-base" autoComplete="name" />
          {errors.full_name && <p className="text-xs mt-1" style={{ color: 'var(--expense)' }}>{errors.full_name.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Email</label>
          <input {...register('email')} type="email" placeholder="tu@email.com" className="input-base" autoComplete="email" />
          {errors.email && <p className="text-xs mt-1" style={{ color: 'var(--expense)' }}>{errors.email.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Contraseña</label>
          <div className="relative">
            <input {...register('password')} type={showPassword ? 'text' : 'password'} placeholder="••••••••" className="input-base pr-10" autoComplete="new-password" />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-faint)' }}>
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && <p className="text-xs mt-1" style={{ color: 'var(--expense)' }}>{errors.password.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Confirmar contraseña</label>
          <input {...register('confirm_password')} type={showPassword ? 'text' : 'password'} placeholder="••••••••" className="input-base" autoComplete="new-password" />
          {errors.confirm_password && <p className="text-xs mt-1" style={{ color: 'var(--expense)' }}>{errors.confirm_password.message}</p>}
        </div>

        {/* T&C checkbox */}
        <div>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              {...register('terms')}
              className="mt-0.5 shrink-0 accent-indigo-500"
              style={{ width: 16, height: 16 }}
            />
            <span className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              Leí y acepto los{' '}
              <Link href="/terms" target="_blank" className="underline font-medium" style={{ color: 'var(--accent)' }}>
                Términos y Condiciones
              </Link>
              {' '}y la{' '}
              <Link href="/privacy" target="_blank" className="underline font-medium" style={{ color: 'var(--accent)' }}>
                Política de Privacidad
              </Link>
              {' '}de REGI$TRATIO.
            </span>
          </label>
          {errors.terms && <p className="text-xs mt-1.5 ml-7" style={{ color: 'var(--expense)' }}>{errors.terms.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full disabled:opacity-50 text-white font-semibold rounded-xl py-2.5 flex items-center justify-center gap-2 mt-2 transition-opacity"
          style={{ background: 'var(--accent)' }}
        >
          {isSubmitting && <Loader2 size={16} className="animate-spin" />}
          Crear cuenta
        </button>
      </form>

      <p className="text-center text-sm mt-6" style={{ color: 'var(--text-muted)' }}>
        ¿Ya tenés cuenta?{' '}
        <Link href="/auth/login" className="font-medium" style={{ color: 'var(--accent)' }}>Iniciá sesión</Link>
      </p>
    </>
  )
}
