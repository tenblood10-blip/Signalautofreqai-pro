import { useState } from 'react';
import { Send, CheckCircle2, XCircle, AlertTriangle, MessageSquare } from 'lucide-react';
import type { Settings, TradeMode } from '../lib/types';
import { Card, Input, Select, Toggle } from '../components/ui';
import { sendWA } from '../lib/fonnte';

interface SettingsPageProps {
  settings: Settings;
  onChange: (s: Settings) => void;
  rate: number;
}

const modes: { value: TradeMode; label: string; desc: string; activeClass: string; activeText: string; activeBorder: string }[] = [
  { value: 'simulasi', label: 'Simulasi', desc: 'Paper trading, PnL simulasi di localStorage', activeClass: 'bg-emerald-500/15', activeText: 'text-emerald-400', activeBorder: 'border-emerald-500/40' },
  { value: 'semi', label: 'Semi', desc: 'Sinyal WA saja, tidak eksekusi order', activeClass: 'bg-amber-500/15', activeText: 'text-amber-400', activeBorder: 'border-amber-500/40' },
  { value: 'real', label: 'Real', desc: 'Eksekusi order via Binance API', activeClass: 'bg-red-500/15', activeText: 'text-red-400', activeBorder: 'border-red-500/40' },
];

export default function SettingsPage({ settings, onChange, rate }: SettingsPageProps) {
  const [testStatus, setTestStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle');
  const [testMsg, setTestMsg] = useState('');
  const [saved, setSaved] = useState(false);

  const update = (patch: Partial<Settings>) => {
    onChange({ ...settings, ...patch });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const handleTestWA = async () => {
    setTestStatus('sending');
    const result = await sendWA('Test dari FreqAI Pro - WhatsApp terhubung!', settings);
    if (result.ok) {
      setTestStatus('ok');
      setTestMsg(result.via === 'fonnte' ? 'Terkirim via Fonnte!' : 'Membuka wa.me (token kosong)');
    } else {
      setTestStatus('error');
      setTestMsg(result.error ?? 'Gagal');
    }
    setTimeout(() => setTestStatus('idle'), 4000);
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white">Pengaturan</h2>
          <p className="text-sm text-gray-500">API keys, mode, dan konfigurasi</p>
        </div>
        {saved && (
          <span className="flex items-center gap-1 text-xs text-emerald-400 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4" /> Tersimpan
          </span>
        )}
      </div>

      {/* Mode selection */}
      <Card className="p-4 md:p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Mode Trading</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {modes.map((m) => {
            const active = settings.mode === m.value;
            return (
              <button
                key={m.value}
                onClick={() => update({ mode: m.value })}
                className={`text-left p-3 rounded-lg border transition-all ${
                  active
                    ? `${m.activeClass} ${m.activeBorder}`
                    : 'bg-[#161b22] border-gray-800 hover:border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm font-bold ${active ? m.activeText : 'text-gray-300'}`}>{m.label}</span>
                  {active && <CheckCircle2 className={`h-4 w-4 ${m.activeText}`} />}
                </div>
                <p className="text-xs text-gray-500">{m.desc}</p>
              </button>
            );
          })}
        </div>
        {settings.mode === 'real' && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Mode Real akan mengeksekusi order sungguhan di Binance. Pastikan API key & secret terisi.</span>
          </div>
        )}
      </Card>

      {/* WhatsApp Fonnte */}
      <Card className="p-4 md:p-5">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="h-4 w-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-gray-300">WhatsApp (Fonnte)</h3>
        </div>
        <div className="space-y-3">
          <Input
            label="Fonnte Token"
            type="password"
            placeholder="token dari fonnte.com"
            value={settings.fonnteToken}
            onChange={(e) => update({ fonnteToken: e.target.value })}
          />
          <Input
            label="Nomor WhatsApp Tujuan"
            placeholder="628xxxxxxxxxx"
            value={settings.whatsappPhone}
            onChange={(e) => update({ whatsappPhone: e.target.value })}
          />
          <div className="flex items-center justify-between pt-1">
            <Toggle
              checked={settings.waAlerts}
              onChange={(v) => update({ waAlerts: v })}
              label="Auto-alert sinyal"
            />
            <button
              onClick={handleTestWA}
              disabled={testStatus === 'sending'}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-semibold hover:bg-emerald-500/25 disabled:opacity-50 transition-all"
            >
              <Send className="h-3.5 w-3.5" />
              {testStatus === 'sending' ? 'Mengirim...' : 'Test WA'}
            </button>
          </div>
          {testStatus === 'ok' && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400">
              <CheckCircle2 className="h-4 w-4" /> {testMsg}
            </div>
          )}
          {testStatus === 'error' && (
            <div className="flex items-center gap-1.5 text-xs text-red-400">
              <XCircle className="h-4 w-4" /> {testMsg}
            </div>
          )}
          {!settings.fonnteToken && (
            <p className="text-xs text-gray-600">Token kosong = fallback ke wa.me link</p>
          )}
        </div>
      </Card>

      {/* Binance */}
      <Card className="p-4 md:p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Binance API</h3>
        <div className="space-y-3">
          <Input
            label="API Key"
            type="password"
            placeholder="Binance API Key"
            value={settings.binanceKey}
            onChange={(e) => update({ binanceKey: e.target.value })}
          />
          <Input
            label="API Secret"
            type="password"
            placeholder="Binance API Secret"
            value={settings.binanceSecret}
            onChange={(e) => update({ binanceSecret: e.target.value })}
          />
          <p className="text-xs text-gray-600">Diperlukan hanya untuk mode Real. Disimpan di browser Anda.</p>
        </div>
      </Card>

      {/* SL/TP & thresholds */}
      <Card className="p-4 md:p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Parameter Sinyal</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Input
            label="Stop Loss (%)"
            type="number"
            step="0.1"
            min="0"
            value={settings.slPercent}
            onChange={(e) => update({ slPercent: parseFloat(e.target.value) || 0 })}
          />
          <Input
            label="Take Profit (%)"
            type="number"
            step="0.1"
            min="0"
            value={settings.tpPercent}
            onChange={(e) => update({ tpPercent: parseFloat(e.target.value) || 0 })}
          />
          <Input
            label="Min Skor Entry"
            type="number"
            min="0"
            max="100"
            value={settings.scoreThreshold}
            onChange={(e) => update({ scoreThreshold: parseInt(e.target.value) || 0 })}
          />
          <Input
            label="Min Confidence (%)"
            type="number"
            min="0"
            max="100"
            value={settings.confThreshold}
            onChange={(e) => update({ confThreshold: parseInt(e.target.value) || 0 })}
          />
        </div>
      </Card>

      {/* Balance & IDR settings */}
      <Card className="p-4 md:p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Saldo &amp; Tampilan</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Saldo (IDR)</label>
            <input
              type="number"
              placeholder="50000"
              value={settings.initialCapital > 0 ? Math.round(settings.initialCapital * rate) : ''}
              onChange={(e) => {
                const idrVal = parseFloat(e.target.value);
                const usdVal = idrVal > 0 && rate > 0 ? idrVal / rate : 0;
                update({ initialCapital: usdVal });
              }}
              className="w-full px-3 py-2.5 bg-[#161b22] border border-gray-800 rounded-lg text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
            />
            <p className="mt-1.5 text-xs text-gray-500">
              &asymp; ${settings.initialCapital.toFixed(2)} · {settings.initialCapital <= 100 ? '(Mode Test)' : '(Mode Pro)'}
            </p>
          </div>
          <div className="flex items-center">
            <Toggle
              checked={settings.showIDR}
              onChange={(v) => update({ showIDR: v })}
              label="Tampilkan IDR"
            />
          </div>
        </div>
        <div className="mt-3">
          <Input
            label="Saldo (USD) — mode pro"
            type="number"
            min="0"
            step="0.01"
            value={settings.initialCapital}
            onChange={(e) => update({ initialCapital: parseFloat(e.target.value) || 0 })}
          />
          <p className="mt-1.5 text-xs text-gray-600">Default $10 untuk test. Ubah ke $10000 untuk mode pro. Internal tetap USD.</p>
        </div>
      </Card>
    </div>
  );
}
