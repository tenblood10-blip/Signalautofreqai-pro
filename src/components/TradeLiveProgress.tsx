import type { TradeRecord } from '@/lib/types';
import { formatUsd } from '@/lib/scalpingEngine';
import { grossPnlPct, tpProgress } from '@/lib/scalpTrades';

interface TradeLiveProgressProps {
  trade: TradeRecord;
  livePrice: number | null;
}

export default function TradeLiveProgress({ trade, livePrice }: TradeLiveProgressProps) {
  if (livePrice === null) {
    return <p className="text-xs text-gray-500">Menunggu harga live...</p>;
  }

  const pnl = grossPnlPct(trade.entry, livePrice);
  const progress = tpProgress(trade, livePrice);
  const remaining = Math.max(trade.tp - livePrice, 0);
  const pnlColor = pnl >= 0 ? 'text-[#02C076]' : 'text-[#F84960]';

  return (
    <div className="space-y-1.5 min-w-[170px]">
      <div className="flex items-center justify-between text-[11px] tabular-nums">
        <span className={`font-bold ${pnlColor}`}>
          PnL {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}%
        </span>
        <span className="text-gray-400">Menuju TP: {progress.toFixed(0)}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-[#1E2329] overflow-hidden">
        <div className="h-full bg-[#02C076] transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>
      <p className="text-[11px] text-gray-500 tabular-nums">Butuh ${formatUsd(remaining)} lagi</p>
    </div>
  );
}
