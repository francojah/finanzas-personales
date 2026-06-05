'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Sparkles, Loader2 } from 'lucide-react'
import { usePlan } from '@/hooks/usePlan'

export default function UpgradeSuccessPage() {
  const router  = useRouter()
  const { refresh, isPremium, loading } = usePlan()
  const [attempts, setAttempts] = useState(0)

  // El webhook puede tardar unos segundos en llegar — polling hasta 20s
  useEffect(() => {
    if (isPremium) return
    if (attempts >= 10) return

    const timer = setTimeout(() => {
      refresh()
      setAttempts(a => a + 1)
    }, 2000)
    return () => clearTimeout(timer)
  }, [isPremium, attempts])

  const stillWaiting = !isPremium && attempts < 10

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="max-w-sm w-full text-center space-y-6 p-8 rounded-2xl"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>

        {stillWaiting && !loading ? (
          <>
            <Loader2 size={48} className="mx-auto animate-spin" style={{ color: 'var(--accent-icon)' }} />
            <div>
              <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                Procesando tu suscripción...
              </h1>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Estamos confirmando el pago con MercadoPago. Esto tarda unos segundos.
              </p>
            </div>
          </>
        ) : isPremium ? (
          <>
            <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))' }}>
              <Sparkles size={36} style={{ color: '#818cf8' }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                ¡Bienvenido a Premium! 🎉
              </h1>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Tu suscripción está activa. Ya podés usar todas las funciones.
              </p>
            </div>
            <button
              onClick={() => router.push('/')}
              className="w-full py-3 rounded-xl text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
            >
              Ir al Dashboard
            </button>
          </>
        ) : (
          // Pasaron 20s y no llegó el webhook — puede estar en camino
          <>
            <CheckCircle2 size={48} className="mx-auto" style={{ color: 'var(--income)' }} />
            <div>
              <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                Pago recibido
              </h1>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Tu suscripción se está procesando. En unos minutos vas a tener acceso completo.
                Si en 10 minutos no se activó, escribinos.
              </p>
            </div>
            <button
              onClick={() => { refresh(); router.push('/') }}
              className="w-full py-3 rounded-xl text-sm font-bold"
              style={{ background: 'var(--accent-bg)', color: 'var(--accent-text)', border: '1px solid var(--accent-border)' }}
            >
              Volver al Dashboard
            </button>
          </>
        )}
      </div>
    </div>
  )
}
