'use client'

import { Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'

/**
 * Floating Action Button para nuevo movimiento.
 * Visible en mobile y desktop, a la izquierda del Guru FAB.
 */
export function NewTransactionFAB() {
  const router = useRouter()

  return (
    <button
      onClick={() => router.push('/transactions/new')}
      className="fixed z-[96] flex items-center justify-center rounded-full active:scale-95 transition-transform"
      style={{
        width: 52,
        height: 52,
        bottom: 84,
        right: 80, // a la izquierda del Guru (52px botón + 12px gap + 16px margen)
        background: 'var(--accent)',
        boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
      }}
      aria-label="Nuevo movimiento"
      title="Nuevo movimiento"
    >
      <Plus size={22} className="text-white" />
    </button>
  )
}
