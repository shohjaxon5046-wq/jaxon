import React, { useState } from 'react';
import {
  PackagePlus,
  QrCode,
  Layers,
  Tag,
  Truck,
  ShoppingCart,
  Users,
  Briefcase,
  Search,
  DollarSign,
  LogOut,
  Edit2,
  Trash2,
  BarChart3,
  RefreshCw,
  Building2,
  Calculator,
  Shield,
  UserCheck,
  Percent
} from 'lucide-react';
import { Language, UserRole, StaffMember } from '../types';

export type ActiveNavTab =
  | 'dashboard'
  | 'calculator'
  | 'intake'
  | 'placement'
  | 'products'
  | 'price_catalog'
  | 'services'
  | 'orders'
  | 'clients'
  | 'sales'
  | 'suppliers'
  | 'staff'
  | 'commissions'
  | 'partners';

interface Props {
  activeTab: ActiveNavTab;
  setActiveTab: (tab: ActiveNavTab) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  exchangeRate: number;
  onUpdateExchangeRate: (rate: number) => void;
  onRefreshLiveRate?: () => void;
  isRateRefreshing?: boolean;
  onOpenSerialSearch: () => void;
  currentUser: string;
  userRole?: UserRole;
  currentStaff?: StaffMember | null;
  onSwitchRole?: (role: UserRole) => void;
  onLogout: () => void;
  pendingPlacementCount?: number;
  onClearAllData?: () => void;
}

export const Sidebar: React.FC<Props> = ({
  activeTab,
  setActiveTab,
  language,
  setLanguage,
  exchangeRate,
  onUpdateExchangeRate,
  onRefreshLiveRate,
  isRateRefreshing = false,
  onOpenSerialSearch,
  currentUser,
  userRole = 'admin',
  currentStaff,
  onSwitchRole,
  onLogout,
  pendingPlacementCount = 0,
  onClearAllData
}) => {
  const [isEditingRate, setIsEditingRate] = useState(false);
  const [rateInput, setRateInput] = useState(exchangeRate.toString());

  const handleSaveRate = () => {
    const val = parseFloat(rateInput);
    if (!isNaN(val) && val > 0) {
      onUpdateExchangeRate(val);
      setIsEditingRate(false);
    }
  };

  const navItems: {
    id: ActiveNavTab;
    labelUz: string;
    labelRu: string;
    icon: React.ReactNode;
    badge?: number;
  }[] = [
    {
      id: 'dashboard',
      labelUz: 'Boshqaruv paneli',
      labelRu: 'Панель управления',
      icon: <BarChart3 className="w-4 h-4" />
    },
    {
      id: 'calculator',
      labelUz: 'Kalkulyator (Arenda)',
      labelRu: 'Калькулятор (Аренда)',
      icon: <Calculator className="w-4 h-4" />
    },
    {
      id: 'orders',
      labelUz: 'Buyurtmalar',
      labelRu: 'Заказы',
      icon: <ShoppingCart className="w-4 h-4" />
    },
    {
      id: 'products',
      labelUz: 'Mahsulotlar',
      labelRu: 'Товары',
      icon: <Layers className="w-4 h-4" />
    },
    {
      id: 'price_catalog',
      labelUz: 'Narxlar ro‘yxati',
      labelRu: 'Прайс-лист (Цены)',
      icon: <Tag className="w-4 h-4" />
    },
    {
      id: 'clients',
      labelUz: 'Mijozlar',
      labelRu: 'Клиенты',
      icon: <Users className="w-4 h-4" />
    },
    {
      id: 'intake',
      labelUz: 'Kirim',
      labelRu: 'Приход (Кирим)',
      icon: <PackagePlus className="w-4 h-4" />
    },
    {
      id: 'placement',
      labelUz: 'Joylashtirish',
      labelRu: 'Размещение',
      icon: <QrCode className="w-4 h-4" />,
      badge: pendingPlacementCount > 0 ? pendingPlacementCount : undefined
    },
    {
      id: 'services',
      labelUz: 'Xizmatlar',
      labelRu: 'Услуги',
      icon: <Truck className="w-4 h-4" />
    },
    {
      id: 'suppliers',
      labelUz: 'Yetkazib beruvchilar',
      labelRu: 'Поставщики',
      icon: <Building2 className="w-4 h-4" />
    },
    {
      id: 'staff',
      labelUz: 'Personal (Xodimlar)',
      labelRu: 'Персонал (Сотрудники)',
      icon: <UserCheck className="w-4 h-4" />
    },
    {
      id: 'commissions',
      labelUz: 'Komissiya & Foyda',
      labelRu: 'Комиссии и Доход',
      icon: <Percent className="w-4 h-4" />
    },
    {
      id: 'partners',
      labelUz: 'Hamkorlar & Xizmatlar',
      labelRu: 'Партнёры (Услуги)',
      icon: <Truck className="w-4 h-4 text-emerald-600" />
    },
    {
      id: 'sales',
      labelUz: 'Sotuvchilar (Statistika)',
      labelRu: 'Продавцы (Статистика)',
      icon: <Briefcase className="w-4 h-4" />
    }
  ];

  const visibleNavItems = navItems.filter((item) => {
    // If staff permissions are present, follow granular RBAC
    if (currentStaff?.permissions) {
      if (currentStaff.role === 'admin') return true;
      const p = currentStaff.permissions;
      switch (item.id) {
        case 'dashboard':
          return !!p.canViewDashboard;
        case 'calculator':
          return !!p.canViewCalculator;
        case 'orders':
          return !!p.canManageOrders;
        case 'products':
          return !!p.canManageProducts;
        case 'price_catalog':
          return !!p.canViewPriceCatalog;
        case 'clients':
          return !!p.canManageClients;
        case 'intake':
          return !!p.canManageIntake;
        case 'placement':
          return !!p.canManagePlacement;
        case 'services':
          return !!p.canManageServices;
        case 'suppliers':
          return !!p.canManageSuppliers;
        case 'staff':
          return !!p.canManageStaff;
        case 'commissions':
          return !!p.canViewCommissions || currentStaff.role === 'seller';
        case 'partners':
          return !!p.canManagePartners;
        case 'sales':
          return !!p.canManageStaff || !!p.canViewFinancials;
        default:
          return false;
      }
    }

    if (userRole === 'seller') {
      // Seller has access to Calculator and personal Commissions module
      return item.id === 'calculator' || item.id === 'commissions';
    }
    return true; // Admin has full access
  });

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 h-screen sticky top-0 shadow-sm z-30">
      {/* Brand Header */}
      <div>
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-lg shadow-sm shadow-blue-500/30">
              S
            </div>
            <div>
              <div className="font-bold text-slate-900 tracking-tight text-base leading-tight">
                Shohrent
              </div>
              <div className="text-[10px] text-blue-600 font-medium tracking-wide uppercase">
                {userRole === 'seller' ? 'SOTUVCHI REJIMI' : 'WMS LOGISTICS'}
              </div>
            </div>
          </div>
        </div>

        {/* RBAC Role Status Badge */}
        <div className="px-3 pb-1">
          <div
            className={`p-2 rounded-xl border flex items-center justify-between text-[11px] ${
              userRole === 'seller'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-blue-50 border-blue-200 text-blue-900'
            }`}
          >
            <div className="flex items-center gap-1.5 font-bold">
              {userRole === 'seller' ? (
                <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              ) : (
                <Shield className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              )}
              <span>{userRole === 'seller' ? 'Sotuvchi (Cheklangan)' : 'Boshqaruvchi (Admin)'}</span>
            </div>
            {/* Only admin can preview/switch to seller view; sellers cannot elevate to admin */}
            {userRole === 'admin' && onSwitchRole && (
              <button
                type="button"
                onClick={() => onSwitchRole('seller')}
                className="px-2 py-0.5 bg-white border border-slate-200 hover:border-slate-300 rounded text-[10px] font-bold text-slate-700 hover:text-slate-900 shadow-2xs transition-colors cursor-pointer"
                title="Sotuvchi rejimini ko'rish"
              >
                Sotuvchi ko'rinishi
              </button>
            )}
          </div>
        </div>

        {/* Global Serial Search Trigger (Admin only) */}
        {userRole !== 'seller' && (
          <div className="p-3 pt-1">
            <button
              onClick={onOpenSerialSearch}
              className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-blue-50/70 border border-slate-200 hover:border-blue-300 rounded-xl text-xs text-slate-600 hover:text-blue-700 transition-all shadow-2xs group cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600" />
                <span className="font-medium">Tezkor seriya qidiruvi...</span>
              </div>
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white border border-slate-200 rounded text-slate-400 group-hover:text-blue-600 shadow-2xs">
                /
              </kbd>
            </button>
          </div>
        )}

        {/* Dedicated Seller Guidance Banner */}
        {userRole === 'seller' && (
          <div className="px-3 pt-2 pb-1">
            <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-900 leading-snug space-y-1">
              <div className="font-bold flex items-center gap-1 text-blue-800">
                <Calculator className="w-3.5 h-3.5 text-blue-600" />
                <span>Kassa va Kalkulyator</span>
              </div>
              <p className="text-[10px] text-blue-700">
                Ombordagi asbob yoki xizmatni tanlang, ijara narxini hisoblang va summani iBox'ga kiriting.
              </p>
            </div>
          </div>
        )}

        {/* Navigation Items List */}
        <nav className="px-3 space-y-1 mt-1 overflow-y-auto max-h-[calc(100vh-310px)]">
          {visibleNavItems.map((item) => {
            const isActive = activeTab === item.id;
            const isPlacement = item.id === 'placement';
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                    : isPlacement && item.badge
                    ? 'bg-amber-50/70 text-slate-800 border border-amber-200/80 hover:bg-amber-100/70'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={isActive ? 'text-white' : isPlacement ? 'text-amber-600' : 'text-slate-400'}>
                    {item.icon}
                  </span>
                  <span className={!isActive && isPlacement ? 'font-bold text-slate-900' : ''}>
                    {language === 'uz' ? item.labelUz : item.labelRu}
                  </span>
                </div>

                {item.badge && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                      isActive
                        ? 'bg-white text-blue-700'
                        : 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Controls */}
      <div className="p-3 border-t border-slate-200 space-y-2 bg-slate-50/50">
        {/* Exchange Rate Box (Admin full / Seller read-only) */}
        {userRole !== 'seller' ? (
          <div className="bg-white border border-slate-200 p-2.5 rounded-xl space-y-1 shadow-2xs">
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <div className="flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                <span className="font-semibold">USD / UZS kursi:</span>
              </div>

              {onRefreshLiveRate && (
                <button
                  onClick={onRefreshLiveRate}
                  disabled={isRateRefreshing}
                  className="p-1 hover:text-blue-600 text-slate-400 rounded transition-colors cursor-pointer"
                  title="Google / MB kursini qayta yangilash"
                >
                  <RefreshCw className={`w-3 h-3 ${isRateRefreshing ? 'animate-spin text-blue-600' : ''}`} />
                </button>
              )}
            </div>

            {isEditingRate ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  inputMode="numeric"
                  value={rateInput}
                  onChange={(e) => setRateInput(e.target.value)}
                  className="w-full px-1.5 py-0.5 text-xs bg-slate-50 border border-blue-400 rounded font-mono text-slate-900"
                  autoFocus
                />
                <button
                  onClick={handleSaveRate}
                  className="px-2 py-0.5 text-[10px] bg-blue-600 text-white rounded font-bold cursor-pointer"
                >
                  OK
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setIsEditingRate(true)}
                  className="font-mono text-xs font-bold text-slate-900 flex items-center gap-1 hover:text-blue-600 cursor-pointer"
                  title="Valyuta kursini tahrirlash"
                >
                  <span>{new Intl.NumberFormat('uz-UZ').format(exchangeRate)} so'm</span>
                  <Edit2 className="w-2.5 h-2.5 text-slate-400" />
                </button>
                <span className="text-[9px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 font-medium">
                  Google / MB
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white border border-slate-200 p-2 rounded-xl text-[10px] text-slate-600 flex items-center justify-between shadow-2xs">
            <span className="text-slate-500 font-medium">USD Kursi:</span>
            <span className="font-mono font-bold text-slate-900">
              {new Intl.NumberFormat('uz-UZ').format(exchangeRate)} so'm
            </span>
          </div>
        )}

        {/* Language & User session */}
        <div className="flex items-center justify-between gap-2">
          {/* Language Toggle */}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5">
            <button
              onClick={() => setLanguage('uz')}
              className={`px-2 py-0.5 text-[11px] font-bold rounded cursor-pointer ${
                language === 'uz'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              UZ
            </button>
            <button
              onClick={() => setLanguage('ru')}
              className={`px-2 py-0.5 text-[11px] font-bold rounded cursor-pointer ${
                language === 'ru'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              RU
            </button>
          </div>

          {/* Reset All Data (Clean Slate) Button - Admin only */}
          {userRole !== 'seller' && onClearAllData && (
            <button
              onClick={onClearAllData}
              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-white rounded transition-colors cursor-pointer"
              title="Barcha ma'lumotlarni tozalash (Toza boshlash)"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Logout */}
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition-colors font-medium cursor-pointer"
            title="Chiqish"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="text-[11px]">Chiqish</span>
          </button>
        </div>

        {/* Current Operator Badge */}
        <div className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] flex items-center justify-between">
          <div className="truncate text-slate-800 font-semibold">{currentUser}</div>
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Online" />
        </div>
      </div>
    </aside>
  );
};
