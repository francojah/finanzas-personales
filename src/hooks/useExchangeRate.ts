'use client'

import { useState, useEffect, useCallback } from 'react'

interface ExchangeRates {
  mep: number | null
  ccl: number | null
  loading: boolean
  error: boolean
  lastUpdate: Date | null
  refresh: () => void
}

// Cache simple en memoria para no hacer fetch en cada render
let cachedRate: { mep: number; ccl: number; ts: number } | null = null
const CACHE_TTL = 5 * 60 * 1000 // 5 minutos

export function useExchangeRate(): ExchangeRates {
  const [mep, setMep] = useState<number | null>(cachedRate?.mep ?? null)
  const [ccl, setCcl] = useState<number | null>(cachedRate?.ccl ?? null)
  const [loading, setLoading] = useState(!cachedRate)
  const [error, setError] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(
    cachedRate ? new Date(cachedRate.ts) : null
  )

  const fetch = useCallback(async () => {
    // Usar cache si es reciente
    if (cachedRate && Date.now() - cachedRate.ts < CACHE_TTL) {
      setMep(cachedRate.mep)
      setCcl(cachedRate.ccl)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(false)

    try {
      const res = await window.fetch('https://api.bluelytics.com.ar/v2/latest')
      const data = await res.json()

      // Bluelytics provee blue. Para MEP/CCL usamos como aproximación.
      // TODO: reemplazar con API MEP real cuando esté disponible
      const rateValue = data.blue?.value_sell ?? data.oficial?.value_sell ?? 0

      cachedRate = { mep: rateValue, ccl: rateValue * 1.015, ts: Date.now() }

      setMep(cachedRate.mep)
      setCcl(cachedRate.ccl)
      setLastUpdate(new Date())
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { mep, ccl, loading, error, lastUpdate, refresh: fetch }
}

// Helper para convertir usando el hook
export function convertAmount(
  amount: number,
  fromCurrency: 'ARS' | 'USD',
  rate: number
): { ars: number; usd: number } {
  if (fromCurrency === 'USD') {
    return { usd: amount, ars: amount * rate }
  } else {
    return { ars: amount, usd: rate > 0 ? amount / rate : 0 }
  }
}
