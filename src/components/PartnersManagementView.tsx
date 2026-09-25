import React, { useState, useMemo } from 'react';
import {
  Truck,
  Building2,
  Users,
  Wrench,
  Percent,
  DollarSign,
  TrendingUp,
  CreditCard,
  Plus,
  Edit2,
  Trash2,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Phone,
  Calendar,
  Award,
  ChevronRight,
  HelpCircle,
  FileText,
  AlertCircle,
  X,
  Save,
  ArrowUpRight,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import {
  Language,
  Order,
  PartnerPayoutRecord,
  PartnerServiceType,
  ServicePartner,
  StaffMember,
  UserRole
} from '../types';
import { formatUZS } from '../utils/pricing';
import {
  PartnerService,
  ServiceJobDetail
} from '../services/partnerService';

interface Props {
  language: Language;
  orders: Order[];
  partners: ServicePartner[];
  onSavePartner: (partner: ServicePartner) => void;
  onDeletePartner: (partnerId: string) => void;
  onRecordPayout: (
    partnerId: string,
    partnerName: string,
    amountUZS: number,
    paidBy: string,
    paymentMethod: 'cash' | 'card' | 'bank_transfer',
    notes?: string
  ) => void;
  currentUser: string;
  userRole?: UserRole;
  currentStaff?: StaffMember | null;
  onInspectOrder?: (orderId: string) => void;
}

export const PartnersManagementView: React.FC<Props> = ({
  language,
  orders,
  partners,
  onSavePartner,
  onDeletePartner,
  onRecordPayout,
  currentUser,
  userRole = 'admin',
  currentStaff,
  onInspectOrder
}) => {
  // Navigation subtabs: 'directory' | 'analytics' | 'jobs'
  const [activeTab, setActiveTab] = useState<'analytics' | 'directory' | 'jobs'>('analytics');

  // Date range filter for analytics
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'this_week' | 'this_month' | 'custom'>('this_month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Service type filter
  const [serviceTypeFilter, setServiceTypeFilter] = useState<'all' | 'waste_truck' | 'crane' | 'loader'>('all');
  const [partnerFilter, setPartnerFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Partner Modal (Add/Edit)
  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<ServicePartner | null>(null);

  // Partner Form State
  const [formName, setFormName] = useState('');
  const [formCompanyName, setFormCompanyName] = useState('');
  const [formContactPerson, setFormContactPerson] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formSecondaryPhone, setFormSecondaryPhone] = useState('');
  const [formServiceType, setFormServiceType] = useState<PartnerServiceType>('crane');
  const [formVehicleDetails, setFormVehicleDetails] = useState('');
  const [formCommissionRate, setFormCommissionRate] = useState<number | string>(20);
  const [formPaymentMethod, setFormPaymentMethod] = useState<'cash' | 'card' | 'bank_transfer'>('cash');
  const [formBankAccount, setFormBankAccount] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');

  // Payout Modal
  const [payoutTargetPartner, setPayoutTargetPartner] = useState<ServicePartner | null>(null);
  const [payoutAmount, setPayoutAmount] = useState<number | string>('');
  const [payoutMethod, setPayoutMethod] = useState<'cash' | 'card' | 'bank_transfer'>('cash');
  const [payoutNotes, setPayoutNotes] = useState('');

  // Map of partners for fast lookup
  const partnersMap = useMemo(() => {
    return new Map(partners.map((p) => [p.id, p]));
  }, [partners]);

  // Extract all service jobs from all orders
  const allServiceJobs = useMemo(() => {
    return PartnerService.extractServiceJobs(orders, partnersMap);
  }, [orders, partnersMap]);

  // Calculate active date range strings
  const activeDateRange = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    if (dateFilter === 'today') {
      return { from: todayStr, to: todayStr };
    }
    if (dateFilter === 'this_week') {
      const now = new Date();
      const firstDay = new Date(now.setDate(now.getDate() - now.getDay() + 1));
      return { from: firstDay.toISOString().split('T')[0], to: todayStr };
    }
    if (dateFilter === 'this_month') {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: firstDay.toISOString().split('T')[0], to: todayStr };
    }
    if (dateFilter === 'custom' && customStartDate) {
      return { from: customStartDate, to: customEndDate || todayStr };
    }
    return undefined;
  }, [dateFilter, customStartDate, customEndDate]);

  // Filtered jobs
  const filteredJobs = useMemo(() => {
    return allServiceJobs.filter((job) => {
      // Date filter
      if (activeDateRange?.from && job.orderDate < activeDateRange.from) return false;
      if (activeDateRange?.to && job.orderDate > activeDateRange.to) return false;

      // Service type filter
      if (serviceTypeFilter !== 'all' && job.serviceType !== serviceTypeFilter) return false;

      // Partner filter
      if (partnerFilter !== 'all' && job.partnerId !== partnerFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchOrder = job.orderId.toLowerCase().includes(q);
        const matchClient = job.clientName.toLowerCase().includes(q);
        const matchService = job.serviceName.toLowerCase().includes(q);
        const matchPartner = (job.partnerName || '').toLowerCase().includes(q);
        return matchOrder || matchClient || matchService || matchPartner;
      }

      return true;
    });
  }, [allServiceJobs, activeDateRange, serviceTypeFilter, partnerFilter, searchQuery]);

  // Analytics calculated for the filtered period
  const analytics = useMemo(() => {
    return PartnerService.calculateAnalytics(allServiceJobs, activeDateRange);
  }, [allServiceJobs, activeDateRange]);

  // Recalculate partners with live balances
  const enrichedPartners = useMemo(() => {
    const payouts = []; // Partner payouts are tracked in AppStorage
    return PartnerService.recalculatePartnersWithJobs(partners, allServiceJobs, []);
  }, [partners, allServiceJobs]);

  // Open Edit Partner Modal
  const handleOpenEditPartner = (p: ServicePartner) => {
    setEditingPartner(p);
    setFormName(p.name);
    setFormCompanyName(p.companyName || '');
    setFormContactPerson(p.contactPerson);
    setFormPhone(p.phone);
    setFormSecondaryPhone(p.secondaryPhone || '');
    setFormServiceType(p.serviceType);
    setFormVehicleDetails(p.vehicleOrEquipmentDetails || '');
    setFormCommissionRate(p.commissionRatePercent || 20);
    setFormPaymentMethod(p.paymentMethod || 'cash');
    setFormBankAccount(p.bankAccountOrCard || '');
    setFormNotes(p.notes || '');
    setFormStatus(p.status);
    setIsPartnerModalOpen(true);
  };

  // Open New Partner Modal
  const handleOpenNewPartner = () => {
    setEditingPartner(null);
    setFormName('');
    setFormCompanyName('');
    setFormContactPerson('');
    setFormPhone('+998 ');
    setFormSecondaryPhone('');
    setFormServiceType('crane');
    setFormVehicleDetails('');
    setFormCommissionRate(20);
    setFormPaymentMethod('cash');
    setFormBankAccount('');
    setFormNotes('');
    setFormStatus('active');
    setIsPartnerModalOpen(true);
  };

  // Submit Partner
  const handleSubmitPartner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formContactPerson.trim() || !formPhone.trim()) return;

    const newPartner: ServicePartner = {
      id: editingPartner?.id || `partner-${Date.now()}`,
      name: formName.trim(),
      companyName: formCompanyName.trim() || undefined,
      contactPerson: formContactPerson.trim(),
      phone: formPhone.trim(),
      secondaryPhone: formSecondaryPhone.trim() || undefined,
      serviceType: formServiceType,
      vehicleOrEquipmentDetails: formVehicleDetails.trim() || undefined,
      commissionRatePercent: Number(formCommissionRate) || 20,
      paymentMethod: formPaymentMethod,
      bankAccountOrCard: formBankAccount.trim() || undefined,
      notes: formNotes.trim() || undefined,
      status: formStatus,
      totalOrdersCount: editingPartner?.totalOrdersCount || 0,
      totalServiceVolumeUZS: editingPartner?.totalServiceVolumeUZS || 0,
      totalEarnedPayoutUZS: editingPartner?.totalEarnedPayoutUZS || 0,
      paidPayoutUZS: editingPartner?.paidPayoutUZS || 0,
      pendingPayoutUZS: editingPartner?.pendingPayoutUZS || 0,
      createdAt: editingPartner?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSavePartner(newPartner);
    setIsPartnerModalOpen(false);
  };

  // Open Payout Modal
  const handleOpenPayout = (p: ServicePartner) => {
    setPayoutTargetPartner(p);
    setPayoutAmount(p.pendingPayoutUZS || 0);
    setPayoutMethod(p.paymentMethod || 'cash');
    setPayoutNotes('');
  };

  // Confirm Payout
  const handleConfirmPayout = () => {
    if (!payoutTargetPartner || !payoutAmount || Number(payoutAmount) <= 0) return;
    onRecordPayout(
      payoutTargetPartner.id,
      payoutTargetPartner.name,
      Number(payoutAmount),
      currentUser,
      payoutMethod,
      payoutNotes
    );
    setPayoutTargetPartner(null);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 text-blue-700 rounded-xl">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Hamkorlar & Xizmatlar Komissiyasi (Shohrent)
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                20% Komissiya & 50% Egalik Ulushi
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Tashqi avtokranlar, musir samosvallari va yukchilar boshqaruvi, 20% sof foyda va admin shaxsiy 50% ulushi auditi
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Subtabs Switcher */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'analytics'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Foyda Analitikasi
            </button>
            <button
              onClick={() => setActiveTab('directory')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'directory'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hamkorlar Ro'yxati ({partners.length})
            </button>
            <button
              onClick={() => setActiveTab('jobs')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'jobs'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Xizmatlar Jurnali ({allServiceJobs.length})
            </button>
          </div>

          <button
            onClick={handleOpenNewPartner}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Yangi Hamkor</span>
          </button>
        </div>
      </div>

      {/* TAB 1: OWNER PROFIT-SHARING & SERVICE COMMISSION ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Date Filter Bar */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-bold text-slate-700">Davr:</span>
              <div className="flex gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => setDateFilter('today')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    dateFilter === 'today' ? 'bg-white text-blue-700 font-bold shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  Bugun
                </button>
                <button
                  onClick={() => setDateFilter('this_week')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    dateFilter === 'this_week' ? 'bg-white text-blue-700 font-bold shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  Shu hafta
                </button>
                <button
                  onClick={() => setDateFilter('this_month')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    dateFilter === 'this_month' ? 'bg-white text-blue-700 font-bold shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  Shu oy
                </button>
                <button
                  onClick={() => setDateFilter('all')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    dateFilter === 'all' ? 'bg-white text-blue-700 font-bold shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  Barcha davr
                </button>
                <button
                  onClick={() => setDateFilter('custom')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    dateFilter === 'custom' ? 'bg-white text-blue-700 font-bold shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  Boshqa
                </button>
              </div>
            </div>

            {dateFilter === 'custom' && (
              <div className="flex items-center gap-2 text-xs">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-2.5 py-1 border border-slate-200 rounded-lg text-slate-800"
                />
                <span className="text-slate-400">—</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-2.5 py-1 border border-slate-200 rounded-lg text-slate-800"
                />
              </div>
            )}
          </div>

          {/* MAIN FINANCIAL BREAKDOWN CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Service Revenue */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase tracking-wider">Jami Xizmatlar Oboroti</span>
                <div className="p-2 bg-slate-100 rounded-xl text-slate-600">
                  <Truck className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 font-mono">
                {formatUZS(analytics.totalServiceRevenueUZS)}
              </div>
              <p className="text-[11px] text-slate-500">
                Barcha kran, musir va yukchi buyurtmalari ({analytics.totalServiceJobsCount} ta reys)
              </p>
            </div>

            {/* Card 2: Partner Share (80%) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase tracking-wider">Hamkorlar Ulushi (80%)</span>
                <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
                  <CreditCard className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-amber-700 font-mono">
                {formatUZS(analytics.totalPartnerShareUZS)}
              </div>
              <p className="text-[11px] text-slate-500">
                Kran egalari va haydovchilarga to'lanishi lozim bo'lgan ulush
              </p>
            </div>

            {/* Card 3: Shohrent 20% Net Profit */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 p-5 rounded-2xl border border-blue-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-blue-800">
                <span className="text-xs font-bold uppercase tracking-wider">Shohrent Sof Foydasi (20%)</span>
                <div className="p-2 bg-blue-600 rounded-xl text-white">
                  <Percent className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-blue-900 font-mono">
                {formatUZS(analytics.totalCompanyProfitUZS)}
              </div>
              <p className="text-[11px] text-blue-700">
                Har bir xizmat tranzaksiyasidan qolgan 20% sof biznes marjasi
              </p>
            </div>

            {/* Card 4: OWNER PROFIT SHARE (50%) */}
            <div className="bg-gradient-to-br from-emerald-500 to-teal-700 p-5 rounded-2xl text-white shadow-md space-y-2">
              <div className="flex items-center justify-between text-emerald-100">
                <span className="text-xs font-bold uppercase tracking-wider">Egalik Ulushi (Owner 50%)</span>
                <div className="p-2 bg-white/20 rounded-xl text-white backdrop-blur-xs">
                  <Award className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-white font-mono">
                {formatUZS(analytics.ownerShareUZS)}
              </div>
              <div className="flex items-center justify-between text-[11px] text-emerald-100 pt-1 border-t border-emerald-400/40">
                <span>Shohjaxon / Admin ish haqi:</span>
                <span className="font-bold">50% ulush</span>
              </div>
            </div>
          </div>

          {/* VISUAL EXPLANATION & FORMULA BANNER */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Daromad Ta'qsimoti Formulasi va Audit Modeli
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px]">1</span>
                  1. Hamkorga To'lov (80%)
                </div>
                <p className="text-slate-600 text-[11px]">
                  Masalan, mijoz 1,000,000 so'mga avtokran buyurtma qilganda, <strong>800,000 so'm</strong> kran egasiga hisoblanadi.
                </p>
              </div>

              <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-200 space-y-1.5">
                <div className="font-bold text-blue-900 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-blue-200 flex items-center justify-center text-[10px] text-blue-800">2</span>
                  2. Shohrent Komissiyasi (20%)
                </div>
                <p className="text-blue-800 text-[11px]">
                  Buyurtmadan <strong>200,000 so'm (20%)</strong> kompaniyaning sof daromadi sifatida qayd etiladi.
                </p>
              </div>

              <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200 space-y-1.5">
                <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-200 flex items-center justify-center text-[10px] text-emerald-800">3</span>
                  3. Egalik Ulushi (50% dan)
                </div>
                <p className="text-emerald-800 text-[11px]">
                  200,000 so'mning <strong>50% qismi (100,000 so'm)</strong> Boshqaruvchi / Owner hisobiga o'tadi, qolgan 100,000 so'm esa kompaniya zaxirasida qoladi.
                </p>
              </div>
            </div>

            {/* Service Volume Breakdown */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-6">
                <div>
                  <span className="text-slate-500">Kran xizmatlari:</span>{' '}
                  <strong className="text-slate-900 font-mono">{formatUZS(analytics.craneRevenueUZS)}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Musir moshina:</span>{' '}
                  <strong className="text-slate-900 font-mono">{formatUZS(analytics.wasteRevenueUZS)}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Yukchilar:</span>{' '}
                  <strong className="text-slate-900 font-mono">{formatUZS(analytics.loaderRevenueUZS)}</strong>
                </div>
              </div>

              <div className="text-slate-500">
                Kompaniya zaxirasidagi operatsion qoldiq:{' '}
                <strong className="text-emerald-700 font-mono">{formatUZS(analytics.companyReserveUZS)}</strong>
              </div>
            </div>
          </div>

          {/* PARTNERS PERFORMANCE LEADERBOARD TABLE */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden space-y-3 p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Hamkorlar Bo'yicha Xizmatlar va Balans Ko'rsatkichlari
                </h3>
                <p className="text-xs text-slate-500">
                  Har bir pudratchining aylanmasi, ishlagan summasi va to'lanishi lozim bo'lgan qoldiqlar
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Hamkor / Tashkilot</th>
                    <th className="py-2.5 px-3">Xizmat turi</th>
                    <th className="py-2.5 px-3 text-center">Buyurtmalar</th>
                    <th className="py-2.5 px-3 text-right">Jami Tushum</th>
                    <th className="py-2.5 px-3 text-right">Shohrent Foydasi (20%)</th>
                    <th className="py-2.5 px-3 text-right">Hamkor Ulushi (80%)</th>
                    <th className="py-2.5 px-3 text-right">Kutilayotgan Qoldiq</th>
                    <th className="py-2.5 px-3 text-center">Amal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {enrichedPartners.map((p) => {
                    const shohrentProfit = Math.round(p.totalServiceVolumeUZS * (p.commissionRatePercent / 100));

                    return (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900">{p.name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{p.phone}</div>
                        </td>

                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">
                            {p.serviceType === 'crane'
                              ? 'Avtokran'
                              : p.serviceType === 'waste_truck'
                              ? 'Musir moshina'
                              : p.serviceType === 'loader'
                              ? 'Yukchilar'
                              : 'Ko‘p tarmoqli'}
                          </span>
                        </td>

                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800">
                          {p.totalOrdersCount}
                        </td>

                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                          {formatUZS(p.totalServiceVolumeUZS)}
                        </td>

                        <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-700">
                          {formatUZS(shohrentProfit)}
                        </td>

                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                          {formatUZS(p.totalEarnedPayoutUZS)}
                        </td>

                        <td className="py-2.5 px-3 text-right font-mono font-black text-amber-600">
                          {formatUZS(p.pendingPayoutUZS)}
                        </td>

                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => handleOpenPayout(p)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold shadow-2xs transition-colors cursor-pointer"
                          >
                            To'lov
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {enrichedPartners.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        Hamkorlar hali qo'shilmagan
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PARTNERS DIRECTORY */}
      {activeTab === 'directory' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {enrichedPartners.map((p) => (
              <div
                key={p.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-all space-y-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">{p.name}</h3>
                      {p.companyName && (
                        <div className="text-xs text-slate-500">{p.companyName}</div>
                      )}
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        p.status === 'active'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {p.status === 'active' ? 'Faol' : 'Nofaol'}
                    </span>
                  </div>

                  <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Xizmat:</span>
                      <span className="font-bold text-slate-800">
                        {p.serviceType === 'crane'
                          ? 'Avtokran'
                          : p.serviceType === 'waste_truck'
                          ? 'Musir moshina'
                          : p.serviceType === 'loader'
                          ? 'Yukchilar'
                          : 'Barchasi'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Shohrent komissiyasi:</span>
                      <span className="font-mono font-bold text-blue-700">{p.commissionRatePercent}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Hamkor ulushi:</span>
                      <span className="font-mono font-bold text-emerald-700">
                        {100 - p.commissionRatePercent}%
                      </span>
                    </div>
                  </div>

                  {p.vehicleOrEquipmentDetails && (
                    <div className="mt-2 text-xs text-slate-600 bg-blue-50/50 p-2 rounded-lg border border-blue-100">
                      <strong>Texnika:</strong> {p.vehicleOrEquipmentDetails}
                    </div>
                  )}

                  <div className="mt-3 space-y-1 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>{p.contactPerson}</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-mono">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <a href={`tel:${p.phone}`} className="text-blue-600 hover:underline">
                        {p.phone}
                      </a>
                    </div>
                    {p.bankAccountOrCard && (
                      <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-500 truncate">
                        <CreditCard className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{p.bankAccountOrCard}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="text-xs font-mono font-bold text-amber-600">
                    Qoldiq: {formatUZS(p.pendingPayoutUZS)}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenPayout(p)}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors"
                    >
                      To'lash
                    </button>
                    <button
                      onClick={() => handleOpenEditPartner(p)}
                      className="p-1 text-slate-400 hover:text-blue-600 rounded cursor-pointer"
                      title="Tahrirlash"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeletePartner(p.id)}
                      className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                      title="O'chirish"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: DETAILED SERVICE JOBS & AUDIT LOG */}
      {activeTab === 'jobs' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden space-y-3 p-5">
          {/* Filter Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <select
                value={serviceTypeFilter}
                onChange={(e) => setServiceTypeFilter(e.target.value as any)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-bold focus:outline-none cursor-pointer"
              >
                <option value="all">Barcha xizmat turlari</option>
                <option value="crane">Avtokran (Kran)</option>
                <option value="waste_truck">Musir moshina (Chiqindi)</option>
                <option value="loader">Yukchilar (Gruschik)</option>
              </select>

              <select
                value={partnerFilter}
                onChange={(e) => setPartnerFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-bold focus:outline-none cursor-pointer"
              >
                <option value="all">Barcha hamkorlar</option>
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buyurtma, mijoz yoki xizmat nomi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Buyurtma & Sana</th>
                  <th className="py-2.5 px-3">Mijoz</th>
                  <th className="py-2.5 px-3">Xizmat nomi</th>
                  <th className="py-2.5 px-3">Biriktirilgan Hamkor</th>
                  <th className="py-2.5 px-3 text-right">Tranzaksiya Summasi</th>
                  <th className="py-2.5 px-3 text-right">Hamkor Ulushi (80%)</th>
                  <th className="py-2.5 px-3 text-right">Shohrent Foydasi (20%)</th>
                  <th className="py-2.5 px-3 text-right">Owner 50% Ulushi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredJobs.map((job, idx) => (
                  <tr key={`${job.orderId}-${idx}`} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="font-mono font-bold text-slate-900">{job.orderId}</div>
                      <div className="text-[10px] text-slate-400">{job.orderDate}</div>
                    </td>

                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-800">{job.clientName}</div>
                      {job.address && (
                        <div className="text-[10px] text-slate-400 truncate max-w-[150px]">
                          {job.address}
                        </div>
                      )}
                    </td>

                    <td className="py-2.5 px-3">
                      <span className="font-semibold text-slate-800">{job.serviceName}</span>
                    </td>

                    <td className="py-2.5 px-3">
                      {job.partnerName && job.partnerName !== 'Biriktirilmagan' ? (
                        <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {job.partnerName}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Biriktirilmagan</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      {formatUZS(job.totalPriceUZS)}
                    </td>

                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-amber-700">
                      {formatUZS(job.partnerPayoutUZS)}
                    </td>

                    <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-700">
                      {formatUZS(job.companyCommissionUZS)}
                    </td>

                    <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-700">
                      {formatUZS(job.ownerProfitShareUZS)}
                    </td>
                  </tr>
                ))}

                {filteredJobs.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-400">
                      Xizmat buyurtmalari topilmadi
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT PARTNER */}
      {isPartnerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {editingPartner ? "Hamkorni Tahrirlash" : "Yangi Hamkor Qo'shish"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Pudratchi ma'lumotlari, xizmat turi va kelishilgan 20% komissiya
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPartnerModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPartner} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Hamkor / Firma nomi *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Masalan: Omon Kran Servis"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Mas'ul shaxs (F.I.O) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formContactPerson}
                    onChange={(e) => setFormContactPerson(e.target.value)}
                    placeholder="Masalan: Omonjon Toirov"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Telefon raqami *</label>
                  <input
                    type="text"
                    required
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+998 90 123 45 67"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono focus:bg-white focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Qo'shimcha telefon</label>
                  <input
                    type="text"
                    value={formSecondaryPhone}
                    onChange={(e) => setFormSecondaryPhone(e.target.value)}
                    placeholder="+998 99 987 65 43"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono focus:bg-white focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Xizmat turi *</label>
                  <select
                    value={formServiceType}
                    onChange={(e) => setFormServiceType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold focus:bg-white focus:border-blue-500 cursor-pointer"
                  >
                    <option value="crane">Avtokran (Kran)</option>
                    <option value="waste_truck">Musir moshina (Chiqindi chiqarish)</option>
                    <option value="loader">Yukchilar brigadasi (Gruschik)</option>
                    <option value="all">Ko'p tarmoqli (Barchasi)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Shohrent komissiyasi (%) *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      value={formCommissionRate}
                      onChange={(e) => setFormCommissionRate(e.target.value)}
                      placeholder="20"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold focus:bg-white focus:border-blue-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">%</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Hamkor oladigan ulush: {100 - (Number(formCommissionRate) || 20)}%
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Texnika yoki mashina raqami / tafsiloti
                </label>
                <input
                  type="text"
                  value={formVehicleDetails}
                  onChange={(e) => setFormVehicleDetails(e.target.value)}
                  placeholder="Masalan: XCMG 25t kran (01 777 AAB) yoki Kamaz 15m3"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">To'lov usuli</label>
                  <select
                    value={formPaymentMethod}
                    onChange={(e) => setFormPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:border-blue-500 cursor-pointer"
                  >
                    <option value="cash">Naqd pul</option>
                    <option value="card">Plastik karta</option>
                    <option value="bank_transfer">Bank orqali o'tkazma</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Karta yoki hisob raqam
                  </label>
                  <input
                    type="text"
                    value={formBankAccount}
                    onChange={(e) => setFormBankAccount(e.target.value)}
                    placeholder="8600 ... yoki 20208..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono focus:bg-white focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Qo'shimcha izoh</label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Shartnoma yoki aloqa bo'yicha eslatma..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:border-blue-500"
                />
              </div>

              <button type="submit" className="hidden" />
            </form>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsPartnerModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-xs cursor-pointer"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                onClick={handleSubmitPartner}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>Saqlash</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PARTNER PAYOUT */}
      {payoutTargetPartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-emerald-600">
              <div className="p-2.5 bg-emerald-100 rounded-xl">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Hamkorga To'lov Qilish</h3>
                <p className="text-xs text-slate-500">Pudratchi qoldig'ini yopish</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Hamkor:</span>
                <span className="font-bold text-slate-900">{payoutTargetPartner.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Xizmat turi:</span>
                <span className="font-bold text-slate-800">
                  {payoutTargetPartner.serviceType}
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200">
                <span className="text-slate-600 font-bold">Kutilayotgan qoldiq:</span>
                <span className="font-mono font-black text-amber-600">
                  {formatUZS(payoutTargetPartner.pendingPayoutUZS)}
                </span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">To'lanadigan summa (UZS) *</label>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">To'lov usuli</label>
                <select
                  value={payoutMethod}
                  onChange={(e) => setPayoutMethod(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:border-blue-500 cursor-pointer"
                >
                  <option value="cash">Naqd pul (Kassadan)</option>
                  <option value="card">Plastik karta</option>
                  <option value="bank_transfer">Bank hisob raqami</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Kvitansiya / Izoh</label>
                <input
                  type="text"
                  value={payoutNotes}
                  onChange={(e) => setPayoutNotes(e.target.value)}
                  placeholder="Kassa cheki yoki to'lov sanasi..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPayoutTargetPartner(null)}
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
