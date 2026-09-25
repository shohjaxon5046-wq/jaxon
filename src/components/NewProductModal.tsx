import React, { useState } from 'react';
import {
  PackagePlus,
  X,
  Barcode,
  Sparkles,
  Layers,
  DollarSign,
  Tag,
  Info,
  Check,
  AlertCircle
} from 'lucide-react';
import { Product } from '../types';
import { generateEAN13Barcode } from '../utils/pricing';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaveProduct: (newProduct: Product) => void;
  initialName?: string;
  categories?: string[];
}

const DEFAULT_UNITS = [
  { value: 'dona', label: 'dona (Soni / Bo\'lak)' },
  { value: 'kg', label: 'kg (Kilogramm / Og\'irlik)' },
  { value: 'metr', label: 'metr (Uzunlik / Kabel)' },
  { value: 'L', label: 'L (Litr / Suyuqlik)' },
  { value: 'm2', label: 'm² (Kvadrat metr / Maydon)' },
  { value: 'komplekt', label: 'komplekt (To\'plam / Jamlanma)' },
  { value: 'qop', label: 'qop (Qop / Paket)' }
];

const DEFAULT_CATEGORIES = [
  'Asboblar va Uskunalar',
  'Perforatorlar va Asboblar',
  'Generatorlar',
  'Samosvallar va Chiqindi',
  'Kranlar va Maxsus Texnika',
  'Payvandlash uskunalari',
  'Kompressorlar',
  'Qurilish materiallari'
];

export const NewProductModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSaveProduct,
  initialName = '',
  categories = DEFAULT_CATEGORIES
}) => {
  const [name, setName] = useState(initialName);
  const [category, setCategory] = useState(categories[0] || 'Asboblar va Uskunalar');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [unit, setUnit] = useState('');
  const [isCustomUnit, setIsCustomUnit] = useState(false);
  const [unitError, setUnitError] = useState<string | null>(null);
  const [barcode, setBarcode] = useState('');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  // Generate 13-digit EAN-13 barcode on demand
  const handleGenerateBarcode = () => {
    const code = generateEAN13Barcode();
    setBarcode(code);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUnitError(null);

    if (!name.trim()) {
      alert("Iltimos, mahsulot nomini kiriting!");
      return;
    }

    if (!unit || !unit.trim()) {
      setUnitError("O'lchov birligini tanlash majburiy! (Masalan: dona, kg, metr)");
      return;
    }

    // Auto-generate 13-digit barcode if empty or ensure clean 13 digits
    let finalBarcode = barcode.trim().replace(/[^0-9]/g, '');
    if (!finalBarcode) {
      finalBarcode = generateEAN13Barcode();
    } else if (finalBarcode.length !== 13) {
      // Pad or format to 13 digits if user typed fewer
      finalBarcode = (finalBarcode + '0000000000000').slice(0, 13);
    }

    const autoSku = brand && model
      ? `${brand.slice(0, 3).toUpperCase()}-${model.replace(/[^a-zA-Z0-9]/g, '').slice(0, 5).toUpperCase()}`
      : `SKU-${name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    const newProd: Product = {
      id: `prod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      sku: autoSku,
      category,
      group: brand || 'Asosiy asboblar',
      brand: brand.trim() || undefined,
      model: model.trim() || undefined,
      unit: unit.trim(),
      barcode: finalBarcode,
      description: description.trim() || undefined,
      warehouse: undefined, // Warehouse assigned later during intake ("Kirim")
      purchasePriceUZS: 0,
      dailyRate: 0, // Managed and set inside Product Catalog ("Katalog / Tariflar")
      depositAmount: 0,
      targetPaybackDays: 30,
      targetMarginPercent: 5,
      totalQuantity: 0,
      serials: [],
      createdAt: new Date().toISOString().slice(0, 10)
    };

    onSaveProduct(newProd);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
              <PackagePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Yangi Mahsulot Yaratish</h3>
              <p className="text-xs text-slate-500">Tizimga yangi tovar, uskuna yoki material qo'shish</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* Row 1: Name & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Mahsulot nomi *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Masalan: Bosch GBH 2-26 DFR Perforator"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500 font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Kategoriya
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Brand, Model, Unit of Measure */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Brend / Firma
              </label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Masalan: Bosch, Makita, DeWalt"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Model / Marka
              </label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Masalan: GBH 2-26, DKM 7500"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>O'lchov birligi <span className="text-rose-500 font-extrabold">* (Majburiy)</span></span>
              </label>
              <select
                value={isCustomUnit ? 'custom' : unit}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'custom') {
                    setIsCustomUnit(true);
                    setUnit('');
                  } else {
                    setIsCustomUnit(false);
                    setUnit(val);
                  }
                  if (unitError) setUnitError(null);
                }}
                className={`w-full px-3 py-2 rounded-lg text-slate-900 font-semibold focus:outline-none transition-colors cursor-pointer ${
                  unitError
                    ? 'bg-rose-50 border-2 border-rose-500 text-rose-900 focus:border-rose-600'
                    : 'bg-white border border-slate-300 text-blue-700 focus:border-blue-500'
                }`}
              >
                <option value="">-- Tanlang (Majburiy) --</option>
                {DEFAULT_UNITS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
                <option value="custom">Boshqa (Qo'lda kiritish)...</option>
              </select>

              {isCustomUnit && (
                <div className="mt-1.5">
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => {
                      setUnit(e.target.value);
                      if (unitError) setUnitError(null);
                    }}
                    placeholder="Birlikni yozing..."
                    className="w-full px-3 py-1.5 bg-white border border-blue-400 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-blue-600"
                    autoFocus
                  />
                </div>
              )}

              {unitError && (
                <div className="mt-1 p-2 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-1.5 text-[11px] text-rose-700 font-bold">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>{unitError}</span>
                </div>
              )}
            </div>
          </div>

          {/* Row 3: Barcode (13-digit EAN-13) */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 flex items-center gap-1.5">
                <Barcode className="w-4 h-4 text-indigo-600" />
                <span>Shtrix-kod (13 xonali EAN-13)</span>
              </label>
              <button
                type="button"
                onClick={handleGenerateBarcode}
                className="flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-md font-bold text-[11px] transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>13 talik avto-generatsiya</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                maxLength={13}
                value={barcode}
                onChange={(e) => setBarcode(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="Masalan: 4780123456789 (13 ta raqam)"
                className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono tracking-wider focus:outline-none focus:border-indigo-500"
              />
              <span className="text-[11px] font-mono text-slate-500 px-2 py-1 bg-white border border-slate-200 rounded-lg">
                {barcode.length}/13
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Skanerdan o'tkazing yoki qo'lda kiriting. Bo'sh qolsa, saqlashda avtomatik 13 xonali unikal shtrix-kod beriladi.
            </p>
          </div>

          {/* Row 4: Description / Izoh */}
          <div>
            <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-slate-400" />
              <span>Mahsulot haqida izoh / tavsif</span>
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mahsulotning texnik holati, komplektatsiyasi yoki boshqa maxsus eslatmalar..."
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Guidance Banners: Pricing in Catalog, Warehouse in Reception */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-blue-900 text-[11px]">
                <Tag className="w-3.5 h-3.5 text-blue-600" />
                <span>Narxlar va Tariflar</span>
              </div>
              <p className="text-[10px] text-blue-700 leading-relaxed">
                Narxlar bu yerda belgilanmaydi. Mahsulot yaratilgach, <strong>"Katalog (Tariflar)"</strong> bo'limida kunlik stavka va garov narxi belgilanadi.
              </p>
            </div>

            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-900 text-[11px]">
                <Layers className="w-3.5 h-3.5 text-amber-600" />
                <span>Omborxona Biriktirish</span>
              </div>
              <p className="text-[10px] text-amber-700 leading-relaxed">
                Omborxona mahsulot omborga amalda qabul qilinayotgan paytda <strong>"Kirim"</strong> bo'limida tanlanadi va biriktiriladi.
              </p>
            </div>
          </div>

          {/* Footer buttons */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold cursor-pointer"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Mahsulotni yaratish</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
