'use client'

import { useState, useEffect, useCallback } from 'react'

interface ExchangeRates {
  mep: number | null
  ccl: number | null
  blue: number | null
  oficial: number | null
  loading: boolean
  error: boolean
  lastUpdate: Date | null
  refresh: () => void
}

let cachedRate: { mep: number; ccl: number; blue: number; oficial: number; ts: number } | null = null
const CACHE_TTL = 5 * 60 * 1000 // 5 minutos

export function useExchangeRate(): ExchangeRates {
  const [rates, setRates] = useState({
    mep:     cachedRate?.mep     ?? null as number | null,
    ccl:     cachedRate?.ccl     ?? null as number | null,
    blue:    cachedRate?.blue    ?? null as number | null,
    oficial: cachedRate?.oficial ?? null as number | null,
  })
  const [loading, setLoading]     = useState(!cachedRate)
  const [error, setError]         = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(
    cachedRate ? new Date(cachedRate.ts) : null
  )

  const fetchRates = useCallback(async () => {
    if (cachedRate && Date.now() - cachedRate.ts < CACHE_TTL) {
      setRates({ mep: cachedRate.mep, ccl: cachedRate.ccl, blue: cachedRate.blue, oficial: cachedRate.oficial })
      setLoading(false)
      return
    }

    setLoading(true)
    setError(false)

    try {
      // dolarapi.com — cotizaciones oficiales MEP, CCL, blue, oficial
      const res  = await window.fetch('https://dolarapi.com/v1/dolares')
      const list = await res.json() as { nombre: string; compra: number; venta: number }[]

      const byCasa = (casa: string) => list.find((d: any) => d.casa?.toLowerCase() === casa)?.venta ?? null

      const mep     = byCasa('bolsa')        // Dólar Bolsa = MEP
      const ccl     = byCasa('contadoconliqui')
      const blue    = byCasa('blue')
      const oficial = byCasa('oficial')

      if (!mep) throw new Error('No MEP data')

      cachedRate = { mep: mep!, ccl: ccl ?? mep! * 1.02, blue: blue ?? mep!, oficial: oficial ?? mep! * 0.85, ts: Date.now() }
      setRates({ mep: cachedRate.mep, ccl: cachedRate.ccl, blue: cachedRate.blue, oficial: cachedRate.oficial })
      setLastUpdate(new Date())
    } catch {
      // Fallback: Bluelytics
      try {
        const res2  = await window.fetch('https://api.bluelytics.com.ar/v2/latest')
        const data2 = await res2.json()
        const blue  = data2.blue?.value_sell ?? 0
        const of    = data2.oficial?.value_sell ?? 0
        cachedRate  = { mep: blue * 0.97, ccl: blue * 1.01, blue, oficial: of, ts: Date.now() }
        setRates({ mep: cachedRate.mep, ccl: cachedRate.ccl, blue: cachedRate.blue, oficial: cachedRate.oficial })
        setLastUpdate(new Date())
      } catch {
        setError(true)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchRates() }, [fetchRates])

  return { ...rates, loading, error, lastUpdate, refresh: fetchRates }
}

export function convertAmount(amount: number, fromCurrency: 'ARS' | 'USD', rate: number): { ars: number; usd: number } {
  if (fromCurrency === 'USD') return { usd: amount, ars: amount * rate }
  return { ars: amount, usd: rate > 0 ? amount / rate : 0 }
}
