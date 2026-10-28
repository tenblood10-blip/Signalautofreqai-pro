import type { Candle, Indicators } from './types';

export function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const out: number[] = [];
  let prev = values[0] ?? 0;
  for (let i = 0; i < values.length; i++) {
    if (i === 0) {
      prev = values[0];
    } else {
      prev = values[i] * k + prev * (1 - k);
    }
    out.push(prev);
  }
  return out;
}

export function rsiCalc(values: number[], period = 14): number[] {
  const out: number[] = new Array(values.length).fill(50);
  if (values.length < period + 1) return out;
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = values[i] - values[i - 1];
    if (diff >= 0) avgGain += diff;
    else avgLoss -= diff;
  }
  avgGain /= period;
  avgLoss /= period;
  out[period] = 100 - 100 / (1 + (avgLoss === 0 ? 100 : avgGain / avgLoss));
  for (let i = period + 1; i < values.length; i++) {
    const diff = values[i] - values[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    out[i] = 100 - 100 / (1 + (avgLoss === 0 ? 100 : avgGain / avgLoss));
  }
  return out;
}

export function macdCalc(values: number[]): {
  macd: number[];
  signal: number[];
  hist: number[];
} {
  const ema12 = ema(values, 12);
  const ema26 = ema(values, 26);
  const macd = values.map((_, i) => ema12[i] - ema26[i]);
  const signal = ema(macd, 9);
  const hist = macd.map((m, i) => m - signal[i]);
  return { macd, signal, hist };
}

export function bollinger(values: number[], period = 20, mult = 2): {
  upper: number[];
  middle: number[];
  lower: number[];
  percent: number[];
} {
  const upper: number[] = new Array(values.length).fill(0);
  const middle: number[] = new Array(values.length).fill(0);
  const lower: number[] = new Array(values.length).fill(0);
  const percent: number[] = new Array(values.length).fill(0.5);
  for (let i = period - 1; i < values.length; i++) {
    const slice = values.slice(i - period + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period;
    const sd = Math.sqrt(variance);
    upper[i] = mean + mult * sd;
    middle[i] = mean;
    lower[i] = mean - mult * sd;
    const range = upper[i] - lower[i];
    percent[i] = range === 0 ? 0.5 : (values[i] - lower[i]) / range;
  }
  return { upper, middle, lower, percent };
}

export function computeIndicators(candles: Candle[]): Indicators | null {
  if (candles.length < 30) return null;
  const closes = candles.map((c) => c.close);
  const vols = candles.map((c) => c.volume);
  const last = candles.length - 1;

  const rsiArr = rsiCalc(closes, 14);
  const { macd, signal, hist } = macdCalc(closes);
  const { upper, middle, lower, percent } = bollinger(closes, 20, 2);
  const ema20Arr = ema(closes, 20);
  const ema50Arr = ema(closes, 50);
  const ema200Arr = ema(closes, 200);
  const volSlice = vols.slice(Math.max(0, last - 19), last + 1);
  const volAvg20 = volSlice.length > 0
    ? volSlice.reduce((a, b) => a + (isFinite(b) ? b : 0), 0) / volSlice.length
    : 0;

  return {
    rsi: rsiArr[last],
    macd: macd[last],
    macdSignal: signal[last],
    macdHist: hist[last],
    bbUpper: upper[last],
    bbMiddle: middle[last],
    bbLower: lower[last],
    bbPercent: percent[last],
    ema20: ema20Arr[last],
    ema50: ema50Arr[last],
    ema200: ema200Arr[last],
    volAvg20,
    price: closes[last],
  };
}
