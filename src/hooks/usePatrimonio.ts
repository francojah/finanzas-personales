'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { PatrimonioAsset } from '@/types/database'

export function usePatrimonio() {
  const [assets, setAssets] = useState<PatrimonioAsset[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('assets')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    setAssets((data ?? []) as PatrimonioAsset[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  return { assets, loading, refetch: load }
}
