import React, { useState, useMemo } from 'react';
import { Search, X, Hash, AlertTriangle, CheckCircle, Clock, ArrowRight } from 'lucide-react';
import { Language, Product, SerialNumber, SerialStatus } from '../types';
import { translations } from '../i18n/translations';
import { formatUZS } from '../utils/pricing';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  language: Language;
  onUpdateSerialStatus?: (productId: string, serialId: string, newStatus: SerialStatus) => void;
  onNavigateToOrder?: (orderId: string) => void;
  onSelectSerial?: (product: Product, serial: SerialNumber) => void;
}

export const GlobalSerialSearchModal: React.FC<Props> = ({
  isOpen,
  onClose,
  products,
  language,
  onUpdateSerialStatus,
  onNavigateToOrder,
  onSelectSerial
}) => {
  const [query, setQuery] = useState('');
  const t = translations[language];

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.trim().toLowerCase();
    const matches: { product: Product; serial: SerialNumber }[] = [];

    for (const product of products) {
      for (const serial of product.serials) {
        if (
          serial.serialNumber.toLowerCase().includes(q) ||
          product.sku.toLowerCase().includes(q) ||
          product.name.toLowerCase().includes(q)
        ) {
          matches.push({ product, serial });
        }
      }
    }
    return matches;
  }, [query, products]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Hash className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{t.quickSearchTitle}</h3>
              <p className="text-xs text-slate-600">
                {language === 'uz'
                  ? 'Barcha uskunalar bo‘yicha individual seriya raqamlarini tezkor izlash'
                  : 'Мгновенный поиск серийных номеров по всей базе склада'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search input */}
        <div className="p-4 border-b border-slate-200 bg-white">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.searchSerialPlaceholder}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>
        </div>

        {/* Results Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
          {query.trim() === '' ? (
            <div className="text-center py-12 text-slate-500">
              <Hash className="w-8 h-8 mx-auto mb-2 text-blue-500 opacity-60" />
              {language === 'uz'
                ? 'Qidirish uchun seriya raqami yoki artikulni kiriting (masalan: SN-...'
                : 'Введите серийный номер или артикул для поиска'}
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-amber-500" />
              <p className="font-bold text-slate-800">
                {language === 'uz' ? 'Hech qanday natija topilmadi' : 'Ничего не найдено'}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">"{query}"</p>
            </div>
          ) : (
            results.map(({ product, serial }) => (
              <div
                key={serial.id}
                className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl hover:border-blue-300 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-blue-700">
                      {serial.serialNumber}
                    </span>
                    {serial.status === 'available' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle className="w-3 h-3" /> Omborda mavjud
                      </span>
                    )}
                    {serial.status === 'rented' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        <Clock className="w-3 h-3" /> Ijarada
                      </span>
                    )}
                    {serial.status === 'maintenance' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                        Ta‘mirda
                      </span>
                    )}
                  </div>

                  <div className="text-xs font-bold text-slate-900 mt-1">{product.name}</div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    SKU: {product.sku} · Kunlik: {formatUZS(product.dailyRate)}
                  </div>
                </div>

                {serial.status === 'rented' && serial.currentOrderId && (
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block">Buyurtma:</span>
                    <button
                      onClick={() => {
                        if (onNavigateToOrder && serial.currentOrderId) {
                          onNavigateToOrder(serial.currentOrderId);
                          onClose();
                        }
                      }}
                      className="font-mono font-bold text-blue-600 hover:underline text-xs"
                    >
                      {serial.currentOrderId}
                    </button>
                    {serial.currentClientName && (
                      <div className="text-[11px] text-slate-700">{serial.currentClientName}</div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-lg"
          >
            Yopish
          </button>
        </div>
      </div>
    </div>
  );
};
