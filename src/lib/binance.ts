import type { Candle, Timeframe } from './types';

const SYMBOL_MAP: Record<string, string> = {
  PEPEUSDT: '1000PEPEUSDT',
};

export async function fetchKlines(symbol: string, interval: Timeframe): Promise<Candle[]> {
  const finalSymbol = SYMBOL_MAP[symbol] || symbol;
  const url = `https://data-api.binance.vision/api/v3/klines?symbol=${finalSymbol}&interval=${interval}&limit=250`;
  console.log(`FETCH ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Binance API error ${res.status}`);
  const raw: unknown[][] = await res.json();
  return raw.map((c) => ({
    time: Math.floor(c[0] as number) / 1000,
    open: +(c[1] as string),
    high: +(c[2] as string),
    low: +(c[3] as string),
    close: +(c[4] as string),
    volume: +(c[5] as string),
  }));
}
