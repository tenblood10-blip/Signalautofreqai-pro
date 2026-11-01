import type { Candle, SignalResult, SignalSide } from './types';

export interface AiVote {
  id: string;
  label: string;
  ok: boolean | null;
}

export type SpiderState = 'scanning' | 'locked' | 'blocked';

export function computeAiVotes(
  signal: SignalResult | null,
  candles: Candle[],
  scoreThreshold: number,
  confThreshold: number,
): AiVote[] {
  const labels = [
    { id: 'ai1', label: 'EMA 20/50' },
    { id: 'ai2', label: 'RSI 14' },
    { id: 'ai3', label: 'Bollinger' },
    { id: 'ai4', label: 'Volume 1.8x' },
    { id: 'ai5', label: 'MTF 5m/15m' },
    { id: 'ai6', label: 'Risk Guard' },
  ];
  if (!signal) return labels.map((l) => ({ ...l, ok: null }));

  const ind = signal.indicators;
  const last = candles[candles.length - 1];
  const oks: (boolean | null)[] = [
    ind.price > ind.ema20 && ind.ema20 > ind.ema50,
    ind.rsi >= 50 && ind.rsi <= 70,
    ind.price > ind.bbMiddle,
    last ? last.volume > ind.volAvg20 * 1.8 : false,
    null,
    signal.score >= scoreThreshold && signal.confidence >= confThreshold,
  ];
  return labels.map((l, i) => ({ ...l, ok: oks[i] }));
}

export function deriveSpiderState(votes: AiVote[], side: SignalSide): SpiderState {
  if (side === 'SELL' || votes.some((v) => v.ok === false)) return 'blocked';
  if (side === 'BUY' && votes.every((v) => v.ok === true)) return 'locked';
  return 'scanning';
}
