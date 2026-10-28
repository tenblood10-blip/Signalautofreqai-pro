import { Search, TrendingUp, TrendingDown, Minus, ArrowRight } from 'lucide-react';
import type { ScanRow } from '../lib/types';
import { Card, Badge, DualPrice } from './ui';

interface ScannerTableProps {
  rows: ScanRow[];
  scanning: boolean;
  selectedSymbol: string;
  onSelect: (symbol: string) => void;
  rate: number;
  showIDR: boolean;
}

export default function ScannerTable({ rows, scanning, selectedSymbol, onSelect, rate, showIDR }: ScannerTableProps) {
  return (
    <Card className="p-4 md:p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Search className={`h-4 w-4 text-blue-400 ${scanning ? 'animate-pulse' : ''}`} />
          <h3 className="text-sm font-semibold text-gray-300">Scanner Multi-Aset</h3>
        </div>
        <span className="text-xs text-gray-500">
          {rows.length} aset · {scanning ? 'Scanning...' : 'Siap'}
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-600">
          {scanning ? 'Memindai 15 aset...' : 'Tekan SCAN untuk memulai'}
        </div>
      ) : (
        <div className="overflow-x-auto -mx-4 md:mx-0">
          <table className="w-full text-sm min-w-[640px] md:min-w-0">
            <thead>
              <tr className="text-[10px] text-gray-500 uppercase tracking-wider border-b border-gray-800">
                <th className="text-left px-2 md:px-3 py-2 font-medium">Symbol</th>
                <th className="text-right px-2 md:px-3 py-2 font-medium">Harga</th>
                <th className="text-center px-2 md:px-3 py-2 font-medium">Skor</th>
                <th className="text-center px-2 md:px-3 py-2 font-medium hidden sm:table-cell">Conf</th>
                <th className="text-center px-2 md:px-3 py-2 font-medium">Sinyal</th>
                <th className="text-right px-2 md:px-3 py-2 font-medium hidden sm:table-cell">1h %</th>
                <th className="text-center px-2 md:px-3 py-2 font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const highlight = row.score > 75 && row.confidence > 68;
                const isSelected = row.symbol === selectedSymbol;
                const sideIcon = row.side === 'BUY' ? TrendingUp : row.side === 'SELL' ? TrendingDown : Minus;
                const SideI = sideIcon;
                const sideColor = row.side === 'BUY' ? 'text-emerald-400' : row.side === 'SELL' ? 'text-red-400' : 'text-amber-400';

                return (
                  <tr
                    key={row.symbol}
                    className={`border-b border-gray-800/40 transition-colors cursor-pointer ${
                      isSelected ? 'bg-blue-500/10' : highlight ? 'bg-emerald-500/5 hover:bg-emerald-500/10' : 'hover:bg-gray-800/20'
                    }`}
                    onClick={() => onSelect(row.symbol)}
                  >
                    <td className="px-2 md:px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-200 text-xs md:text-sm">{row.label}</span>
                        {row.klass === 'stock' && (
                          <span className="text-[9px] px-1 py-0.5 rounded bg-gray-700/40 text-gray-500 uppercase">Saham</span>
                        )}
                      </div>
                    </td>
                    <td className="px-2 md:px-3 py-2.5 text-right">
                      <DualPrice usd={row.price} rate={rate} showIDR={showIDR} className="text-xs tabular-nums text-gray-300" idrClassName="whitespace-nowrap" />
                    </td>
                    <td className="px-2 md:px-3 py-2.5 text-center">
                      <span className={`font-bold tabular-nums ${highlight ? 'text-emerald-400' : 'text-gray-200'}`}>
                        {row.score}
                      </span>
                    </td>
                    <td className="px-2 md:px-3 py-2.5 text-center tabular-nums text-gray-400 text-xs hidden sm:table-cell">
                      {row.confidence}%
                    </td>
                    <td className="px-2 md:px-3 py-2.5 text-center">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold ${sideColor}`}>
                        <SideI className="h-3.5 w-3.5" />
                        {row.side}
                      </span>
                    </td>
                    <td className={`px-2 md:px-3 py-2.5 text-right tabular-nums text-xs hidden sm:table-cell ${row.return1h >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {row.return1h >= 0 ? '+' : ''}{row.return1h.toFixed(2)}%
                    </td>
                    <td className="px-2 md:px-3 py-2.5 text-center">
                      <button
                        onClick={(e) => { e.stopPropagation(); onSelect(row.symbol); }}
                        className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-medium"
                      >
                        Lihat <ArrowRight className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
