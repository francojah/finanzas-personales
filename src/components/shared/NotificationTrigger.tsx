'use client'

// Componente invisible que dispara notificaciones cuando hay alertas urgentes.
// Se monta en el dashboard y actúa silenciosamente.

import { useEffect } from 'react'
import { useAlerts } from '@/hooks/useAlerts'
import { useNotifications } from '@/hooks/useNotifications'

export function NotificationTrigger() {
  const { alerts } = useAlerts()
  const { permission, sendNotification } = useNotifications()

  useEffect(() => {
    if (permission !== 'granted' || !alerts.length) return

    // Solo enviar alertas peligrosas / urgentes
    const urgent = alerts.filter(a => a.severity === 'danger')
    if (!urgent.length) return

    // Enviar una sola notificación agrupada si hay múltiples
    if (urgent.length === 1) {
      sendNotification(
        urgent[0].id,
        '⚠️ Alerta financiera',
        urgent[0].message,
        { data: { url: '/' } }
      )
    } else {
      sendNotification(
        `multi_${urgent.map(a => a.id).join('_')}`,
        `⚠️ ${urgent.length} alertas financieras`,
        urgent[0].message + (urgent.length > 1 ? ` y ${urgent.length - 1} más` : ''),
        { data: { url: '/' } }
      )
    }
  }, [alerts, permission])

  return null
}
