import type { Timeframe } from './types';

export const DEFAULT_TIMEFRAME: Timeframe = '1m';

export const SCALPING_TIMEFRAMES: { id: Timeframe; label: string; desc: string }[] = [
  { id: '1m', label: '1m', desc: 'Scalp Entry' },
  { id: '3m', label: '3m', desc: 'Fast Scalp' },
  { id: '5m', label: '5m', desc: 'Trend' },
  { id: '15m', label: '15m', desc: 'Strong Trend' },
];
