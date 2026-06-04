import { NextRequest, NextResponse } from 'next/server'

// Fetch price from Yahoo Finance
async function fetchYahoo(ticker: string): Promise<number | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 300 }, // cache 5 min
    })
    const data = await res.json()
    const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice
    return price ?? null
  } catch {
    return null
  }
}

// Fetch price from CoinGecko
async function fetchCoinGecko(coinId: string): Promise<number | null> {
  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`
    const res = await fetch(url, { next: { revalidate: 300 } })
    const data = await res.json()
    return data?.[coinId]?.usd ?? null
  } catch {
    return null
  }
}

// Mapeo de tickers crypto comunes a CoinGecko IDs
const CRYPTO_MAP: Record<string, string> = {
  BTC: 'bitcoin', ETH: 'ethereum', USDT: 'tether',
  BNB: 'binancecoin', SOL: 'solana', ADA: 'cardano',
  MATIC: 'matic-network', DOT: 'polkadot', AVAX: 'avalanche-2',
  LINK: 'chainlink', UNI: 'uniswap', XRP: 'ripple',
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const ticker = searchParams.get('ticker')?.toUpperCase()
  const source = searchParams.get('source') // 'yahoo' | 'coingecko'

  if (!ticker) {
    return NextResponse.json({ error: 'ticker required' }, { status: 400 })
  }

  let price: number | null = null

  if (source === 'coingecko') {
    const coinId = CRYPTO_MAP[ticker] ?? ticker.toLowerCase()
    price = await fetchCoinGecko(coinId)
  } else {
    // Yahoo Finance por defecto
    price = await fetchYahoo(ticker)
  }

  if (price === null) {
    return NextResponse.json({ error: 'Price not found', ticker }, { status: 404 })
  }

  return NextResponse.json({ ticker, price, source: source ?? 'yahoo', timestamp: Date.now() })
}
