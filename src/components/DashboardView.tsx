import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Package,
  ShoppingCart,
  Layers,
  Users,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Truck,
  Building,
  FileSpreadsheet,
  Plus,
  QrCode,
  Calendar,
  DollarSign,
  Building2,
  Briefcase,
  Award,
  ArrowDownRight,
  PieChart,
  BarChart,
  BarChart3,
  Percent,
  RefreshCw,
  Wallet
} from 'lucide-react';
import { Language, Order, Product, IntakeRecord, Client, Salesperson, Supplier } from '../types';
import { translations } from '../i18n/translations';
import { formatUZS } from '../utils/pricing';
import { exportOrdersToExcel, exportProductsWithSerials } from '../utils/excel';

interface Props {
  language: Language;
  products: Product[];
  orders: Order[];
  intakeRecords: IntakeRecord[];
  clients: Client[];
  salespersons: Salesperson[];
  suppliers?: Supplier[];
  onNavigateTab: (tab: any) => void;
  onOpenNewOrder: () => void;
  onOpenNewIntake: () => void;
  onOpenSerialSearch: () => void;
  onViewOrderDetails: (order: Order) => void;
}

type AnalyticsSubTab = 'overview' | 'suppliers' | 'managers' | 'inventory';

export const DashboardView: React.FC<Props> = ({
  language,
  products,
  orders,
  intakeRecords,
  clients,
  salespersons,
  suppliers = [],
  onNavigateTab,
  onOpenNewOrder,
  onOpenNewIntake,
  onOpenSerialSearch,
  onViewOrderDetails
}) => {
  const t = translations[language];
  const [activeSubTab, setActiveSubTab] = useState<AnalyticsSubTab>('overview');

  // ==========================================
  // 1. GLOBAL CALCULATIONS & METRICS
  // ==========================================
  const totalSerials = useMemo(() => products.reduce((acc, p) => acc + p.serials.length, 0), [products]);
  const rentedSerials = useMemo(
    () => products.reduce((acc, p) => acc + p.serials.filter((s) => s.status === 'rented').length, 0),
    [products]
  );
  const availableSerials = useMemo(
    () => products.reduce((acc, p) => acc + p.serials.filter((s) => s.status === 'available').length, 0),
    [products]
  );
  const maintenanceSerials = useMemo(
    () => products.reduce((acc, p) => acc + p.serials.filter((s) => s.status === 'maintenance').length, 0),
    [products]
  );

  const utilizationRate = totalSerials > 0 ? Math.round((rentedSerials / totalSerials) * 100) : 0;

  const activeOrders = useMemo(
    () => orders.filter((o) => o.status === 'active' || o.status === 'returning_today'),
    [orders]
  );
  const totalRevenueUZS = useMemo(() => orders.reduce((sum, o) => sum + o.grandTotalUZS, 0), [orders]);
  const totalPaidUZS = useMemo(() => orders.reduce((sum, o) => sum + o.paidAmountUZS, 0), [orders]);
  const totalClientDebtUZS = useMemo(() => orders.reduce((sum, o) => sum + o.remainingAmountUZS, 0), [orders]);

  // ==========================================
  // 2. PURCHASES & SUPPLIER BALANCE ANALYTICS
  // ==========================================
  const activeIntakeRecords = useMemo(
    () => intakeRecords.filter((r) => r.status !== 'deleted'),
    [intakeRecords]
  );

  const totalPurchasesUZS = useMemo(
    () => activeIntakeRecords.reduce((sum, r) => sum + (r.totalAmountUZS || 0), 0),
    [activeIntakeRecords]
  );

  const totalPurchasesUSD = useMemo(
    () => activeIntakeRecords.reduce((sum, r) => sum + (r.totalAmountUSD || 0), 0),
    [activeIntakeRecords]
  );

  // Supplier balances calculation
  const supplierAnalytics = useMemo(() => {
    return suppliers.map((sup) => {
      const supIntakes = activeIntakeRecords.filter(
        (r) => r.supplier.toLowerCase().trim() === sup.name.toLowerCase().trim()
      );
      const totalBilledUZS = supIntakes.reduce((sum, r) => sum + (r.totalAmountUZS || 0), 0);
      const totalPaidUZS = sup.transactions
        ?.filter((tx) => tx.type === 'payment')
        .reduce((sum, tx) => sum + (tx.amountUZS || 0), 0) || 0;
      
      const balanceUZS = sup.balanceUZS ?? totalBilledUZS - totalPaidUZS;

      return {
        id: sup.id,
        name: sup.name,
        contactPerson: sup.contactPerson,
        phone: sup.phone,
        intakesCount: supIntakes.length,
        totalBilledUZS,
        totalPaidUZS,
        balanceUZS,
        hasDebt: balanceUZS > 0
      };
    }).sort((a, b) => b.balanceUZS - a.balanceUZS);
  }, [suppliers, activeIntakeRecords]);

  const totalSupplierDebtUZS = useMemo(
    () => supplierAnalytics.reduce((sum, s) => sum + Math.max(0, s.balanceUZS), 0),
    [supplierAnalytics]
  );

  const totalPaidToSuppliersUZS = useMemo(
    () => supplierAnalytics.reduce((sum, s) => sum + s.totalPaidUZS, 0),
    [supplierAnalytics]
  );

  // ==========================================
  // 3. MANAGER PERFORMANCE & COMMISSIONS
  // ==========================================
  const managerAnalytics = useMemo(() => {
    return salespersons.map((sp) => {
      // Find orders attributed to this salesperson
      const spOrders = orders.filter(
        (o) =>
          o.salespersonId === sp.id ||
          o.salespersonName?.toLowerCase().includes(sp.fullName.toLowerCase())
      );
      const dealsCount = spOrders.length;
      const spRevenueUZS = spOrders.reduce((sum, o) => sum + o.grandTotalUZS, 0);
      const spPaidRevenueUZS = spOrders.reduce((sum, o) => sum + o.paidAmountUZS, 0);
      const commissionRate = sp.commissionRatePercent || 5; // default 5%
      const earnedCommissionUZS = Math.round((spRevenueUZS * commissionRate) / 100);
      const avgCheckUZS = dealsCount > 0 ? Math.round(spRevenueUZS / dealsCount) : 0;

      return {
        id: sp.id,
        fullName: sp.fullName,
        role: sp.role,
        avatar: sp.avatar,
        dealsCount,
        revenueUZS: spRevenueUZS,
        paidRevenueUZS: spPaidRevenueUZS,
        commissionRate,
        earnedCommissionUZS,
        avgCheckUZS
      };
    }).sort((a, b) => b.revenueUZS - a.revenueUZS);
  }, [salespersons, orders]);

  const totalCommissionsEarnedUZS = useMemo(
    () => managerAnalytics.reduce((sum, m) => sum + m.earnedCommissionUZS, 0),
    [managerAnalytics]
  );

  // ==========================================
  // 4. INVENTORY & STOCK MOVEMENT ANALYTICS
  // ==========================================
  const topRentedProducts = useMemo(() => {
    return products
      .map((p) => {
        const rentedCount = p.serials.filter((s) => s.status === 'rented').length;
        const totalCount = p.serials.length;
        const rate = totalCount > 0 ? Math.round((rentedCount / totalCount) * 100) : 0;
        return {
          ...p,
          rentedCount,
          totalCount,
          rate
        };
      })
      .sort((a, b) => b.rentedCount - a.rentedCount)
      .slice(0, 6);
  }, [products]);

  return (
    <div className="space-y-6">
      {/* Top Welcome Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-1.5 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
            <span>Toshkent Bosh Ombori · Jonli Tizim</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Shohrent Boshqaruv va Tahlil Markazi
          </h1>
          <p className="text-xs text-slate-600 leading-relaxed">
            Qurilish uskunalarini ijaraga berish, yetkazib beruvchilar hisobi, menejerlar samaradorligi va ombor aylanmasi ko‘rsatkichlari.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => onNavigateTab('calculator')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 text-xs font-bold rounded-xl border border-indigo-300 transition-colors"
          >
            <Percent className="w-4 h-4 text-indigo-600" />
            <span>Kalkulyator (iBox)</span>
          </button>

          <button
            onClick={onOpenNewIntake}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 transition-colors"
          >
            <Package className="w-4 h-4 text-blue-600" />
            <span>+ Yangi Kirim</span>
          </button>

          <button
            onClick={() => onNavigateTab('placement')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold rounded-xl border border-amber-300 transition-colors"
          >
            <QrCode className="w-4 h-4 text-amber-600" />
            <span>Razmeshenie</span>
          </button>

          <button
            onClick={onOpenNewOrder}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm shadow-blue-500/20 transition-colors"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>+ Yangi Buyurtma</span>
          </button>
        </div>
      </div>

      {/* Sub-tab analytics navigation */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveSubTab('overview')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
            activeSubTab === 'overview'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Umumiy Ko‘rsatkichlar</span>
        </button>

        <button
          onClick={() => setActiveSubTab('suppliers')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
            activeSubTab === 'suppliers'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Kirimlar va Ta'minotchilar Qarzi</span>
        </button>

        <button
          onClick={() => setActiveSubTab('managers')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
            activeSubTab === 'managers'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>Menejerlar Natijadorligi</span>
        </button>

        <button
          onClick={() => setActiveSubTab('inventory')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
            activeSubTab === 'inventory'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Ombor va Ijara Harakati</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* 1. OVERVIEW TAB */}
      {/* ========================================================= */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Top 4 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Jami Savdo */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Jami Savdo (Ijara)</span>
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl font-black text-slate-900 font-mono">
                {formatUZS(totalRevenueUZS)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                <span>Olingan kassa: <strong className="text-emerald-700 font-mono">{formatUZS(totalPaidUZS)}</strong></span>
              </div>
            </div>

            {/* Card 2: Mijozlar Qarzi */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Mijozlar Qarzdorligi</span>
                <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                  <AlertCircle className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl font-black text-rose-700 font-mono">
                {formatUZS(totalClientDebtUZS)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Kassaga to‘lanishi kerak bo‘lgan qoldiq
              </div>
            </div>

            {/* Card 3: Ta'minotchilarga qarz */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Ta'minotchilardan Qarz</span>
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                  <Building2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl font-black text-amber-800 font-mono">
                {formatUZS(totalSupplierDebtUZS)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Kirim qilingan tovarlar bo‘yicha to‘lanmagan
              </div>
            </div>

            {/* Card 4: Uskunalar bandligi */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Uskunalar Bandligi</span>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <Percent className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl font-black text-slate-900 font-mono">
                {utilizationRate}% <span className="text-xs font-normal text-slate-500">band</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Ijarada: <strong className="text-blue-700 font-mono">{rentedSerials}</strong> / {totalSerials} dona
              </div>
            </div>
          </div>

          {/* Quick Access & Recent Active Orders */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left: Active Orders list */}
            <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Faol Obyektdagi Buyurtmalar</h2>
                  <p className="text-xs text-slate-500">Hozirda mijozlar qo‘lida bo‘lgan ijaralar</p>
                </div>
                <button
                  onClick={() => onNavigateTab('orders')}
                  className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Barchasini ko‘rish</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {activeOrders.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl text-slate-500 text-xs">
                  Hozircha faol buyurtmalar yo‘q. Yangi buyurtma yaratish orqali boshlang.
                </div>
              ) : (
                <div className="space-y-2 text-xs">
                  {activeOrders.slice(0, 5).map((ord) => (
                    <div
                      key={ord.id}
                      onClick={() => onViewOrderDetails(ord)}
                      className="p-3 bg-slate-50 hover:bg-blue-50/60 border border-slate-200 rounded-xl transition-colors cursor-pointer flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-blue-700">{ord.id}</span>
                          <span className="font-bold text-slate-900">{ord.clientName}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {ord.tools.length} ta asbob · {ord.deliveryAddress}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-mono font-bold text-slate-900">{formatUZS(ord.grandTotalUZS)}</div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold">
                          Obyektda
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Quick actions & Excel export */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
                <h2 className="text-sm font-bold text-slate-900">Tezkor Amallar va Eksport</h2>
                <div className="space-y-2 text-xs">
                  <button
                    onClick={onOpenSerialSearch}
                    className="w-full p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-800 font-semibold flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <span>Seriya raqamini qidirish (SN)</span>
                    <QrCode className="w-4 h-4 text-blue-600" />
                  </button>

                  <button
                    onClick={() => exportProductsWithSerials(products)}
                    className="w-full p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-800 font-semibold flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <span>Seriyalar ro‘yxatini Excelga olish</span>
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  </button>

                  <button
                    onClick={() => exportOrdersToExcel(orders)}
                    className="w-full p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-800 font-semibold flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <span>Buyurtmalar hisobotini Excelga olish</span>
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  </button>
                </div>
              </div>

              <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-4 text-xs text-slate-700 space-y-1">
                <div className="font-bold text-blue-900">Tizim holati: Shohrent WMS</div>
                <p className="text-[11px] text-slate-600">
                  Kirim, Razmesheniya, Yangi Arenda Kalkulyatori va iBox to‘lov integratsiyasi faol holatda.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. PURCHASES & SUPPLIER BALANCE ANALYTICS TAB */}
      {/* ========================================================= */}
      {activeSubTab === 'suppliers' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Jami Kirimlar Qiymati
              </div>
              <div className="text-2xl font-black text-slate-900 font-mono">
                {formatUZS(totalPurchasesUZS)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Jami {activeIntakeRecords.length} ta kirim hujjati
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Yetkazib Beruvchilarga To‘langan
              </div>
              <div className="text-2xl font-black text-emerald-700 font-mono">
                {formatUZS(totalPaidToSuppliersUZS)}
              </div>
              <div className="text-[11px] text-emerald-600 mt-1">
                To‘lov o‘tkazilgan summasi
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Qolgan Qarzdorlik (Kreditor)
              </div>
              <div className="text-2xl font-black text-amber-700 font-mono">
                {formatUZS(totalSupplierDebtUZS)}
              </div>
              <div className="text-[11px] text-amber-600 mt-1">
                Yetkazib beruvchilarga to‘lanishi kerak
              </div>
            </div>
          </div>

          {/* Supplier Balances Table */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Yetkazib Beruvchilar va Balans Hisoboti
                </h3>
                <p className="text-xs text-slate-500">
                  Har bir ta'minotchi bo‘yicha qabul qilingan tovarlar va to‘lanmagan qarz miqdori
                </p>
              </div>
              <button
                onClick={() => onNavigateTab('suppliers')}
                className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>To‘liq Yetkazib Beruvchilar Bo‘limi</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Yetkazib Beruvchi</th>
                    <th className="py-2.5 px-3">Telefon / Kontakt</th>
                    <th className="py-2.5 px-3 text-center">Kirimlar</th>
                    <th className="py-2.5 px-3 text-right">Jami Kirim (UZS)</th>
                    <th className="py-2.5 px-3 text-right">To‘langan (UZS)</th>
                    <th className="py-2.5 px-4 text-right">Qarz Balansi (UZS)</th>
                    <th className="py-2.5 px-3 text-center">Holat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {supplierAnalytics.map((sup) => (
                    <tr key={sup.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {sup.name}
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {sup.phone || '—'}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-700">
                        {sup.intakesCount} ta
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                        {formatUZS(sup.totalBilledUZS)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-emerald-700 font-bold">
                        {formatUZS(sup.totalPaidUZS)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-extrabold text-amber-800">
                        {formatUZS(sup.balanceUZS)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {sup.balanceUZS > 0 ? (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold text-[10px] rounded-full">
                            Qarz bor
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-full">
                            Hisob-kitob qilingan
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {supplierAnalytics.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-400">
                        Yetkazib beruvchilar mavjud emas
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. MANAGER PERFORMANCE & COMMISSION TAB */}
      {/* ========================================================= */}
      {activeSubTab === 'managers' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Jami Menejerlar
              </div>
              <div className="text-2xl font-black text-slate-900 font-mono">
                {salespersons.length} nafar
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Faol savdo va ijara xodimlari
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Jami Yopilgan Bitimlar
              </div>
              <div className="text-2xl font-black text-blue-700 font-mono">
                {orders.length} ta
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Barcha buyurtmalar soni
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Hisoblangan Bonus / Komissiya
              </div>
              <div className="text-2xl font-black text-emerald-700 font-mono">
                {formatUZS(totalCommissionsEarnedUZS)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Sotuvchilarga to‘lanadigan mukofot puli
              </div>
            </div>
          </div>

          {/* Managers Leaderboard Table */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-500" />
                  <span>Menejerlar Samaradorligi va Komissiya Hisob-Kitobi</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Har bir xodimning savdo ko‘rsatkichi, o‘rtacha chek va belgilangan foiz bo‘yicha bonus hisobi
                </p>
              </div>
              <button
                onClick={() => onNavigateTab('sales')}
                className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Sotuvchilar Bo‘limi</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4"># Reyting</th>
                    <th className="py-2.5 px-3">Menejer Ismi</th>
                    <th className="py-2.5 px-3">Lavozimi</th>
                    <th className="py-2.5 px-3 text-center">Bitimlar Soni</th>
                    <th className="py-2.5 px-3 text-right">O‘rtacha Chek</th>
                    <th className="py-2.5 px-3 text-right">Jami Savdo</th>
                    <th className="py-2.5 px-3 text-center">Komissiya %</th>
                    <th className="py-2.5 px-4 text-right">Mukofot Puli (UZS)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {managerAnalytics.map((m, idx) => (
                    <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-500">
                        {idx === 0 ? '🥇 1' : idx === 1 ? '🥈 2' : idx === 2 ? '🥉 3' : `${idx + 1}`}
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900">
                        {m.fullName}
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {m.role}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-blue-700">
                        {m.dealsCount} ta
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-700">
                        {formatUZS(m.avgCheckUZS)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                        {formatUZS(m.revenueUZS)}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-indigo-700">
                        {m.commissionRate}%
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-emerald-700">
                        {formatUZS(m.earnedCommissionUZS)}
                      </td>
                    </tr>
                  ))}
                  {managerAnalytics.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-slate-400">
                        Menejerlar ro‘yxati bo‘sh
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. INVENTORY & STOCK MOVEMENT TAB */}
      {/* ========================================================= */}
      {activeSubTab === 'inventory' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Jami Unikal Seriyalar
              </div>
              <div className="text-2xl font-black text-slate-900 font-mono">
                {totalSerials} dona
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Tizimga kiritilgan shtrix-kodli uskunalar
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Hozirda Ijarada
              </div>
              <div className="text-2xl font-black text-blue-700 font-mono">
                {rentedSerials} dona
              </div>
              <div className="text-[11px] text-blue-600 mt-1">
                Mijozlar foydalanishida ({utilizationRate}%)
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Omborda Mavjud
              </div>
              <div className="text-2xl font-black text-emerald-700 font-mono">
                {availableSerials} dona
              </div>
              <div className="text-[11px] text-emerald-600 mt-1">
                Ijaraga berishga tayyor
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Ta'mirda (Servis)
              </div>
              <div className="text-2xl font-black text-amber-700 font-mono">
                {maintenanceSerials} dona
              </div>
              <div className="text-[11px] text-amber-600 mt-1">
                Texnik ko‘rikdagi uskunalar
              </div>
            </div>
          </div>

          {/* Top In-Demand Rented Products */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <span>Eng Ko‘p Ijaraga Berilayotgan Asboblar (Top Talab)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Bandlik ko‘rsatkichi va aylanmasi eng yuqori bo‘lgan uskunalar
                </p>
              </div>
              <button
                onClick={() => onNavigateTab('products')}
                className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Barcha Mahsulotlar</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {topRentedProducts.map((p) => (
                <div
                  key={p.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {p.sku}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500">{p.category}</span>
                  </div>

                  <div>
                    <h4 className="font-bold text-xs text-slate-900 line-clamp-1">{p.name}</h4>
                    <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
                      Stavka: {formatUZS(p.dailyRate)} / kun
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-600">
                      <span>Bandlik: {p.rate}%</span>
                      <span className="font-bold font-mono">
                        {p.rentedCount} / {p.totalCount} dona
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all"
                        style={{ width: `${p.rate}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
