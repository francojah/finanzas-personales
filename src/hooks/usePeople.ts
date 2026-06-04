'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Person } from '@/types/database'

export function usePeople() {
  const [people, setPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('people')
        .select('*')
        .order('name')
      setPeople(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  return { people, loading }
}
