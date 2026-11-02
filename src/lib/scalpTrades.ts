import type { TradeMode, TradeRecord, Timeframe } from './types';

const FEE_RATE = 0.001;
const POSITION_RATIO = 0.33;

export function openBeliTrade(opts: {
  price: number;
  tp: number;
  sl: number;
  score: number;
  confidence: number;
  timeframe: Timeframe;
  mode: TradeMode;
  capital: number;
  now: number;
}): TradeRecord {
  const positionUSD = opts.capital * POSITION_RATIO;
  return {
    id: `${opts.now}`,
    time: opts.now,
    side: 'BUY',
    entry: opts.price,
    sl: opts.sl,
    tp: opts.tp,
    score: opts.score,
    confidence: opts.confidence,
    status: 'OPEN',
    qty: positionUSD / opts.price,
    fee: positionUSD * FEE_RATE,
    timeframe: opts.timeframe,
    mode: opts.mode,
  };
}

export function grossPnlPct(entry: number, price: number): number {
  return ((price - entry) / entry) * 100;
}

export function tpProgress(trade: TradeRecord, livePrice: number): number {
  const span = trade.tp - trade.entry;
  if (span <= 0) return 0;
  const pct = ((livePrice - trade.entry) / span) * 100;
  return Math.min(Math.max(pct, 0), 100);
}

export function closeTradeIfHit(trade: TradeRecord, livePrice: number, now: number): TradeRecord | null {
  if (trade.status !== 'OPEN') return null;
  const hitTp = livePrice >= trade.tp;
  const hitSl = livePrice <= trade.sl;
  if (!hitTp && !hitSl) return null;
  const qty = trade.qty ?? 0;
  const exitFee = qty * livePrice * FEE_RATE;
  const pnl = (livePrice - trade.entry) * qty - (trade.fee ?? 0) - exitFee;
  return {
    ...trade,
    status: hitTp ? 'WIN' : 'LOSS',
    exitPrice: livePrice,
    exitTime: now,
    pnl,
    pnlPct: grossPnlPct(trade.entry, livePrice),
  };
}
