import { Download, Trash2, History as HistoryIcon, Inbox } from 'lucide-react';
import type { TradeRecord } from '../lib/types';
import { Card, Badge, DualPrice } from '../components/ui';
import { exportTradesCSV } from '../lib/storage';

interface HistoryPageProps {
  trades: TradeRecord[];
  onClear: () => void;
  rate: number;
  showIDR: boolean;
}

export default function HistoryPage({ trades, onClear, rate, showIDR }: HistoryPageProps) {
  const wins = trades.filter((t) => t.status === 'WIN').length;
  const losses = trades.filter((t) => t.status === 'LOSS').length;
  const winrate = wins + losses > 0 ? (wins / (wins + losses)) * 100 : 0;

  const sorted = [...trades].sort((a, b) => b.time - a.time);

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white">Riwayat Sinyal</h2>
          <p className="text-sm text-gray-500">{trades.length} trade · Winrate {winrate.toFixed(1)}%</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportTradesCSV(trades)}
            disabled={trades.length === 0}
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

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold text-emerald-400">{wins}</p>
          <p className="text-xs text-gray-500 mt-1">WIN</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold text-red-400">{losses}</p>
          <p className="text-xs text-gray-500 mt-1">LOSS</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold text-blue-400">{winrate.toFixed(0)}%</p>
          <p className="text-xs text-gray-500 mt-1">Winrate</p>
        </Card>
      </div>

      {sorted.length === 0 ? (
        <Card className="p-12 flex flex-col items-center justify-center text-center">
          <Inbox className="h-12 w-12 text-gray-700 mb-3" />
          <p className="text-gray-500 text-sm">Belum ada trade tersimpan</p>
          <p className="text-gray-600 text-xs mt-1">Sinyal akan muncul di sini saat mode aktif</p>
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden md:block overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wider">
                  <th className="text-left px-4 py-3 font-medium">Waktu</th>
                  <th className="text-left px-4 py-3 font-medium">Side</th>
                  <th className="text-right px-4 py-3 font-medium">Entry</th>
                  <th className="text-right px-4 py-3 font-medium">SL / TP</th>
                  <th className="text-center px-4 py-3 font-medium">Skor</th>
                  <th className="text-center px-4 py-3 font-medium">Conf</th>
                  <th className="text-center px-4 py-3 font-medium">Status</th>
                  <th className="text-right px-4 py-3 font-medium">PnL</th>
                  <th className="text-center px-4 py-3 font-medium">TF</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((t) => (
                  <tr key={t.id} className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors">
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {new Date(t.time).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={t.side === 'BUY' ? 'green' : t.side === 'SELL' ? 'red' : 'gray'}>{t.side}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DualPrice usd={t.entry} rate={rate} showIDR={showIDR} className="tabular-nums" idrClassName="whitespace-nowrap" />
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-xs text-gray-500">
                      <span className="text-red-400">{t.sl.toFixed(0)}</span> / <span className="text-emerald-400">{t.tp.toFixed(0)}</span>
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums text-gray-300">{t.score}</td>
                    <td className="px-4 py-3 text-center tabular-nums text-gray-300">{t.confidence}%</td>
                    <td className="px-4 py-3 text-center">
                      <Badge color={t.status === 'WIN' ? 'green' : t.status === 'LOSS' ? 'red' : t.status === 'OPEN' ? 'blue' : 'gray'}>
                        {t.status}
                      </Badge>
                    </td>
                    <td className={`px-4 py-3 text-right tabular-nums font-semibold ${t.pnl != null ? (t.pnl >= 0 ? 'text-emerald-400' : 'text-red-400') : 'text-gray-600'}`}>
                      {t.pnl != null ? (
                        <DualPrice usd={Math.abs(t.pnl)} rate={rate} showIDR={showIDR} prefix={t.pnl >= 0 ? '+' : '-'} tone={t.pnl >= 0 ? 'green' : 'red'} idrClassName="whitespace-nowrap" />
                      ) : '--'}
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-gray-500">{t.timeframe}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {sorted.map((t) => (
              <Card key={t.id} className="p-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge color={t.side === 'BUY' ? 'green' : t.side === 'SELL' ? 'red' : 'gray'}>{t.side}</Badge>
                    <Badge color={t.status === 'WIN' ? 'green' : t.status === 'LOSS' ? 'red' : t.status === 'OPEN' ? 'blue' : 'gray'}>{t.status}</Badge>
                  </div>
                  <span className="text-xs text-gray-500">{new Date(t.time).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-gray-500">Entry</p>
                    <DualPrice usd={t.entry} rate={rate} showIDR={showIDR} className="tabular-nums" idrClassName="whitespace-nowrap" />
                  </div>
                  <div>
                    <p className="text-gray-500">Skor/Conf</p>
                    <p className="text-gray-200 tabular-nums">{t.score}/{t.confidence}%</p>
                  </div>
                  <div>
                    <p className="text-gray-500">PnL</p>
                    {t.pnl != null ? (
                      <DualPrice usd={Math.abs(t.pnl)} rate={rate} showIDR={showIDR} prefix={t.pnl >= 0 ? '+' : '-'} tone={t.pnl >= 0 ? 'green' : 'red'} idrClassName="whitespace-nowrap" />
                    ) : <p className="text-gray-600">--</p>}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
