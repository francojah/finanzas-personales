'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Account } from '@/types/database'

export function useAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('accounts')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')
      setAccounts(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  return { accounts, loading, refetch: () => {} }
}
