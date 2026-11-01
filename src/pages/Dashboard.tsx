import { useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Minus, RefreshCw, AlertTriangle,
  Activity, Target, Shield, Clock, Radar, Zap, ArrowRightCircle, X,
} from 'lucide-react';
import type { SignalResult, Timeframe, TradeMode, ScanRow, AssetClass } from '../lib/types';
import type { Candle } from '../lib/types';
import type { SwitchRecommendation } from '../App';
import { Card, StatBar, Badge, Select, DualPrice } from '../components/ui';
import FeatureWeights from '../components/FeatureWeights';
import ScannerTable from '../components/ScannerTable';
import SpiderHunter from '../components/SpiderHunter';
import PerfectSpiderWeb from '../components/PerfectSpiderWeb';
import { useSpiderHunter } from '../hooks/useSpiderHunter';
import { computeAiVotes, deriveSpiderState } from '../lib/aiVotes';
import { SCALPING_TIMEFRAMES } from '../lib/timeframes';

interface DashboardProps {
  signal: SignalResult | null;
  candles: Candle[];
  timeframe: Timeframe;
  onTimeframe: (t: Timeframe) => void;
  loading: boolean;
  error: string | null;
  mode: TradeMode;
  slPercent: number;
  tpPercent: number;
  scoreThreshold: number;
  confThreshold: number;
  openCount: number;
  selectedSymbol: string;
  scanRows: ScanRow[];
  scanning: boolean;
  onScan: () => void;
  onSelectAsset: (symbol: string) => void;
  marketFilter: AssetClass | 'all';
  onMarketFilter: (f: AssetClass | 'all') => void;
  switchRec: SwitchRecommendation | null;
  onDismissSwitchRec: () => void;
  rate: number;
  showIDR: boolean;
  mtfOk: boolean | null;
}

export default function Dashboard({
  signal, candles, timeframe, onTimeframe, loading, error, mode,
  slPercent, tpPercent, scoreThreshold, confThreshold, openCount,
  selectedSymbol, scanRows, scanning, onScan, onSelectAsset,
  marketFilter, onMarketFilter, switchRec, onDismissSwitchRec,
  rate, showIDR, mtfOk,
}: DashboardProps) {
  const spiderScores = useMemo(
    () => scanRows.map((r) => ({ coin: r.label, score: r.score })),
    [scanRows]
  );
  const { best, triggerShoot } = useSpiderHunter(spiderScores);

  const chartData = useMemo(
    () => candles.slice(-60).map((c) => ({
      time: new Date(c.time * 1000).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      price: c.close,
    })),
    [candles]
  );

  const side = signal?.side ?? 'WAIT';
  const price = signal?.indicators.price ?? 0;
  const slPrice = side === 'BUY' ? price * (1 - slPercent / 100) : price * (1 + slPercent / 100);
  const tpPrice = side === 'BUY' ? price * (1 + tpPercent / 100) : price * (1 - tpPercent / 100);

  const sideConfig = {
    BUY: { icon: TrendingUp, color: 'text-emerald-400', bg: 'from-emerald-500/20 to-emerald-500/5', border: 'border-emerald-500/30', label: 'BELI' },
    SELL: { icon: TrendingDown, color: 'text-red-400', bg: 'from-red-500/20 to-red-500/5', border: 'border-red-500/30', label: 'JUAL' },
    WAIT: { icon: Minus, color: 'text-amber-400', bg: 'from-amber-500/20 to-amber-500/5', border: 'border-amber-500/30', label: 'TUNGGU' },
  }[side];

  const SideIcon = sideConfig.icon;
  const isAggressive = signal?.aggressive ?? false;
  const effScoreThreshold = isAggressive ? 62 : scoreThreshold;
  const effConfThreshold = isAggressive ? 55 : confThreshold;
  const entryActive = side !== 'WAIT' && (signal?.score ?? 0) >= effScoreThreshold && (signal?.confidence ?? 0) >= effConfThreshold;

  const aiVotes = useMemo(
    () => computeAiVotes(signal, candles, effScoreThreshold, effConfThreshold, mtfOk),
    [signal, candles, effScoreThreshold, effConfThreshold, mtfOk]
  );
  const spiderState = deriveSpiderState(aiVotes, side);
  const spiderCoins = useMemo(
    () => (best?.allCoins.length ? best.allCoins : scanRows.slice(0, 10).map((r) => r.label)),
    [best, scanRows]
  );

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white">Dashboard Live</h2>
            <p className="text-sm text-gray-500">{selectedSymbol} · Regression AI 15-Fitur</p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[#02C076]/40 bg-[#02C076]/15 text-[#02C076] text-xs font-bold">
            <Zap className="h-3.5 w-3.5" />
            Mode Scalping 1m-15m LOCKED
          </span>
        </div>
        <div className="flex items-center gap-2">
          {SCALPING_TIMEFRAMES.map((tf) => (
            <button
              key={tf.id}
              title={tf.desc}
              onClick={() => onTimeframe(tf.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                timeframe === tf.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-[#161b22] text-gray-400 border border-gray-800 hover:text-gray-200'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scanner section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-36">
            <Select
              value={marketFilter}
              onChange={(e) => onMarketFilter(e.target.value as AssetClass | 'all')}
            >
              <option value="all">Semua Pasar</option>
              <option value="crypto">Crypto</option>
              <option value="stock">Saham US</option>
            </Select>
          </div>
        </div>
        <button
          onClick={onScan}
          disabled={scanning}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 disabled:opacity-50 transition-all"
        >
          <Radar className={`h-4 w-4 ${scanning ? 'animate-spin' : ''}`} />
          {scanning ? 'Scanning...' : 'SCAN TERBAIK'}
        </button>
      </div>

      {/* Switch recommendation banner */}
      {switchRec && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500/15 to-emerald-500/10 border border-blue-500/30">
          <div className="flex items-center gap-3 min-w-0">
            <ArrowRightCircle className="h-5 w-5 text-blue-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">
                REKOMENDASI: SWITCH KE {switchRec.toLabel}
              </p>
              <p className="text-xs text-gray-400">
                Skor {switchRec.toScore} &gt; {switchRec.fromLabel} {switchRec.fromScore}
              </p>
            </div>
          </div>
          <button
            onClick={onDismissSwitchRec}
            className="shrink-0 p-1 rounded-md text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <ScannerTable
        rows={scanRows}
        scanning={scanning}
        selectedSymbol={selectedSymbol}
        onSelect={onSelectAsset}
        rate={rate}
        showIDR={showIDR}
      />

      <SpiderHunter best={best} triggerShoot={triggerShoot} tpPercent={tpPercent} slPercent={slPercent} />

      <PerfectSpiderWeb votes={aiVotes} coins={spiderCoins} state={spiderState} />

      {mode === 'real' && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="font-medium">MODE REAL AKTIF — Order akan dieksekusi di Binance dengan API key Anda.</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Signal card */}
      <Card className={`p-5 md:p-6 bg-gradient-to-br ${sideConfig.bg} border ${sideConfig.border}`}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-[#0d1117]/80 ${sideConfig.color}`}>
              <SideIcon className="h-7 w-7" />
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider">Sinyal</p>
              <p className={`text-2xl font-bold ${sideConfig.color}`}>{sideConfig.label}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Harga {selectedSymbol}</p>
            <DualPrice usd={price} rate={rate} showIDR={showIDR} className="text-right" tone="default" idrClassName="text-right" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <StatBar value={signal?.score ?? 0} max={100} color="bg-gradient-to-r from-blue-500 to-cyan-400" label="Skor Ensemble" />
          <StatBar value={signal?.confidence ?? 0} max={100} color="bg-gradient-to-r from-purple-500 to-pink-400" label="Confidence" />
        </div>

        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {signal ? new Date(signal.lastUpdate).toLocaleTimeString('id-ID') : '--'}
          </div>
          <div className="flex items-center gap-1.5">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Memperbarui...' : 'Real-time'}
          </div>
        </div>
      </Card>

      {/* Status + entry info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-4 w-4 text-blue-400" />
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Status</span>
          </div>
          {entryActive ? (
            <Badge color={side === 'BUY' ? 'green' : 'red'}>Entry Aktif</Badge>
          ) : (
            <Badge color="amber">Menunggu Sinyal</Badge>
          )}
          <p className="mt-2 text-xs text-gray-500">
            Threshold: Skor {effScoreThreshold} · Conf {effConfThreshold}%
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-4 w-4 text-red-400" />
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Stop Loss</span>
          </div>
          {side !== 'WAIT' ? (
            <DualPrice usd={slPrice} rate={rate} showIDR={showIDR} tone="red" className="text-lg" />
          ) : (
            <p className="text-lg font-bold text-gray-600 tabular-nums">--</p>
          )}
          <p className="text-xs text-gray-500 mt-1">{slPercent}% dari entry</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Take Profit</span>
          </div>
          {side !== 'WAIT' ? (
            <DualPrice usd={tpPrice} rate={rate} showIDR={showIDR} tone="green" className="text-lg" />
          ) : (
            <p className="text-lg font-bold text-gray-600 tabular-nums">--</p>
          )}
          <p className="text-xs text-gray-500 mt-1">{tpPercent}% dari entry</p>
        </Card>
      </div>

      {/* Chart */}
      <Card className="p-4 md:p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-300">Chart Harga · {timeframe}</h3>
          <span className="text-xs text-gray-500">250 candle terakhir</span>
        </div>
        <div className="h-64 md:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" tick={{ fill: '#6b7280', fontSize: 10 }} interval="preserveStartEnd" axisLine={false} tickLine={false} />
              <YAxis domain={['dataMin', 'dataMax']} tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} width={60} tickFormatter={(v) => `$${Number(v).toFixed(0)}`} />
              <Tooltip
                contentStyle={{ background: '#0d1117', border: '1px solid #1f2937', borderRadius: '8px', fontSize: '12px' }}
                labelStyle={{ color: '#9ca3af' }}
                formatter={(v) => [`${Number(v).toFixed(2)}`, 'Harga']}
              />
              <Area type="monotone" dataKey="price" stroke="#3b82f6" strokeWidth={2} fill="url(#priceGrad)" />
              {side !== 'WAIT' && <ReferenceLine y={tpPrice} stroke="#10b981" strokeDasharray="3 3" />}
              {side !== 'WAIT' && <ReferenceLine y={slPrice} stroke="#ef4444" strokeDasharray="3 3" />}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* 15 Feature weights */}
      {signal && signal.featureWeights.length > 0 ? (
        <FeatureWeights weights={signal.featureWeights} r2={signal.r2} />
      ) : (
        <Card className="p-4 md:p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-300">15 Fitur AI Aktif</h3>
            <span className="text-sm font-bold text-gray-500 tabular-nums">R² = --</span>
          </div>
          <p className="text-xs text-gray-600">Menghitung 15 fitur regresi...</p>
        </Card>
      )}

      {/* Open positions */}
      <Card className="p-4 md:p-5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-300">Posisi Terbuka</h3>
          <span className="text-sm font-bold text-blue-400 tabular-nums">{openCount}/3</span>
        </div>
        <p className="text-xs text-gray-500">
          {openCount === 0 ? 'Tidak ada posisi aktif. Menunggu sinyal entry.' : `${openCount} posisi berjalan.`}
        </p>
      </Card>

      {/* Reasons */}
      <Card className="p-4 md:p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Alasan Sinyal</h3>
        <div className="space-y-2">
          {signal?.reasons.map((r, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-gray-300">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-400" />
              {r}
            </div>
          )) ?? <p className="text-sm text-gray-500">Memuat...</p>}
        </div>
      </Card>

      {/* Indicators grid */}
      {signal && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <IndiCard label="RSI(14)" value={signal.indicators.rsi.toFixed(1)} tone={signal.indicators.rsi > 70 ? 'red' : signal.indicators.rsi < 30 ? 'green' : 'gray'} />
          <IndiCard label="MACD" value={signal.indicators.macd.toFixed(2)} tone={signal.indicators.macdHist > 0 ? 'green' : 'red'} />
          <IndiCard label="EMA20" value={signal.indicators.ema20.toFixed(1)} tone="gray" />
          <IndiCard label="EMA50" value={signal.indicators.ema50.toFixed(1)} tone="gray" />
          <IndiCard label="EMA200" value={signal.indicators.ema200.toFixed(1)} tone="gray" />
          <IndiCard label="BB %B" value={(signal.indicators.bbPercent * 100).toFixed(0) + '%'} tone={signal.indicators.bbPercent > 0.8 ? 'red' : signal.indicators.bbPercent < 0.2 ? 'green' : 'gray'} />
          <IndiCard label="BB Upper" value={signal.indicators.bbUpper.toFixed(1)} tone="gray" />
          <IndiCard label="BB Lower" value={signal.indicators.bbLower.toFixed(1)} tone="gray" />
        </div>
      )}
    </div>
  );
}

function IndiCard({ label, value, tone }: { label: string; value: string; tone: 'red' | 'green' | 'gray' }) {
  const colors = { red: 'text-red-400', green: 'text-emerald-400', gray: 'text-gray-200' };
  return (
    <Card className="p-3">
      <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-sm font-bold tabular-nums ${colors[tone]}`}>{value}</p>
    </Card>
  );
}
