'use client'

import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Loader2, ArrowLeft, Mail } from 'lucide-react'
import { useState } from 'react'

const schema = z.object({
  email: z.string().email('Email inválido'),
})
type FormData = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const supabase = createClient()
  const [sent, setSent] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    if (error) { toast.error('Error al enviar el email'); return }
    setSent(true)
  }

  if (sent) {
    return (
      <div className="text-center">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: 'var(--accent-bg)' }}
        >
          <Mail size={24} style={{ color: 'var(--accent-icon)' }} />
        </div>
        <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Email enviado</h2>
        <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
          Revisá tu bandeja de entrada y seguí el link para resetear tu contraseña.
        </p>
        <Link href="/auth/login" className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
          Volver al inicio de sesión
        </Link>
      </div>
    )
  }

  return (
    <>
      <Link
        href="/auth/login"
        className="flex items-center gap-1.5 text-sm mb-6"
        style={{ color: 'var(--text-muted)' }}
      >
        <ArrowLeft size={14} /> Volver
      </Link>

      <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
        Recuperar contraseña
      </h2>
      <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
        Te enviamos un link para resetear tu contraseña.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            Email
          </label>
          <input
            {...register('email')}
            type="email"
            placeholder="tu@email.com"
            className="input-base"
            autoComplete="email"
          />
          {errors.email && (
            <p className="text-xs mt-1" style={{ color: 'var(--expense)' }}>{errors.email.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full disabled:opacity-50 text-white font-semibold rounded-xl py-2.5 flex items-center justify-center gap-2 transition-opacity"
          style={{ background: 'var(--accent)' }}
        >
          {isSubmitting && <Loader2 size={16} className="animate-spin" />}
          Enviar link
        </button>
      </form>
    </>
  )
}
