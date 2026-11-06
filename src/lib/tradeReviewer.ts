import type { TradeRecord } from './types';

export type Review = {
  lesson: string;
  bias: number;
  winRateLast20: number;
  pattern: string;
};

export function reviewTrades(trades: TradeRecord[]): Review {
  const closed = trades.filter((t) => t.status === 'WIN' || t.status === 'LOSS');
  if (closed.length === 0) {
    return {
      lesson: 'Belum ada data, 6 AI jalan normal.',
      bias: 0,
      winRateLast20: 0,
      pattern: '-',
    };
  }

  const last20 = closed.slice(-20);
  const wins = last20.filter((t) => t.status === 'WIN').length;
  const winRate = (wins / last20.length) * 100;

  const lossTrades = last20.filter((t) => t.status === 'LOSS');
  const lossLowScore = lossTrades.filter((t) => (t.score ?? 0) < 70).length;

  const last3 = last20.slice(-3);
  const losingStreak = last3.length === 3 && last3.every((t) => t.status === 'LOSS');

  const last3Win = last20.slice(-3);
  const winningStreak = last3Win.length === 3 && last3Win.every((t) => t.status === 'WIN');

  if (losingStreak) {
    return {
      lesson: '3 LOSS beruntun! 6 AI disuruh lebih ketat. Score di bawah 75 ditolak dulu!',
      bias: -15,
      winRateLast20: winRate,
      pattern: 'LOSING STREAK - MODE HATI-HATI',
    };
  }

  if (winningStreak && winRate >= 60) {
    return {
      lesson: `3 WIN beruntun! Winrate 20 trade terakhir ${winRate.toFixed(0)}%. Pola lagi bagus, 6 AI dikasih gas!`,
      bias: 10,
      winRateLast20: winRate,
      pattern: 'POLA BAGUS - MODE AGRESIF',
    };
  }

  if (lossTrades.length > 0 && lossLowScore / lossTrades.length > 0.6) {
    return {
      lesson: `${lossLowScore} LOSS terakhir karena Score rendah (<70). AI Reviewer naikin standar!`,
      bias: -10,
      winRateLast20: winRate,
      pattern: 'SCORE RENDAH = LOSS',
    };
  }

  if (winRate >= 70) {
    return {
      lesson: `Winrate 20 trade terakhir ${winRate.toFixed(0)}%! Pola lagi bagus, 6 AI dikasih gas!`,
      bias: 10,
      winRateLast20: winRate,
      pattern: 'POLA BAGUS - MODE AGRESIF',
    };
  }

  if (winRate < 40 && last20.length >= 5) {
    return {
      lesson: `Winrate cuma ${winRate.toFixed(0)}%. 6 AI disuruh lebih selektif, jangan asal BELI!`,
      bias: -12,
      winRateLast20: winRate,
      pattern: 'WINRATE RENDAH - MODE SELEKTIF',
    };
  }

  return {
    lesson: `Winrate 20 trade terakhir ${winRate.toFixed(0)}%. 6 AI jalan normal, terus belajar.`,
    bias: 0,
    winRateLast20: winRate,
    pattern: 'NORMAL',
  };
      }
