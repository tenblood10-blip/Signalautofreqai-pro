import { useState } from 'react';
import { Download, Trash2, Inbox } from 'lucide-react';
import type { TradeRecord } from '../lib/types';
import { Card, Badge, DualPrice } from '../components/ui';
import TradeLiveProgress from '../components/TradeLiveProgress';
import { exportTradesCSV } from '../lib/storage';
import { formatUsd } from '../lib/scalpingEngine';

interface HistoryPageProps {
  trades: TradeRecord[];
  onClear: () => void;
  rate: number;
  showIDR: boolean;
  livePrice: number | null;
}

type HistoryFilter = 'semua' | 'open';

const DATE_FORMAT: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' };

export default function HistoryPage({ trades, onClear, rate, showIDR, livePrice }: HistoryPageProps) {
  const [filter, setFilter] = useState<HistoryFilter>('semua');

  const beli = trades.filter((t) => t.side === 'BUY');
  const wins = beli.filter((t) => t.status === 'WIN').length;
  const losses = beli.filter((t) => t.status === 'LOSS').length;
  const winrate = wins + losses > 0 ? (wins / (wins + losses)) * 100 : 0;

  const shown = (filter === 'open' ? beli.filter((t) => t.status === 'OPEN') : beli)
    .sort((a, b) => b.time - a.time);

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white">Riwayat Sinyal BELI</h2>
          <p className="text-sm text-gray-500">{beli.length} sinyal · Winrate {winrate.toFixed(1)}%</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportTradesCSV(beli)}
            disabled={beli.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/30 text-xs font-semibold hover:bg-blue-500/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <Download className="h-4 w-4" />
            CSV
          </button>
          <button
            onClick={onClear}
            disabled={trades.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/15 text-red-400 border border-red-500/30 text-xs font-semibold hover:bg-red-500/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <Trash2 className="h-4 w-4" />
            Hapus
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold text-emerald-400">{wins}</p>
          <p className="text-xs text-gray-500 mt-1">WIN (TP)</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold text-red-400">{losses}</p>
          <p className="text-xs text-gray-500 mt-1">LOSS (SL)</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold text-blue-400">{winrate.toFixed(0)}%</p>
          <p className="text-xs text-gray-500 mt-1">Winrate</p>
        </Card>
      </div>

      <div className="flex gap-2">
        {([['semua', 'Semua BELI'], ['open', 'OPEN saja']] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filter === id
                ? 'bg-[#FCD535] text-black'
                : 'bg-[#151A21] text-gray-400 border border-[#1E2329] hover:text-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <Card className="p-12 flex flex-col items-center justify-center text-center">
          <Inbox className="h-12 w-12 text-gray-700 mb-3" />
          <p className="text-gray-500 text-sm">
            {filter === 'open' ? 'Tidak ada sinyal BELI yang sedang OPEN' : 'Belum ada sinyal BELI tersimpan'}
          </p>
          <p className="text-gray-600 text-xs mt-1">Sinyal BELI akan tercatat otomatis di sini</p>
        </Card>
      ) : (
        <>
          <Card className="hidden md:block overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wider">
                  <th className="text-left px-4 py-3 font-medium">Waktu</th>
                  <th className="text-right px-4 py-3 font-medium">Entry</th>
                  <th className="text-right px-4 py-3 font-medium">SL / TP</th>
                  <th className="text-center px-4 py-3 font-medium">Skor</th>
                  <th className="text-center px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">PnL & Progres</th>
                  <th className="text-center px-4 py-3 font-medium">TF</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((t) => (
                  <tr key={t.id} className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors align-top">
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {new Date(t.time).toLocaleString('id-ID', DATE_FORMAT)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DualPrice usd={t.entry} rate={rate} showIDR={showIDR} className="tabular-nums" idrClassName="whitespace-nowrap" />
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-xs text-gray-500">
                      <span className="text-red-400">{formatUsd(t.sl)}</span> / <span className="text-emerald-400">{formatUsd(t.tp)}</span>
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums text-gray-300">{t.score}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge color={t.status === 'WIN' ? 'green' : t.status === 'LOSS' ? 'red' : 'blue'}>{t.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {t.status === 'OPEN' ? (
                        <TradeLiveProgress trade={t} livePrice={livePrice} />
                      ) : (
                        <ClosedPnl trade={t} rate={rate} showIDR={showIDR} />
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-gray-500">{t.timeframe}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <div className="md:hidden space-y-2">
            {shown.map((t) => (
              <Card key={t.id} className="p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge color="green">BELI</Badge>
                    <Badge color={t.status === 'WIN' ? 'green' : t.status === 'LOSS' ? 'red' : 'blue'}>{t.status}</Badge>
                  </div>
                  <span className="text-xs text-gray-500">{new Date(t.time).toLocaleString('id-ID', DATE_FORMAT)}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-gray-500">Entry</p>
                    <DualPrice usd={t.entry} rate={rate} showIDR={showIDR} className="tabular-nums" idrClassName="whitespace-nowrap" />
                  </div>
                  <div>
                    <p className="text-gray-500">Skor</p>
                    <p className="text-gray-200 tabular-nums">{t.score}/100</p>
                  </div>
                  <div>
                    <p className="text-gray-500">TF</p>
                    <p className="text-gray-200">{t.timeframe}</p>
                  </div>
                </div>
                {t.status === 'OPEN' ? (
                  <TradeLiveProgress trade={t} livePrice={livePrice} />
                ) : (
                  <ClosedPnl trade={t} rate={rate} showIDR={showIDR} />
                )}
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ClosedPnl({ trade, rate, showIDR }: { trade: TradeRecord; rate: number; showIDR: boolean }) {
  if (trade.pnl == null) return <p className="text-xs text-gray-600">--</p>;
  const positive = trade.pnl >= 0;
  return (
    <div className="space-y-0.5">
      <DualPrice
        usd={Math.abs(trade.pnl)}
        rate={rate}
        showIDR={showIDR}
        prefix={positive ? '+' : '-'}
        tone={positive ? 'green' : 'red'}
        idrClassName="whitespace-nowrap"
      />
      {trade.pnlPct != null && (
        <p className={`text-[11px] tabular-nums ${positive ? 'text-[#02C076]' : 'text-[#F84960]'}`}>
          {positive ? '+' : ''}{trade.pnlPct.toFixed(2)}%
        </p>
      )}
    </div>
  );
}
