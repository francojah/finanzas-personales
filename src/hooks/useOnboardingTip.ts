'use client'

import { useState, useEffect } from 'react'

// Cada sección tiene un ID único. Guardamos en localStorage qué ya vio el usuario.
const STORAGE_KEY = 'finanzapp_onboarding_seen'

function getSeenTips(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return new Set(raw ? JSON.parse(raw) : [])
  } catch {
    return new Set()
  }
}

function markSeen(tipId: string) {
  if (typeof window === 'undefined') return
  try {
    const seen = getSeenTips()
    seen.add(tipId)
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...seen]))
  } catch { /* noop */ }
}

// Devuelve si el tip debe mostrarse y una función para cerrarlo
export function useOnboardingTip(tipId: string) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Pequeño delay para que no flashee en el primer render
    const timer = setTimeout(() => {
      if (!getSeenTips().has(tipId)) {
        setVisible(true)
      }
    }, 600)
    return () => clearTimeout(timer)
  }, [tipId])

  function dismiss() {
    setVisible(false)
    markSeen(tipId)
  }

  function dismissAll() {
    setVisible(false)
    // Marca todos los tips conocidos como vistos
    const allTips = ['dashboard','transactions','investments','patrimonio','projects','loans','people','guru','import','reporte','recurrentes']
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allTips))
    }
  }

  return { visible, dismiss, dismissAll }
}

// Resetea todos los tips (útil para testing desde el panel de admin)
export function resetOnboarding() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY)
  }
}
