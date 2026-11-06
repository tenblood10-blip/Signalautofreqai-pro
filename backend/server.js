// SATPAM BOT - Jalan 24 jam di Render
// Tugas: Cek BTC tiap 60 detik, kalau BELI kirim WA!

const FONNTE_TOKEN = process.env.FONNTE_TOKEN; // Token Fonnte lu
const WA_TARGET = process.env.WA_TARGET; // Nomor WA lu, contoh: 6281234567890
const INTERVAL = 60 * 1000; // Cek tiap 60 detik

let lastSignal = 'TUNGGU';
let lastAlertTime = 0;

async function getKlines(interval, limit = 100) {
  const url = `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=${interval}&limit=${limit}`;
  const res = await fetch(url);
  const data = await res.json();
  // [openTime, open, high, low, close, volume, ...]
  return data.map(c => ({
    close: parseFloat(c[4]),
    volume: parseFloat(c[5]),
  }));
}

function ema(data, period) {
  const k = 2 / (period + 1);
  let emaVal = data[0];
  for (let i = 1; i < data.length; i++) {
    emaVal = data[i] * k + emaVal * (1 - k);
  }
  return emaVal;
}

function rsi(closes, period = 14) {
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff; else losses -= diff;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) { avgGain = (avgGain * (period - 1) + diff) / period; avgLoss = (avgLoss * (period - 1)) / period; }
    else { avgGain = (avgGain * (period - 1)) / period; avgLoss = (avgLoss * (period - 1) - diff) / period; }
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

async function cekSinyal() {
  try {
    const k1 = await getKlines('1m', 100);
    const k5 = await getKlines('5m', 100);
    const k15 = await getKlines('15m', 100);

    const closes = k1.map(c => c.close);
    const volumes = k1.map(c => c.volume);
    const price = closes[closes.length - 1];

    const ema9 = ema(closes, 9);
    const ema21 = ema(closes, 21);
    const rsi14 = rsi(closes, 14);
    const volNow = volumes[volumes.length - 1];
    const volAvg = volumes.slice(-21, -1).reduce((a, b) => a + b, 0) / 20;
    const volRatio = volNow / volAvg;

    const mtf5Closes = k5.map(c => c.close);
    const mtf15Closes = k15.map(c => c.close);
    const mtf5Ok = ema(mtf5Closes, 9) > ema(mtf5Closes, 21);
    const mtf15Ok = ema(mtf15Closes, 9) > ema(mtf15Closes, 21);

    let signal = 'TUNGGU';
    if (ema9 > ema21 && rsi14 >= 45 && rsi14 <= 70 && volRatio >= 1 && mtf5Ok && mtf15Ok) {
      signal = 'BELI';
    }

    console.log(`[${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}] BTC $${price.toFixed(0)} | EMA9 ${ema9.toFixed(0)} EMA21 ${ema21.toFixed(0)} | RSI ${rsi14.toFixed(1)} | Vol ${volRatio.toFixed(2)}x | MTF ${mtf5Ok && mtf15Ok ? 'OK' : 'NO'} | Sinyal: ${signal}`);

    // Kirim WA cuma kalau baru berubah jadi BELI, dan jeda minimal 30 menit
    const now = Date.now();
    if (signal === 'BELI' && lastSignal !== 'BELI' && now - lastAlertTime > 30 * 60 * 1000) {
      lastAlertTime = now;
      await kirimWA(`🚀 *SINYAL BELI - FreqAI Pro (Server 24 Jam)*\n\nBTC: $${price.toFixed(2)}\nRSI: ${rsi14.toFixed(1)}\nEMA 9: ${ema9.toFixed(0)} > EMA 21: ${ema21.toFixed(0)}\nVolume: ${volRatio.toFixed(2)}x\nMTF 5M & 15M: OK\n\nBot server yang ngasih sinyal ini, HP lu boleh mati! Cek Vercel lu!`);
    }
    lastSignal = signal;
  } catch (e) {
    console.log('Error cek:', e.message);
  }
}

async function kirimWA(message) {
  if (!FONNTE_TOKEN || !WA_TARGET) { console.log('Fonnte / WA belum di-setting!'); return; }
  try {
    const res = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: { 'Authorization': FONNTE_TOKEN, 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: WA_TARGET, message, countryCode: '62' })
    });
    console.log('WA terkirim!', await res.text());
  } catch (e) { console.log('Gagal kirim WA:', e.message); }
}

console.log('Satpam Bot jalan... cek tiap 60 detik!');
cekSinyal();
setInterval(cekSinyal, INTERVAL);

// Biar Render tau server hidup (health check)
import http from 'http';
http.createServer((req, res) => { res.writeHead(200); res.end('Bot jalan 24 jam!'); }).listen(process.env.PORT || 3000);
