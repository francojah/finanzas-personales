// Rate limiter en memoria — simple, sin Redis
// Suficiente para apps con tráfico moderado
// Para producción con alto tráfico: reemplazar por @upstash/ratelimit

interface Entry { count: number; resetAt: number }
const store = new Map<string, Entry>()

// Limpia entradas viejas cada 5 minutos para evitar memory leak
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store.entries()) {
      if (entry.resetAt < now) store.delete(key)
    }
  }, 5 * 60 * 1000)
}

interface RateLimitOptions {
  key: string        // identificador único (ej: userId o IP)
  limit: number      // máximo de requests
  windowMs: number   // ventana en ms (ej: 60_000 = 1 minuto)
}

export function rateLimit({ key, limit, windowMs }: RateLimitOptions): {
  allowed: boolean
  remaining: number
  resetAt: number
} {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || entry.resetAt < now) {
    // Nueva ventana
    const resetAt = now + windowMs
    store.set(key, { count: 1, resetAt })
    return { allowed: true, remaining: limit - 1, resetAt }
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }

  entry.count++
  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt }
}
