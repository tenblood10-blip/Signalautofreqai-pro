import type { FeatureWeight } from '../lib/types';
import { Card } from './ui';

interface FeatureWeightsProps {
  weights: FeatureWeight[];
  r2: number;
}

export default function FeatureWeights({ weights, r2 }: FeatureWeightsProps) {
  const maxAbs = Math.max(...weights.map((w) => Math.abs(w.weight)), 0.0001);

  return (
    <Card className="p-4 md:p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-300">15 Fitur AI Aktif</h3>
        <span className="text-sm font-bold text-blue-400 tabular-nums">
          R² = {r2.toFixed(2)}
        </span>
      </div>

      <div className="space-y-1.5">
        {weights.map((fw, i) => {
          const isPositive = fw.weight > 0;
          const barWidth = (Math.abs(fw.weight) / maxAbs) * 100;
          const barColor = isPositive ? 'bg-emerald-500' : 'bg-red-500';
          const textColor = isPositive ? 'text-emerald-400' : 'text-red-400';

          return (
            <div key={i} className="flex items-center gap-3">
              <span className="text-xs text-gray-400 w-24 md:w-28 shrink-0 truncate">{fw.name}</span>
              <div className="flex-1 h-5 bg-gray-800/50 rounded relative overflow-hidden">
                <div
                  className={`absolute top-0 bottom-0 left-1/2 ${barColor} transition-all duration-300`}
                  style={{ width: `${barWidth / 2}%` }}
                />
                <div className="absolute top-0 bottom-0 left-1/2 w-px bg-gray-600/50" />
              </div>
              <span className={`text-xs font-semibold tabular-nums w-20 text-right ${textColor}`}>
                {fw.weight >= 0 ? '+' : ''}{fw.weight.toFixed(4)}
              </span>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-[11px] text-gray-600 leading-relaxed">
        Bar menunjukkan bobot regresi tiap fitur. Hijau = pengaruh positif, merah = negatif.
      </p>
    </Card>
  );
}
