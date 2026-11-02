import { useState, useEffect, useRef, useMemo } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import HistoryPage from './pages/HistoryPage';
import SettingsPage from './pages/SettingsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import type { PageId, Settings, TradeRecord, EquityPoint, Timeframe } from './lib/types';
import { sendWA, buildSignalMessage } from './lib/fonnte';
import { DEFAULT_TIMEFRAME } from './lib/timeframes';
import { getSignal, confidenceOf, type ScalpSignal } from './lib/scalpingEngine';
import { openBeliTrade, closeTradeIfHit } from './lib/scalpTrades';
import { useScalpingData } from './hooks/useScalpingData';
import {
  loadSettings, saveSettings, loadTrades, saveTrades, loadEquity, saveEquity,
} from './lib/storage';
import { useExchangeRate } from './lib/exchange';

const SANITY_PNL_LIMIT = 100;
const SANITY_EQUITY_LIMIT = 1000;

export default function App() {
  const [page, setPage] = useState<PageId>('dashboard');
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [timeframe, setTimeframe] = useState<Timeframe>(DEFAULT_TIMEFRAME);
  const [trades, setTrades] = useState<TradeRecord[]>(() => loadTrades());
  const [equity, setEquity] = useState<EquityPoint[]>(() => loadEquity(loadSettings().initialCapital));

  const { rate } = useExchangeRate();
  const { data, failed } = useScalpingData(timeframe);
  const result = useMemo(
    () => getSignal(data?.base ?? null, data?.k5 ?? null, data?.k15 ?? null),
    [data],
  );
  const livePrice = result.price;
  const prevSignalRef = useRef<ScalpSignal>('TUNGGU');

  useEffect(() => { saveSettings(settings); }, [settings]);
  useEffect(() => { saveTrades(trades); }, [trades]);
  useEffect(() => { saveEquity(equity); }, [equity]);

  // Open a trade on each fresh BELI signal, one open trade at a time
  useEffect(() => {
    const previous = prevSignalRef.current;
    prevSignalRef.current = result.signal;
    if (result.signal !== 'BELI' || previous === 'BELI') return;
    if (result.price === null || result.tp === null || result.sl === null) return;
    if (trades.some((t) => t.side === 'BUY' && t.status === 'OPEN')) return;

    const trade = openBeliTrade({
      price: result.price,
      tp: result.tp,
      sl: result.sl,
      score: result.score,
      confidence: confidenceOf(result.checks),
      timeframe,
      mode: settings.mode,
      capital: settings.initialCapital,
      now: Date.now(),
    });
    setTrades((prev) => [...prev, trade]);

    if (settings.mode !== 'simulasi' && settings.waAlerts) {
      const msg = buildSignalMessage({
        side: 'BELI',
        symbol: 'BTCUSDT',
        price: trade.entry,
        score: trade.score,
        confidence: trade.confidence,
        sl: trade.sl,
        tp: trade.tp,
        timeframe,
        reasons: ['EMA 9 > EMA 21', 'RSI 45-70', 'Volume spike', 'MTF 5m & 15m'],
      });
      sendWA(msg, settings);
    }
  }, [result, trades, settings, timeframe]);

  // Auto close the open trade when live price hits TP or SL
  useEffect(() => {
    const open = trades.find((t) => t.side === 'BUY' && t.status === 'OPEN');
    if (!open || livePrice === null) return;
    const closed = closeTradeIfHit(open, livePrice, Date.now());
    if (!closed) return;

    const updated = trades.map((t) => (t.id === closed.id ? closed : t));
    const sumPnL = updated
      .filter((t) => t.status === 'WIN' || t.status === 'LOSS')
      .reduce((acc, t) => acc + (t.pnl ?? 0), 0);
    const newEquity = settings.initialCapital + sumPnL;
    if (Math.abs(closed.pnl ?? 0) > SANITY_PNL_LIMIT || newEquity > SANITY_EQUITY_LIMIT) {
      setTrades([]);
      setEquity([{ time: Date.now(), equity: settings.initialCapital }]);
      return;
    }
    setTrades(updated);
    setEquity((eq) => [...eq, { time: closed.exitTime ?? Date.now(), equity: newEquity }]);
  }, [livePrice, trades, settings.initialCapital]);

  const handleClearTrades = () => {
    setTrades([]);
    setEquity([{ time: Date.now(), equity: settings.initialCapital }]);
  };

  return (
    <Layout current={page} onNavigate={setPage} mode={settings.mode}>
      {page === 'dashboard' && (
        <Dashboard
          timeframe={timeframe}
          onTimeframe={setTimeframe}
          result={result}
          failed={failed}
          updatedAt={data?.updatedAt ?? null}
        />
      )}
      {page === 'history' && (
        <HistoryPage
          trades={trades}
          onClear={handleClearTrades}
          rate={rate}
          showIDR={settings.showIDR}
          livePrice={livePrice}
        />
      )}
      {page === 'analytics' && <AnalyticsPage trades={trades} equity={equity} initialCapital={settings.initialCapital} rate={rate} showIDR={settings.showIDR} />}
      {page === 'settings' && <SettingsPage settings={settings} onChange={setSettings} rate={rate} />}
    </Layout>
  );
}
