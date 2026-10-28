interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`bg-[#0d1117] border border-gray-800/60 rounded-xl ${className}`}>
      {children}
    </div>
  );
}

interface StatBarProps {
  value: number;
  max: number;
  color: string;
  label?: string;
}

export function StatBar({ value, max, color, label }: StatBarProps) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div>
      {label && (
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>{label}</span>
          <span className="font-semibold text-gray-200">{value}/{max}</span>
        </div>
      )}
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

interface BadgeProps {
  children: React.ReactNode;
  color: 'green' | 'red' | 'amber' | 'blue' | 'gray';
}

const badgeColors: Record<BadgeProps['color'], string> = {
  green: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  red: 'bg-red-500/15 text-red-400 border-red-500/30',
  amber: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  blue: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  gray: 'bg-gray-700/30 text-gray-400 border-gray-700',
};

export function Badge({ children, color }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md border text-xs font-semibold ${badgeColors[color]}`}>
      {children}
    </span>
  );
}

interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}

export function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      {label && <span className="text-sm text-gray-300">{label}</span>}
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
          checked ? 'bg-blue-500' : 'bg-gray-700'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform duration-200 ${
            checked ? 'translate-x-5' : ''
          }`}
        />
      </button>
    </label>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className = '', ...props }: InputProps) {
  return (
    <div className="w-full">
      {label && <label className="block text-xs font-medium text-gray-400 mb-1.5">{label}</label>}
      <input
        className={`w-full px-3 py-2.5 bg-[#161b22] border border-gray-800 rounded-lg text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all ${className}`}
        {...props}
      />
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  children: React.ReactNode;
}

export function Select({ label, className = '', children, ...props }: SelectProps) {
  return (
    <div className="w-full">
      {label && <label className="block text-xs font-medium text-gray-400 mb-1.5">{label}</label>}
      <select
        className={`w-full px-3 py-2.5 bg-[#161b22] border border-gray-800 rounded-lg text-sm text-gray-100 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all ${className}`}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}

interface DualPriceProps {
  usd: number;
  rate: number;
  showIDR: boolean;
  className?: string;
  idrClassName?: string;
  tone?: 'default' | 'green' | 'red';
  prefix?: string;
}

export function DualPrice({ usd, rate, showIDR, className = '', idrClassName = '', tone = 'default', prefix = '' }: DualPriceProps) {
  const toneClass = tone === 'green' ? 'text-emerald-400' : tone === 'red' ? 'text-red-400' : 'text-white';
  const idr = usd * rate;
  return (
    <div className={className}>
      <span className={`font-bold tabular-nums ${toneClass}`}>
        {prefix}${usd.toFixed(2)}
      </span>
      {showIDR && (
        <span className={`block text-xs text-gray-500 tabular-nums ${idrClassName}`}>
          &asymp; Rp {idr.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
        </span>
      )}
    </div>
  );
}
