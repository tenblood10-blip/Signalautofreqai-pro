import type { Candle, Timeframe, AssetDef, ScanRow, SignalResult } from './types';
import { fetchCandles } from './binance';
import { generateSignal } from './signal';

export const CRYPTO_ASSETS: AssetDef[] = [
  { symbol: 'BTCUSDT', label: 'BTC', klass: 'crypto' },
  { symbol: 'ETHUSDT', label: 'ETH', klass: 'crypto' },
  { symbol: 'SOLUSDT', label: 'SOL', klass: 'crypto' },
  { symbol: 'BNBUSDT', label: 'BNB', klass: 'crypto' },
  { symbol: 'AVAXUSDT', label: 'AVAX', klass: 'crypto' },
  { symbol: 'DOGEUSDT', label: 'DOGE', klass: 'crypto' },
  { symbol: 'XRPUSDT', label: 'XRP', klass: 'crypto' },
  { symbol: 'PEPEUSDT', label: 'PEPE', klass: 'crypto' },
];

export const STOCK_ASSETS: AssetDef[] = [
  { symbol: 'AAPL', label: 'AAPL', klass: 'stock' },
  { symbol: 'NVDA', label: 'NVDA', klass: 'stock' },
  { symbol: 'TSLA', label: 'TSLA', klass: 'stock' },
  { symbol: 'MSFT', label: 'MSFT', klass: 'stock' },
  { symbol: 'META', label: 'META', klass: 'stock' },
  { symbol: 'GOOGL', label: 'GOOGL', klass: 'stock' },
  { symbol: 'AMZN', label: 'AMZN', klass: 'stock' },
];

export const ALL_ASSETS: AssetDef[] = [...CRYPTO_ASSETS, ...STOCK_ASSETS];

// Yahoo has no 3m bars, so stocks use 2m for the 3m timeframe.
const STOCK_YAHOO: Record<Timeframe, { interval: string; range: string }> = {
  '1m': { interval: '1m', range: '5d' },
  '3m': { interval: '2m', range: '5d' },
  '5m': { interval: '5m', range: '1mo' },
  '15m': { interval: '15m', range: '1mo' },
};

async function fetchStockCandles(symbol: string, timeframe: Timeframe, limit = 300): Promise<Candle[]> {
  const { interval, range } = STOCK_YAHOO[timeframe];
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Yahoo API error ${res.status} for ${symbol}`);
  const data = await res.json();
  const result = data?.chart?.result?.[0];
  if (!result) throw new Error(`No Yahoo data for ${symbol}`);
  const timestamps: number[] = result.timestamp ?? [];
  const quote = result.indicators?.quote?.[0];
  if (!quote) throw new Error(`No quote data for ${symbol}`);
  const candles: Candle[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const o = quote.open?.[i];
    const h = quote.high?.[i];
    const l = quote.low?.[i];
    const c = quote.close?.[i];
    const v = quote.volume?.[i];
    if (o == null || h == null || l == null || c == null || v == null) continue;
    candles.push({ time: timestamps[i], open: o, high: h, low: l, close: c, volume: v });
  }
  if (candles.length < 50) throw new Error(`Insufficient Yahoo data for ${symbol}`);
  return candles.slice(-limit);
}

export async function fetchAssetCandles(asset: AssetDef, timeframe: Timeframe): Promise<Candle[]> {
  if (asset.klass === 'crypto') {
    return fetchCandles(asset.symbol, timeframe, 250);
  }
  return fetchStockCandles(asset.symbol, timeframe, 250);
}

function computeReturn1h(candles: Candle[]): number {
  if (candles.length < 13) return 0;
  const last = candles[candles.length - 1].close;
  const prev = candles[candles.length - 13].close;
  return prev !== 0 ? (last / prev - 1) * 100 : 0;
}

export async function scanAssets(
  assets: AssetDef[],
  timeframe: Timeframe
): Promise<ScanRow[]> {
  const results = await Promise.allSettled(
    assets.map(async (asset): Promise<ScanRow> => {
      const candles = await fetchAssetCandles(asset, timeframe);
      const sig = generateSignal(candles, asset.symbol);
      const price = candles[candles.length - 1]?.close ?? 0;
      const ret1h = computeReturn1h(candles);
      return {
        symbol: asset.symbol,
        label: asset.label,
        klass: asset.klass,
        price,
        score: sig?.score ?? 0,
        confidence: sig?.confidence ?? 0,
        side: sig?.side ?? 'WAIT',
        r2: sig?.r2 ?? 0,
        return1h: ret1h,
        signal: sig,
        aggressive: sig?.aggressive ?? false,
      };
    })
  );

  const rows: ScanRow[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') rows.push(r.value);
  }
  rows.sort((a, b) => b.score - a.score);
  return rows;
}

export function findBestSignal(rows: ScanRow[]): ScanRow | null {
  if (rows.length === 0) return null;
  return rows.reduce((best, row) => (row.score > best.score ? row : best), rows[0]);
}

export function buildOpportunityMessage(
  best: ScanRow,
  btcScore: number,
  timeframe: string
): string {
  const lines = [
    `*PELUANG TERBAIK: ${best.label}*`,
    `Skor: ${best.score}/100 | Conf: ${best.confidence}% | ${best.side}`,
    `Harga: $${best.price.toFixed(2)}`,
    `1h Return: ${best.return1h >= 0 ? '+' : ''}${best.return1h.toFixed(2)}%`,
    `R²: ${best.r2.toFixed(2)} | TF: ${timeframe}`,
    `Lebih bagus dari BTC (skor ${btcScore})`,
    `_Bukan nasihat keuangan_`,
  ];
  return lines.join('\n');
}
