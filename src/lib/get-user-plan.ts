import type { Plan } from '@/lib/plans'

// Server-side helper para obtener el plan del usuario
export async function getUserPlan(supabase: any, userId: string): Promise<Plan> {
  const { data } = await supabase
    .from('profiles')
    .select('plan, plan_expires_at')
    .eq('id', userId)
    .single()

  if (!data) return 'free'

  const expired = data.plan_expires_at
    ? new Date(data.plan_expires_at) < new Date()
    : false

  return data.plan === 'premium' && !expired ? 'premium' : 'free'
}
