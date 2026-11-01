import { useEffect, useRef, useState } from 'react';
import { Bug, Volume2, VolumeX, Lock } from 'lucide-react';
import type { SpiderBest } from '@/hooks/useSpiderHunter';

interface SpiderHunterProps {
  best: SpiderBest | null;
  triggerShoot: number;
  tpPercent: number;
  slPercent: number;
}

interface Shot {
  coin: string;
  webPath: string;
}

const SHOT_MS = 3000;
const FALLBACK_COINS = ['BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'DOGE', 'PEPE', 'SHIB', 'ADA', 'AVAX'];
const SHOOT_SCORE = 85;

function playShootSound() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.32);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
    osc.onended = () => void ctx.close();
  } catch {
    // audio not supported or blocked
  }
}

export default function SpiderHunter({ best, triggerShoot, tpPercent, slPercent }: SpiderHunterProps) {
  const [shot, setShot] = useState<Shot | null>(null);
  const [angleOffset, setAngleOffset] = useState(0);
  const [soundOn, setSoundOn] = useState(true);
  const soundOnRef = useRef(soundOn);
  const lastShotRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { soundOnRef.current = soundOn; }, [soundOn]);

  useEffect(() => {
    let frame = 0;
    const animate = () => {
      setAngleOffset((prev) => (prev + 1.2) % 360);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!best || triggerShoot === 0 || triggerShoot === lastShotRef.current || best.score < SHOOT_SCORE) return;
    lastShotRef.current = triggerShoot;
    const slY = 80 + Math.random() * 15;
    const tpY = 15 + Math.random() * 10;
    setShot({ coin: best.coin, webPath: `M 150 75 Q 90 ${tpY} 40 20 Q 210 ${slY} 260 110` });
    if (soundOnRef.current) playShootSound();
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setShot(null), SHOT_MS);
  }, [best, triggerShoot]);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const coins = best && best.allCoins.length > 0 ? best.allCoins.slice(0, 10) : FALLBACK_COINS;
  const step = 360 / coins.length;
  const score = best?.score ?? 0;
  const ready = score >= SHOOT_SCORE;

  return (
    <div className="bg-[#0B0E11] border-2 border-[#FCD535]/30 rounded-2xl p-4 relative overflow-hidden shadow-[0_0_30px_rgba(252,213,53,0.15)]">
      <div className="flex justify-between items-center gap-2 relative z-10">
        <div className="flex items-center gap-2 min-w-0">
          <Bug className="h-4 w-4 text-[#FCD535] shrink-0" />
          <p className="text-[12px] font-black text-[#FCD535] tracking-[0.2em] truncate">15T SPIDER HUNTER</p>
          <span className="text-[8px] bg-[#FCD535] text-black px-1.5 py-0.5 rounded font-black shrink-0">LOCKED</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <p className="hidden sm:block text-[9px] font-mono text-gray-500 border border-[#1E2329] px-2 py-0.5 rounded">JARING AUTO SL/TP</p>
          <button
            type="button"
            onClick={() => setSoundOn((v) => !v)}
            aria-label={soundOn ? 'Matikan suara' : 'Nyalakan suara'}
            className="p-1 rounded-md border border-[#1E2329] text-gray-400 hover:text-[#FCD535] transition-colors"
          >
            {soundOn ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      <svg viewBox="0 0 300 150" className="w-full h-auto mt-2 relative z-10">
        <g opacity="0.25" stroke="#FCD535" strokeWidth="0.6">
          {Array.from({ length: 10 }).map((_, i) => {
            const a = (i * 36 * Math.PI) / 180;
            return <line key={i} x1="150" y1="75" x2={150 + Math.cos(a) * 120} y2={75 + Math.sin(a) * 70} />;
          })}
          <circle cx="150" cy="75" r="22" fill="none" strokeDasharray="3 3" />
          <circle cx="150" cy="75" r="42" fill="none" strokeWidth="0.8" />
          <circle cx="150" cy="75" r="65" fill="none" strokeWidth="1" opacity="0.5" />
        </g>

        {coins.map((c, i) => {
          const rad = ((angleOffset + i * step) % 360) * (Math.PI / 180);
          const x = 150 + 92 * Math.cos(rad);
          const y = 75 + 52 * Math.sin(rad);
          const isTarget = shot?.coin === c;
          return (
            <g key={c}>
              <circle
                cx={x}
                cy={y}
                r={isTarget ? 11 : 7}
                fill="#1E2329"
                stroke={isTarget ? '#FCD535' : '#2B3139'}
                strokeWidth={isTarget ? 2 : 1.2}
                className={isTarget ? 'animate-ping' : 'animate-pulse'}
              />
              <text x={x} y={y + 1.5} textAnchor="middle" fontSize={isTarget ? 7 : 6} fontWeight="900" fill={isTarget ? '#FCD535' : '#aaa'}>{c}</text>
            </g>
          );
        })}

        <g transform="translate(150,75)">
          <g className={shot ? 'animate-[wiggle_0.1s_ease-in-out_infinite]' : 'animate-[wiggle_0.25s_ease-in-out_infinite]'}>
            <line x1="-14" y1="-9" x2="-24" y2="-18" stroke="#FCD535" strokeWidth="2.2" strokeLinecap="round" />
            <line x1="14" y1="-9" x2="24" y2="-18" stroke="#FCD535" strokeWidth="2.2" strokeLinecap="round" />
            <line x1="-14" y1="9" x2="-24" y2="18" stroke="#FCD535" strokeWidth="2.2" strokeLinecap="round" />
            <line x1="14" y1="9" x2="24" y2="18" stroke="#FCD535" strokeWidth="2.2" strokeLinecap="round" />
            <line x1="-8" y1="-12" x2="-12" y2="-22" stroke="#FCD535" strokeWidth="1.5" opacity="0.7" />
            <line x1="8" y1="-12" x2="12" y2="-22" stroke="#FCD535" strokeWidth="1.5" opacity="0.7" />
          </g>
          <circle cx="0" cy="0" r="13" fill="#0B0E11" stroke="#FCD535" strokeWidth="2.5" />
          <circle cx="-3.5" cy="-2.5" r="2.2" fill="#fff" />
          <circle cx="3.5" cy="-2.5" r="2.2" fill="#fff" />
          <circle cx="-3.5" cy="-2.5" r="1" fill="#000" />
          <circle cx="3.5" cy="-2.5" r="1" fill="#000" />
          {shot && <circle cx="0" cy="0" r="18" fill="none" stroke="#02C076" strokeWidth="2" className="animate-ping" />}
        </g>

        {shot && (
          <>
            <path d={shot.webPath} stroke="#fff" strokeWidth="2.5" fill="none" strokeDasharray="6 4" opacity="0.9">
              <animate attributeName="stroke-dashoffset" from="0" to="-24" dur="0.25s" repeatCount="indefinite" />
            </path>
            <path d={shot.webPath} stroke="#FCD535" strokeWidth="0.8" fill="none" opacity="0.4" />
            <g>
              <rect x="8" y="8" width="84" height="20" rx="6" fill="#02C076" stroke="#fff" strokeWidth="0.5" />
              <text x="50" y="21" textAnchor="middle" fontSize="9" fontWeight="900" fill="#fff">TP +{tpPercent.toFixed(2)}%</text>
              <rect x="208" y="112" width="84" height="20" rx="6" fill="#F84960" stroke="#fff" strokeWidth="0.5" />
              <text x="250" y="125" textAnchor="middle" fontSize="9" fontWeight="900" fill="#fff">SL -{slPercent.toFixed(2)}%</text>
            </g>
            <g>
              <rect x="85" y="2" width="130" height="18" rx="9" fill="#0B0E11" stroke="#02C076" strokeWidth="1.5" />
              <text x="150" y="14" textAnchor="middle" fontSize="10" fontWeight="900" fill="#02C076">{shot.coin} LOCKED</text>
            </g>
          </>
        )}
      </svg>

      <div className="flex gap-2 mt-1 relative z-10">
        <div className="flex-1 min-w-0 bg-[#151A21] border border-[#1E2329] rounded-xl p-2.5 flex justify-between items-center gap-2">
          <div className="min-w-0">
            <p className="text-[8px] text-gray-500 tracking-widest">JARING STATUS</p>
            <p className="text-[11px] font-bold text-white font-mono flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full shrink-0 ${shot ? 'bg-[#02C076] animate-ping' : 'bg-[#FCD535] animate-pulse'}`} />
              <span className="truncate">{shot ? `MENEMBAK ${shot.coin}` : `HUNTING ${coins.length} EMITEN...`}</span>
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[8px] text-gray-500 flex items-center justify-end gap-1"><Lock className="h-2.5 w-2.5" />LOCKED</p>
            <p className="text-[10px] font-black text-[#02C076]">SL/TP AUTO</p>
          </div>
        </div>
        <div className="bg-[#FCD535] rounded-xl p-2.5 px-4 text-black min-w-[70px] text-center border-2 border-yellow-300">
          <p className="text-[8px] font-black tracking-widest">SCORE</p>
          <p className="text-[18px] font-black leading-none mt-0.5">{score}</p>
          <p className="text-[8px] font-bold">{ready ? 'READY SHOOT' : 'SCANNING'}</p>
        </div>
      </div>

      <p className="mt-2 text-[9px] text-gray-600 relative z-10">Sinyal ditampilkan dari skor AI. Bukan jaminan profit.</p>

      <style>{`
        @keyframes wiggle { 0%,100%{transform:rotate(-4deg)} 50%{transform:rotate(4deg)} }
      `}</style>
    </div>
  );
}
