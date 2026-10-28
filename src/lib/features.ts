import type { Candle } from './types';
import { ema, rsiCalc, macdCalc, bollinger } from './indicators';

export const FEATURE_NAMES = [
  'EMA12 Dev',
  'VWAP Dev',
  'Return 1h',
  'BB Position',
  'Return 24h',
  'OBV Norm',
  'SMA50 Dev',
  'SMA200 Dev',
  'EMA26 Dev',
  'RSI (14)',
  'Stoch %D',
  'Stoch %K',
  'MACD Hist',
  'CCI (20)',
  'ADX (14)',
] as const;

export const FEATURE_COUNT = 15;

function sma(values: number[], period: number): number[] {
  const out: number[] = new Array(values.length).fill(0);
  for (let i = period - 1; i < values.length; i++) {
    let s = 0;
    for (let j = i - period + 1; j <= i; j++) s += values[j];
    out[i] = s / period;
  }
  return out;
}

function vwap(candles: Candle[]): number[] {
  const out: number[] = new Array(candles.length).fill(0);
  let cumPV = 0;
  let cumV = 0;
  for (let i = 0; i < candles.length; i++) {
    const tp = (candles[i].high + candles[i].low + candles[i].close) / 3;
    const pv = tp * candles[i].volume;
    cumPV += pv;
    cumV += candles[i].volume;
    out[i] = cumV > 0 ? cumPV / cumV : candles[i].close;
  }
  return out;
}

function obv(candles: Candle[]): number[] {
  const out: number[] = new Array(candles.length).fill(0);
  for (let i = 1; i < candles.length; i++) {
    const prev = out[i - 1];
    if (candles[i].close > candles[i - 1].close) out[i] = prev + candles[i].volume;
    else if (candles[i].close < candles[i - 1].close) out[i] = prev - candles[i].volume;
    else out[i] = prev;
  }
  return out;
}

function stochastic(highs: number[], lows: number[], closes: number[], period = 14): { k: number[]; d: number[] } {
  const k: number[] = new Array(closes.length).fill(50);
  for (let i = period - 1; i < closes.length; i++) {
    const hh = Math.max(...highs.slice(i - period + 1, i + 1));
    const ll = Math.min(...lows.slice(i - period + 1, i + 1));
    k[i] = hh === ll ? 50 : ((closes[i] - ll) / (hh - ll)) * 100;
  }
  const d = sma(k, 3);
  return { k, d };
}

function cci(highs: number[], lows: number[], closes: number[], period = 20): number[] {
  const tp = closes.map((c, i) => (highs[i] + lows[i] + c) / 3);
  const smaTp = sma(tp, period);
  const out: number[] = new Array(closes.length).fill(0);
  for (let i = period - 1; i < closes.length; i++) {
    let meanDev = 0;
    for (let j = i - period + 1; j <= i; j++) meanDev += Math.abs(tp[j] - smaTp[i]);
    meanDev /= period;
    out[i] = meanDev === 0 ? 0 : (tp[i] - smaTp[i]) / (0.015 * meanDev);
  }
  return out;
}

function adx(highs: number[], lows: number[], closes: number[], period = 14): number[] {
  const len = closes.length;
  const out: number[] = new Array(len).fill(0);
  if (len < period * 2) return out;
  const plusDM: number[] = new Array(len).fill(0);
  const minusDM: number[] = new Array(len).fill(0);
  const tr: number[] = new Array(len).fill(0);
  for (let i = 1; i < len; i++) {
    const upMove = highs[i] - highs[i - 1];
    const downMove = lows[i - 1] - lows[i];
    plusDM[i] = upMove > downMove && upMove > 0 ? upMove : 0;
    minusDM[i] = downMove > upMove && downMove > 0 ? downMove : 0;
    tr[i] = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    );
  }
  const atr = sma(tr, period);
  const plusDI = plusDM.map((dm, i) => (atr[i] > 0 ? (dm / atr[i]) * 100 : 0));
  const minusDI = minusDM.map((dm, i) => (atr[i] > 0 ? (dm / atr[i]) * 100 : 0));
  const dx: number[] = new Array(len).fill(0);
  for (let i = 0; i < len; i++) {
    const sum = plusDI[i] + minusDI[i];
    dx[i] = sum > 0 ? (Math.abs(plusDI[i] - minusDI[i]) / sum) * 100 : 0;
  }
  const adxArr = sma(dx, period);
  for (let i = 0; i < len; i++) out[i] = adxArr[i];
  return out;
}

export function computeFeatures(candles: Candle[]): { features: number[][]; valid: boolean } {
  const n = candles.length;
  if (n < 50) return { features: [], valid: false };

  const closes = candles.map((c) => c.close);
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);

  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const sma50 = sma(closes, 50);
  const sma200 = n >= 200 ? sma(closes, 200) : sma(closes, Math.max(20, n));
  const vwapArr = vwap(candles);
  const obvArr = obv(candles);
  const rsiArr = rsiCalc(closes, 14);
  const { hist } = macdCalc(closes);
  const { lower, upper } = bollinger(closes, 20, 2);
  const { k: stochK, d: stochD } = stochastic(highs, lows, closes, 14);
  const cciArr = cci(highs, lows, closes, 20);
  const adxArr = adx(highs, lows, closes, 14);

  const obvMax = Math.max(...obvArr.map((v) => isFinite(v) ? Math.abs(v) : 0), 1);
  const lookback = Math.min(100, n);
  const start = n - lookback;

  const features: number[][] = [];
  for (let i = start; i < n; i++) {
    const c = closes[i];
    const ema12Dev = ema12[i] !== 0 ? (c - ema12[i]) / ema12[i] : 0;
    const vwapDev = vwapArr[i] !== 0 ? (c - vwapArr[i]) / vwapArr[i] : 0;
    const ret1h = i >= 12 && closes[i - 12] !== 0 ? (c / closes[i - 12]) - 1 : 0;
    const bbRange = upper[i] - lower[i];
    const bbPos = bbRange !== 0 ? (c - lower[i]) / bbRange : 0.5;
    const ret24h = i >= 288 && closes[i - 288] !== 0 ? (c / closes[i - 288]) - 1 : 0;
    const obvNorm = obvArr[i] / obvMax;
    const sma50Dev = sma50[i] !== 0 ? (c - sma50[i]) / sma50[i] : 0;
    const sma200Dev = sma200[i] !== 0 ? (c - sma200[i]) / sma200[i] : 0;
    const ema26Dev = ema26[i] !== 0 ? (c - ema26[i]) / ema26[i] : 0;
    const rsiVal = rsiArr[i] / 100;
    const stochDVal = stochD[i] / 100;
    const stochKVal = stochK[i] / 100;
    const macdHist = hist[i] / (c !== 0 ? c : 1);
    const cciVal = Math.max(-200, Math.min(200, cciArr[i])) / 200;
    const adxVal = adxArr[i] / 100;

    features.push([
      ema12Dev, vwapDev, ret1h, bbPos, ret24h, obvNorm,
      sma50Dev, sma200Dev, ema26Dev, rsiVal, stochDVal,
      stochKVal, macdHist, cciVal, adxVal,
    ]);
  }
  return { features, valid: true };
}
