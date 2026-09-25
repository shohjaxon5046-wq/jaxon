import React, { useState } from 'react';
import {
  QrCode,
  CheckCircle,
  Hash,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Save,
  Package,
  Layers,
  Search,
  Calculator,
  Percent,
  Calendar,
  DollarSign,
  History,
  X
} from 'lucide-react';
import { IntakeItem, IntakeRecord, Language, Product, SerialNumber } from '../types';
import { formatUZS } from '../utils/pricing';

interface Props {
  language: Language;
  intakeRecords: IntakeRecord[];
  products: Product[];
  onSavePlacedSerials: (
    intakeId: string,
    productId: string,
    newSerials: SerialNumber[],
    pricingUpdate?: {
      dailyRate: number;
      depositAmount: number;
      targetPaybackDays: number;
      targetMarginPercent: number;
      purchasePriceUZS: number;
    }
  ) => void;
}

export const PlacementView: React.FC<Props> = ({
  language,
  intakeRecords,
  products,
  onSavePlacedSerials
}) => {
  // Status filter for Inbound records: all, new (pending unplaced units), closed (all units placed)
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'closed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIntakeIds, setExpandedIntakeIds] = useState<Record<string, boolean>>({});

  // Categorize inbound records
  const { activeIntakes, newIntakes, closedIntakes } = React.useMemo(() => {
    const active = intakeRecords.filter((rec) => rec.status !== 'deleted');
    const newRecs: IntakeRecord[] = [];
    const closedRecs: IntakeRecord[] = [];

    active.forEach((rec) => {
      const allPlaced = rec.items.length > 0 && rec.items.every(
        (it) => (it.placedQuantity || 0) >= it.quantity
      );
      if (allPlaced) {
        closedRecs.push(rec);
      } else {
        newRecs.push(rec);
      }
    });

    return { activeIntakes: active, newIntakes: newRecs, closedIntakes: closedRecs };
  }, [intakeRecords]);

  // Filtered intake records based on status filter and search query
  const filteredIntakes = React.useMemo(() => {
    let list = activeIntakes;
    if (statusFilter === 'new') list = newIntakes;
    if (statusFilter === 'closed') list = closedIntakes;

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (rec) =>
        rec.id.toLowerCase().includes(q) ||
        rec.supplier.toLowerCase().includes(q) ||
        (rec.warehouse && rec.warehouse.toLowerCase().includes(q)) ||
        rec.items.some((i) => i.productName.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q))
    );
  }, [activeIntakes, newIntakes, closedIntakes, statusFilter, searchQuery]);

  // Find all items across all intake records that have unplaced units
  const pendingList = React.useMemo(() => {
    const list: {
      intake: IntakeRecord;
      item: IntakeItem;
      unplacedCount: number;
    }[] = [];

    intakeRecords
      .filter((intake) => intake.status !== 'deleted')
      .forEach((intake) => {
      intake.items.forEach((item) => {
        const placed = item.placedQuantity || 0;
        const total = item.quantity;
        if (placed < total) {
          list.push({
            intake,
            item,
            unplacedCount: total - placed
          });
        }
      });
    });

    return list;
  }, [intakeRecords]);

  // Selected item to enter serial numbers
  const [selectedTask, setSelectedTask] = useState<{
    intake: IntakeRecord;
    item: IntakeItem;
    unplacedCount: number;
  } | null>(null);

  // Serial input list
  const [serialInputs, setSerialInputs] = useState<string[]>([]);
  const [notesInput, setNotesInput] = useState('');

  // Dynamic Pricing State based on User Formula:
  // Kunlik narx = (Sotib olish narxi * (1 + Maqsadli foyda marjasi %)) / Maqsadli to'lov kunlari (30-60 kun)
  const [paybackDays, setPaybackDays] = useState<string>('30');
  const [marginPercent, setMarginPercent] = useState<string>('5');
  const [customDailyRate, setCustomDailyRate] = useState<string>('');
  const [depositAmount, setDepositAmount] = useState<string>('');

  // Audit Logs State
  const [selectedAuditIntake, setSelectedAuditIntake] = useState<IntakeRecord | null>(null);
  const [showAllPlacementLogs, setShowAllPlacementLogs] = useState(false);

  const allPlacementLogs = React.useMemo(() => {
    const logs: {
      intakeId: string;
      logId: string;
      timestamp: string;
      operator: string;
      action: string;
      details: string;
    }[] = [];

    intakeRecords.forEach((rec) => {
      (rec.auditLogs || []).forEach((l) => {
        logs.push({
          intakeId: rec.id,
          logId: l.id,
          timestamp: l.timestamp,
          operator: l.operator,
          action: l.action,
          details: l.details
        });
      });
    });

    return logs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [intakeRecords]);

  // Handle selecting an item for placement
  const handleSelectTask = (task: { intake: IntakeRecord; item: IntakeItem; unplacedCount: number }) => {
    setSelectedTask(task);
    // Pre-populate input array with empty strings or default serial suggestions
    const inputs: string[] = [];
    const prefix = task.item.sku.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase();
    for (let i = 0; i < task.unplacedCount; i++) {
      inputs.push(`SN-${prefix}-${Math.floor(100000 + Math.random() * 900000)}`);
    }
    setSerialInputs(inputs);

    // Find linked product if existing
    const linkedProduct = products.find(p => p.id === task.item.productId || p.sku === task.item.sku);
    const purchasePrice = task.item.unitPriceUZS || linkedProduct?.purchasePriceUZS || 0;
    const defaultDays = linkedProduct?.targetPaybackDays || 30;
    const defaultMargin = linkedProduct?.targetMarginPercent || 5;

    setPaybackDays(defaultDays.toString());
    setMarginPercent(defaultMargin.toString());

    // Calculate initial suggested daily rate using formula
    const calculatedRate = calculateFormulaRate(purchasePrice, defaultDays, defaultMargin);
    setCustomDailyRate(calculatedRate.toString());

    // Default deposit (e.g. 30% of purchase price or product deposit)
    const suggestedDeposit = linkedProduct?.depositAmount || Math.round(purchasePrice * 0.3) || 500000;
    setDepositAmount(suggestedDeposit.toString());
  };

  // Helper formula calculation:
  // Kunlik narx = (Sotib olish narxi * (1 + Marja% / 100)) / Kunlar
  const calculateFormulaRate = (purchasePrice: number, days: number, margin: number): number => {
    if (purchasePrice <= 0 || days <= 0) return 0;
    const totalWithMargin = purchasePrice * (1 + margin / 100);
    const rawDaily = totalWithMargin / days;
    return Math.ceil(rawDaily / 1000) * 1000; // Round to nearest 1,000 UZS
  };

  const handlePaybackDaysChange = (val: string) => {
    setPaybackDays(val);
    const daysNum = parseFloat(val) || 0;
    const marginNum = parseFloat(marginPercent) || 0;
    const purchasePrice = selectedTask?.item.unitPriceUZS || 0;
    if (daysNum > 0 && purchasePrice > 0) {
      const newRate = calculateFormulaRate(purchasePrice, daysNum, marginNum);
      setCustomDailyRate(newRate.toString());
    }
  };

  const handleMarginChange = (val: string) => {
    setMarginPercent(val);
    const marginNum = parseFloat(val) || 0;
    const daysNum = parseFloat(paybackDays) || 0;
    const purchasePrice = selectedTask?.item.unitPriceUZS || 0;
    if (daysNum > 0 && purchasePrice > 0) {
      const newRate = calculateFormulaRate(purchasePrice, daysNum, marginNum);
      setCustomDailyRate(newRate.toString());
    }
  };

  const handleSerialChange = (index: number, val: string) => {
    const updated = [...serialInputs];
    updated[index] = val;
    setSerialInputs(updated);
  };

  const handleGenerateSerials = () => {
    if (!selectedTask) return;
    const prefix = selectedTask.item.sku.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase();
    const updated = serialInputs.map(
      () => `SN-${prefix}-${Math.floor(100000 + Math.random() * 900000)}`
    );
    setSerialInputs(updated);
  };

  const handleSaveSerials = () => {
    if (!selectedTask) return;

    // Validate that all serials are filled and unique
    const filled = serialInputs.map((s) => s.trim());
    if (filled.some((s) => !s)) {
      alert("Barcha seriya raqamlarini to'ldiring!");
      return;
    }

    const uniqueSet = new Set(filled);
    if (uniqueSet.size !== filled.length) {
      alert("Kiritilgan seriya raqamlari orasida takrorlanishlar bor. Har bir seriya unikal bo'lishi shart!");
      return;
    }

    const nowStr = new Date().toISOString().slice(0, 10);
    const newSerialObjects: SerialNumber[] = filled.map((sn, idx) => ({
      id: `sn-${Date.now()}-${idx}`,
      serialNumber: sn,
      status: 'available',
      notes: notesInput || `${selectedTask.intake.id} kirim hujjati orqali qabul qilindi`,
      assignedDate: nowStr,
      inboundId: selectedTask.intake.id,
      inboundDate: selectedTask.intake.date ? selectedTask.intake.date.slice(0, 10) : nowStr,
      placementDate: nowStr
    }));

    const finalDailyRate = parseFloat(customDailyRate) || 0;
    const finalDeposit = parseFloat(depositAmount) || 0;
    const finalDays = parseFloat(paybackDays) || 30;
    const finalMargin = parseFloat(marginPercent) || 5;

    const pricingUpdate = {
      dailyRate: finalDailyRate,
      depositAmount: finalDeposit,
      targetPaybackDays: finalDays,
      targetMarginPercent: finalMargin,
      purchasePriceUZS: selectedTask.item.unitPriceUZS || 0
    };

    onSavePlacedSerials(selectedTask.intake.id, selectedTask.item.productId, newSerialObjects, pricingUpdate);
    setSelectedTask(null);
    setSerialInputs([]);
    setNotesInput('');
  };

  const toggleExpandIntake = (id: string) => {
    setExpandedIntakeIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <QrCode className="w-5 h-5 text-blue-600" />
            <span>Joylashtirish</span>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
              {pendingList.length} ta mahsulot kutilmoqda
            </span>
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Kirim qilingan tovarlarni omborga joylashtirish, seriya raqamlarini biriktirish va ijara narxlarini belgilash
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowAllPlacementLogs(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0"
            title="Barcha joylashtirish va kirimlar o'zgarish tarixi"
          >
            <History className="w-4 h-4 text-indigo-600" />
            <span>Audit jurnali</span>
          </button>

          <div className="w-full sm:w-64 relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Mahsulot yoki Kirim ID..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Status Filter: Barchasi, Yangi, Yopilgan */}
      <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-xs">
        <span className="text-xs font-bold text-slate-500 ml-2">Holat bo'yicha filter:</span>
        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
            statusFilter === 'all'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Barchasi ({activeIntakes.length})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('new')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
            statusFilter === 'new'
              ? 'bg-amber-500 text-slate-950 shadow-xs'
              : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'
          }`}
        >
          <span>Yangi ({newIntakes.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('closed')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
            statusFilter === 'closed'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
          }`}
        >
          <span>Yopilgan ({closedIntakes.length})</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: List of inbound records with placement items */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-blue-600" />
              <span>Kirim hujjatlari va joylashtirish</span>
            </h3>
            <span className="text-[11px] font-mono text-slate-500">
              {filteredIntakes.length} ta hujjat
            </span>
          </div>

          {filteredIntakes.length === 0 ? (
            <div className="p-8 text-center bg-white border border-slate-200 rounded-xl">
              <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <div className="text-sm font-bold text-slate-900">Ushbu holatda kirim hujjatlari topilmadi</div>
              <div className="text-xs text-slate-500 mt-1">
                Kirim bo'limida yangi kirim yaratilganda, uning hujjatlari bu yerda ko'rinadi.
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredIntakes.map((intake) => {
                const totalUnits = intake.items.reduce((s, i) => s + i.quantity, 0);
                const placedUnits = intake.items.reduce((s, i) => s + (i.placedQuantity || 0), 0);
                const isClosed = totalUnits > 0 && placedUnits >= totalUnits;
                const isExpanded = expandedIntakeIds[intake.id] !== false; // default expanded

                return (
                  <div
                    key={intake.id}
                    className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs"
                  >
                    {/* Inbound Record Header */}
                    <div
                      onClick={() => toggleExpandIntake(intake.id)}
                      className="p-3.5 bg-slate-50/70 hover:bg-slate-100/70 border-b border-slate-200 flex items-center justify-between cursor-pointer transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-blue-700 text-xs">{intake.id}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              isClosed
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : 'bg-amber-100 text-amber-900 border-amber-300'
                            }`}
                          >
                            {isClosed ? 'Yopilgan' : 'Yangi'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {intake.supplier} · {intake.warehouse || 'Bosh ombor'} · <span className="font-mono">{intake.date}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-[11px] font-mono font-bold text-slate-700">
                          {placedUnits} / {totalUnits} dona
                        </div>
                        <span className="text-[10px] text-blue-600 font-semibold">
                          {isExpanded ? 'Yashirish' : "Ko'rish"}
                        </span>
                      </div>
                    </div>

                    {/* Items inside this inbound document */}
                    {isExpanded && (
                      <div className="p-3 divide-y divide-slate-100 space-y-2">
                        {intake.items.map((item, itemIdx) => {
                          const placed = item.placedQuantity || 0;
                          const total = item.quantity;
                          const unplaced = Math.max(0, total - placed);
                          const isItemSelected =
                            selectedTask?.intake.id === intake.id &&
                            selectedTask?.item.productId === item.productId;

                          return (
                            <div
                              key={itemIdx}
                              className={`pt-2 first:pt-0 p-2 rounded-lg transition-colors ${
                                isItemSelected
                                  ? 'bg-blue-50/80 border border-blue-300'
                                  : 'hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="font-bold text-slate-900 text-xs">
                                    {item.productName}
                                  </div>
                                  <div className="text-[10px] font-mono text-slate-500">
                                    SKU: <span className="text-blue-700 font-semibold">{item.sku}</span> · Narx: {formatUZS(item.unitPriceUZS)}
                                  </div>
                                </div>

                                <div className="text-right shrink-0">
                                  {unplaced > 0 ? (
                                    <button
                                      type="button"
                                      onClick={() => handleSelectTask({ intake, item, unplacedCount: unplaced })}
                                      className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-[11px] font-bold shadow-xs cursor-pointer flex items-center gap-1 transition-colors"
                                    >
                                      <QrCode className="w-3 h-3" />
                                      <span>Seriya kiritish ({unplaced})</span>
                                    </button>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                      <CheckCircle className="w-3 h-3 text-emerald-600" />
                                      <span>Joylashtirilgan</span>
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Placed serials preview */}
                              {item.generatedSerials && item.generatedSerials.length > 0 && (
                                <div className="mt-1.5 text-[10px] text-slate-600 bg-slate-50 p-1.5 rounded border border-slate-200 font-mono flex flex-wrap gap-1">
                                  <span className="text-slate-400 font-sans">Seriyalar:</span>
                                  {item.generatedSerials.map((sn, sIdx) => (
                                    <span key={sIdx} className="bg-white px-1 py-0.5 rounded text-blue-700 font-bold border border-slate-200">
                                      {sn}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Serial Number Entry & Formula Pricing Pad */}
        <div className="lg:col-span-7">
          {selectedTask ? (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-5">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-200 pb-3">
                <div>
                  <div className="text-xs text-blue-600 font-bold uppercase tracking-wider">
                    {selectedTask.intake.id} · {selectedTask.intake.warehouse || 'Bosh ombor'}
                  </div>
                  <h2 className="text-base font-bold text-slate-900 mt-0.5">
                    {selectedTask.item.productName}
                  </h2>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">
                    Artikul: {selectedTask.item.sku} · Kirim narxi: <span className="font-bold text-slate-800">{formatUZS(selectedTask.item.unitPriceUZS)}</span>
                  </div>
                </div>

                <button
                  onClick={handleGenerateSerials}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-300 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Avto-generatsiya</span>
                </button>
              </div>

              {/* DYNAMIC PRICING FORMULA SECTION */}
              <div className="bg-gradient-to-br from-blue-50/70 to-indigo-50/70 border border-blue-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Calculator className="w-4 h-4 text-blue-700" />
                    <span className="text-xs font-bold text-blue-950 uppercase tracking-wider">
                      Ijara narxi formulasi (Katalog uchun)
                    </span>
                  </div>
                  <span className="text-[11px] font-medium text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-full border border-blue-200">
                    O'rtacha 5% marja
                  </span>
                </div>

                {/* Formula display banner matching user picture */}
                <div className="bg-white/90 border border-blue-100 rounded-lg p-2.5 text-center text-xs text-slate-700 font-mono">
                  <div className="font-semibold text-slate-800">
                    Kunlik narx = (Sotib olish narxi × (1 + Foyda marjasi %)) ÷ Maqsadli to'lov kunlari
                  </div>
                  <div className="text-[11px] text-blue-600 mt-0.5">
                    ({formatUZS(selectedTask.item.unitPriceUZS)} × (1 + {marginPercent || '0'}%)) ÷ {paybackDays || '0'} kun ={' '}
                    <strong className="text-slate-900 font-bold">{formatUZS(parseFloat(customDailyRate) || 0)} / kun</strong>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Ishlash srog'i (kun) *
                    </label>
                    <div className="relative">
                      <Calendar className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        inputMode="numeric"
                        value={paybackDays}
                        onChange={(e) => handlePaybackDaysChange(e.target.value)}
                        placeholder="30"
                        className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">Masalan: 30 - 60 kun</span>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Foyda marjasi (%) *
                    </label>
                    <div className="relative">
                      <Percent className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        inputMode="numeric"
                        value={marginPercent}
                        onChange={(e) => handleMarginChange(e.target.value)}
                        placeholder="5"
                        className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">Standart: 5%</span>
                  </div>

                  <div>
                    <label className="block font-bold text-blue-950 mb-1">
                      Kunlik ijara narxi (so'm) *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={customDailyRate}
                        onChange={(e) => setCustomDailyRate(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-blue-400 rounded-lg font-mono font-bold text-blue-700 text-sm focus:outline-none focus:border-blue-600"
                      />
                    </div>
                    <span className="text-[10px] text-blue-600 mt-0.5 block">Katalogda saqlanadi</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-blue-200/60 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">Garov depoziti (so'm):</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="500000"
                    className="w-44 px-2.5 py-1 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 text-right text-xs"
                  />
                </div>
              </div>

              {/* SERIAL NUMBERS INPUT LIST */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Har bir birlik uchun Seriya Raqami (SN) ni yozing yoki skanerlang ({selectedTask.unplacedCount} dona):
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                  {serialInputs.map((val, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg">
                      <span className="w-6 text-[11px] font-mono font-bold text-slate-500 text-center">
                        #{idx + 1}
                      </span>
                      <Hash className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <input
                        type="text"
                        required
                        value={val}
                        onChange={(e) => handleSerialChange(idx, e.target.value)}
                        placeholder="SN-XXXXX"
                        className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Omborchi izohi (ixtiyoriy)
                </label>
                <input
                  type="text"
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  placeholder="Masalan: Bosh ombor, 3-seksiya, A-polka"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setSelectedTask(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Bekor qilish
                </button>

                <button
                  type="button"
                  onClick={handleSaveSerials}
                  className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm shadow-emerald-600/20 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Seriyalarni va ijara narxini tasdiqlash</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center bg-white border border-dashed border-slate-300 rounded-xl h-full flex flex-col justify-center items-center">
              <QrCode className="w-12 h-12 text-slate-300 mb-3" />
              <h3 className="text-sm font-bold text-slate-700">Mahsulot tanlanmagan</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                Chap tomondagi ro'yxatdan mahsulot ustiga bosing va uning seriya raqamlari hamda ijara narxini kiritishni boshlang.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* SINGLE INTAKE AUDIT LOG MODAL */}
      {selectedAuditIntake && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Audit Tarixi: {selectedAuditIntake.id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedAuditIntake(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto text-xs">
              {(!selectedAuditIntake.auditLogs || selectedAuditIntake.auditLogs.length === 0) ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-500">
                  Tarix ma'lumotlari mavjud emas.
                </div>
              ) : (
                selectedAuditIntake.auditLogs.map((log) => (
                  <div key={log.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <div className="flex items-center justify-between text-slate-500 text-[11px]">
                      <span className="font-bold text-indigo-700">{log.action}</span>
                      <span className="font-mono">{log.timestamp}</span>
                    </div>
                    <div className="text-slate-800 font-medium">{log.details}</div>
                    <div className="text-[10px] text-slate-500">Operator: {log.operator}</div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-200">
              <button
                onClick={() => setSelectedAuditIntake(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-semibold text-xs cursor-pointer"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ALL PLACEMENT & INTAKE AUDIT LOGS MODAL */}
      {showAllPlacementLogs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Joylashtirish va Kirimlar Audit Jurnali
                  </h3>
                  <div className="text-xs text-slate-500">
                    Kim, qachon va qaysi kirim yoki seriyalarni o'zgartirganligi tarixi
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowAllPlacementLogs(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 max-h-96 overflow-y-auto text-xs">
              {allPlacementLogs.length === 0 ? (
                <div className="p-6 text-center bg-slate-50 border border-slate-200 rounded-xl text-slate-500">
                  Hozircha audit yozuvlari mavjud emas.
                </div>
              ) : (
                allPlacementLogs.map((log) => (
                  <div key={log.logId} className="p-3 bg-slate-50 hover:bg-indigo-50/40 border border-slate-200 rounded-xl space-y-1 transition-colors">
                    <div className="flex items-center justify-between text-slate-500 text-[11px]">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded font-bold">
                          {log.action}
                        </span>
                        <span className="font-mono text-slate-700 font-bold">
                          Kirim: {log.intakeId}
                        </span>
                      </div>
                      <span className="font-mono text-slate-500">{log.timestamp}</span>
                    </div>
                    <div className="text-slate-800 font-medium pl-1">{log.details}</div>
                    <div className="text-[10px] text-slate-500 pl-1">Mas'ul xodim: <span className="font-semibold text-slate-700">{log.operator}</span></div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-200">
              <button
                onClick={() => setShowAllPlacementLogs(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-semibold text-xs cursor-pointer"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
