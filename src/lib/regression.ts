import { FEATURE_COUNT, FEATURE_NAMES } from './features';

const r2History: Record<string, number[]> = {};
const confHistory: Record<string, number[]> = {};

export function getR2History(symbol: string): number[] {
  return r2History[symbol] ?? [];
}

export function recordConfidence(symbol: string, confidence: number): void {
  if (!confHistory[symbol]) confHistory[symbol] = [];
  confHistory[symbol].push(confidence);
  if (confHistory[symbol].length > 200) confHistory[symbol].shift();
}

export function trainRegression(
  features: number[][],
  returns: number[],
  symbol?: string
): { weights: number[]; intercept: number; r2: number; r2Smoothed: number; trainPredictions: number[] } | null {
  const m = features.length;
  if (m < 10 || returns.length < m) return null;

  const n = FEATURE_COUNT;

  const xMean: number[] = new Array(n).fill(0);
  const yMean = returns.reduce((a, b) => a + b, 0) / m;
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) xMean[j] += features[i][j];
  }
  for (let j = 0; j < n; j++) xMean[j] /= m;

  const weights: number[] = new Array(n).fill(0);
  for (let j = 0; j < n; j++) {
    let covXy = 0;
    let varX = 0;
    let varY = 0;
    for (let i = 0; i < m; i++) {
      const dx = features[i][j] - xMean[j];
      const dy = returns[i] - yMean;
      covXy += dx * dy;
      varX += dx * dx;
      varY += dy * dy;
    }
    const denom = Math.sqrt(varX * varY);
    const corr = denom > 1e-15 ? covXy / denom : 0;
    weights[j] = corr * 0.1;
  }

  const intercept = yMean - weights.reduce((a, w, j) => a + w * xMean[j], 0);

  const trainPredictions: number[] = [];
  let predMean = 0;
  for (let i = 0; i < m; i++) {
    const pred = intercept + weights.reduce((a, w, j) => a + w * features[i][j], 0);
    trainPredictions.push(pred);
    predMean += pred;
  }
  predMean /= m;

  let covPredActual = 0;
  let varPred = 0;
  let varActual = 0;
  for (let i = 0; i < m; i++) {
    covPredActual += (trainPredictions[i] - predMean) * (returns[i] - yMean);
    varPred += (trainPredictions[i] - predMean) ** 2;
    varActual += (returns[i] - yMean) ** 2;
  }
  const predStd = Math.sqrt(varPred);
  const actualStd = Math.sqrt(varActual);
  const predActualCorr = predStd * actualStd > 1e-15 ? covPredActual / (predStd * actualStd) : 0;
  const r2 = Math.max(0, predActualCorr * predActualCorr);

  let r2Smoothed = r2;
  if (symbol) {
    if (!r2History[symbol]) r2History[symbol] = [];
    const prev = r2History[symbol].length > 0
      ? r2History[symbol][r2History[symbol].length - 1]
      : r2;
    r2Smoothed = prev * 0.9 + r2 * 0.1;
    r2History[symbol].push(r2Smoothed);
    if (r2History[symbol].length > 200) r2History[symbol].shift();
  }

  return { weights, intercept, r2, r2Smoothed, trainPredictions };
}

export function predictAndScore(
  currentFeatures: number[],
  weights: number[],
  intercept: number,
  r2: number,
  trainPredictions?: number[]
): { rawScore: number; score: number; confidence: number } {
  let raw = intercept + weights.reduce((a, w, j) => a + w * currentFeatures[j], 0);
  if (!isFinite(raw)) raw = 0;

  let score: number;
  if (trainPredictions && trainPredictions.length > 5) {
    const mean = trainPredictions.reduce((a, b) => a + b, 0) / trainPredictions.length;
    const variance = trainPredictions.reduce((a, p) => a + (p - mean) ** 2, 0) / trainPredictions.length;
    const std = Math.sqrt(variance) || 0.0001;
    const z = (raw - mean) / std;
    score = Math.round(50 + z * 16);
  } else {
    score = Math.round(50 + raw * 500);
  }
  if (!isFinite(score)) score = 45;
  score = Math.max(20, Math.min(85, score));

  let confidence = Math.round(50 + r2 * 40 + Math.abs(raw) * 200);
  if (!isFinite(confidence)) confidence = 60;
  confidence = Math.min(95, Math.max(50, confidence));

  return { rawScore: raw, score, confidence };
}

export function getSortedWeights(weights: number[]): { index: number; name: string; weight: number }[] {
  return weights
    .map((w, i) => ({ index: i, name: FEATURE_NAMES[i], weight: w }))
    .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));
}

export function computeDynamicThresholds(symbol: string): {
  confThreshold: number;
  scoreThreshold: number;
  aggressive: boolean;
} {
  const history = confHistory[symbol] ?? [];
  let aggressive = true; // Mode Aggressive aktif default
  if (history.length >= 4) {
    const twoHoursAgo = Math.max(0, history.length - 24);
    const recent = history.slice(twoHoursAgo);
    const belowThreshold = recent.filter((c) => c < 68).length;
    // tetap aggressive jika 70%+ scan di bawah 68%, ATAU selalu aggressive sampai confidence konsisten > 68%
    aggressive = belowThreshold >= recent.length * 0.7 || recent[recent.length - 1] < 68;
  }
  return {
    confThreshold: aggressive ? 55 : 68,
    scoreThreshold: aggressive ? 62 : 72,
    aggressive,
  };
}
