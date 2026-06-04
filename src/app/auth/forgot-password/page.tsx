'use client'

import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Loader2, ArrowLeft } from 'lucide-react'
import { useState } from 'react'

const schema = z.object({
  email: z.string().email('Email inválido'),
})

type FormData = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const supabase = createClient()
  const [sent, setSent] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })

    if (error) {
      toast.error('Error al enviar el email')
      return
    }

    setSent(true)
  }

  if (sent) {
    return (
      <div className="text-center">
        <div className="text-4xl mb-3">📬</div>
        <h2 className="text-lg font-bold text-slate-900 mb-2">Email enviado</h2>
        <p className="text-sm text-slate-500 mb-6">
          Revisá tu bandeja de entrada y seguí el link para resetear tu contraseña.
        </p>
        <Link href="/auth/login" className="text-indigo-600 text-sm font-medium hover:underline">
          Volver al login
        </Link>
      </div>
    )
  }

  return (
    <>
      <Link href="/auth/login" className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-5">
        <ArrowLeft size={14} /> Volver
      </Link>

      <h2 className="text-xl font-bold text-slate-900 mb-2">Recuperar contraseña</h2>
      <p className="text-sm text-slate-500 mb-6">
        Te enviamos un link para resetear tu contraseña.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
          <input
            {...register('email')}
            type="email"
            placeholder="tu@email.com"
            className="input-base"
          />
          {errors.email && (
            <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold rounded-xl py-2.5 transition-colors flex items-center justify-center gap-2"
        >
          {isSubmitting && <Loader2 size={16} className="animate-spin" />}
          Enviar link
        </button>
      </form>
    </>
  )
}
