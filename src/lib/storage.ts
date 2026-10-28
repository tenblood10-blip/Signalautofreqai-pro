import type { Settings, TradeRecord, EquityPoint } from './types';

const SETTINGS_KEY = 'freqai_settings';
const TRADES_KEY = 'freqai_trades';
const EQUITY_KEY = 'freqai_equity';

export const defaultSettings: Settings = {
  fonnteToken: '',
  whatsappPhone: '',
  binanceKey: '',
  binanceSecret: '',
  slPercent: 1.5,
  tpPercent: 3,
  mode: 'simulasi',
  waAlerts: true,
  scoreThreshold: 72,
  confThreshold: 65,
  initialCapital: 10,
  showIDR: true,
};

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...defaultSettings };
    const parsed = JSON.parse(raw);
    return { ...defaultSettings, ...parsed };
  } catch {
    return { ...defaultSettings };
  }
}

export function saveSettings(s: Settings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

export function loadTrades(): TradeRecord[] {
  try {
    const raw = localStorage.getItem(TRADES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as TradeRecord[];
  } catch {
    return [];
  }
}

export function saveTrades(t: TradeRecord[]): void {
  localStorage.setItem(TRADES_KEY, JSON.stringify(t.slice(-200)));
}

export function loadEquity(initial: number): EquityPoint[] {
  try {
    const raw = localStorage.getItem(EQUITY_KEY);
    if (!raw) return [{ time: Date.now(), equity: initial }];
    const arr = JSON.parse(raw) as EquityPoint[];
    if (arr.length === 0) return [{ time: Date.now(), equity: initial }];
    return arr;
  } catch {
    return [{ time: Date.now(), equity: initial }];
  }
}

export function saveEquity(e: EquityPoint[]): void {
  localStorage.setItem(EQUITY_KEY, JSON.stringify(e.slice(-300)));
}

export function exportTradesCSV(trades: TradeRecord[]): void {
  const headers = [
    'Time', 'Side', 'Entry', 'SL', 'TP', 'Score', 'Confidence',
    'Status', 'ExitPrice', 'ExitTime', 'PnL', 'PnLPct', 'Timeframe', 'Mode',
  ];
  const rows = trades.map((t) => [
    new Date(t.time).toISOString(),
    t.side,
    t.entry,
    t.sl,
    t.tp,
    t.score,
    t.confidence,
    t.status,
    t.exitPrice ?? '',
    t.exitTime ? new Date(t.exitTime).toISOString() : '',
    t.pnl ?? '',
    t.pnlPct ?? '',
    t.timeframe,
    t.mode,
  ]);
  const csv = [headers, ...rows]
    .map((r) => r.map((c) => `"${String(c)}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `freqai_trades_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
