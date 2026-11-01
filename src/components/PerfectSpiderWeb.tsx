import { useEffect, useRef } from 'react';
import { Check, X, Minus, Lock } from 'lucide-react';
import type { AiVote, SpiderState } from '@/lib/aiVotes';

interface PerfectSpiderWebProps {
  votes: AiVote[];
  coins: string[];
  state: SpiderState;
}

const GREEN = '#02C076';
const GOLD = '#FCD535';
const RED = '#F84960';
const BG = '#0E0E10';

const STATE_LABEL: Record<SpiderState, { text: string; color: string }> = {
  scanning: { text: 'SCANNING', color: GOLD },
  locked: { text: 'ENTRY LOCKED', color: GREEN },
  blocked: { text: 'BLOCKED', color: RED },
};

function eyeColor(ok: boolean | null) {
  if (ok === true) return GREEN;
  if (ok === false) return RED;
  return '#4b5563';
}

function drawLock(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(x, y - 3, 4, Math.PI, 0);
  ctx.stroke();
  ctx.fillRect(x - 6, y - 1, 12, 9);
  ctx.restore();
}

function drawSpider(ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number, state: SpiderState, votes: AiVote[]) {
  const accent = STATE_LABEL[state].color;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';
  for (let k = 0; k < 4; k++) {
    const wig = Math.sin(t * 6 + k) * 2;
    for (const side of [-1, 1]) {
      const base = (k - 1.5) * 0.45;
      const ang = side < 0 ? Math.PI + base : -base;
      const bx = Math.cos(ang) * 9;
      const by = Math.sin(ang) * 9;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(Math.cos(ang) * 22 + wig, Math.sin(ang) * 16 + 6);
      ctx.stroke();
    }
  }
  ctx.fillStyle = BG;
  ctx.beginPath();
  ctx.ellipse(0, 5, 10, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, -5, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  const eyePos = [[-4, -8], [4, -8], [-6, -4], [6, -4], [-2, -9], [2, -9]];
  votes.slice(0, 6).forEach((v, i) => {
    const [ex, ey] = eyePos[i];
    ctx.fillStyle = eyeColor(v.ok);
    ctx.beginPath();
    ctx.arc(ex, ey, 1.6, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  coins: string[],
  state: SpiderState,
  votes: AiVote[],
) {
  const cx = w / 2;
  const cy = h / 2;
  const R = Math.min(w, h) * 0.42;

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.shadowColor = GOLD;
  ctx.shadowBlur = 18;
  ctx.strokeStyle = 'rgba(252,213,53,0.55)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(t * 0.4);
  ctx.setLineDash([6, 6]);
  ctx.strokeStyle = 'rgba(2,192,118,0.6)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.66, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  const pulse = 0.5 + 0.5 * Math.sin(t * 2.4);
  ctx.strokeStyle = `rgba(255,255,255,${(0.25 + 0.35 * pulse).toFixed(3)})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.33 * (0.96 + 0.06 * pulse), 0, Math.PI * 2);
  ctx.stroke();

  const n = coins.length;
  coins.forEach((coin, i) => {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / n;
    const nx = cx + Math.cos(a) * R;
    const ny = cy + Math.sin(a) * R;

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(nx, ny);
    ctx.stroke();

    const p = (t * 0.5 + i / n) % 1;
    const dx = nx + (cx - nx) * p;
    const dy = ny + (cy - ny) * p;
    ctx.fillStyle = `rgba(252,213,53,${(0.4 + 0.6 * (1 - p)).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(dx, dy, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#151A21';
    ctx.strokeStyle = 'rgba(252,213,53,0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(nx, ny, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#e5e7eb';
    ctx.font = '600 9px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(coin, nx, ny);
  });

  drawSpider(ctx, cx, cy, t, state, votes);

  if (state === 'locked') drawLock(ctx, w - 18, 18, GREEN);

  const label = STATE_LABEL[state];
  ctx.fillStyle = label.color;
  ctx.font = '700 10px ui-monospace, monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(label.text, 12, h - 12);
}

export default function PerfectSpiderWeb({ votes, coins, state }: PerfectSpiderWebProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const propsRef = useRef({ votes, coins, state });

  useEffect(() => {
    propsRef.current = { votes, coins, state };
  }, [votes, coins, state]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const start = performance.now();
    let frame = 0;
    const loop = (now: number) => {
      const rect = canvas.getBoundingClientRect();
      const p = propsRef.current;
      drawFrame(ctx, rect.width, rect.height, (now - start) / 1000, p.coins, p.state, p.votes);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, []);

  return (
    <div className="bg-[#0E0E10] border border-[#1E2329] rounded-2xl p-4 md:p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-300">Spider Web 6 AI</h3>
        <span className="text-[10px] font-mono text-gray-500">10 emiten</span>
      </div>

      <canvas ref={canvasRef} className="w-full h-[280px] md:h-[320px] rounded-xl" />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3">
        {votes.map((v) => {
          const Icon = v.ok === true ? Check : v.ok === false ? X : Minus;
          const color = v.ok === true ? 'text-[#02C076]' : v.ok === false ? 'text-[#F84960]' : 'text-gray-500';
          return (
            <div key={v.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#151A21] border border-[#1E2329]">
              <span className="text-[11px] text-gray-300 truncate">{v.label}</span>
              <span className={`flex items-center gap-1 text-[10px] font-bold ${color}`}>
                <Icon className="h-3 w-3" />
                {v.ok === true ? 'OK' : v.ok === false ? 'NO' : 'N/A'}
              </span>
            </div>
          );
        })}
      </div>

      {state === 'locked' && (
        <p className="flex items-center gap-1.5 mt-3 text-[11px] text-[#02C076] font-semibold">
          <Lock className="h-3 w-3" /> Semua 6 AI setuju. Sinyal beli terkunci.
        </p>
      )}
    </div>
  );
}
