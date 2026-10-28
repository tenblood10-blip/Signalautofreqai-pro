import type { Settings } from './types';

export async function sendWA(
  message: string,
  settings: Settings
): Promise<{ ok: boolean; via: 'fonnte' | 'wa.me'; error?: string }> {
  const phone = settings.whatsappPhone.trim();
  if (!phone) {
    return { ok: false, via: 'fonnte', error: 'Nomor WhatsApp belum diisi' };
  }
  if (!settings.fonnteToken.trim()) {
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    return { ok: true, via: 'wa.me' };
  }
  try {
    const res = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        Authorization: settings.fonnteToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target: phone,
        message,
        countryCode: '62',
      }),
    });
    const data = await res.json();
    if (res.ok && (data.status === true || data.status === 'success')) {
      return { ok: true, via: 'fonnte' };
    }
    return { ok: false, via: 'fonnte', error: data.reason || data.message || 'Gagal kirim' };
  } catch (e) {
    return {
      ok: false,
      via: 'fonnte',
      error: e instanceof Error ? e.message : 'Network error',
    };
  }
}

export function buildSignalMessage(opts: {
  side: string;
  symbol: string;
  price: number;
  score: number;
  confidence: number;
  sl: number;
  tp: number;
  timeframe: string;
  reasons: string[];
}): string {
  const lines = [
    `*FreqAI Pro - Sinyal ${opts.side}*`,
    `Symbol: ${opts.symbol}`,
    `TF: ${opts.timeframe} | Skor: ${opts.score}/100 | Conf: ${opts.confidence}%`,
    `Entry: $${opts.price.toFixed(2)}`,
    `SL: $${opts.sl.toFixed(2)} | TP: $${opts.tp.toFixed(2)}`,
    `Alasan: ${opts.reasons.join(', ')}`,
    `_Bukan nasihat keuangan_`,
  ];
  return lines.join('\n');
}
