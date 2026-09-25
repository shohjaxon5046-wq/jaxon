import React, { useState } from 'react';
import {
  Briefcase,
  Plus,
  Search,
  Phone,
  DollarSign,
  TrendingUp,
  X,
  Eye,
  ShoppingCart
} from 'lucide-react';
import { Language, Order, Salesperson } from '../types';
import { formatUZS } from '../utils/pricing';

interface Props {
  language: Language;
  salespersons: Salesperson[];
  orders?: Order[];
  onAddSalesperson: (person: Salesperson) => void;
  onViewOrderDetails?: (ord: Order) => void;
}

export const SalespersonsView: React.FC<Props> = ({
  language,
  salespersons,
  orders = [],
  onAddSalesperson,
  onViewOrderDetails
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSalespersonForOrders, setSelectedSalespersonForOrders] = useState<Salesperson | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('Savdo menejeri');
  const [commissionRate, setCommissionRate] = useState<number>(5);

  const handleCreateSalesperson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) return;

    const newPerson: Salesperson = {
      id: `sales-${Date.now()}`,
      fullName: fullName.trim(),
      phone: phone.trim(),
      role,
      commissionRatePercent: commissionRate,
      activeDealsCount: 0,
      totalRevenueUZS: 0,
      status: 'active'
    };

    onAddSalesperson(newPerson);
    setIsAddModalOpen(false);
    setFullName('');
    setPhone('');
  };

  const filteredSalespersons = salespersons.filter(
    (s) =>
      s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.phone.includes(searchQuery)
  );

  // Orders handled by selected salesperson
  const salespersonOrders = React.useMemo(() => {
    if (!selectedSalespersonForOrders) return [];
    return orders.filter((o) => o.salespersonId === selectedSalespersonForOrders.id);
  }, [orders, selectedSalespersonForOrders]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-blue-600" />
            <span>Sotuvchilar (Menejerlar)</span>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {salespersons.length} kishi
            </span>
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Menejerlar faoliyati, shartnomalari va qachon nima sotganligi nazorati
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm shadow-blue-500/20 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>+ Yangi sotuvchi qo'shish</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Sotuvchi ismi yoki telefon..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Sotuvchi (F.I.O)</th>
                <th className="py-3 px-4">Lavozimi</th>
                <th className="py-3 px-4">Telefon</th>
                <th className="py-3 px-4 text-center">Komissiya (%)</th>
                <th className="py-3 px-4 text-center">Bitimlar soni</th>
                <th className="py-3 px-4 text-right">Jami Tushum</th>
                <th className="py-3 px-4 text-center">Sotuvlar tarixi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSalespersons.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    Sotuvchilar topilmadi.
                  </td>
                </tr>
              ) : (
                filteredSalespersons.map((person) => {
                  return (
                    <tr
                      key={person.id}
                      onClick={() => setSelectedSalespersonForOrders(person)}
                      className="hover:bg-blue-50/50 transition-colors cursor-pointer"
                      title="Qachon nima sotganini ko'rish uchun bosing"
                    >
                      <td className="py-3 px-4 font-bold text-slate-900 text-xs">
                        {person.fullName}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{person.role}</td>
                      <td className="py-3 px-4 font-mono text-slate-700">{person.phone}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-blue-700">
                        {person.commissionRatePercent}%
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-900">
                        {person.activeDealsCount} ta
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {formatUZS(person.totalRevenueUZS)}
                      </td>
                      <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedSalespersonForOrders(person)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Bitimlar</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SALESPERSON ORDERS HISTORY MODAL ("sotuvchi da xam shunaqa qachon nima sotkan zakazlarni kora olish kerak") */}
      {selectedSalespersonForOrders && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-xs">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-blue-600" />
                  <span>{selectedSalespersonForOrders.fullName} — Sotuvlar va Bitimlar</span>
                </h3>
                <div className="text-xs text-slate-500 mt-0.5">
                  Tel: {selectedSalespersonForOrders.phone} · Komissiya: {selectedSalespersonForOrders.commissionRatePercent}%
                </div>
              </div>
              <button
                onClick={() => setSelectedSalespersonForOrders(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3 flex-1">
              {salespersonOrders.length === 0 ? (
                <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  Bu sotuvchi tomonidan hali buyurtmalar rasmiylashtirilmagan.
                </div>
              ) : (
                salespersonOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-blue-700 text-xs">{ord.id}</span>
                        <span className="text-slate-500 text-[11px]">Sana: {ord.orderDate}</span>
                      </div>
                      <div className="font-mono font-bold text-slate-900">
                        {formatUZS(ord.grandTotalUZS)}
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-700">
                      <strong>Mijoz:</strong> {ord.clientName} ({ord.clientPhone})
                    </div>

                    <div className="space-y-1 text-[11px]">
                      <div className="font-bold text-slate-600">Sotilgan/Ijaraga berilgan asboblar:</div>
                      {ord.tools.map((t, idx) => (
                        <div key={idx} className="flex justify-between bg-white p-1.5 rounded border border-slate-200">
                          <span>{t.productName} (SN: {t.serialNumber})</span>
                          <span className="font-mono text-blue-700">{formatUZS(t.totalUZS)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedSalespersonForOrders(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Yangi Sotuvchi Qo'shish</h3>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSalesperson} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">To'liq ismi (F.I.O) *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Masalan: Jamshid Aliyev"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Telefon raqami *</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+998 90 999 88 77"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Lavozimi</label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Komissiya stavkasi (%)</label>
                <input
                  type="number"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg shadow-sm"
                >
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
