'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { CreditCard } from '@/types/database'

export function useCreditCards() {
  const [cards, setCards] = useState<CreditCard[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('credit_cards')
        .select('*')
        .eq('is_active', true)
        .order('created_at')
      setCards(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  return { cards, loading }
}
