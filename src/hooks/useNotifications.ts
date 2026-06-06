'use client'

import { useState, useEffect, useCallback } from 'react'

export type NotifPermission = 'default' | 'granted' | 'denied' | 'unsupported'

// Guarda una marca en localStorage de cuándo se enviaron notificaciones
// para no spamear al usuario con la misma alerta cada vez que abre la app
const SENT_KEY = 'rgt_notif_sent'
const NOTIF_TTL = 12 * 60 * 60 * 1000 // 12 horas

function wasRecentlySent(id: string): boolean {
  try {
    const raw = localStorage.getItem(SENT_KEY)
    const store: Record<string, number> = raw ? JSON.parse(raw) : {}
    return !!store[id] && Date.now() - store[id] < NOTIF_TTL
  } catch { return false }
}

function markSent(id: string) {
  try {
    const raw = localStorage.getItem(SENT_KEY)
    const store: Record<string, number> = raw ? JSON.parse(raw) : {}
    // Limpiar entradas viejas
    const now = Date.now()
    const clean: Record<string, number> = {}
    for (const [k, v] of Object.entries(store)) {
      if (now - v < NOTIF_TTL * 2) clean[k] = v
    }
    clean[id] = now
    localStorage.setItem(SENT_KEY, JSON.stringify(clean))
  } catch {}
}

export function useNotifications() {
  const [permission, setPermission] = useState<NotifPermission>('default')

  useEffect(() => {
    if (!('Notification' in window)) {
      setPermission('unsupported')
      return
    }
    setPermission(Notification.permission as NotifPermission)
  }, [])

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) return false
    const result = await Notification.requestPermission()
    setPermission(result as NotifPermission)
    return result === 'granted'
  }, [])

  const sendNotification = useCallback((
    id: string,
    title: string,
    body: string,
    options: NotificationOptions = {}
  ) => {
    if (permission !== 'granted') return
    if (wasRecentlySent(id)) return

    try {
      // Intentar via service worker para mejor soporte mobile
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SHOW_NOTIFICATION',
          id, title, body, options,
        })
      } else {
        new Notification(title, {
          body,
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          ...options,
        })
      }
      markSent(id)
    } catch {}
  }, [permission])

  return { permission, requestPermission, sendNotification }
}
