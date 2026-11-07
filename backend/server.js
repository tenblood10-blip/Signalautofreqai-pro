// OTAK FREQAI PRO - TANPA FONNTE, TANPA WA
// SIMULASI 5jt + REAL 10jt - Liat hasil di Vercel aja
import http from 'http';
const SYMBOL = 'BTCUSDT';

function newState(modal) {
  return { modalAwal: modal, modal: modal, trades: [], equity: [{ time: Date.now(), equity: modal }], lastSignal: 'TUNGGU', lastPrice: 0, updatedAt: 0 };
}
const sim = newState(5000000);
const real = newState(10000000);
let klines = [];
let livePrice = 0;
let lastLog = '';

function ema(data, period) {
  const k = 2 / (period + 1);
  let e = data[0];
  for (let i = 1; i < data.length; i++) e = data[i] * k + e * (1 - k);
  return e;
}
function rsi(data, period = 14) {
  let gains = 0, losses = 0;
  for (let i = data.length - period; i < data.length; i++) {
    const diff = data[i] - data[i - 1];
    if (diff >= 0) gains += diff; else losses -= diff;
  }
  const avgGain = gains / period, avgLoss = losses / period || 0.00001;
  return 100 - (100 / (1 + (avgGain / avgLoss)));
}
function cekSinyal(state, label) {
  if (klines.length < 30) return;
  const closes = klines.map(c => c.close);
  const volumes = klines.map(c => c.volume);
  const ema9 = ema(closes, 9);
  const ema21 = ema(closes, 21);
  const r = rsi(closes, 14);
  const volNow = volumes[volumes.length - 1];
  const volAvg = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
  const isBeli = ema9 > ema21 && r >= 45 && r <= 70 && volNow > volAvg;
  const open = state.trades.find(t => t.status === 'OPEN');
  if (open) {
    if (livePrice >= open.tp) {
      open.status = 'WIN'; open.exitPrice = livePrice; open.exitTime = Date.now();
      open.pnl = (open.tp - open.entry) / open.entry * open.modalDipake;
      state.modal += open.pnl;
      state.equity.push({ time: Date.now(), equity: state.modal });
      lastLog = `✅ ${label} TP KENA! PnL +Rp ${Math.round(open.pnl).toLocaleString('id-ID')}`;
      console.log(lastLog);
    } else if (livePrice <= open.sl) {
      open.status = 'LOSS'; open.exitPrice = livePrice; open.exitTime = Date.now();
      open.pnl = (open.sl - open.entry) / open.entry * open.modalDipake;
      state.modal += open.pnl;
      state.equity.push({ time: Date.now(), equity: state.modal });
      lastLog = `❌ ${label} SL KENA! PnL Rp ${Math.round(open.pnl).toLocaleString('id-ID')}`;
      console.log(lastLog);
    }
    return;
  }
  if (isBeli && state.lastSignal !== 'BELI') {
    const entry = livePrice;
    const sl = entry * 0.998;
    const tp = entry * 1.004;
    const modalDipake = state.modal * 0.2;
    state.trades.push({ id: Date.now(), side: 'BUY', entry, sl, tp, modalDipake, status: 'OPEN', time: Date.now() });
    state.lastSignal = 'BELI';
    lastLog = `${label === 'SIMULASI' ? '🧪 SIMULASI' : '🚨 REAL'} BELI di ${entry} TP ${tp.toFixed(2)} SL ${sl.toFixed(2)}`;
    console.log(lastLog);
  } else if (!isBeli) state.lastSignal = 'TUNGGU';
}
setInterval(async () => {
  try {
    const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${SYMBOL}`);
    const data = await res.json();
    livePrice = parseFloat(data.price);
    sim.lastPrice = livePrice; real.lastPrice = livePrice;
    sim.updatedAt = Date.now(); real.updatedAt = Date.now();
  } catch (e) {}
}, 3000);
setInterval(async () => {
  try {
    const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${SYMBOL}&interval=1m&limit=50`);
    const data = await res.json();
    klines = data.map(c => ({ close: parseFloat(c[4]), volume: parseFloat(c[5]) }));
    if (!livePrice && klines.length) livePrice = klines[klines.length - 1].close;
    cekSinyal(sim, 'SIMULASI');
    cekSinyal(real, 'REAL');
    console.log(`[${new Date().toLocaleTimeString('id-ID')}] Harga ${livePrice} | Sim ${Math.round(sim.modal)} | Real ${Math.round(real.modal)} | ${lastLog}`);
  } catch (e) {}
}, 10000);

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  if (req.url === '/api/status') {
    res.end(JSON.stringify({ price: livePrice, sim, real, lastLog, updatedAt: Date.now() }));
  } else {
    res.end(JSON.stringify({ status: 'FreqAI Pro Otak - Jalan Tanpa Fonnte' }));
  }
});
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Otak jalan di port ' + PORT));
