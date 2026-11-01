import type { Candle, SignalResult } from './types';
import { computeIndicators } from './indicators';
import { computeFeatures, FEATURE_NAMES } from './features';
import { trainRegression, predictAndScore, getSortedWeights, computeDynamicThresholds, recordConfidence } from './regression';

export function generateSignal(candles: Candle[], symbol = 'BTCUSDT'): SignalResult | null {
  const ind = computeIndicators(candles);
  if (!ind) return null;
  if (candles.length < 50) return null;

  const { features, valid } = computeFeatures(candles);
  if (!valid || features.length < 10) return null;

  const lookback = Math.min(150, Math.max(20, features.length - 12));
  const trainStart = features.length - lookback - 12;
  if (trainStart < 0) return null;

  const trainFeatures: number[][] = [];
  const trainReturns: number[] = [];
  for (let i = trainStart; i < features.length - 12; i++) {
    trainFeatures.push(features[i]);
    const closeNow = candles[candles.length - features.length + i].close;
    const closeFuture = candles[candles.length - features.length + i + 12].close;
    trainReturns.push(closeNow !== 0 ? (closeFuture / closeNow) - 1 : 0);
  }

  const model = trainRegression(trainFeatures, trainReturns, symbol);
  if (!model) return null;

  const currentFeatures = features[features.length - 1];
  const { score, confidence } = predictAndScore(
    currentFeatures, model.weights, model.intercept, model.r2Smoothed, model.trainPredictions
  );
  recordConfidence(symbol, confidence);

  const sorted = getSortedWeights(model.weights);
  const featureWeights = sorted.map((s) => ({
    name: s.name,
    weight: s.weight,
    value: currentFeatures[s.index],
  }));

  const featVals = sorted.slice(0, 5).map((s) => {
    const v = currentFeatures[s.index];
    const val = s.name.includes('RSI') || s.name.includes('Stoch') || s.name.includes('ADX')
      ? (v * 100).toFixed(1)
      : (v >= 0 ? '+' : '') + v.toFixed(3);
    return `${s.name} ${val}`;
  }).join(' ');

  const ema12Feat = currentFeatures[0];
  const vwapFeat = currentFeatures[1];
  const ret1hFeat = currentFeatures[2];

  const thresholds = computeDynamicThresholds(symbol);

  let side: 'BUY' | 'SELL' | 'WAIT' = 'WAIT';
  const reasons: string[] = [];

  // Mode Aggressive: paksa BUY jika skor >= threshold dan conf >= threshold, abaikan konflik EMA12/VWAP/Ret1h
  const forceBuy = thresholds.aggressive && score > thresholds.scoreThreshold && confidence > thresholds.confThreshold;
  const forceSell = thresholds.aggressive && score < (100 - thresholds.scoreThreshold) && confidence > thresholds.confThreshold;

  if (forceBuy) {
    side = 'BUY';
    reasons.push(`BUY (AGGRESSIVE): Skor ${score} > ${thresholds.scoreThreshold}, Conf ${confidence}% > ${thresholds.confThreshold}% — konflik EMA12/VWAP/Ret1h diabaikan`);
    reasons.push(`Fitur: ${featVals} | R2=${model.r2Smoothed.toFixed(2)}`);
  } else if (score > thresholds.scoreThreshold && confidence > thresholds.confThreshold && ema12Feat > 0 && vwapFeat > 0 && ret1hFeat > 0) {
    side = 'BUY';
    reasons.push(`BUY: ${featVals} | R2=${model.r2Smoothed.toFixed(2)}`);
  } else if (forceSell) {
    side = 'SELL';
    reasons.push(`SELL (AGGRESSIVE): Skor ${score} < ${100 - thresholds.scoreThreshold}, Conf ${confidence}% > ${thresholds.confThreshold}% — konflik EMA12/VWAP/Ret1h diabaikan`);
    reasons.push(`Fitur: ${featVals} | R2=${model.r2Smoothed.toFixed(2)}`);
  } else if (score < (100 - thresholds.scoreThreshold) && confidence > thresholds.confThreshold && ema12Feat < 0 && vwapFeat < 0 && ret1hFeat < 0) {
    side = 'SELL';
    reasons.push(`SELL: ${featVals} | R2=${model.r2Smoothed.toFixed(2)}`);
  } else {
    side = 'WAIT';
    reasons.push(`TUNGGU: ${featVals} | R2=${model.r2Smoothed.toFixed(2)}`);
    if (score >= (100 - thresholds.scoreThreshold) && score <= thresholds.scoreThreshold) {
      reasons.push(`Skor ${score} di zona netral (${100 - thresholds.scoreThreshold}-${thresholds.scoreThreshold})`);
    } else if (score > thresholds.scoreThreshold && (ema12Feat <= 0 || vwapFeat <= 0 || ret1hFeat <= 0)) {
      reasons.push(`Skor ${score} tinggi tapi EMA12/VWAP/Ret1h konflik`);
    } else if (score < (100 - thresholds.scoreThreshold) && (ema12Feat >= 0 || vwapFeat >= 0 || ret1hFeat >= 0)) {
      reasons.push(`Skor ${score} rendah tapi EMA12/VWAP/Ret1h konflik`);
    }
  }

  const modeLabel = thresholds.aggressive ? ' | Mode Scalping 1m-15m LOCKED' : '';
  reasons.push(
    `Confidence ${confidence}% (R2=${model.r2Smoothed.toFixed(2)}${model.r2Smoothed < 0.05 ? ' learning' : ''}${modeLabel})`
  );

  return {
    side, score, confidence, reasons, indicators: ind,
    lastUpdate: Date.now(), r2: model.r2Smoothed, featureWeights, symbol,
    aggressive: thresholds.aggressive,
  };
}

export function getFeatureName(index: number): string {
  return FEATURE_NAMES[index] ?? `F${index}`;
}
