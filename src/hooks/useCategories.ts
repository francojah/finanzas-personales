'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Category } from '@/types/database'

export function useCategories(type?: 'income' | 'expense') {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      setLoading(true)
      let query = supabase
        .from('categories')
        .select('*, subcategories(*)')
        .eq('is_active', true)
        .order('sort_order')

      if (type) query = query.eq('type', type)

      const { data } = await query
      setCategories(data ?? [])
      setLoading(false)
    }
    load()
  }, [type])

  return { categories, loading }
}
