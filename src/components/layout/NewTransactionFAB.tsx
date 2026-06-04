'use client'

import { Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'

/**
 * Floating Action Button para nuevo movimiento — solo visible en mobile.
 * Se posiciona sobre el bottom nav.
 */
export function NewTransactionFAB() {
  const router = useRouter()

  return (
    <button
      onClick={() => router.push('/transactions/new')}
      className="md:hidden fixed bottom-20 right-4 z-50 w-14 h-14 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-full shadow-lg shadow-indigo-300 flex items-center justify-center transition-transform"
      aria-label="Nuevo movimiento"
    >
      <Plus size={24} />
    </button>
  )
}
