import { useEffect, useRef, useState } from 'react';
import { TrendingUp, TrendingDown, Minus, Lock, Activity, WifiOff } from 'lucide-react';
import type { Timeframe } from '@/lib/types';
import { SCALPING_TIMEFRAMES } from '@/lib/timeframes';
import { formatUsd, passedChecks, type ScalpChecks, type ScalpResult, type ScalpSignal } from '@/lib/scalpingEngine';
import { SCALP_SYMBOL } from '@/hooks/useScalpingData';

interface DashboardProps {
  timeframe: Timeframe;
  onTimeframe: (t: Timeframe) => void;
  result: ScalpResult;
  failed: boolean;
  updatedAt: number | null;
}

const SIGNAL_STYLE: Record<ScalpSignal, { label: string; text: string; icon: typeof TrendingUp }> = {
  BELI: { label: 'BELI', text: 'text-[#02C076]', icon: TrendingUp },
  SIAP: { label: 'SIAP', text: 'text-[#FCD535]', icon: Activity },
  TUNGGU: { label: 'TUNGGU', text: 'text-gray-400', icon: Minus },
};

function MetricCard({ label, value, detail, ok }: { label: string; value: string; detail: string; ok: boolean | null }) {
  const status = ok === null ? 'N/A' : ok ? 'OK' : 'NO';
  const statusColor = ok ? 'text-[#02C076] border-[#02C076]/40 bg-[#02C076]/10' : 'text-[#F84960] border-[#F84960]/40 bg-[#F84960]/10';
  return (
    <div className="bg-[#151A21] border border-[#1E2329] rounded-xl p-4 flex flex-col gap-2 transition-colors hover:border-[#FCD535]/30">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold tracking-widest text-gray-500 uppercase">{label}</p>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${statusColor}`}>{status}</span>
      </div>
      <p className="text-lg font-bold text-white tabular-nums">{value}</p>
      <p className="text-[11px] text-gray-500">{detail}</p>
    </div>
  );
}

export default function Dashboard({ timeframe, onTimeframe, result, failed, updatedAt }: DashboardProps) {
  const price = result.price;
  const [dir, setDir] = useState<'up' | 'down' | 'flat'>('flat');
  const prevPrice = useRef<number | null>(null);
  useEffect(() => {
    if (price === null) return;
    if (prevPrice.current !== null && price !== prevPrice.current) {
      setDir(price > prevPrice.current ? 'up' : 'down');
    }
    prevPrice.current = price;
  }, [price]);

  const priceColor = dir === 'up' ? 'text-[#02C076]' : dir === 'down' ? 'text-[#F84960]' : 'text-white';
  const style = SIGNAL_STYLE[result.signal];
  const SignalIcon = style.icon;
  const passed = passedChecks(result.checks);
  const locked = result.score >= 80;
  const updatedLabel = updatedAt ? new Date(updatedAt).toLocaleTimeString('id-ID') : null;

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white">Mesin Scalping</h2>
          <p className="text-sm text-gray-500">{SCALP_SYMBOL} · Auto refresh 3 detik</p>
        </div>
        <div className="flex items-center gap-2">
          {SCALPING_TIMEFRAMES.map((tf) => (
            <button
              key={tf.id}
              title={tf.desc}
              onClick={() => onTimeframe(tf.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                timeframe === tf.id
                  ? 'bg-[#FCD535] text-black'
                  : 'bg-[#151A21] text-gray-400 border border-[#1E2329] hover:text-gray-200'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[#0B0E11] border border-[#1E2329] rounded-2xl p-5 md:p-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold tracking-widest text-[#FCD535]">HARGA LIVE {SCALP_SYMBOL}</p>
          {failed && (
            <span className="flex items-center gap-1.5 text-[11px] text-[#F84960]">
              <WifiOff className="h-3.5 w-3.5" /> Koneksi terputus, mencoba lagi
            </span>
          )}
        </div>
        <p className={`mt-2 text-3xl md:text-4xl font-black tabular-nums transition-colors duration-300 ${price === null ? 'text-gray-500' : priceColor}`}>
          {price === null ? 'Memuat data...' : `$${formatUsd(price)}`}
        </p>
        {updatedLabel && (
          <p className="mt-1 text-[11px] text-gray-500">
            Diperbarui {updatedLabel}
            {failed ? ' (data terakhir)' : ''}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
        <MetricCard
          label="EMA 9 / 21"
          value={result.ema9 !== null && result.ema21 !== null ? `${formatUsd(result.ema9)} / ${formatUsd(result.ema21)}` : 'Memuat...'}
          detail="EMA 9 di atas EMA 21"
          ok={result.checks?.ema ?? null}
        />
        <MetricCard
          label="RSI 14"
          value={result.rsi !== null ? result.rsi.toFixed(1) : 'Memuat...'}
          detail="Zona aman 45 sampai 70"
          ok={result.checks?.rsi ?? null}
        />
        <MetricCard
          label="Volume"
          value={result.volRatio !== null ? `${result.volRatio.toFixed(2)}x` : 'Memuat...'}
          detail="Minimal 1.2x candle sebelumnya"
          ok={result.checks?.volume ?? null}
        />
        <MetricCard
          label="MTF 5m / 15m"
          value={result.checks ? `5m ${result.checks.mtf5 ? 'OK' : 'NO'} · 15m ${result.checks.mtf15 ? 'OK' : 'NO'}` : 'Memuat...'}
          detail="Harga di atas EMA 21 di 5m dan 15m"
          ok={result.checks ? result.checks.mtf5 && result.checks.mtf15 : null}
        />
      </div>

      <div className="bg-[#0B0E11] border border-[#1E2329] rounded-2xl p-5 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <p className="text-[11px] font-semibold tracking-widest text-gray-500">SINYAL</p>
            <p className={`mt-1 flex items-center gap-2 text-4xl font-black ${style.text}`}>
              <SignalIcon className="h-8 w-8" />
              {style.label}
            </p>
          </div>
          <div className="flex-1 md:max-w-xs space-y-3">
            <div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>Score</span>
                <span className="font-bold text-white tabular-nums">{result.score}/100</span>
              </div>
              <div className="mt-1.5 h-2 rounded-full bg-[#1E2329] overflow-hidden">
                <div className="h-full bg-[#FCD535] transition-all duration-500" style={{ width: `${result.score}%` }} />
              </div>
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>Keyakinan</span>
              <span className="font-bold text-white tabular-nums">{passed * 20}% ({passed}/5 cek lolos)</span>
            </div>
          </div>
        </div>

        {locked && result.tp !== null && result.sl !== null && (
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-[#151A21] border border-[#02C076]/40 rounded-xl p-3">
              <p className="text-[10px] text-gray-500 tracking-widest">TAKE PROFIT +0.45%</p>
              <p className="text-base font-bold text-[#02C076] tabular-nums">${formatUsd(result.tp)}</p>
            </div>
            <div className="bg-[#151A21] border border-[#F84960]/40 rounded-xl p-3">
              <p className="text-[10px] text-gray-500 tracking-widest">STOP LOSS -0.35%</p>
              <p className="text-base font-bold text-[#F84960] tabular-nums">${formatUsd(result.sl)}</p>
            </div>
            <div className="bg-[#02C076]/10 border border-[#02C076]/40 rounded-xl p-3 flex items-center justify-center gap-2">
              <Lock className="h-4 w-4 text-[#02C076]" />
              <span className="text-sm font-black tracking-widest text-[#02C076]">LOCKED</span>
            </div>
          </div>
        )}

        <p className="mt-5 text-[11px] text-gray-600">
          Sinyal dari perhitungan indikator, bukan nasihat keuangan. Trading berisiko.
        </p>
      </div>
    </div>
  );
}
