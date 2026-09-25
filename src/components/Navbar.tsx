import React, { useState } from 'react';
import {
  Building2,
  Search,
  Globe,
  LogOut,
  TrendingUp,
  DollarSign,
  Package,
  Layers,
  Users,
  Briefcase,
  ShoppingCart,
  BarChart3,
  Edit2
} from 'lucide-react';
import { Language } from '../types';
import { translations } from '../i18n/translations';
import { formatUZS } from '../utils/pricing';

export type ActiveTab = 'dashboard' | 'intake' | 'catalog' | 'sales' | 'clients' | 'orders' | 'reports';

interface Props {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  exchangeRate: number;
  onUpdateExchangeRate: (newRate: number) => void;
  onOpenSerialSearch: () => void;
  currentUser: string;
  onLogout: () => void;
}

export const Navbar: React.FC<Props> = ({
  activeTab,
  setActiveTab,
  language,
  setLanguage,
  exchangeRate,
  onUpdateExchangeRate,
  onOpenSerialSearch,
  currentUser,
  onLogout
}) => {
  const t = translations[language];
  const [isEditingRate, setIsEditingRate] = useState(false);
  const [rateInput, setRateInput] = useState(exchangeRate.toString());

  const handleSaveRate = () => {
    const val = parseFloat(rateInput);
    if (!isNaN(val) && val > 0) {
      onUpdateExchangeRate(val);
      setIsEditingRate(false);
    }
  };

  const navLinks: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: t.navDashboard, icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'intake', label: t.navIntake, icon: <Package className="w-4 h-4" /> },
    { id: 'catalog', label: t.navCatalog, icon: <Layers className="w-4 h-4" /> },
    { id: 'orders', label: t.navOrders, icon: <ShoppingCart className="w-4 h-4" /> },
    { id: 'clients', label: t.navClients, icon: <Users className="w-4 h-4" /> },
    { id: 'sales', label: t.navSales, icon: <Briefcase className="w-4 h-4" /> }
  ];

  return (
    <header className="bg-slate-950 border-b border-slate-800 sticky top-0 z-40">
      {/* Zone 1, 2, 3 Top Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16 gap-4">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-amber-500 rounded-lg flex items-center justify-center text-slate-950 font-black text-xl shadow-sm shadow-amber-500/20">
              S
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                Shohrent
                <span className="text-[11px] font-mono font-medium px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  WMS
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Zone 2: Navigation Links (Desktop) */}
        <nav className="hidden lg:flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = activeTab === link.id;
            return (
              <button
                key={link.id}
                onClick={() => setActiveTab(link.id)}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'
                }`}
              >
                {link.icon}
                <span>{link.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Actions (Search, Rate, Language, Profile) */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Global Serial Search Trigger */}
          <button
            onClick={onOpenSerialSearch}
            className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-300 transition-colors"
            title="Seriya raqamlari qidiruvi"
          >
            <Search className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline font-mono">SN qidiruv</span>
            <kbd className="hidden md:inline-block px-1.5 py-0.2 bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-400 font-mono">
              /
            </kbd>
          </button>

          {/* USD Exchange Rate Badge & Fast Editor */}
          <div className="relative flex items-center">
            {isEditingRate ? (
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-amber-500">
                <span className="text-xs text-slate-400 px-1">$1 =</span>
                <input
                  type="number"
                  value={rateInput}
                  onChange={(e) => setRateInput(e.target.value)}
                  className="w-20 bg-slate-950 text-xs px-1.5 py-0.5 rounded border border-slate-700 text-white font-mono"
                  autoFocus
                />
                <button
                  onClick={handleSaveRate}
                  className="px-2 py-0.5 text-[11px] bg-amber-500 text-slate-950 font-semibold rounded hover:bg-amber-400"
                >
                  OK
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsEditingRate(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs text-slate-300 transition-colors"
                title="Valyuta kursini o'zgartirish"
              >
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-mono tabular-nums text-slate-200">
                  1$ = {new Intl.NumberFormat('uz-UZ').format(exchangeRate)} so'm
                </span>
                <Edit2 className="w-3 h-3 text-slate-500 hover:text-amber-400 ml-0.5" />
              </button>
            )}
          </div>

          {/* Language Switcher Button */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => setLanguage('uz')}
              className={`px-2 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                language === 'uz'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              UZ
            </button>
            <button
              onClick={() => setLanguage('ru')}
              className={`px-2 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                language === 'ru'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              RU
            </button>
          </div>

          {/* User Account / Logout */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <div className="hidden sm:block text-right">
              <div className="text-xs font-semibold text-slate-200">{currentUser}</div>
              <div className="text-[10px] text-emerald-400">Toshkent bosh ombor</div>
            </div>
            <button
              onClick={onLogout}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition-colors"
              title={t.logout}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav Links Row */}
      <div className="lg:hidden border-t border-slate-900 bg-slate-950 px-4 py-2 flex items-center gap-2 overflow-x-auto">
        {navLinks.map((link) => {
          const isActive = activeTab === link.id;
          return (
            <button
              key={link.id}
              onClick={() => setActiveTab(link.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap ${
                isActive
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {link.icon}
              <span>{link.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
