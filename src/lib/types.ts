export type Timeframe = '1m' | '3m' | '5m' | '15m';

export type TradeMode = 'simulasi' | 'semi' | 'real';

export type PageId = 'dashboard' | 'history' | 'analytics' | 'settings';

export type SignalSide = 'BUY' | 'SELL' | 'WAIT';

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Settings {
  fonnteToken: string;
  whatsappPhone: string;
  binanceKey: string;
  binanceSecret: string;
  slPercent: number;
  tpPercent: number;
  mode: TradeMode;
  waAlerts: boolean;
  scoreThreshold: number;
  confThreshold: number;
  initialCapital: number;
  showIDR: boolean;
}

export interface TradeRecord {
  id: string;
  time: number;
  side: SignalSide;
  entry: number;
  sl: number;
  tp: number;
  score: number;
  confidence: number;
  status: 'OPEN' | 'WIN' | 'LOSS';
  exitPrice?: number;
  exitTime?: number;
  pnl?: number;
  pnlPct?: number;
  qty?: number;
  fee?: number;
  timeframe: Timeframe;
  mode: TradeMode;
}

export interface EquityPoint {
  time: number;
  equity: number;
}
