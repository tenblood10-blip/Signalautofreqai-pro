import { useState, useEffect, useCallback } from 'react';

const RATE_KEY = 'usd_idr_rate';
const RATE_TS_KEY = 'usd_idr_rate_ts';
const FALLBACK_RATE = 18177;
const REFRESH_MS = 5 * 60 * 1000;

export function getCachedRate(): number {
  try {
    const raw = localStorage.getItem(RATE_KEY);
    if (!raw) return FALLBACK_RATE;
    const rate = parseFloat(raw);
    return isNaN(rate) || rate <= 0 ? FALLBACK_RATE : rate;
  } catch {
    return FALLBACK_RATE;
  }
}

export function useExchangeRate() {
  const [rate, setRate] = useState<number>(() => getCachedRate());
  const [loading, setLoading] = useState(false);

  const fetchRate = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const idr = data?.rates?.IDR;
      if (typeof idr === 'number' && idr > 0) {
        setRate(idr);
        localStorage.setItem(RATE_KEY, String(idr));
        localStorage.setItem(RATE_TS_KEY, String(Date.now()));
      }
    } catch {
      // keep cached/fallback rate
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const ts = parseInt(localStorage.getItem(RATE_TS_KEY) ?? '0');
    const stale = Date.now() - ts > REFRESH_MS;
    if (stale) {
      fetchRate();
    }
    const interval = setInterval(fetchRate, REFRESH_MS);
    return () => clearInterval(interval);
  }, [fetchRate]);

  return { rate, loading, refresh: fetchRate };
}
