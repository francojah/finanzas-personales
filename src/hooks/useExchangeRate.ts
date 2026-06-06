'use client'

import { useState, useEffect, useCallback } from 'react'

interface ExchangeRates {
  mep: number | null
  ccl: number | null
  blue: number | null
  oficial: number | null
  btc: number | null       // BTC/USD
  loading: boolean
  error: boolean
  lastUpdate: Date | null
  refresh: () => void
}

let cachedRate: { mep: number; ccl: number; blue: number; oficial: number; btc: number; ts: number } | null = null
const CACHE_TTL = 5 * 60 * 1000 // 5 minutos

export function useExchangeRate(): ExchangeRates {
  const [rates, setRates] = useState({
    mep:     cachedRate?.mep     ?? null as number | null,
    ccl:     cachedRate?.ccl     ?? null as number | null,
    blue:    cachedRate?.blue    ?? null as number | null,
    oficial: cachedRate?.oficial ?? null as number | null,
    btc:     cachedRate?.btc     ?? null as number | null,
  })
  const [loading, setLoading]     = useState(!cachedRate)
  const [error, setError]         = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(
    cachedRate ? new Date(cachedRate.ts) : null
  )

  const fetchRates = useCallback(async () => {
    if (cachedRate && Date.now() - cachedRate.ts < CACHE_TTL) {
      setRates({ mep: cachedRate.mep, ccl: cachedRate.ccl, blue: cachedRate.blue, oficial: cachedRate.oficial, btc: cachedRate.btc })
      setLoading(false)
      return
    }

    setLoading(true)
    setError(false)

    try {
      // Fetch dólar + BTC en paralelo
      const [dolarRes, btcRes] = await Promise.all([
        window.fetch('https://dolarapi.com/v1/dolares'),
        window.fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd'),
      ])

      const list = await dolarRes.json() as { casa: string; venta: number }[]
      const btcData = await btcRes.json().catch(() => null)

      const byCasa = (casa: string) => list.find((d: any) => d.casa?.toLowerCase() === casa)?.venta ?? null

      const mep     = byCasa('bolsa')        // Dólar Bolsa = MEP
      const ccl     = byCasa('contadoconliqui')
      const blue    = byCasa('blue')
      const oficial = byCasa('oficial')
      const btc     = btcData?.bitcoin?.usd ?? null

      if (!mep) throw new Error('No MEP data')

      cachedRate = { mep: mep!, ccl: ccl ?? mep! * 1.02, blue: blue ?? mep!, oficial: oficial ?? mep! * 0.85, btc, ts: Date.now() }
      setRates({ mep: cachedRate.mep, ccl: cachedRate.ccl, blue: cachedRate.blue, oficial: cachedRate.oficial, btc: cachedRate.btc })
      setLastUpdate(new Date())
    } catch {
      // Fallback: Bluelytics
      try {
        const res2  = await window.fetch('https://api.bluelytics.com.ar/v2/latest')
        const data2 = await res2.json()
        const blue  = data2.blue?.value_sell ?? 0
        const of    = data2.oficial?.value_sell ?? 0
        cachedRate  = { mep: blue * 0.97, ccl: blue * 1.01, blue, oficial: of, btc: null, ts: Date.now() }
        setRates({ mep: cachedRate.mep, ccl: cachedRate.ccl, blue: cachedRate.blue, oficial: cachedRate.oficial, btc: null })
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

// Helper: formatear precio en K (ej: 98.500 → "98.5K")
export function formatK(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M'
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K'
  return n.toFixed(0)
}

export function convertAmount(amount: number, fromCurrency: 'ARS' | 'USD', rate: number): { ars: number; usd: number } {
  if (fromCurrency === 'USD') return { usd: amount, ars: amount * rate }
  return { ars: amount, usd: rate > 0 ? amount / rate : 0 }
}
