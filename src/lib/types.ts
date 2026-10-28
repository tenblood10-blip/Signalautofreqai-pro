export type Timeframe = '5m' | '15m' | '1h' | '4h';

export type TradeMode = 'simulasi' | 'semi' | 'real';

export type PageId = 'dashboard' | 'history' | 'analytics' | 'settings';

export type SignalSide = 'BUY' | 'SELL' | 'WAIT';

export type AssetClass = 'crypto' | 'stock';

export interface AssetDef {
  symbol: string;
  label: string;
  klass: AssetClass;
}

export interface ScanRow {
  symbol: string;
  label: string;
  klass: AssetClass;
  price: number;
  score: number;
  confidence: number;
  side: SignalSide;
  r2: number;
  return1h: number;
  signal: SignalResult | null;
  aggressive: boolean;
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Indicators {
  rsi: number;
  macd: number;
  macdSignal: number;
  macdHist: number;
  bbUpper: number;
  bbMiddle: number;
  bbLower: number;
  bbPercent: number;
  ema20: number;
  ema50: number;
  ema200: number;
  volAvg20: number;
  price: number;
}

export interface FeatureWeight {
  name: string;
  weight: number;
  value: number;
}

export interface SignalResult {
  side: SignalSide;
  score: number;
  confidence: number;
  reasons: string[];
  indicators: Indicators;
  lastUpdate: number;
  r2: number;
  featureWeights: FeatureWeight[];
  symbol: string;
  aggressive: boolean;
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
