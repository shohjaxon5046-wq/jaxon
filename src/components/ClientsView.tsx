import React, { useState } from 'react';
import {
  Users,
  Plus,
  Search,
  Phone,
  Calendar,
  X,
  CreditCard,
  Building,
  Eye,
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { Client, Language, Order } from '../types';
import { formatUZS } from '../utils/pricing';

interface Props {
  language: Language;
  clients: Client[];
  orders: Order[];
  onAddClient: (client: Client) => void;
  onViewOrderDetails?: (order: Order) => void;
}

export const ClientsView: React.FC<Props> = ({
  language,
  clients,
  orders,
  onAddClient,
  onViewOrderDetails
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClientForHistory, setSelectedClientForHistory] = useState<Client | null>(null);
  const [clientHistoryFilter, setClientHistoryFilter] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [address, setAddress] = useState('');
  const [passportOrInn, setPassportOrInn] = useState('');

  const handleCreateClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) return;

    const newClient: Client = {
      id: `client-${Date.now()}`,
      fullName: fullName.trim(),
      phone: phone.trim(),
      companyName: companyName.trim() || undefined,
      address: address.trim() || 'Toshkent shahar',
      passportOrInn: passportOrInn.trim() || undefined,
      totalOrdersCount: 0,
      totalSpentUZS: 0,
      currentBalanceUZS: 0,
      activeRentalsCount: 0,
      createdAt: new Date().toISOString().slice(0, 10)
    };

    onAddClient(newClient);
    setIsAddModalOpen(false);
    setFullName('');
    setPhone('');
    setCompanyName('');
    setAddress('');
    setPassportOrInn('');
  };

  const filteredClients = clients.filter(
    (c) =>
      c.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      (c.companyName && c.companyName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Orders for selected client
  const clientOrders = React.useMemo(() => {
    if (!selectedClientForHistory) return [];
    return orders.filter((o) => o.clientId === selectedClientForHistory.id);
  }, [orders, selectedClientForHistory]);

  // Filtered orders inside client profile ("zakaz nomeri mahsulotni yozsa mijozga kirip shu zakaz chiqsin")
  const filteredClientOrders = React.useMemo(() => {
    if (!clientHistoryFilter.trim()) return clientOrders;
    const q = clientHistoryFilter.toLowerCase();
    return clientOrders.filter(
      (ord) =>
        ord.id.toLowerCase().includes(q) ||
        ord.tools.some((t) => t.productName.toLowerCase().includes(q) || t.serialNumber.toLowerCase().includes(q))
    );
  }, [clientOrders, clientHistoryFilter]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <span>Mijozlar</span>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {clients.length} ta
            </span>
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Mijozlar ro'yxati. Mijoz ustiga bosilganda uning barcha ijara tarixi ko'rinadi
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm shadow-blue-500/20 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>+ Yangi mijoz</span>
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
            placeholder="Mijoz ismi, telefon yoki kompaniya..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* CLIENTS TABLE */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Mijoz (F.I.O)</th>
                <th className="py-3 px-4">Telefon</th>
                <th className="py-3 px-4">Kompaniya / Korxona</th>
                <th className="py-3 px-4">Manzil</th>
                <th className="py-3 px-4 text-center">Faol ijaralar</th>
                <th className="py-3 px-4 text-center">Jami buyurtmalar</th>
                <th className="py-3 px-4 text-right">Jami tushum (so'm)</th>
                <th className="py-3 px-4 text-center">Ijara tarixi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    Mijozlar mavjud emas. Yuqoridagi "+ Yangi mijoz" tugmasi orqali qo'shing.
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => {
                  return (
                    <tr
                      key={client.id}
                      onClick={() => {
                        setSelectedClientForHistory(client);
                        setClientHistoryFilter('');
                      }}
                      className="hover:bg-blue-50/50 transition-colors cursor-pointer"
                      title="Mijozning barcha buyurtmalarini ko'rish uchun bosing"
                    >
                      <td className="py-3 px-4 font-bold text-slate-900 text-xs">
                        {client.fullName}
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-slate-700">
                        {client.phone}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {client.companyName || '-'}
                      </td>
                      <td className="py-3 px-4 text-slate-600 truncate max-w-xs">
                        {client.address}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          {client.activeRentalsCount} ta
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-900">
                        {client.totalOrdersCount} ta
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {formatUZS(client.totalSpentUZS)}
                      </td>
                      <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            setSelectedClientForHistory(client);
                            setClientHistoryFilter('');
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Tarix</span>
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

      {/* CLIENT RENTAL HISTORY DRAWER / MODAL (CRITICAL REQUIREMENT) */}
      {selectedClientForHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-xs">
            {/* Header */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>{selectedClientForHistory.fullName} — Ijara Tarixi</span>
                </h3>
                <div className="text-xs text-slate-500 mt-0.5">
                  Tel: {selectedClientForHistory.phone} · Manzil: {selectedClientForHistory.address}
                </div>
              </div>
              <button
                onClick={() => setSelectedClientForHistory(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Input Inside Client Profile ("zakaz nomeri mahsulotni yozsa mijozga kirip shu zakaz chiqsin") */}
            <div className="p-4 border-b border-slate-200 bg-white">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={clientHistoryFilter}
                  onChange={(e) => setClientHistoryFilter(e.target.value)}
                  placeholder="Shu mijoz ichida qidirish: Zakaz nomeri (ORD-...) yoki Mahsulot nomi..."
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Orders List */}
            <div className="p-5 overflow-y-auto space-y-3 flex-1">
              {filteredClientOrders.length === 0 ? (
                <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  Buyurtmalar topilmadi.
                </div>
              ) : (
                filteredClientOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-blue-700 text-xs">
                          {ord.id}
                        </span>
                        <span className="text-[11px] text-slate-500">Sana: {ord.orderDate}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white border border-slate-300">
                          {ord.status === 'active' ? 'Obyektda' : ord.status === 'completed' ? 'Qaytarilgan' : ord.status}
                        </span>
                        <div className="font-mono font-bold text-slate-900 text-xs">
                          {formatUZS(ord.grandTotalUZS)}
                        </div>
                      </div>
                    </div>

                    {/* Tools rented in this order */}
                    <div className="space-y-1 pt-1 border-t border-slate-200 text-[11px]">
                      <div className="font-bold text-slate-700">Olingan uskunalar:</div>
                      {ord.tools.map((tool, idx) => (
                        <div key={idx} className="flex justify-between items-center text-slate-800 bg-white p-1.5 rounded border border-slate-200">
                          <div>
                            <strong>{tool.productName}</strong>
                            <span className="text-slate-500 font-mono text-[10px] ml-1.5">
                              (SN: {tool.serialNumber})
                            </span>
                          </div>
                          <span className="text-blue-700 font-mono font-semibold">
                            {tool.durationDays} kun ({formatUZS(tool.totalUZS)})
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Services used */}
                    {(ord.wasteServices.length > 0 || ord.craneServices.length > 0 || ord.loaderServices.length > 0) && (
                      <div className="text-[11px] text-slate-600">
                        <strong>Xizmatlar: </strong>
                        {ord.wasteServices.map((w) => w.truckName).join(', ')}
                        {ord.craneServices.map((c) => c.craneName).join(', ')}
                        {ord.loaderServices.length > 0 && 'Yuk tashuvchilar (Gruschik)'}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedClientForHistory(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD CLIENT MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Yangi Mijoz Qo'shish</h3>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateClient} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Mijoz to'liq ismi (F.I.O) *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Masalan: Sardor Rustamov"
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
                  placeholder="+998 90 123 45 67"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Kompaniya / Korxona nomi (ixtiyoriy)
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="MChJ, Stroy Kompaniya..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Manzil</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Toshkent shahar, manzil..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
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
                  Mijozni saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
