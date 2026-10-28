# FreqAI Pro

BTC/USDT signal engine with live Binance data, WhatsApp alerts, and 3 trading modes.

## Features

- **AI Live Signal**: Fetches Binance BTCUSDT candles across 4 timeframes (5m, 15m, 1h, 4h). Computes RSI, MACD, Bollinger Bands, EMA20/50/200, and volume. Ensemble score 0-100 with dynamic confidence 50-95%.
- **WhatsApp Alerts (Fonnte)**: Sends BUY/SELL signals via Fonnte API. Falls back to wa.me link if token is empty. Test button included.
- **3 Trading Modes**:
  - **Simulasi** (default): Paper trading with simulated PnL stored locally.
  - **Semi**: WhatsApp alerts only, no order execution.
  - **Real**: Executes orders via Binance API (requires API key + secret).
- **Pages**:
  - **Dashboard**: Live price, ensemble score, confidence bars, signal status with reasons, price chart with SL/TP lines, indicator grid.
  - **Riwayat**: Trade history table with WIN/LOSS badges, CSV export, clear button.
  - **Analitik**: Equity curve line chart, win/loss pie chart, winrate, profit factor, total PnL.
  - **Pengaturan**: Binance API, Fonnte token, WhatsApp number, SL/TP, mode selection, WA toggle, thresholds.

## Tech Stack

- React + TypeScript + Vite
- Tailwind CSS (dark, mobile-first)
- Recharts for charts
- Binance REST API (public endpoints)
- Fonnte WhatsApp API
- localStorage for persistence

## Getting Started

```bash
npm install
npm run dev
```

## Environment Variables

See `.env.example` for all supported variables. Settings are also configurable in-app via the Pengaturan page.

## Disclaimer

This is not financial advice. Crypto trading carries significant risk.
