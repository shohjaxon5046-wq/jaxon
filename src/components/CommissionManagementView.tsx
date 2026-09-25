import React, { useState, useMemo } from 'react';
import {
  Percent,
  DollarSign,
  TrendingUp,
  Settings,
  Shield,
  Lock,
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  Filter,
  CreditCard,
  Building,
  Wrench,
  Truck,
  ArrowRight,
  Eye,
  Check,
  X,
  FileText,
  User,
  Award,
  ChevronRight,
  HelpCircle,
  Save,
  RotateCcw
} from 'lucide-react';
import {
  CommissionCalculationBasis,
  CommissionPayout,
  Language,
  Order,
  OrderCommissionRecord,
  Product,
  Salesperson,
  SellerCommissionConfig,
  StaffMember,
  UserRole
} from '../types';
import { formatUZS } from '../utils/pricing';
import {
  calculateSellerAggregates,
  getCommissionExplanation
} from '../utils/commission';
import { CommissionService } from '../services/commissionService';

interface Props {
  language: Language;
  orders: Order[];
  products: Product[];
  salespersons: Salesperson[];
  staffList: StaffMember[];
  configs: SellerCommissionConfig[];
  records: OrderCommissionRecord[];
  onSaveConfig: (config: SellerCommissionConfig) => void;
  onMarkAsPaid: (
    recordIds: string[],
    paidBy: string,
    paymentMethod: 'cash' | 'card' | 'bank_transfer',
    notes?: string
  ) => void;
  currentUser: string;
  userRole?: UserRole;
  currentStaff?: StaffMember | null;
}

export const CommissionManagementView: React.FC<Props> = ({
  language,
  orders,
  products,
  salespersons,
  staffList,
  configs,
  records,
  onSaveConfig,
  onMarkAsPaid,
  currentUser,
  userRole = 'admin',
  currentStaff
}) => {
  // Determine if the current user has Admin privileges
  const isAdmin =
    userRole === 'admin' ||
    currentStaff?.role === 'admin' ||
    currentStaff?.role === 'accountant' ||
    !!currentStaff?.permissions.canManageStaff;

  // If user is a seller, determine their seller identity
  const currentSellerId = currentStaff?.id;
  const currentSellerName = currentStaff?.fullName || currentUser;

  // Active subtab: 'orders' | 'configs' | 'payouts'
  const [activeTab, setActiveTab] = useState<'orders' | 'configs'>('orders');

  // Filters
  const [selectedSellerFilter, setSelectedSellerFilter] = useState<string>(
    !isAdmin && currentSellerId ? currentSellerId : 'all'
  );
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Admin Settings Modal State
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<SellerCommissionConfig | null>(null);

  // Payout Modal State
  const [payoutModalRecords, setPayoutModalRecords] = useState<OrderCommissionRecord[] | null>(null);
  const [payoutPaymentMethod, setPayoutPaymentMethod] = useState<'cash' | 'card' | 'bank_transfer'>('cash');
  const [payoutNotes, setPayoutNotes] = useState('');

  // Config Form State
  const [formSellerId, setFormSellerId] = useState('');
  const [formCalculationBasis, setFormCalculationBasis] = useState<CommissionCalculationBasis>('net_profit');
  const [formProductRate, setFormProductRate] = useState<number | string>(20);
  const [formServiceRate, setFormServiceRate] = useState<number | string>(15);
  const [formProductMargin, setFormProductMargin] = useState<number | string>(50);
  const [formServiceMargin, setFormServiceMargin] = useState<number | string>(35);
  const [formMinQuota, setFormMinQuota] = useState<number | string>(0);
  const [formBonusTarget, setFormBonusTarget] = useState<number | string>(50000000);
  const [formBonusAmount, setFormBonusAmount] = useState<number | string>(1500000);
  const [formNotes, setFormNotes] = useState('');
  const [formSuccessMessage, setFormSuccessMessage] = useState('');

  // Open modal for editing a specific seller config
  const handleOpenEditConfig = (cfg: SellerCommissionConfig) => {
    if (!isAdmin) return; // Strict safety check
    setEditingConfig(cfg);
    setFormSellerId(cfg.sellerId);
    setFormCalculationBasis(cfg.calculationBasis);
    setFormProductRate(cfg.productCommissionRate);
    setFormServiceRate(cfg.serviceCommissionRate);
    setFormProductMargin(cfg.estimatedProductMarginPercent || 50);
    setFormServiceMargin(cfg.estimatedServiceMarginPercent || 35);
    setFormMinQuota(cfg.minSalesQuotaUZS || 0);
    setFormBonusTarget(cfg.bonusTargetUZS || 50000000);
    setFormBonusAmount(cfg.bonusAmountUZS || 1500000);
    setFormNotes(cfg.notes || '');
    setFormSuccessMessage('');
    setIsConfigModalOpen(true);
  };

  // Open modal for new config
  const handleOpenNewConfig = () => {
    if (!isAdmin) return;
    setEditingConfig(null);
    setFormSellerId('default');
    setFormCalculationBasis('net_profit');
    setFormProductRate(20);
    setFormServiceRate(15);
    setFormProductMargin(50);
    setFormServiceMargin(35);
    setFormMinQuota(0);
    setFormBonusTarget(50000000);
    setFormBonusAmount(1500000);
    setFormNotes('');
    setFormSuccessMessage('');
    setIsConfigModalOpen(true);
  };

  // Save Config
  const handleSaveConfigSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    let targetSellerName = 'Standart';
    let targetPhone = '';

    if (formSellerId !== 'default') {
      const staffMember = staffList.find((s) => s.id === formSellerId);
      const sp = salespersons.find((s) => s.id === formSellerId);
      targetSellerName = staffMember?.fullName || sp?.fullName || 'Sotuvchi';
      targetPhone = staffMember?.phone || sp?.phone || '';
    }

    const newConfig: SellerCommissionConfig = {
      id: editingConfig?.id || `cfg-${formSellerId}-${Date.now()}`,
      sellerId: formSellerId,
      sellerName: targetSellerName,
      sellerPhone: targetPhone,
      calculationBasis: formCalculationBasis,
      productCommissionRate: Number(formProductRate) || 0,
      serviceCommissionRate: Number(formServiceRate) || 0,
      estimatedProductMarginPercent: Number(formProductMargin) || 50,
      estimatedServiceMarginPercent: Number(formServiceMargin) || 35,
      minSalesQuotaUZS: Number(formMinQuota) || 0,
      bonusTargetUZS: Number(formBonusTarget) || 0,
      bonusAmountUZS: Number(formBonusAmount) || 0,
      notes: formNotes.trim() || undefined,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser
    };

    onSaveConfig(newConfig);
    setFormSuccessMessage('Komissiya stavkasi muvaffaqiyatli saqlandi!');
    setTimeout(() => {
      setIsConfigModalOpen(false);
      setFormSuccessMessage('');
    }, 900);
  };

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      // Seller restriction: If not admin, strictly only show own records
      if (!isAdmin) {
        const isMine =
          rec.sellerId === currentSellerId ||
          rec.sellerName.toLowerCase().includes(currentSellerName.toLowerCase());
        if (!isMine) return false;
      } else if (selectedSellerFilter !== 'all') {
        if (rec.sellerId !== selectedSellerFilter) return false;
      }

      // Status filter
      if (selectedStatusFilter !== 'all' && rec.payoutStatus !== selectedStatusFilter) {
        return false;
      }

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchOrder = rec.orderId.toLowerCase().includes(q);
        const matchClient = rec.clientName.toLowerCase().includes(q);
        const matchSeller = rec.sellerName.toLowerCase().includes(q);
        return matchOrder || matchClient || matchSeller;
      }

      return true;
    });
  }, [
    records,
    isAdmin,
    currentSellerId,
    currentSellerName,
    selectedSellerFilter,
    selectedStatusFilter,
    searchQuery
  ]);

  // Overall Statistics for KPI cards
  const stats = useMemo(() => {
    const targetRecords = !isAdmin
      ? records.filter(
          (r) =>
            r.sellerId === currentSellerId ||
            r.sellerName.toLowerCase().includes(currentSellerName.toLowerCase())
        )
      : records;

    const totalSales = targetRecords.reduce((acc, r) => acc + (r.totalAmountUZS || 0), 0);
    const totalProfit = targetRecords.reduce((acc, r) => acc + (r.totalNetProfitUZS || 0), 0);
    const totalCommission = targetRecords.reduce((acc, r) => acc + (r.totalCommissionUZS || 0), 0);
    const totalPaid = targetRecords
      .filter((r) => r.payoutStatus === 'paid')
      .reduce((acc, r) => acc + (r.totalCommissionUZS || 0), 0);
    const totalPending = targetRecords
      .filter((r) => r.payoutStatus !== 'paid')
      .reduce((acc, r) => acc + (r.totalCommissionUZS || 0), 0);

    const avgRate =
      totalSales > 0 ? Math.round((totalCommission / totalSales) * 100 * 10) / 10 : 0;

    return { totalSales, totalProfit, totalCommission, totalPaid, totalPending, avgRate };
  }, [records, isAdmin, currentSellerId, currentSellerName]);

  // Seller active configuration (for display to seller or admin)
  const activeSellerConfig = useMemo(() => {
    if (!isAdmin && currentSellerId) {
      return (
        configs.find((c) => c.sellerId === currentSellerId) ||
        configs.find((c) => c.sellerName.toLowerCase() === currentSellerName.toLowerCase()) ||
        configs.find((c) => c.sellerId === 'default') ||
        configs[0]
      );
    }
    return null;
  }, [configs, isAdmin, currentSellerId, currentSellerName]);

  // Handle Payout submission
  const handleConfirmPayout = () => {
    if (!payoutModalRecords || payoutModalRecords.length === 0) return;
    const ids = payoutModalRecords.map((r) => r.id);
    onMarkAsPaid(ids, currentUser, payoutPaymentMethod, payoutNotes);
    setPayoutModalRecords(null);
    setPayoutNotes('');
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl">
            <Percent className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                {isAdmin
                  ? "Sotuvchilar Komissiyasi va Foydani Ta'qsimlash"
                  : 'Mening Sotuvlarim va Komissiyam'}
              </h1>
              {!isAdmin && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  <Lock className="w-3 h-3 text-amber-600" />
                  <span>Faqat ko'rish (Read-only)</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {isAdmin
                ? "Admin nazoratidagi foiz stavkalari, sof foydadan ulush va buyurtmalar bo'yicha avtomatik bonus hisob-kitobi"
                : "Sizning amalga oshirgan buyurtmalaringiz, admin belgilagan stavkalar va hisoblangan daromadlaringiz"}
            </p>
          </div>
        </div>

        {/* Admin Action Buttons */}
        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab(activeTab === 'orders' ? 'configs' : 'orders')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                activeTab === 'configs'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Stavkalar Sozlamalari</span>
            </button>

            <button
              onClick={handleOpenNewConfig}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Percent className="w-4 h-4" />
              <span>Yangi Stavka Belgilash</span>
            </button>
          </div>
        )}
      </div>

      {/* Seller Active Rate Notice (Strictly visible to sellers with lock indicator) */}
      {!isAdmin && activeSellerConfig && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-600 text-white rounded-xl mt-0.5">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-900">
                  Sizga biriktirilgan faol komissiya modeli:
                </span>
                <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-white text-blue-700 border border-blue-300 shadow-2xs">
                  {activeSellerConfig.calculationBasis === 'net_profit'
                    ? 'Sof Foydadan Foiz'
                    : 'Umumiy Tushumdan Foiz'}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Asboblar ijarasi: <strong className="text-emerald-700 font-mono">{activeSellerConfig.productCommissionRate}%</strong> | 
                Xizmatlar (Samosval, kran, yukchi): <strong className="text-emerald-700 font-mono">{activeSellerConfig.serviceCommissionRate}%</strong>
              </p>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 bg-white/80 px-3 py-1.5 rounded-xl border border-blue-200 flex items-center gap-1.5 shrink-0">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>Admin tomonidan belgilangan (O'zgartirib bo'lmaydi)</span>
          </div>
        </div>
      )}

      {/* Stats KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            {isAdmin ? 'Jami Sotuvlar' : 'Mening Savdolarim'}
          </div>
          <div className="text-xl font-black text-slate-900 mt-1 font-mono truncate" title={formatUZS(stats.totalSales)}>
            {formatUZS(stats.totalSales)}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">{filteredRecords.length} ta buyurtma</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Sof Foyda
          </div>
          <div className="text-xl font-black text-blue-700 mt-1 font-mono truncate" title={formatUZS(stats.totalProfit)}>
            {formatUZS(stats.totalProfit)}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Xarajatlar chegirilganda</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Jami Komissiya
          </div>
          <div className="text-xl font-black text-emerald-700 mt-1 font-mono truncate" title={formatUZS(stats.totalCommission)}>
            {formatUZS(stats.totalCommission)}
          </div>
          <div className="text-[10px] text-emerald-600 font-medium mt-1">Hisoblangan daromad</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            To'langan
          </div>
          <div className="text-xl font-black text-slate-900 mt-1 font-mono truncate" title={formatUZS(stats.totalPaid)}>
            {formatUZS(stats.totalPaid)}
          </div>
          <div className="text-[10px] text-emerald-600 font-medium mt-1">Kassadan berilgan</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Kutilmoqda
          </div>
          <div className="text-xl font-black text-amber-600 mt-1 font-mono truncate" title={formatUZS(stats.totalPending)}>
            {formatUZS(stats.totalPending)}
          </div>
          <div className="text-[10px] text-amber-600 font-medium mt-1">To'lanishi lozim</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            O'rtacha Ulush
          </div>
          <div className="text-xl font-black text-purple-700 mt-1 font-mono">
            {stats.avgRate}%
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Tushumga nisbatan</div>
        </div>
      </div>

      {/* ADMIN ONLY: SELLER CONFIGURATIONS MANAGEMENT TAB */}
      {isAdmin && activeTab === 'configs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Sotuvchilarning Faol Foiz Stavkasi va Shartlari
              </h2>
              <p className="text-xs text-slate-500">
                Har bir sotuvchiga alohida yoki umumiy standart bo'yicha stavka va hisoblash usulini belgilang.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {configs.map((cfg) => {
              const aggregates = calculateSellerAggregates(records, cfg);
              const isDefault = cfg.sellerId === 'default';

              return (
                <div
                  key={cfg.id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-all"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm text-slate-900">{cfg.sellerName}</h3>
                          {isDefault && (
                            <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                              Standart
                            </span>
                          )}
                        </div>
                      </div>

                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                          cfg.calculationBasis === 'net_profit'
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}
                      >
                        {cfg.calculationBasis === 'net_profit'
                          ? 'Sof Foydadan'
                          : 'Umumiy Tushumdan'}
                      </span>
                    </div>

                    {/* Rates card */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 flex items-center gap-1.5">
                          <Wrench className="w-3.5 h-3.5 text-slate-400" />
                          Asboblar ijarasi:
                        </span>
                        <span className="font-mono font-bold text-emerald-700">
                          {cfg.productCommissionRate}%
                        </span>
                      </div>
                      {cfg.bonusTargetUZS && cfg.bonusTargetUZS > 0 && (
                        <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                          <span className="text-slate-500 flex items-center gap-1.5">
                            <Award className="w-3.5 h-3.5 text-amber-500" />
                            Bonus rejasi:
                          </span>
                          <span className="font-mono font-bold text-amber-700">
                            {formatUZS(cfg.bonusAmountUZS || 0)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Performance metrics */}
                    <div className="space-y-1 text-xs text-slate-600">
                      <div className="flex justify-between">
                        <span>Jami ishlagan komissiyasi:</span>
                        <span className="font-mono font-bold text-emerald-700">
                          {formatUZS(aggregates.totalCommissionEarnedUZS)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Kutilayotgan to'lov:</span>
                        <span className="font-mono font-bold text-amber-600">
                          {formatUZS(aggregates.totalPendingUZS)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2 mt-3">
                    <span className="text-[10px] text-slate-400">
                      Yangilangan: {cfg.updatedAt.split('T')[0]}
                    </span>
                    <button
                      onClick={() => handleOpenEditConfig(cfg)}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      <span>Stavkani tahrirlash</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* COMMISSION RECORDS & DEALS TABLE */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden space-y-3 p-4 md:p-5">
          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex flex-wrap items-center gap-2">
              {/* Seller filter (Admin only) */}
              {isAdmin && (
                <div className="min-w-[180px]">
                  <select
                    value={selectedSellerFilter}
                    onChange={(e) => setSelectedSellerFilter(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="all">Barcha sotuvchilar</option>
                    {configs.map((c) => (
                      <option key={c.id} value={c.sellerId}>
                        {c.sellerName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Status filter */}
              <div className="min-w-[140px]">
                <select
                  value={selectedStatusFilter}
                  onChange={(e) => setSelectedStatusFilter(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="all">Barcha holatlar</option>
                  <option value="pending">Kutilmoqda (Pending)</option>
                  <option value="paid">To'langan (Paid)</option>
                </select>
              </div>
            </div>

            {/* Search */}
            <div className="relative min-w-[220px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buyurtma ID, mijoz yoki sotuvchi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Buyurtma</th>
                  {isAdmin && <th className="py-2.5 px-3">Sotuvchi</th>}
                  <th className="py-2.5 px-3">Mijoz</th>
                  <th className="py-2.5 px-3 text-right">Tushum (UZS)</th>
                  <th className="py-2.5 px-3 text-right">Sof Foyda (UZS)</th>
                  <th className="py-2.5 px-3 text-center">Stavka Modeli</th>
                  <th className="py-2.5 px-3 text-right">Komissiya</th>
                  <th className="py-2.5 px-3 text-center">Holati</th>
                  {isAdmin && <th className="py-2.5 px-3 text-right">Amal</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map((rec) => {
                  const isPaid = rec.payoutStatus === 'paid';

                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="font-mono font-bold text-slate-900">{rec.orderId}</div>
                        <div className="text-[10px] text-slate-400">{rec.orderDate}</div>
                      </td>

                      {isAdmin && (
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-800">{rec.sellerName}</div>
                        </td>
                      )}

                      <td className="py-2.5 px-3">
                        <div className="text-slate-800 font-medium">{rec.clientName}</div>
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                        {formatUZS(rec.totalAmountUZS)}
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-blue-700">
                        {formatUZS(rec.totalNetProfitUZS)}
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            rec.calculationBasis === 'net_profit'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                          title={getCommissionExplanation(rec)}
                        >
                          {rec.calculationBasis === 'net_profit'
                            ? `Foydadan ${rec.productRatePercent}% / ${rec.serviceRatePercent}%`
                            : `Tushumdan ${rec.productRatePercent}% / ${rec.serviceRatePercent}%`}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-700 text-sm">
                        {formatUZS(rec.totalCommissionUZS)}
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isPaid
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {isPaid ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>To'langan</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3 text-amber-600" />
                              <span>Kutilmoqda</span>
                            </>
                          )}
                        </span>
                      </td>

                      {isAdmin && (
                        <td className="py-2.5 px-3 text-right">
                          {!isPaid ? (
                            <button
                              onClick={() => setPayoutModalRecords([rec])}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] shadow-2xs transition-colors cursor-pointer"
                            >
                              To'lash
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400">
                              {rec.paidAt?.split('T')[0] || 'Bajarildi'}
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}

                {filteredRecords.length === 0 && (
                  <tr>
                    <td colSpan={isAdmin ? 9 : 7} className="py-12 text-center text-slate-400">
                      <Percent className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                      <p className="font-bold text-slate-600">Buyurtmalar topilmadi</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Sotuvchi tomonidan yangi buyurtmalar rasmiylashtirilganda ushbu jadvalda avtomatik ko'rinadi.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ADMIN COMMISSION CONFIGURATION MODAL (STAVKA SOZLAMALARI) */}
      {isAdmin && isConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                  <Percent className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Komissiya Stavkalarini Sozlash (Admin)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Hisoblash asosi: Sof foydadan yoki umumiy tushumdan foiz
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formSuccessMessage && (
              <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{formSuccessMessage}</span>
              </div>
            )}

            <form onSubmit={handleSaveConfigSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
              {/* Target Seller */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Stavka qaysi sotuvchiga tegishli? *
                </label>
                <select
                  value={formSellerId}
                  onChange={(e) => setFormSellerId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold focus:bg-white focus:border-blue-500 cursor-pointer"
                >
                  <option value="default">Standart (Barcha biriktirilmagan sotuvchilar uchun)</option>
                  {staffList
                    .filter((s) => s.role === 'seller' || s.role === 'custom')
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.fullName} ({s.username})
                      </option>
                    ))}
                  {salespersons.map((sp) => (
                    <option key={sp.id} value={sp.id}>
                      {sp.fullName} (Savdo menejeri)
                    </option>
                  ))}
                </select>
              </div>

              {/* CALCULATION BASIS SELECTOR */}
              <div className="space-y-2">
                <label className="block font-bold text-slate-700">
                  Hisoblash Asosi (Calculation Basis) *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                      formCalculationBasis === 'net_profit'
                        ? 'border-blue-600 bg-blue-50/70 shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="basis"
                        value="net_profit"
                        checked={formCalculationBasis === 'net_profit'}
                        onChange={() => setFormCalculationBasis('net_profit')}
                        className="text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span className="font-bold text-xs text-slate-900">
                        1. Sof Foydadan Foiz (Net Profit)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2 pl-5">
                      Tovar va xizmat tannarxi chegirilgandan keyin qolgan <strong>sof foydadan</strong> belgilangan ulush (masalan 20%) olinadi.
                    </p>
                  </label>

                  <label
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                      formCalculationBasis === 'gross_sales'
                        ? 'border-emerald-600 bg-emerald-50/70 shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="basis"
                        value="gross_sales"
                        checked={formCalculationBasis === 'gross_sales'}
                        onChange={() => setFormCalculationBasis('gross_sales')}
                        className="text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span className="font-bold text-xs text-slate-900">
                        2. Umumiy Tushumdan Foiz (Gross Sales)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2 pl-5">
                      Buyurtmaning umumiy aylanma summasidan (oborotidan) to'g'ridan-to'g'ri foiz (masalan 5%) hisoblanadi.
                    </p>
                  </label>
                </div>
              </div>

              {/* COMMISSION RATES */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5 text-emerald-600" />
                  Komissiya Foiz Stavkasi (%)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Asboblar Ijarasi uchun stavka (%) *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        required
                        value={formProductRate}
                        onChange={(e) => setFormProductRate(e.target.value)}
                        placeholder="20"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold focus:border-blue-500"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      {formCalculationBasis === 'net_profit' ? 'Asboblar sof foydasining % qismi' : 'Asboblar tushumining % qismi'}
                    </span>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Maxsus Xizmatlar uchun stavka (%) *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        required
                        value={formServiceRate}
                        onChange={(e) => setFormServiceRate(e.target.value)}
                        placeholder="15"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold focus:border-blue-500"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Samosvallar, kranlar, yukchilar uchun foiz
                    </span>
                  </div>
                </div>
              </div>

              {/* PROFIT MARGIN ASSUMPTIONS (Only for Net Profit) */}
              {formCalculationBasis === 'net_profit' && (
                <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-200 space-y-3">
                  <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                    Foyda Marjasi Taxminiy Ko'rsatkichi (%)
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Asboblar sof foyda marjasi (%)
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formProductMargin}
                        onChange={(e) => setFormProductMargin(e.target.value)}
                        placeholder="50"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold focus:border-blue-500"
                      />
                      <span className="text-[10px] text-slate-500 mt-0.5 block">
                        Asbob amortizatsiyasidan keyingi o'rtacha sof foyda
                      </span>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Xizmatlar sof foyda marjasi (%)
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formServiceMargin}
                        onChange={(e) => setFormServiceMargin(e.target.value)}
                        placeholder="35"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold focus:border-blue-500"
                      />
                      <span className="text-[10px] text-slate-500 mt-0.5 block">
                        Yoqilg'i, haydovchi va kran amortizatsiyasidan so'ng qolgan marja
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* BONUS & QUOTA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Bonus marrasi (Savdo rejasi, so'm)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formBonusTarget}
                    onChange={(e) => setFormBonusTarget(e.target.value)}
                    placeholder="50000000"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold focus:bg-white focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Reja to'lganda mukofot (Bonus so'm)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formBonusAmount}
                    onChange={(e) => setFormBonusAmount(e.target.value)}
                    placeholder="1500000"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold focus:bg-white focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Qo'shimcha izoh</label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Masalan: Shartnoma bo'yicha 2026-yilgi stavka"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:border-blue-500"
                />
              </div>

              <button type="submit" className="hidden" />
            </form>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsConfigModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-xs cursor-pointer"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                onClick={handleSaveConfigSubmit}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>Stavkani Saqlash</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAYOUT CONFIRMATION MODAL (Admin to'lovni tasdiqlash) */}
      {isAdmin && payoutModalRecords && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-emerald-600">
              <div className="p-2.5 bg-emerald-100 rounded-xl">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Komissiyani To'lash</h3>
                <p className="text-xs text-slate-500">Xodimga bonusni topshirishni qayd qilish</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Sotuvchi:</span>
                <span className="font-bold text-slate-900">
                  {payoutModalRecords[0]?.sellerName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Buyurtmalar soni:</span>
                <span className="font-mono font-bold text-slate-800">
                  {payoutModalRecords.length} ta
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <span className="font-bold text-slate-700">Jami to'lanadigan summa:</span>
                <span className="font-mono font-black text-emerald-700 text-base">
                  {formatUZS(
                    payoutModalRecords.reduce((acc, r) => acc + r.totalCommissionUZS, 0)
                  )}
                </span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">To'lov usuli</label>
                <select
                  value={payoutPaymentMethod}
                  onChange={(e) => setPayoutPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:border-blue-500 cursor-pointer"
                >
                  <option value="cash">Naqd pul (Kassadan)</option>
                  <option value="card">Plastik karta (UzCard / Humo)</option>
                  <option value="bank_transfer">Bank orqali o'tkazma</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Kvitansiya yoki izoh</label>
                <input
                  type="text"
                  value={payoutNotes}
                  onChange={(e) => setPayoutNotes(e.target.value)}
                  placeholder="Kassa cheki yoki qo'shimcha belgi..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPayoutModalRecords(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-xs cursor-pointer"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                onClick={handleConfirmPayout}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-xs cursor-pointer"
              >
                To'lovni tasdiqlash
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
