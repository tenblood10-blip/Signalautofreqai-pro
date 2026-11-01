import { useState, useEffect, useRef, useCallback } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import HistoryPage from './pages/HistoryPage';
import SettingsPage from './pages/SettingsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import type {
  PageId, Settings, SignalResult, TradeRecord, EquityPoint, Candle, Timeframe,
  ScanRow, AssetClass, AssetDef,
} from './lib/types';
import { generateSignal } from './lib/signal';
import { sendWA, buildSignalMessage } from './lib/fonnte';
import {
  ALL_ASSETS, CRYPTO_ASSETS, STOCK_ASSETS, scanAssets, findBestSignal,
  buildOpportunityMessage, fetchAssetCandles,
} from './lib/scanner';
import { mtfLocked } from './lib/mtf';
import { DEFAULT_TIMEFRAME } from './lib/timeframes';
import {
  loadSettings, saveSettings, loadTrades, saveTrades, loadEquity, saveEquity,
} from './lib/storage';
import { useExchangeRate } from './lib/exchange';

export interface SwitchRecommendation {
  fromSymbol: string;
  fromLabel: string;
  fromScore: number;
  toSymbol: string;
  toLabel: string;
  toScore: number;
}

const POLL_MS = 30000;
const SCAN_MS = 60000;
const MTF_MS = 60000;

export default function App() {
  const [page, setPage] = useState<PageId>('dashboard');
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [timeframe, setTimeframe] = useState<Timeframe>(DEFAULT_TIMEFRAME);
  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSDT');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [signal, setSignal] = useState<SignalResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trades, setTrades] = useState<TradeRecord[]>(() => loadTrades());
  const [equity, setEquity] = useState<EquityPoint[]>(() => loadEquity(loadSettings().initialCapital));

  const [scanRows, setScanRows] = useState<ScanRow[]>([]);
  const [scanning, setScanning] = useState(false);
  const [marketFilter, setMarketFilter] = useState<AssetClass | 'all'>('all');
  const [switchRec, setSwitchRec] = useState<SwitchRecommendation | null>(null);
  const [mtfOk, setMtfOk] = useState<boolean | null>(null);

  const { rate } = useExchangeRate();

  const lastSignalRef = useRef<string>('');
  const lastBestAlertRef = useRef<string>('');

  useEffect(() => { saveSettings(settings); }, [settings]);
  useEffect(() => { saveTrades(trades); }, [trades]);
  useEffect(() => { saveEquity(equity); }, [equity]);

  const selectedAsset: AssetDef = ALL_ASSETS.find((a) => a.symbol === selectedSymbol) ?? ALL_ASSETS[0];

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [c5, c15] = await Promise.all([
          fetchAssetCandles(selectedAsset, '5m'),
          fetchAssetCandles(selectedAsset, '15m'),
        ]);
        if (!cancelled) setMtfOk(mtfLocked(c5, c15));
      } catch {
        if (!cancelled) setMtfOk(null);
      }
    };
    load();
    const id = setInterval(load, MTF_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [selectedAsset]);

  // Poll selected asset
  const poll = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAssetCandles(selectedAsset, timeframe);
      setCandles(data);
      const sig = generateSignal(data, selectedAsset.symbol);
      if (sig) {
        setSignal(sig);
        setError(null);

        const effScoreThreshold = sig.aggressive ? 62 : settings.scoreThreshold;
        const effConfThreshold = sig.aggressive ? 55 : settings.confThreshold;
        const entryActive = sig.side !== 'WAIT' && sig.score >= effScoreThreshold && sig.confidence >= effConfThreshold;
        const sigKey = `${sig.symbol}-${sig.side}-${sig.score}-${Math.floor(sig.lastUpdate / 60000)}`;
        const hasOpenTrade = trades.some((t) => t.status === 'OPEN');
        // Prevent duplicate: skip if a trade was created in the last 60 seconds
        const lastTradeTime = trades.length > 0 ? trades[trades.length - 1].time : 0;
        const tooSoon = Date.now() - lastTradeTime < 60000;

        if (entryActive && sigKey !== lastSignalRef.current && !hasOpenTrade && !tooSoon) {
          lastSignalRef.current = sigKey;
          const price = sig.indicators.price;
          const isBuy = sig.side === 'BUY';
          const sl = isBuy ? price * (1 - settings.slPercent / 100) : price * (1 + settings.slPercent / 100);
          const tp = isBuy ? price * (1 + settings.tpPercent / 100) : price * (1 - settings.tpPercent / 100);
          // qty = balance * 33% / entry price, fee = 0.1% of position value
          const positionUSD = settings.initialCapital * 0.33;
          const qty = price > 0 ? positionUSD / price : 0;
          const fee = positionUSD * 0.001; // 0.1% entry fee
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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal mengambil data');
    } finally {
      setLoading(false);
    }
  }, [selectedAsset, timeframe, settings, trades]);

  useEffect(() => {
    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => clearInterval(interval);
  }, [poll]);

  // Scanner loop
  const runScan = useCallback(async () => {
    setScanning(true);
    try {
      const assets = marketFilter === 'crypto' ? CRYPTO_ASSETS
        : marketFilter === 'stock' ? STOCK_ASSETS
        : ALL_ASSETS;
      const rows = await scanAssets(assets, timeframe);
      setScanRows(rows);

      // Auto-switch: if any symbol has score > 72 and is higher than current selection, recommend switch
      if (rows.length > 0) {
        const best = rows[0];
        const currentRow = rows.find((r) => r.symbol === selectedSymbol);
        const currentScore = currentRow?.score ?? 0;
        if (best.score > 72 && best.symbol !== selectedSymbol && best.score > currentScore + 10) {
          const bestAsset = assets.find((a) => a.symbol === best.symbol);
          const currentAsset = assets.find((a) => a.symbol === selectedSymbol);
          setSwitchRec({
            fromSymbol: selectedSymbol,
            fromLabel: currentAsset?.label ?? selectedSymbol,
            fromScore: currentScore,
            toSymbol: best.symbol,
            toLabel: bestAsset?.label ?? best.label,
            toScore: best.score,
          });
          setSelectedSymbol(best.symbol);
        } else {
          setSwitchRec(null);
        }
      }

      if (rows.length > 0 && settings.waAlerts && settings.mode !== 'simulasi') {
        const best = findBestSignal(rows);
        const btcRow = rows.find((r) => r.symbol === 'BTCUSDT');
        const btcScore = btcRow?.score ?? 50;
        if (best && best.score > 75 && best.confidence > 68 && best.symbol !== 'BTCUSDT') {
          const alertKey = `${best.symbol}-${best.score}-${Math.floor(Date.now() / 300000)}`;
          if (alertKey !== lastBestAlertRef.current) {
            lastBestAlertRef.current = alertKey;
            const msg = buildOpportunityMessage(best, btcScore, timeframe);
            sendWA(msg, settings);
          }
        }
      }
    } catch {
      // scanner errors are non-fatal
    } finally {
      setScanning(false);
    }
  }, [marketFilter, timeframe, settings, selectedSymbol]);

  useEffect(() => {
    runScan();
    const interval = setInterval(runScan, SCAN_MS);
    return () => clearInterval(interval);
  }, [runScan]);

  // Check open trades for SL/TP hit
  useEffect(() => {
    const openTrade = trades.find((t) => t.status === 'OPEN');
    if (!openTrade || !signal) return;
    const price = signal.indicators.price;
    const isBuy = openTrade.side === 'BUY';
    const qty = openTrade.qty ?? 1;
    const entryFee = openTrade.fee ?? 0;
    const exitFee = qty * price * 0.001; // 0.1% exit fee
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
        // Recompute equity as initialCapital + sum of all closed PnL
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

  const handleSelectAsset = (symbol: string) => {
    setSelectedSymbol(symbol);
  };

  return (
    <Layout current={page} onNavigate={setPage} mode={settings.mode}>
      {page === 'dashboard' && (
        <Dashboard
          signal={signal}
          candles={candles}
          timeframe={timeframe}
          onTimeframe={setTimeframe}
          loading={loading}
          error={error}
          mode={settings.mode}
          slPercent={settings.slPercent}
          tpPercent={settings.tpPercent}
          scoreThreshold={settings.scoreThreshold}
          confThreshold={settings.confThreshold}
          openCount={trades.filter((t) => t.status === 'OPEN').length}
          selectedSymbol={selectedSymbol}
          scanRows={scanRows}
          scanning={scanning}
          onScan={runScan}
          onSelectAsset={handleSelectAsset}
          marketFilter={marketFilter}
          onMarketFilter={setMarketFilter}
          switchRec={switchRec}
          onDismissSwitchRec={() => setSwitchRec(null)}
          rate={rate}
          showIDR={settings.showIDR}
          mtfOk={mtfOk}
        />
      )}
      {page === 'history' && <HistoryPage trades={trades} onClear={handleClearTrades} rate={rate} showIDR={settings.showIDR} />}
      {page === 'analytics' && <AnalyticsPage trades={trades} equity={equity} initialCapital={settings.initialCapital} rate={rate} showIDR={settings.showIDR} />}
      {page === 'settings' && <SettingsPage settings={settings} onChange={setSettings} rate={rate} />}
    </Layout>
  );
}
