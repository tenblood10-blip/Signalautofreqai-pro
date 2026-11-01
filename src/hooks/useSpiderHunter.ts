import { useEffect, useState } from 'react';

export interface SpiderScore {
  coin: string;
  score: number;
}

export interface SpiderBest {
  coin: string;
  score: number;
  allCoins: string[];
}

const SHOOT_SCORE = 85;
const HUNT_COUNT = 10;

export function useSpiderHunter(allScores: SpiderScore[]) {
  const [best, setBest] = useState<SpiderBest | null>(null);
  const [triggerShoot, setTriggerShoot] = useState(0);

  useEffect(() => {
    if (allScores.length === 0) return;
    const sorted = [...allScores].sort((a, b) => b.score - a.score);
    const top = sorted[0];
    setBest({
      coin: top.coin,
      score: top.score,
      allCoins: sorted.slice(0, HUNT_COUNT).map((s) => s.coin),
    });
    if (top.score >= SHOOT_SCORE) setTriggerShoot((c) => c + 1);
  }, [allScores]);

  return { best, triggerShoot };
}
