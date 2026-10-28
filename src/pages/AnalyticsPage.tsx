import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { TrendingUp, TrendingDown, Award, Target, DollarSign } from 'lucide-react';
import type { TradeRecord, EquityPoint } from '../lib/types';
import { Card, DualPrice } from '../components/ui';

interface AnalyticsProps {
  trades: TradeRecord[];
  equity: EquityPoint[];
  initialCapital: number;
  rate: number;
  showIDR: boolean;
}

export default function AnalyticsPage({ trades, equity, initialCapital, rate, showIDR }: AnalyticsProps) {
  const wins = trades.filter((t) => t.status === 'WIN');
  const losses = trades.filter((t) => t.status === 'LOSS');
  const open = trades.filter((t) => t.status === 'OPEN');
  const closed = [...wins, ...losses];
  const totalPnL = closed.reduce((a, t) => a + (t.pnl ?? 0), 0);
  const winrate = closed.length > 0 ? (wins.length / closed.length) * 100 : 0;

  const avgWin = wins.length > 0 ? wins.reduce((a, t) => a + (t.pnl ?? 0), 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? losses.reduce((a, t) => a + (t.pnl ?? 0), 0) / losses.length : 0;
  const profitFactor = avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : 0;

  const currentEquity = equity.length > 0 ? equity[equity.length - 1].equity : initialCapital;
  const totalReturn = initialCapital > 0 ? ((currentEquity - initialCapital) / initialCapital) * 100 : 0;

  const equityData = equity.slice(-50).map((e) => ({
    time: new Date(e.time).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
    equity: e.equity,
  }));

  const pieData = [
    { name: 'WIN', value: wins.length, color: '#10b981' },
    { name: 'LOSS', value: losses.length, color: '#ef4444' },
    { name: 'OPEN', value: open.length, color: '#3b82f6' },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-white">Analitik</h2>
        <p className="text-sm text-gray-500">Performa & equity curve</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={DollarSign} label="Equity" tone={totalReturn >= 0 ? 'green' : 'red'} sub={`${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(1)}%`}>
          <DualPrice usd={currentEquity} rate={rate} showIDR={showIDR} className="text-lg md:text-xl" tone={totalReturn >= 0 ? 'green' : 'red'} />
        </StatCard>
        <StatCard icon={Award} label="Winrate" tone="blue" sub={`${wins.length}W / ${losses.length}L`}>
          <p className={`text-lg md:text-xl font-bold tabular-nums text-blue-400`}>{winrate.toFixed(1)}%</p>
        </StatCard>
        <StatCard icon={TrendingUp} label="Total PnL" tone={totalPnL >= 0 ? 'green' : 'red'} sub={`${closed.length} trade ditutup`}>
          <DualPrice usd={Math.abs(totalPnL)} rate={rate} showIDR={showIDR} prefix={totalPnL >= 0 ? '+' : '-'} tone={totalPnL >= 0 ? 'green' : 'red'} className="text-lg md:text-xl" />
        </StatCard>
        <StatCard icon={Target} label="Profit Factor" tone={profitFactor >= 1 ? 'green' : 'red'} sub={`Avg W/L`}>
          <p className={`text-lg md:text-xl font-bold tabular-nums ${profitFactor >= 1 ? 'text-emerald-400' : 'text-red-400'}`}>{profitFactor.toFixed(2)}</p>
          <div className="flex gap-2 mt-1">
            <span className="text-xs text-emerald-400 tabular-nums">W ${avgWin.toFixed(2)}</span>
            <span className="text-xs text-red-400 tabular-nums">L ${avgLoss.toFixed(2)}</span>
          </div>
        </StatCard>
      </div>

      {/* Equity curve */}
      <Card className="p-4 md:p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Equity Curve</h3>
        {equityData.length > 1 ? (
          <div className="h-64 md:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={equityData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <XAxis dataKey="time" tick={{ fill: '#6b7280', fontSize: 10 }} interval="preserveStartEnd" axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} width={70} tickFormatter={(v) => `$${Number(v).toFixed(0)}`} domain={['dataMin', 'dataMax']} />
                <Tooltip
                  contentStyle={{ background: '#0d1117', border: '1px solid #1f2937', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(v) => [`${Number(v).toFixed(2)}`, 'Equity']}
                />
                <Line type="monotone" dataKey="equity" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-600 text-sm">
            Belum ada data equity
          </div>
        )}
      </Card>

      {/* Win/Loss pie */}
      <Card className="p-4 md:p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Distribusi Hasil</h3>
        {pieData.length > 0 ? (
          <div className="h-56 md:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} dataKey="value">
                  {pieData.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#0d1117', border: '1px solid #1f2937', borderRadius: '8px', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '12px', color: '#9ca3af' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-56 flex items-center justify-center text-gray-600 text-sm">
            Belum ada data trade
          </div>
        )}
      </Card>
    </div>
  );
}

function StatCard({ icon: Icon, label, tone, sub, children }: {
  icon: typeof DollarSign;
  label: string;
  tone: 'green' | 'red' | 'blue';
  sub: string;
  children: React.ReactNode;
}) {
  const colors = { green: 'text-emerald-400', red: 'text-red-400', blue: 'text-blue-400' };
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`h-4 w-4 ${colors[tone]}`} />
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">{label}</span>
      </div>
      {children}
      <p className="text-xs text-gray-500 mt-1">{sub}</p>
    </Card>
  );
}
