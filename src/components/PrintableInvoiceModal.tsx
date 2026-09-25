import React from 'react';
import { Printer, X, Check, Building2 } from 'lucide-react';
import { Language, Order } from '../types';
import { translations } from '../i18n/translations';
import { formatUZS } from '../utils/pricing';

interface Props {
  order: Order | null;
  language: Language;
  onClose: () => void;
}

export const PrintableInvoiceModal: React.FC<Props> = ({ order, language, onClose }) => {
  if (!order) return null;
  const t = translations[language];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-4xl bg-white text-slate-900 rounded-xl shadow-2xl overflow-hidden flex flex-col my-auto border border-slate-300">
        {/* Top Controls (Hidden on Print) */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold text-amber-400">
              {order.id} — Rasmiy Shartnoma va Qabul Qilish Dalolatnomasi
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>{language === 'uz' ? 'Chop etish (Print)' : 'Печать'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Formal Document Body */}
        <div className="p-8 space-y-6 text-xs leading-relaxed font-sans text-slate-800">
          {/* Header */}
          <div className="flex justify-between items-start border-b border-slate-300 pb-6">
            <div>
              <div className="text-2xl font-black text-slate-950 tracking-tight flex items-center gap-2">
                <span>SHOHRENT</span>
                <span className="text-xs bg-slate-900 text-amber-400 px-2 py-0.5 rounded font-mono font-bold">
                  WMS LOGISTICS
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 max-w-md">
                "SHOHRENT SERVIS" MChJ · Toshkent shahri, Yunusobod tumani, 12-omborxona
                <br />
                Tel: +998 (71) 200-88-88 · www.shohrent.uz
              </p>
            </div>

            <div className="text-right">
              <div className="font-mono text-lg font-bold text-slate-950">
                {order.id}
              </div>
              <div className="text-xs text-slate-500">Sana: {order.orderDate}</div>
              <div className="text-xs font-semibold text-emerald-700 mt-1 uppercase">
                {order.status === 'active' ? 'Faol Ijara Shartnomasi' : 'Bajarilgan / Yopilgan'}
              </div>
            </div>
          </div>

          {/* Parties Meta */}
          <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Ijara Beruvchi (Kompaniya):
              </div>
              <div className="font-bold text-slate-900">"SHOHRENT SERVIS" MChJ</div>
              <div className="text-slate-600">Mas'ul Menejer: {order.salespersonName}</div>
              <div className="text-slate-600">INN: 309876543 · Toshkent sh.</div>
            </div>

            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Ijaraga Oluvchi (Buyurtmachi):
              </div>
              <div className="font-bold text-slate-900">{order.clientName}</div>
              <div className="text-slate-600 font-mono">Tel: {order.clientPhone}</div>
              <div className="text-slate-600">Obyekt manzili: {order.deliveryAddress}</div>
            </div>
          </div>

          {/* Section 1: Rented Tools with Serial Numbers */}
          {order.tools.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                1. Ijaraga Berilayotgan Asboblar va Maxsus Texnikalar (Seriyalar bo‘yicha):
              </h4>
              <table className="w-full text-left border border-slate-300 text-xs">
                <thead className="bg-slate-100 font-semibold border-b border-slate-300">
                  <tr>
                    <th className="py-2 px-3">#</th>
                    <th className="py-2 px-3">Uskuna nomi</th>
                    <th className="py-2 px-3">Artikul</th>
                    <th className="py-2 px-3">Seriya raqami (SN)</th>
                    <th className="py-2 px-3 text-center">Muddati</th>
                    <th className="py-2 px-3 text-right">Kunlik stavka</th>
                    <th className="py-2 px-3 text-right">Summa (so'm)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {order.tools.map((tool, idx) => (
                    <tr key={idx}>
                      <td className="py-2 px-3 font-mono text-slate-500">{idx + 1}</td>
                      <td className="py-2 px-3 font-medium text-slate-900">{tool.productName}</td>
                      <td className="py-2 px-3 font-mono text-slate-600">{tool.sku}</td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-900 bg-amber-50">
                        {tool.serialNumber}
                      </td>
                      <td className="py-2 px-3 text-center font-mono">{tool.durationDays} kun</td>
                      <td className="py-2 px-3 text-right font-mono">{formatUZS(tool.dailyRateUZS)}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                        {formatUZS(tool.totalUZS)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Section 2: Services attached */}
          {(order.wasteServices.length > 0 ||
            order.craneServices.length > 0 ||
            order.loaderServices.length > 0) && (
            <div className="space-y-2">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                2. Biriktirilgan Logistika va Qo‘shimcha Xizmatlar:
              </h4>
              <table className="w-full text-left border border-slate-300 text-xs">
                <thead className="bg-slate-100 font-semibold border-b border-slate-300">
                  <tr>
                    <th className="py-2 px-3">Xizmat turi</th>
                    <th className="py-2 px-3">Tafsilotlar</th>
                    <th className="py-2 px-3 text-right">Jami summa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {order.wasteServices.map((ws, i) => (
                    <tr key={`ws-${i}`}>
                      <td className="py-2 px-3 font-medium">Chiqindilarni tashish</td>
                      <td className="py-2 px-3">
                        {ws.truckName} · {ws.tripsCount} reys ({ws.m3Volume} m³) ·{' '}
                        {ws.includeLoading ? 'Yuklovchilar bilan' : 'Faqat mashina'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold">
                        {formatUZS(ws.totalUZS)}
                      </td>
                    </tr>
                  ))}
                  {order.craneServices.map((cs, i) => (
                    <tr key={`cs-${i}`}>
                      <td className="py-2 px-3 font-medium">Avtokran xizmati</td>
                      <td className="py-2 px-3">
                        {cs.craneName} ({cs.tonnage} Tonna) · {cs.quantityUnits}{' '}
                        {cs.rentalType === 'hours' ? 'soat' : 'kun'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold">
                        {formatUZS(cs.totalUZS)}
                      </td>
                    </tr>
                  ))}
                  {order.loaderServices.map((ls, i) => (
                    <tr key={`ls-${i}`}>
                      <td className="py-2 px-3 font-medium">Yuk ortish va ko‘tarish (Gruschik)</td>
                      <td className="py-2 px-3">
                        {ls.assignedPersonsCount} kishi · {ls.totalWeightKg} kg · {ls.floorCount}-qavat (
                        {ls.hasElevator ? 'Lift mavjud' : 'Zina orqali'})
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold">
                        {formatUZS(ls.calculatedPriceUZS)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Financial Summary Calculation */}
          <div className="flex justify-end pt-2">
            <div className="w-80 space-y-1.5 border-t-2 border-slate-900 pt-3 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Uskunalar ijarasi:</span>
                <span className="font-mono">{formatUZS(order.subtotalToolsUZS)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Qo‘shimcha xizmatlar:</span>
                <span className="font-mono">{formatUZS(order.subtotalServicesUZS)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Garov depoziti:</span>
                <span className="font-mono font-semibold text-slate-800">
                  {formatUZS(order.depositTotalUZS)}
                </span>
              </div>
              <div className="flex justify-between font-bold text-sm text-slate-950 border-t border-slate-300 pt-2">
                <span>JAMI TO‘LOV:</span>
                <span className="font-mono text-base">{formatUZS(order.grandTotalUZS)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-semibold pt-1">
                <span>To‘langan summa:</span>
                <span className="font-mono">{formatUZS(order.paidAmountUZS)}</span>
              </div>
            </div>
          </div>

          {/* Legal Notes & Signatures */}
          <div className="pt-6 border-t border-slate-300 text-[11px] text-slate-500 space-y-2">
            <p>
              Uskunalar texnik soz holatda, to‘liq butlangan holda qabul qilindi. Ijarachi uskunani
              belgilangan muddatda toza va soz holatda qaytarish majburiyatini oladi.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-12 pt-8">
            <div className="border-t border-slate-400 pt-3">
              <div className="font-bold text-slate-900">Ijara Beruvchi:</div>
              <div className="text-slate-600 mt-1">"Shohrent Servis" MChJ vakili</div>
              <div className="mt-8 text-slate-400">Imzo: _____________________ (M.O'.)</div>
            </div>

            <div className="border-t border-slate-400 pt-3">
              <div className="font-bold text-slate-900">Ijaraga Oluvchi:</div>
              <div className="text-slate-600 mt-1">{order.clientName}</div>
              <div className="mt-8 text-slate-400">Imzo: _____________________</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
