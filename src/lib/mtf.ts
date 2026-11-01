import type { Candle } from './types';
import { ema, rsiCalc } from './indicators';

const last = (values: number[]) => values[values.length - 1];

export function mtfLocked(candles5m: Candle[], candles15m: Candle[]): boolean | null {
  if (candles5m.length < 50 || candles15m.length < 200) return null;

  const closes5 = candles5m.map((c) => c.close);
  const closes15 = candles15m.map((c) => c.close);
  const ema21_5 = last(ema(closes5, 21));
  const ema50_5 = last(ema(closes5, 50));
  const rsi5 = last(rsiCalc(closes5, 14));
  const uptrend5m = ema21_5 > ema50_5 && rsi5 >= 48 && rsi5 <= 68;

  const ema50_15 = last(ema(closes15, 50));
  const ema200_15 = last(ema(closes15, 200));
  const rsi15 = last(rsiCalc(closes15, 14));
  const strongBull15m =
    closes15[closes15.length - 1] > ema50_15 && ema50_15 > ema200_15 && rsi15 >= 50 && rsi15 <= 70;

  return uptrend5m && strongBull15m;
}
