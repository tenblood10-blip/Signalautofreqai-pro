import { useState, type ReactNode } from 'react';
import {
  LayoutDashboard,
  History,
  Settings as SettingsIcon,
  BarChart3,
  Activity,
  Menu,
  X,
  Zap,
} from 'lucide-react';
import type { PageId, TradeMode } from '../lib/types';

interface LayoutProps {
  current: PageId;
  onNavigate: (p: PageId) => void;
  mode: TradeMode;
  children: ReactNode;
}

const navItems: { id: PageId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'history', label: 'Riwayat', icon: History },
  { id: 'analytics', label: 'Analitik', icon: BarChart3 },
  { id: 'settings', label: 'Pengaturan', icon: SettingsIcon },
];

const modeColors: Record<TradeMode, string> = {
  simulasi: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  semi: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  real: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const modeLabels: Record<TradeMode, string> = {
  simulasi: 'SIMULASI',
  semi: 'SEMI',
  real: 'REAL',
};

export default function Layout({ current, onNavigate, mode, children }: LayoutProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleNav = (p: PageId) => {
    onNavigate(p);
    setDrawerOpen(false);
  };

  const Sidebar = (
    <div className="flex h-full flex-col bg-[#0d1117] border-r border-gray-800/60">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-800/60">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 shadow-lg shadow-blue-500/20">
          <Zap className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight">FreqAI Pro</h1>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest">BTC Signal Engine</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = current === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                active
                  ? 'bg-blue-500/15 text-blue-400'
                  : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? 'text-blue-400' : ''}`} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-gray-800/60">
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold ${modeColors[mode]}`}>
          <Activity className="h-4 w-4" />
          Mode {modeLabels[mode]}
        </div>
        <p className="mt-3 px-3 text-[10px] text-gray-600 leading-relaxed">
          Bukan nasihat keuangan. Trading berisiko.
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0e14] text-gray-100">
      {/* Desktop sidebar */}
      <aside className="hidden md:block fixed inset-y-0 left-0 w-64 z-30">
        {Sidebar}
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="md:hidden fixed inset-y-0 left-0 w-72 z-50 animate-in slide-in-from-left duration-200">
            {Sidebar}
            <button
              onClick={() => setDrawerOpen(false)}
              className="absolute top-4 right-3 text-gray-500 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </aside>
        </>
      )}

      {/* Mobile header */}
      <header className="md:hidden sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-[#0d1117] border-b border-gray-800/60">
        <button
          onClick={() => setDrawerOpen(true)}
          className="text-gray-400 hover:text-white"
        >
          <Menu className="h-6 w-6" />
        </button>
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-blue-400" />
          <span className="font-bold text-white">FreqAI Pro</span>
        </div>
        <div className={`px-2 py-1 rounded border text-[10px] font-bold ${modeColors[mode]}`}>
          {modeLabels[mode]}
        </div>
      </header>

      {/* Main content */}
      <main className="md:pl-64 min-h-screen">
        <div className="px-4 md:px-8 py-4 md:py-8 max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
