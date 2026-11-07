// SATPAM BOT - Jalan 24 jam di Render
// Tugas: 1. Cek BTC tiap 60 detik, kalau BELI kirim WA!
//        2. Kalau ada yang chat "Hallo satpam", dibales!

import http from 'http';

const FONNTE_TOKEN = process.env.FONNTE_TOKEN;
const WA_TARGET = process.env.WA_TARGET;
const INTERVAL = 60 * 1000;

let lastSignal = 'TUNGGU';
let lastAlertTime = 0;

// --- AMBIL DATA BINANCE (SUDAH DIBENERIN) ---
async function getKlines(interval, limit = 100) {
  const urls = [
    `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=${interval}&limit=${limit}`,
    `https://data-api.binance.vision/api/v3/klines?symbol=BTCUSDT&interval=${interval}&limit=${limit}`
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url);
      const data = await res.json();
      // Kalau Binance ngirim error (bukan list), lempar ke URL cadangan
      if (!Array.isArray(data)) {
        console.log('Binance error di ' + url + ' : ' + JSON.stringify(data).slice(0, 100));
        continue;
      }
      return data.map(c => ({
        close: parseFloat(c[4]),
        volume: parseFloat(c[5]),
      }));
    } catch (e) {
      console.log('Gagal fetch ' + url + ' : ' + e.message);
    }
  }
  throw new Error('Semua API Binance gagal');
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

    const now = Date.now();
    if (signal === 'BELI' && lastSignal !== 'BELI' && now - lastAlertTime > 30 * 60 * 1000) {
      lastAlertTime = now;
      await kirimWA(WA_TARGET, `🚀 *SINYAL BELI - FreqAI Pro (Server 24 Jam)*\n\nBTC: $${price.toFixed(2)}\nRSI: ${rsi14.toFixed(1)}\nEMA 9: ${ema9.toFixed(0)} > EMA 21: ${ema21.toFixed(0)}\nVolume: ${volRatio.toFixed(2)}x\nMTF 5M & 15M: OK\n\nBot server yang ngasih sinyal ini, HP lu boleh mati! Cek Vercel lu!`);
    }
    lastSignal = signal;
  } catch (e) {
    console.log('Error cek:', e.message);
  }
}

// --- KIRIM WA (BISA KE SIAPA AJA) ---
async function kirimWA(target, message) {
  if (!FONNTE_TOKEN || !target) { console.log('Fonnte / Target belum di-setting!'); return; }
  try {
    const res = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: { 'Authorization': FONNTE_TOKEN, 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: target, message, countryCode: '62' })
    });
    console.log('WA terkirim ke ' + target + ' : ' + await res.text());
  } catch (e) { console.log('Gagal kirim WA:', e.message); }
}

console.log('Satpam Bot jalan... cek tiap 60 detik!');
cekSinyal();
setInterval(cekSinyal, INTERVAL);

// --- SERVER BUAT WEBHOOK + HEALTH CHECK ---
const server = http.createServer(async (req, res) => {
  // 1. Kalau dibuka di browser, tampilkan ini
  if (req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot jalan 24 jam! Sinyal terakhir: ' + lastSignal);
    return;
  }

  // 2. Kalau ada chat masuk dari Fonnte
  if (req.method === 'POST' && req.url === '/webhook') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const data = JSON.parse(body || '{}');
        console.log('Webhook masuk:', JSON.stringify(data).slice(0, 500));

        // Fonnte bisa ngirim format beda-beda, kita tangkap semua
        const sender = data.sender || data.from || data.number || (data.data && data.data.sender);
        const pesan = (data.message || data.text || data.caption || (data.data && data.data.message) || '').toString().toLowerCase();

        if (sender && pesan) {
          console.log(`Chat dari ${sender}: ${pesan}`);
          if (pesan.includes('halo') || pesan.includes('halo satpam') || pesan.includes('satpam') || pesan.includes('test') || pesan.includes('hallo')) {
            await kirimWA(sender, `Halo! 👋 Satpam aktif! 🛡️\n\nBot lagi jaga BTC 24 jam.\nSinyal terakhir: ${lastSignal}\n\nKalau sinyal jadi BELI, kamu langsung dikabarin!`);
            // Teruskan juga ke lu biar lu tau ada yang chat
            if (sender !== WA_TARGET) {
              await kirimWA(WA_TARGET, `📩 Ada yang chat satpam\nDari: ${sender}\nPesan: ${pesan}\n\nUdah gue bales otomatis!`);
            }
          }
        }
      } catch (e) {
        console.log('Error webhook:', e.message);
      }
      res.writeHead(200);
      res.end('OK');
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(process.env.PORT || 3000, () => {
  console.log('Server nyala di port ' + (process.env.PORT || 3000));
});
        
