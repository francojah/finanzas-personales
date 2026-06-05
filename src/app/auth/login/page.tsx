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
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [showPassword, setShowPassword] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    const { error } = await supabase.auth.signInWithPassword({ email: data.email, password: data.password })
    if (error) { toast.error('Credenciales incorrectas'); return }
    router.push('/')
    router.refresh()
  }

  return (
    <>
      <h2 className="text-lg font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>Iniciar sesión</h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Email</label>
          <input {...register('email')} type="email" placeholder="tu@email.com" className="input-base" autoComplete="email" />
          {errors.email && <p className="text-xs mt-1" style={{ color: 'var(--expense)' }}>{errors.email.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Contraseña</label>
          <div className="relative">
            <input {...register('password')} type={showPassword ? 'text' : 'password'} placeholder="••••••••" className="input-base pr-10" autoComplete="current-password" />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-faint)' }}>
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && <p className="text-xs mt-1" style={{ color: 'var(--expense)' }}>{errors.password.message}</p>}
        </div>

        <div className="flex justify-end">
          <Link href="/auth/forgot-password" className="text-sm font-medium" style={{ color: 'var(--accent)' }}>
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full disabled:opacity-50 text-white font-semibold rounded-xl py-2.5 flex items-center justify-center gap-2 transition-opacity"
          style={{ background: 'var(--accent)', boxShadow: '0 4px 12px var(--accent-bg)' }}
        >
          {isSubmitting && <Loader2 size={16} className="animate-spin" />}
          Ingresar
        </button>
      </form>

      <p className="text-center text-sm mt-6" style={{ color: 'var(--text-muted)' }}>
        ¿No tenés cuenta?{' '}
        <Link href="/auth/register" className="font-medium" style={{ color: 'var(--accent)' }}>Registrarte</Link>
      </p>
    </>
  )
}
