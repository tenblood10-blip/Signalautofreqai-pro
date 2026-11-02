import { useState, useEffect, useRef, useCallback } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import HistoryPage from './pages/HistoryPage';
import SettingsPage from './pages/SettingsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import type {
  PageId, Settings, SignalResult, TradeRecord, EquityPoint, Timeframe,
} from './lib/types';
import { generateSignal } from './lib/signal';
import { sendWA, buildSignalMessage } from './lib/fonnte';
import { ALL_ASSETS, fetchAssetCandles } from './lib/scanner';
import { DEFAULT_TIMEFRAME } from './lib/timeframes';
import {
  loadSettings, saveSettings, loadTrades, saveTrades, loadEquity, saveEquity,
} from './lib/storage';
import { useExchangeRate } from './lib/exchange';

const POLL_MS = 30000;

export default function App() {
  const [page, setPage] = useState<PageId>('dashboard');
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [timeframe, setTimeframe] = useState<Timeframe>(DEFAULT_TIMEFRAME);
  const [signal, setSignal] = useState<SignalResult | null>(null);
  const [trades, setTrades] = useState<TradeRecord[]>(() => loadTrades());
  const [equity, setEquity] = useState<EquityPoint[]>(() => loadEquity(loadSettings().initialCapital));

  const { rate } = useExchangeRate();

  const lastSignalRef = useRef<string>('');

  useEffect(() => { saveSettings(settings); }, [settings]);
  useEffect(() => { saveTrades(trades); }, [trades]);
  useEffect(() => { saveEquity(equity); }, [equity]);

  const selectedAsset = ALL_ASSETS.find((a) => a.symbol === 'BTCUSDT') ?? ALL_ASSETS[0];

  const poll = useCallback(async () => {
    try {
      const data = await fetchAssetCandles(selectedAsset, timeframe);
      const sig = generateSignal(data, selectedAsset.symbol);
      if (sig) {
        setSignal(sig);

        const effScoreThreshold = sig.aggressive ? 62 : settings.scoreThreshold;
        const effConfThreshold = sig.aggressive ? 55 : settings.confThreshold;
        const entryActive = sig.side !== 'WAIT' && sig.score >= effScoreThreshold && sig.confidence >= effConfThreshold;
        const sigKey = `${sig.symbol}-${sig.side}-${sig.score}-${Math.floor(sig.lastUpdate / 60000)}`;
        const hasOpenTrade = trades.some((t) => t.status === 'OPEN');
        const lastTradeTime = trades.length > 0 ? trades[trades.length - 1].time : 0;
        const tooSoon = Date.now() - lastTradeTime < 60000;

        if (entryActive && sigKey !== lastSignalRef.current && !hasOpenTrade && !tooSoon) {
          lastSignalRef.current = sigKey;
          const price = sig.indicators.price;
          const isBuy = sig.side === 'BUY';
          const sl = isBuy ? price * (1 - settings.slPercent / 100) : price * (1 + settings.slPercent / 100);
          const tp = isBuy ? price * (1 + settings.tpPercent / 100) : price * (1 - settings.tpPercent / 100);
          const positionUSD = settings.initialCapital * 0.33;
          const qty = price > 0 ? positionUSD / price : 0;
          const fee = positionUSD * 0.001;
          const trade: TradeRecord = {
            id: `${Date.now()}`,
            time: Date.now(),
            side: sig.side,
            entry: price,
            sl,
            tp,
            score: sig.score,
            confidence: sig.confidence,
            status: 'OPEN',
            qty,
            fee,
            timeframe,
            mode: settings.mode,
          };
          setTrades((prev) => [...prev, trade]);

          if (settings.mode !== 'simulasi' && settings.waAlerts) {
            const msg = buildSignalMessage({
              side: sig.side, symbol: selectedAsset.symbol, price, score: sig.score, confidence: sig.confidence,
              sl, tp, timeframe, reasons: sig.reasons,
            });
            sendWA(msg, settings);
          }
        }
      }
    } catch {
      // Network errors are retried on the next poll
    }
  }, [selectedAsset, timeframe, settings, trades]);

  useEffect(() => {
    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => clearInterval(interval);
  }, [poll]);

  useEffect(() => {
    const openTrade = trades.find((t) => t.status === 'OPEN');
    if (!openTrade || !signal) return;
    const price = signal.indicators.price;
    const isBuy = openTrade.side === 'BUY';
    const qty = openTrade.qty ?? 1;
    const entryFee = openTrade.fee ?? 0;
    const exitFee = qty * price * 0.001;
    const totalFee = entryFee + exitFee;
    let closed: TradeRecord | null = null;
    if (isBuy && price <= openTrade.sl) {
      const pnl = (price - openTrade.entry) * qty - totalFee;
      closed = { ...openTrade, status: 'LOSS', exitPrice: price, exitTime: Date.now(), pnl, pnlPct: (pnl / (openTrade.entry * qty)) * 100 };
    } else if (isBuy && price >= openTrade.tp) {
      const pnl = (price - openTrade.entry) * qty - totalFee;
      closed = { ...openTrade, status: 'WIN', exitPrice: price, exitTime: Date.now(), pnl, pnlPct: (pnl / (openTrade.entry * qty)) * 100 };
    } else if (!isBuy && price >= openTrade.sl) {
      const pnl = (openTrade.entry - price) * qty - totalFee;
      closed = { ...openTrade, status: 'LOSS', exitPrice: price, exitTime: Date.now(), pnl, pnlPct: (pnl / (openTrade.entry * qty)) * 100 };
    } else if (!isBuy && price <= openTrade.tp) {
      const pnl = (openTrade.entry - price) * qty - totalFee;
      closed = { ...openTrade, status: 'WIN', exitPrice: price, exitTime: Date.now(), pnl, pnlPct: (pnl / (openTrade.entry * qty)) * 100 };
    }
    if (closed) {
      const pnl = closed.pnl ?? 0;
      // Sanity wipe: if PnL is absurdly large (> $100) or equity would exceed $1000, reset
      if (Math.abs(pnl) > 100) {
        setTrades([]);
        setEquity([{ time: Date.now(), equity: settings.initialCapital }]);
        return;
      }
      setTrades((prev) => {
        const updated = prev.map((t) => (t.id === closed!.id ? closed! : t));
        const sumPnL = updated
          .filter((t) => t.status === 'WIN' || t.status === 'LOSS')
          .reduce((acc, t) => acc + (t.pnl ?? 0), 0);
        const newEquity = settings.initialCapital + sumPnL;
        if (newEquity > 1000) {
          setEquity([{ time: Date.now(), equity: settings.initialCapital }]);
          return [];
        }
        setEquity((eq) => [...eq, { time: Date.now(), equity: newEquity }]);
        return updated;
      });
    }
  }, [signal, trades, settings.initialCapital]);

  const handleClearTrades = () => {
    setTrades([]);
    setEquity([{ time: Date.now(), equity: settings.initialCapital }]);
  };

  return (
    <Layout current={page} onNavigate={setPage} mode={settings.mode}>
      {page === 'dashboard' && (
        <Dashboard timeframe={timeframe} onTimeframe={setTimeframe} />
      )}
      {page === 'history' && <HistoryPage trades={trades} onClear={handleClearTrades} rate={rate} showIDR={settings.showIDR} />}
      {page === 'analytics' && <AnalyticsPage trades={trades} equity={equity} initialCapital={settings.initialCapital} rate={rate} showIDR={settings.showIDR} />}
      {page === 'settings' && <SettingsPage settings={settings} onChange={setSettings} rate={rate} />}
    </Layout>
  );
}
