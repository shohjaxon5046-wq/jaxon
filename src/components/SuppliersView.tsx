import React, { useState, useMemo } from 'react';
import {
  Building2,
  Plus,
  Search,
  Phone,
  DollarSign,
  TrendingDown,
  TrendingUp,
  CreditCard,
  FileSpreadsheet,
  Calendar,
  Eye,
  Edit2,
  Trash2,
  X,
  CheckCircle,
  Clock,
  ArrowRight,
  Package,
  Layers,
  FileText,
  AlertTriangle
} from 'lucide-react';
import { IntakeRecord, Language, Supplier, SupplierTransaction } from '../types';
import { formatUZS } from '../utils/pricing';
import { AppStorage } from '../services/storage';
import * as XLSX from 'xlsx';

interface Props {
  language: Language;
  suppliers: Supplier[];
  intakeRecords: IntakeRecord[];
  currentUser: string;
  onSaveSuppliers: (suppliers: Supplier[]) => void;
  onDeleteSupplier?: (id: string, name: string) => void;
  onInspectIntake?: (intake: IntakeRecord) => void;
}

export const SuppliersView: React.FC<Props> = ({
  language,
  suppliers,
  intakeRecords,
  currentUser,
  onSaveSuppliers,
  onDeleteSupplier,
  onInspectIntake
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSupplierForDetails, setSelectedSupplierForDetails] = useState<Supplier | null>(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentSupplier, setPaymentSupplier] = useState<Supplier | null>(null);

  // Deletion modals state
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  const [txToDelete, setTxToDelete] = useState<{ supplier: Supplier; transaction: SupplierTransaction } | null>(null);

  // Persisted deleted suppliers list
  const [deletedSuppliers, setDeletedSuppliers] = useState<string[]>(() => {
    return AppStorage.getDeletedSuppliers();
  });

  // Add/Edit Form State
  const [formName, setFormName] = useState('');
  const [formContactPerson, setFormContactPerson] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Payment Form State
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));

  // Compute live totals from intakes for accuracy (including auto-discovered suppliers from intakes, excluding deleted)
  const suppliersWithLiveData = useMemo(() => {
    const deletedSet = new Set(deletedSuppliers.map((d) => d.toLowerCase().trim()));
    const map = new Map<string, Supplier>();

    suppliers.forEach((s) => {
      const k = s.name.toLowerCase().trim();
      if (!deletedSet.has(k) && !deletedSet.has(s.id.toLowerCase())) {
        map.set(k, { ...s });
      }
    });

    // Auto-discover any suppliers from active intake records (exclude deleted ones)
    const activeIntakes = intakeRecords.filter((r) => r.status !== 'deleted');

    activeIntakes.forEach((r) => {
      const nameKey = r.supplier?.toLowerCase().trim();
      if (nameKey && !deletedSet.has(nameKey) && !map.has(nameKey)) {
        map.set(nameKey, {
          id: `supp-auto-${nameKey.replace(/[^a-z0-9]/g, '-')}`,
          name: r.supplier.trim(),
          contactPerson: 'Mas’ul shaxs',
          phone: '—',
          address: r.warehouse || 'Toshkent',
          totalSuppliedUZS: 0,
          totalPaidUZS: 0,
          balanceUZS: 0,
          notes: 'Kirim hujjati orqali avtomatik aniqlangan',
          createdAt: r.date ? r.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
          transactions: []
        });
      }
    });

    const allSuppliers = Array.from(map.values());

    return allSuppliers.map((supp) => {
      // Find all active intakes for this supplier
      const suppIntakes = activeIntakes.filter(
        (r) => r.supplier?.toLowerCase().trim() === supp.name.toLowerCase().trim()
      );
      const totalSupplied = suppIntakes.reduce((sum, r) => sum + r.totalAmountUZS, 0);
      const totalPaid = supp.totalPaidUZS || 0;
      // Balance: positive = overpaid/credit, negative = we owe them
      const balance = totalPaid - totalSupplied;

      return {
        ...supp,
        totalSuppliedUZS: totalSupplied,
        balanceUZS: balance,
        intakesCount: suppIntakes.length
      };
    });
  }, [suppliers, intakeRecords, deletedSuppliers]);

  // Overall KPI metrics
  const totalTurnover = suppliersWithLiveData.reduce((sum, s) => sum + s.totalSuppliedUZS, 0);
  const totalPaidSum = suppliersWithLiveData.reduce((sum, s) => sum + s.totalPaidUZS, 0);
  const totalDebtSum = suppliersWithLiveData.reduce((sum, s) => {
    const debt = s.totalSuppliedUZS - s.totalPaidUZS;
    return debt > 0 ? sum + debt : sum;
  }, 0);

  // Filtered suppliers
  const filteredSuppliers = useMemo(() => {
    return suppliersWithLiveData.filter(
      (s) =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.phone.includes(searchQuery)
    );
  }, [suppliersWithLiveData, searchQuery]);

  // Create Supplier
  const handleCreateSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const newSupp: Supplier = {
      id: `supp-${Date.now()}`,
      name: formName.trim(),
      contactPerson: formContactPerson.trim() || formName.trim(),
      phone: formPhone.trim() || '+998',
      address: formAddress.trim() || "Toshkent shahri",
      totalSuppliedUZS: 0,
      totalPaidUZS: 0,
      balanceUZS: 0,
      notes: formNotes.trim(),
      createdAt: new Date().toISOString().slice(0, 10),
      transactions: []
    };

    onSaveSuppliers([...suppliers, newSupp]);
    setIsAddModalOpen(false);
    setFormName('');
    setFormContactPerson('');
    setFormPhone('');
    setFormAddress('');
    setFormNotes('');
  };

  // Edit Supplier
  const handleSaveEditedSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier || !formName.trim()) return;

    const updated = suppliers.map((s) =>
      s.id === editingSupplier.id
        ? {
            ...s,
            name: formName.trim(),
            contactPerson: formContactPerson.trim(),
            phone: formPhone.trim(),
            address: formAddress.trim(),
            notes: formNotes.trim()
          }
        : s
    );

    onSaveSuppliers(updated);
    setEditingSupplier(null);
  };

  // Delete Supplier Confirmation Handlers
  const handleConfirmDeleteSupplier = () => {
    if (!supplierToDelete) return;

    const id = supplierToDelete.id;
    const nameKey = supplierToDelete.name.toLowerCase().trim();

    // 1. Update deletedSuppliers set in state & AppStorage so auto-discovery won't resurrect it
    const nextDeleted = Array.from(new Set([...deletedSuppliers, nameKey, id]));
    setDeletedSuppliers(nextDeleted);
    AppStorage.saveDeletedSuppliers(nextDeleted);

    // 2. Remove from suppliers list & save
    const updated = suppliers.filter(
      (s) => s.id !== id && s.name.toLowerCase().trim() !== nameKey
    );
    onSaveSuppliers(updated);

    if (onDeleteSupplier) {
      onDeleteSupplier(id, supplierToDelete.name);
    }

    if (
      selectedSupplierForDetails?.id === id ||
      selectedSupplierForDetails?.name.toLowerCase().trim() === nameKey
    ) {
      setSelectedSupplierForDetails(null);
    }

    setSupplierToDelete(null);
  };

  // Delete Transaction Handler
  const handleConfirmDeleteTransaction = () => {
    if (!txToDelete) return;
    const { supplier: supp, transaction: tx } = txToDelete;

    const prevTxs = supp.transactions || [];
    const updatedTxs = prevTxs.filter((t) => t.id !== tx.id);
    const newPaid = updatedTxs.reduce((sum, t) => sum + (t.amountUZS || 0), 0);
    const currentSupplied = supp.totalSuppliedUZS || 0;

    const updatedSupplier: Supplier = {
      ...supp,
      totalPaidUZS: newPaid,
      balanceUZS: newPaid - currentSupplied,
      transactions: updatedTxs
    };

    const exists = suppliers.some(
      (s) => s.id === supp.id || s.name.toLowerCase().trim() === supp.name.toLowerCase().trim()
    );
    let updatedList: Supplier[];
    if (exists) {
      updatedList = suppliers.map((s) =>
        s.id === supp.id || s.name.toLowerCase().trim() === supp.name.toLowerCase().trim()
          ? updatedSupplier
          : s
      );
    } else {
      updatedList = [...suppliers, updatedSupplier];
    }

    onSaveSuppliers(updatedList);
    setSelectedSupplierForDetails(updatedSupplier);
    setTxToDelete(null);
  };

  // Open Record Payment Modal
  const handleOpenPayment = (supp: Supplier) => {
    setPaymentSupplier(supp);
    setPaymentAmount('');
    setPaymentMethod('bank_transfer');
    setPaymentNotes('');
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setIsPaymentModalOpen(true);
  };

  // Submit Payment
  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentSupplier) return;

    const amount = parseFloat(paymentAmount) || 0;
    if (amount <= 0) {
      alert("Iltimos, to'g'ri to'lov summasini kiriting!");
      return;
    }

    const newTx: SupplierTransaction = {
      id: `tx-${Date.now()}`,
      date: paymentDate,
      type: 'payment',
      amountUZS: amount,
      paymentMethod: paymentMethod === 'cash' ? 'Naqd pul' : paymentMethod === 'bank_transfer' ? 'Bank o‘tkazmasi' : 'Korporativ karta',
      notes: paymentNotes.trim() || "Yetkazib beruvchiga to'lov",
      operator: currentUser
    };

    const exists = suppliers.some((s) => s.id === paymentSupplier.id);
    let updated: Supplier[];

    if (exists) {
      updated = suppliers.map((s) => {
        if (s.id === paymentSupplier.id) {
          const prevPaid = s.totalPaidUZS || 0;
          const newPaid = prevPaid + amount;
          const currentSupplied = s.totalSuppliedUZS || 0;
          const prevTxs = s.transactions || [];
          return {
            ...s,
            totalPaidUZS: newPaid,
            balanceUZS: newPaid - currentSupplied,
            transactions: [newTx, ...prevTxs]
          };
        }
        return s;
      });
    } else {
      const baseSupp: Supplier = {
        ...paymentSupplier,
        totalPaidUZS: amount,
        balanceUZS: amount - (paymentSupplier.totalSuppliedUZS || 0),
        transactions: [newTx]
      };
      updated = [...suppliers, baseSupp];
    }

    onSaveSuppliers(updated);
    setIsPaymentModalOpen(false);

    // Update opened modal state if open
    if (selectedSupplierForDetails?.id === paymentSupplier.id) {
      const updatedCurrent = updated.find((s) => s.id === paymentSupplier.id);
      if (updatedCurrent) setSelectedSupplierForDetails(updatedCurrent);
    }
  };

  // Export Supplier Summary to Excel
  const handleExportSuppliersExcel = () => {
    const rows = suppliersWithLiveData.map((s, idx) => ({
      '№': idx + 1,
      'Yetkazib beruvchi': s.name,
      'Mas‘ul shaxs': s.contactPerson,
      'Telefon': s.phone,
      'Manzil': s.address || '-',
      'Jami yetkazib berilgan (so‘m)': s.totalSuppliedUZS,
      'To‘langan mablag‘ (so‘m)': s.totalPaidUZS,
      'Qoldiq qarzimiz (so‘m)': s.totalSuppliedUZS > s.totalPaidUZS ? s.totalSuppliedUZS - s.totalPaidUZS : 0,
      'Holati': s.totalSuppliedUZS > s.totalPaidUZS ? 'Qarzdorlik mavjud' : 'To‘langan / Avans',
      'Izoh': s.notes || '-'
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 6 },
      { wch: 30 },
      { wch: 22 },
      { wch: 18 },
      { wch: 26 },
      { wch: 24 },
      { wch: 22 },
      { wch: 22 },
      { wch: 20 },
      { wch: 25 }
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Yetkazib_beruvchilar');
    XLSX.writeFile(wb, `Shohrent_Yetkazib_Beruvchilar_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            <span>Yetkazib beruvchilar (Xisob-kitob va Analitika)</span>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {suppliers.length} ta hamkor
            </span>
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Yetkazib beruvchilar bilan to'lovlar, qarzdorliklar va mahsulotlar qabul qilish tarixi
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportSuppliersExcel}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-300 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Hisobotni Excelga yuklash</span>
          </button>

          <button
            onClick={() => {
              setFormName('');
              setFormContactPerson('');
              setFormPhone('');
              setFormAddress('');
              setFormNotes('');
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Yangi yetkazib beruvchi</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Jami xaridlar (Kirimlar):</span>
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-lg font-bold font-mono text-slate-900">
            {formatUZS(totalTurnover)}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Barcha qabul qilingan tovarlar summasi</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">To'langan mablag':</span>
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-lg font-bold font-mono text-emerald-700">
            {formatUZS(totalPaidSum)}
          </div>
          <span className="text-[11px] text-emerald-600 mt-1 block">Yetkazib beruvchilarga berilgan pul</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Bizning umumiy qarzimiz:</span>
            <div className="p-2 bg-rose-50 rounded-lg text-rose-600">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-lg font-bold font-mono text-rose-600">
            {formatUZS(totalDebtSum)}
          </div>
          <span className="text-[11px] text-rose-500 mt-1 block">To'lanishi lozim bo'lgan qarz balansi</span>
        </div>
      </div>

      {/* Search Input */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Yetkazib beruvchi nomi, mas'ul shaxs yoki telefon raqami..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Yetkazib beruvchi</th>
                <th className="py-2.5 px-3">Mas'ul shaxs & Telefon</th>
                <th className="py-2.5 px-3 text-right">Jami xarid (Kirim)</th>
                <th className="py-2.5 px-3 text-right">To'langan summa</th>
                <th className="py-2.5 px-3 text-right">Qarz / Balans</th>
                <th className="py-2.5 px-3 text-center">Xisob-kitob</th>
                <th className="py-2.5 px-3 text-center">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">Yetkazib beruvchilar topilmadi</p>
                    <p className="text-[11px] text-slate-500 mt-1">Yangi kirim kiritilganda yoki yuqoridagi tugma orqali qo'shishingiz mumkin</p>
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((supp) => {
                  const hasDebt = supp.totalSuppliedUZS > supp.totalPaidUZS;
                  const debtAmount = supp.totalSuppliedUZS - supp.totalPaidUZS;
                  return (
                    <tr key={supp.id} className="hover:bg-slate-50">
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <Building2 className="w-4 h-4 text-slate-400" />
                          <span>{supp.name}</span>
                        </div>
                        {supp.address && (
                          <div className="text-[11px] text-slate-500 mt-0.5">{supp.address}</div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <div className="text-slate-800 font-medium">{supp.contactPerson || '-'}</div>
                        <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{supp.phone || '-'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                        {formatUZS(supp.totalSuppliedUZS)}
                        <span className="block text-[10px] text-slate-400 font-normal">
                          {supp.intakesCount || 0} ta kirim
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                        {formatUZS(supp.totalPaidUZS)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono">
                        {hasDebt ? (
                          <span className="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            -{formatUZS(debtAmount)}
                          </span>
                        ) : (
                          <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            0 so'm (To'liq)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenPayment(supp)}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded text-xs font-bold transition-colors cursor-pointer"
                            title="Yetkazib beruvchiga to'lov kiritish"
                          >
                            + To'lov
                          </button>
                          <button
                            onClick={() => setSelectedSupplierForDetails(supp)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                            title="Tarix va xisob-kitobni ko'rish"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => {
                              setEditingSupplier(supp);
                              setFormName(supp.name);
                              setFormContactPerson(supp.contactPerson);
                              setFormPhone(supp.phone);
                              setFormAddress(supp.address || '');
                              setFormNotes(supp.notes || '');
                            }}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded cursor-pointer"
                            title="Tahrirlash"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSupplierToDelete(supp);
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer transition-colors"
                            title="Yetkazib beruvchini o'chirish"
                            aria-label={`${supp.name} yetkazib beruvchisini o'chirish`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: SUPPLIER DETAILS & SETTLEMENT HISTORY */}
      {selectedSupplierForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-4xl max-h-[90vh] bg-white border border-slate-300 rounded-2xl shadow-xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-100 rounded-lg text-blue-700">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{selectedSupplierForDetails.name}</h3>
                  <div className="text-xs text-slate-500 flex items-center gap-3 mt-0.5">
                    <span>Mas'ul: {selectedSupplierForDetails.contactPerson}</span>
                    <span>Tel: {selectedSupplierForDetails.phone}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenPayment(selectedSupplierForDetails)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>To'lov kiritish</span>
                </button>
                <button
                  onClick={() => setSelectedSupplierForDetails(null)}
                  className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Financial Status Summary */}
            <div className="grid grid-cols-3 gap-3 p-4 bg-slate-100/60 border-b border-slate-200 text-xs">
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-slate-500">Jami xarid (Kirimlar):</span>
                <div className="font-mono font-bold text-slate-900 text-sm mt-0.5">
                  {formatUZS(selectedSupplierForDetails.totalSuppliedUZS)}
                </div>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-slate-500">To'langan mablag':</span>
                <div className="font-mono font-bold text-emerald-700 text-sm mt-0.5">
                  {formatUZS(selectedSupplierForDetails.totalPaidUZS)}
                </div>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-slate-500">Qoldiq qarzimiz:</span>
                <div className="font-mono font-bold text-sm mt-0.5">
                  {selectedSupplierForDetails.totalSuppliedUZS > selectedSupplierForDetails.totalPaidUZS ? (
                    <span className="text-rose-600">
                      {formatUZS(selectedSupplierForDetails.totalSuppliedUZS - selectedSupplierForDetails.totalPaidUZS)}
                    </span>
                  ) : (
                    <span className="text-emerald-700">0 so'm (Qarz yo'q)</span>
                  )}
                </div>
              </div>
            </div>

            {/* Tabs / Content: Intakes & Payment Transactions */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {/* 1. KIRIMLAR TARIXI */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-blue-600" />
                  <span>Keltirilgan tovarlar va kirimlar</span>
                </h4>
                {intakeRecords.filter((r) => r.supplier.toLowerCase().trim() === selectedSupplierForDetails.name.toLowerCase().trim()).length === 0 ? (
                  <p className="text-xs text-slate-500 py-3 text-center bg-slate-50 rounded-lg border border-slate-100">
                    Ushbu yetkazib beruvchidan hali kirim qabul qilinmagan.
                  </p>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-3">Kirim ID</th>
                          <th className="py-2 px-3">Sana</th>
                          <th className="py-2 px-3">Ombor</th>
                          <th className="py-2 px-3">Tovarlar</th>
                          <th className="py-2 px-3 text-right">Summa</th>
                          <th className="py-2 px-3 text-center">Batafsil</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {intakeRecords
                          .filter((r) => r.supplier.toLowerCase().trim() === selectedSupplierForDetails.name.toLowerCase().trim())
                          .map((rec) => (
                            <tr key={rec.id} className="hover:bg-slate-50">
                              <td className="py-2 px-3 font-mono font-bold text-blue-700">{rec.id}</td>
                              <td className="py-2 px-3 text-slate-600">{rec.date}</td>
                              <td className="py-2 px-3 text-slate-600">{rec.warehouse || 'Bosh ombor'}</td>
                              <td className="py-2 px-3 text-slate-800">
                                {rec.items.map((i) => `${i.productName} (${i.quantity} dona)`).join(', ')}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                                {formatUZS(rec.totalAmountUZS)}
                              </td>
                              <td className="py-2 px-3 text-center">
                                {onInspectIntake && (
                                  <button
                                    onClick={() => onInspectIntake(rec)}
                                    className="p-1 text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                                    title="Kirimni ochish"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* 2. TO'LOVLAR TARIXI */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-emerald-600" />
                    <span>To'langan mablag'lar tarixi</span>
                  </h4>
                  <button
                    onClick={() => handleOpenPayment(selectedSupplierForDetails)}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
                  >
                    + Yangi to'lov
                  </button>
                </div>

                {!selectedSupplierForDetails.transactions || selectedSupplierForDetails.transactions.length === 0 ? (
                  <p className="text-xs text-slate-500 py-3 text-center bg-slate-50 rounded-lg border border-slate-100">
                    To'lovlar tarixi mavjud emas. Yuqoridagi "+ To'lov kiritish" tugmasi orqali yozib boring.
                  </p>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-3">Sana</th>
                          <th className="py-2 px-3">To'lov turi</th>
                          <th className="py-2 px-3">Izoh</th>
                          <th className="py-2 px-3">Operator</th>
                          <th className="py-2 px-3 text-right">Summa (so'm)</th>
                          <th className="py-2 px-3 text-center">Amallar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedSupplierForDetails.transactions.map((tx) => (
                          <tr key={tx.id} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-mono text-slate-700">{tx.date}</td>
                            <td className="py-2 px-3 text-slate-800 font-medium">{tx.paymentMethod || 'Bank o‘tkazmasi'}</td>
                            <td className="py-2 px-3 text-slate-600">{tx.notes || '-'}</td>
                            <td className="py-2 px-3 text-slate-500">{tx.operator || '-'}</td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                              +{formatUZS(tx.amountUZS)}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => setTxToDelete({ supplier: selectedSupplierForDetails, transaction: tx })}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer transition-colors"
                                title="To'lov yozuvini o'chirish"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedSupplierForDetails(null)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold cursor-pointer"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT SUPPLIER */}
      {(isAddModalOpen || editingSupplier) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white border border-slate-300 rounded-2xl shadow-xl overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  {editingSupplier ? "Yetkazib Beruvchini Tahrirlash" : "Yangi Yetkazib Beruvchi Qo'shish"}
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingSupplier(null);
                }}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={editingSupplier ? handleSaveEditedSupplier : handleCreateSupplier}
              className="p-4 space-y-3.5 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-700 mb-1">Yetkazib beruvchi / Tashkilot nomi *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Masalan: Bosch Professional Uzbekistan"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mas'ul shaxs</label>
                  <input
                    type="text"
                    value={formContactPerson}
                    onChange={(e) => setFormContactPerson(e.target.value)}
                    placeholder="Menejer ismi"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Telefon raqami</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+998 90 123 45 67"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Manzil</label>
                <input
                  type="text"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="Masalan: Toshkent sh., Chilonzor tumani"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Qo'shimcha izoh</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Shartnoma shartlari, tovarlar turi yoki bank rekvizitlari..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingSupplier(null);
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs cursor-pointer"
                >
                  {editingSupplier ? "O'zgarishlarni saqlash" : "Qo'shish"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RECORD PAYMENT */}
      {isPaymentModalOpen && paymentSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white border border-slate-300 rounded-2xl shadow-xl overflow-hidden">
            <div className="p-4 bg-emerald-50 border-b border-emerald-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-700" />
                <h3 className="text-sm font-bold text-emerald-950">Yetkazib Beruvchiga To'lov Kiritish</h3>
              </div>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitPayment} className="p-4 space-y-3.5 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900">{paymentSupplier.name}</div>
                <div className="text-[11px] text-slate-500">
                  Bizning qoldiq qarzimiz:{' '}
                  <span className="font-mono font-bold text-rose-600">
                    {paymentSupplier.totalSuppliedUZS > paymentSupplier.totalPaidUZS
                      ? formatUZS(paymentSupplier.totalSuppliedUZS - paymentSupplier.totalPaidUZS)
                      : "0 so'm"}
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">To'lov summasi (so'm) *</label>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Masalan: 5000000"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold text-base"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">To'lov sanasi *</label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">To'lov turi *</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  >
                    <option value="bank_transfer">Bank o'tkazmasi</option>
                    <option value="cash">Naqd pul</option>
                    <option value="card">Korporativ karta</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Izoh / To'lov maqsadi</label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="To'lov topshirig'i raqami yoki boshqa izoh..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-xs cursor-pointer"
                >
                  To'lovni tasdiqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL (SUPPLIER) */}
      {supplierToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white border border-slate-300 rounded-2xl shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-100 text-rose-600 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Yetkazib beruvchini o'chirish
                </h3>
                <p className="text-xs text-slate-500">
                  Ushbu amal yetkazib beruvchini tizimdan butunlay o'chiradi
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Tashkilot nomi:</span>
                <span className="font-bold text-slate-900">{supplierToDelete.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Mas'ul shaxs:</span>
                <span className="text-slate-800">{supplierToDelete.contactPerson || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Telefon:</span>
                <span className="text-slate-800 font-mono">{supplierToDelete.phone || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Jami keltirilgan:</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatUZS(supplierToDelete.totalSuppliedUZS)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">To'langan summa:</span>
                <span className="font-mono font-bold text-emerald-700">
                  {formatUZS(supplierToDelete.totalPaidUZS)}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1.5">
                <span className="text-slate-500 font-medium">Balans (Qarzdorlik):</span>
                <span
                  className={`font-mono font-bold ${
                    supplierToDelete.balanceUZS < 0
                      ? 'text-rose-600'
                      : supplierToDelete.balanceUZS > 0
                      ? 'text-blue-600'
                      : 'text-slate-700'
                  }`}
                >
                  {supplierToDelete.balanceUZS < 0
                    ? `-${formatUZS(Math.abs(supplierToDelete.balanceUZS))}`
                    : formatUZS(supplierToDelete.balanceUZS)}
                </span>
              </div>
            </div>

            {supplierToDelete.balanceUZS < 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Diqqat:</strong> Ushbu yetkazib beruvchi bo'yicha to'lanmagan qarzdorlik balansi mavjud!
                </span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setSupplierToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSupplier}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ha, o'chirish</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL (TRANSACTION) */}
      {txToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white border border-slate-300 rounded-2xl shadow-2xl p-5 space-y-3.5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-rose-100 text-rose-600 rounded-lg">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                To'lov yozuvini o'chirish
              </h3>
            </div>

            <p className="text-xs text-slate-600">
              Haqiqatan ham ushbu <strong>{formatUZS(txToDelete.transaction.amountUZS)}</strong> miqdoridagi to'lov yozuvini o'chirmoqchimisiz?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setTxToDelete(null)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteTransaction}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                O'chirish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
