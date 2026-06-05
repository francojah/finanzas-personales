'use client'

import { useState, useEffect, createContext, useContext } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type Plan, PLAN_FEATURES, type PlanFeatures } from '@/lib/plans'

interface PlanContext {
  plan: Plan
  features: PlanFeatures
  loading: boolean
  isPremium: boolean
  refresh: () => void
}

// Hook standalone (sin context) — para uso directo en componentes
export function usePlan(): PlanContext {
  const [plan, setPlan] = useState<Plan>('free')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data } = await supabase
      .from('profiles')
      .select('plan, plan_expires_at')
      .eq('id', user.id)
      .single()

    if (data) {
      // Si tiene plan premium pero expiró, forzar free
      const expired = data.plan_expires_at
        ? new Date(data.plan_expires_at) < new Date()
        : false
      setPlan(data.plan === 'premium' && !expired ? 'premium' : 'free')
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  return {
    plan,
    features: PLAN_FEATURES[plan],
    loading,
    isPremium: plan === 'premium',
    refresh: load,
  }
}
