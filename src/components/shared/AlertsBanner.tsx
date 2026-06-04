'use client'

import { AlertTriangle, X, BellOff } from 'lucide-react'
import { useState } from 'react'
import { useAlerts } from '@/hooks/useAlerts'
import { cn } from '@/lib/utils'

export function AlertsBanner() {
  const { alerts, loading } = useAlerts()
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  if (loading || alerts.length === 0) return null

  const visible = alerts.filter(a => !dismissed.has(a.id))
  if (visible.length === 0) return null

  return (
    <div className="space-y-2">
      {visible.map(alert => (
        <div
          key={alert.id}
          className={cn(
            'flex items-start gap-3 rounded-xl px-4 py-3 border',
            alert.severity === 'danger'
              ? 'bg-red-50 border-red-200'
              : 'bg-amber-50 border-amber-200'
          )}
        >
          <AlertTriangle
            size={16}
            className={cn(
              'shrink-0 mt-0.5',
              alert.severity === 'danger' ? 'text-red-500' : 'text-amber-500'
            )}
          />
          <p className={cn(
            'flex-1 text-sm font-medium leading-snug',
            alert.severity === 'danger' ? 'text-red-700' : 'text-amber-700'
          )}>
            {alert.message}
          </p>
          <button
            onClick={() => setDismissed(prev => new Set([...prev, alert.id]))}
            className={cn(
              'shrink-0 p-0.5 rounded hover:bg-black/10 transition-colors',
              alert.severity === 'danger' ? 'text-red-400' : 'text-amber-400'
            )}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
