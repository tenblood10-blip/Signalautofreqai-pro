import { useEffect, useState } from 'react';
import type { Candle, Timeframe } from '@/lib/types';
import { fetchKlines } from '@/lib/binance';

export const SCALP_SYMBOL = 'BTCUSDT';
const REFRESH_MS = 3000;

export interface ScalpData {
  base: Candle[];
  k5: Candle[];
  k15: Candle[];
  updatedAt: number;
}

export function useScalpingData(timeframe: Timeframe) {
  const [data, setData] = useState<ScalpData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [base, k5, k15] = await Promise.all([
          fetchKlines(SCALP_SYMBOL, timeframe),
          fetchKlines(SCALP_SYMBOL, '5m'),
          fetchKlines(SCALP_SYMBOL, '15m'),
        ]);
        if (cancelled) return;
        setData({ base, k5, k15, updatedAt: Date.now() });
        setFailed(false);
      } catch {
        if (!cancelled) setFailed(true);
      }
    };
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [timeframe]);

  return { data, failed };
}
