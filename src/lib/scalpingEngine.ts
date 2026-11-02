import type { Candle } from './types';

export type ScalpSignal = 'BELI' | 'SIAP' | 'TUNGGU';

export interface ScalpChecks {
  ema: boolean;
  rsi: boolean;
  volume: boolean;
  mtf5: boolean;
  mtf15: boolean;
}

export interface ScalpResult {
  signal: ScalpSignal;
  score: number;
  price: number | null;
  ema9: number | null;
  ema21: number | null;
  rsi: number | null;
  volRatio: number | null;
  checks: ScalpChecks | null;
  tp: number | null;
  sl: number | null;
}

const EMPTY_RESULT: ScalpResult = {
  signal: 'TUNGGU',
  score: 0,
  price: null,
  ema9: null,
  ema21: null,
  rsi: null,
  volRatio: null,
  checks: null,
  tp: null,
  sl: null,
};

export function calcEMA(prices: number[], period: number): number {
  const k = 2 / (period + 1);
  let ema = prices[0];
  for (let i = 1; i < prices.length; i++) ema = prices[i] * k + ema * (1 - k);
  return ema;
}

export function calcRSI(prices: number[], period = 14): number {
  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i++) {
    const d = prices[i] - prices[i - 1];
    if (d > 0) gains += d;
    else losses += -d;
  }
  const rs = gains / (losses || 1);
  return 100 - 100 / (1 + rs);
}

function closesOf(candles: Candle[]): number[] {
  return candles.map((c) => c.close);
}

function aboveEma21(candles: Candle[] | null): boolean {
  if (!candles || candles.length === 0) return false;
  const last = candles[candles.length - 1].close;
  return last > calcEMA(closesOf(candles).slice(-30), 21);
}

export function getSignal(
  klines1m: Candle[] | null,
  klines5m: Candle[] | null,
  klines15m: Candle[] | null,
): ScalpResult {
  if (!klines1m || klines1m.length < 50) return EMPTY_RESULT;

  const closes = closesOf(klines1m);
  const ema9 = calcEMA(closes.slice(-20), 9);
  const ema21 = calcEMA(closes.slice(-30), 21);
  const rsi = calcRSI(closes.slice(-20));
  const last = klines1m[klines1m.length - 1];
  const prev = klines1m[klines1m.length - 2];
  const price = last.close;
  const volRatio = prev.volume > 0 ? last.volume / prev.volume : 0;

  const checks: ScalpChecks = {
    ema: ema9 > ema21,
    rsi: rsi > 45 && rsi < 70,
    volume: last.volume > prev.volume * 1.2,
    mtf5: aboveEma21(klines5m),
    mtf15: aboveEma21(klines15m),
  };

  let score = 0;
  if (checks.ema) score += 30;
  if (checks.rsi) score += 25;
  if (checks.volume) score += 20;
  if (checks.mtf5) score += 15;
  if (checks.mtf15) score += 10;

  const signal: ScalpSignal = score >= 80 ? 'BELI' : score >= 60 ? 'SIAP' : 'TUNGGU';
  return {
    signal,
    score,
    price,
    ema9,
    ema21,
    rsi,
    volRatio,
    checks,
    tp: price * 1.0045,
    sl: price * 0.9965,
  };
}
