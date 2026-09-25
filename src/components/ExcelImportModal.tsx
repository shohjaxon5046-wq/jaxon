import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  X,
  Plus,
  Layers,
  HelpCircle,
  Package,
  Building2
} from 'lucide-react';
import { Product, ExcelImportRow } from '../types';
import { formatUZS } from '../utils/pricing';

export interface MappedImportResult {
  matchedRows: ExcelImportRow[];
  newProductsToCreate: Product[];
  supplier: string;
  warehouse: string;
  currency: 'UZS' | 'USD';
  exchangeRate: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  existingProducts: Product[];
  defaultExchangeRate?: number;
  targetMode?: 'intake' | 'order' | 'general';
  defaultSupplier?: string;
  defaultWarehouse?: string;
  onConfirmImport: (result: MappedImportResult) => void;
}

export const ExcelImportModal: React.FC<Props> = ({
  isOpen,
  onClose,
  existingProducts,
  defaultExchangeRate = 12850,
  targetMode = 'intake',
  defaultSupplier = '',
  defaultWarehouse = 'Bosh ombor',
  onConfirmImport
}) => {
  // Step: 1 = Upload, 2 = Mapping (Xaritalash), 3 = Matching & Confirmation (Moslashtirish)
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Raw sheet parsed data
  const [fileName, setFileName] = useState<string>('');
  const [rawRows, setRawRows] = useState<any[][]>([]);
  const [headerCols, setHeaderCols] = useState<string[]>([]);
  const [headerRowIdx, setHeaderRowIdx] = useState<number>(0);

  // Mapping columns (Indices in raw row)
  const [nameColIdx, setNameColIdx] = useState<number>(-1);
  const [qtyColIdx, setQtyColIdx] = useState<number>(-1);
  const [priceColIdx, setPriceColIdx] = useState<number>(-1);
  const [skuColIdx, setSkuColIdx] = useState<number>(-1);
  const [brandColIdx, setBrandColIdx] = useState<number>(-1);

  // Intake metadata
  const [supplier, setSupplier] = useState(defaultSupplier || '');
  const [warehouse, setWarehouse] = useState(defaultWarehouse || 'Bosh ombor');
  const [currency, setCurrency] = useState<'UZS' | 'USD'>('UZS');
  const [exchangeRate, setExchangeRate] = useState(defaultExchangeRate);

  // Manual overrides for unmatched items (rowNumber -> chosen existing productId)
  const [manualProductMatches, setManualProductMatches] = useState<Record<number, string>>({});

  // Reset state when closing or opening
  const handleReset = () => {
    setStep(1);
    setFileName('');
    setRawRows([]);
    setHeaderCols([]);
    setHeaderRowIdx(0);
    setNameColIdx(-1);
    setQtyColIdx(-1);
    setPriceColIdx(-1);
    setSkuColIdx(-1);
    setBrandColIdx(-1);
    setManualProductMatches({});
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  // Handle File Upload & Parse
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result as ArrayBuffer;
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheet = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheet];
        if (!worksheet) {
          alert("Excel faylda varaq topilmadi!");
          return;
        }

        const sheetData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        if (!sheetData || sheetData.length === 0) {
          alert("Excel fayl bo'sh!");
          return;
        }

        // Find header row in first 8 rows
        let detectedHeaderIdx = 0;
        for (let r = 0; r < Math.min(sheetData.length, 8); r++) {
          const rowVals = sheetData[r].map((c) => String(c).toLowerCase().trim());
          const hasKey = rowVals.some(
            (v) =>
              v.includes('nom') ||
              v.includes('mahsulot') ||
              v.includes('tovar') ||
              v.includes('name') ||
              v.includes('наименование') ||
              v.includes('товар') ||
              v.includes('miqdor') ||
              v.includes('soni') ||
              v.includes('narx') ||
              v.includes('price') ||
              v.includes('цена')
          );
          if (hasKey) {
            detectedHeaderIdx = r;
            break;
          }
        }

        const headers = (sheetData[detectedHeaderIdx] || []).map((h, i) => {
          const text = String(h).trim();
          return text ? text : `Ustun ${i + 1}`;
        });

        setRawRows(sheetData);
        setHeaderRowIdx(detectedHeaderIdx);
        setHeaderCols(headers);

        // Auto-detect columns
        let autoName = -1;
        let autoQty = -1;
        let autoPrice = -1;
        let autoSku = -1;
        let autoBrand = -1;
        let detectedSupplier = '';

        headers.forEach((h, idx) => {
          const lower = h.toLowerCase();
          if (autoName === -1 && (lower.includes('nom') || lower.includes('mahsulot') || lower.includes('tovar') || lower.includes('name') || lower.includes('наименование') || lower.includes('товар') || lower.includes('item'))) {
            autoName = idx;
          } else if (autoQty === -1 && (lower.includes('miqdor') || lower.includes('soni') || lower.includes('qty') || lower.includes('count') || lower.includes('dona') || lower.includes('кол') || lower.includes('количество'))) {
            autoQty = idx;
          } else if (autoPrice === -1 && (lower.includes('narx') || lower.includes('price') || lower.includes('summa') || lower.includes('baho') || lower.includes('цена') || lower.includes('uzs') || lower.includes('stoimost'))) {
            autoPrice = idx;
          } else if (autoSku === -1 && (lower.includes('sku') || lower.includes('artikul') || lower.includes('артикул') || lower.includes('kod') || lower.includes('code'))) {
            autoSku = idx;
          } else if (autoBrand === -1 && (lower.includes('brend') || lower.includes('brand') || lower.includes('ishlab') || lower.includes('firma') || lower.includes('производитель'))) {
            autoBrand = idx;
          } else if (lower.includes('yetkazib') || lower.includes('postav') || lower.includes('supplier')) {
            // Check if supplier is specified in this column
            const sample = sheetData[detectedHeaderIdx + 1]?.[idx];
            if (sample) detectedSupplier = String(sample).trim();
          }
        });

        // Fallbacks
        if (autoName === -1 && headers.length > 0) autoName = 0;
        if (autoQty === -1 && headers.length > 1) autoQty = 1;
        if (autoPrice === -1 && headers.length > 2) autoPrice = 2;

        setNameColIdx(autoName);
        setQtyColIdx(autoQty);
        setPriceColIdx(autoPrice);
        setSkuColIdx(autoSku);
        setBrandColIdx(autoBrand);

        if (detectedSupplier && !supplier) {
          setSupplier(detectedSupplier);
        }

        // Proceed to Step 2 (Xaritalash)
        setStep(2);
      } catch (err: any) {
        alert(err?.message || "Excel faylni yuklashda xatolik yuz berdi");
      }
    };

    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // Sample preview rows (first 3 rows after header)
  const previewRows = useMemo(() => {
    if (rawRows.length <= headerRowIdx + 1) return [];
    return rawRows.slice(headerRowIdx + 1, headerRowIdx + 4);
  }, [rawRows, headerRowIdx]);

  // Execute matching logic when on Step 3
  const { foundItems, notFoundItems, allProcessedRows } = useMemo(() => {
    if (step !== 3 || rawRows.length === 0 || nameColIdx === -1) {
      return { foundItems: [], notFoundItems: [], allProcessedRows: [] };
    }

    const found: ExcelImportRow[] = [];
    const notFound: ExcelImportRow[] = [];
    const all: ExcelImportRow[] = [];

    for (let r = headerRowIdx + 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!row || row.length === 0) continue;

      const rawName = String(row[nameColIdx] || '').trim();
      const rawSku = skuColIdx >= 0 ? String(row[skuColIdx] || '').trim() : '';
      const rawBrand = brandColIdx >= 0 ? String(row[brandColIdx] || '').trim() : '';

      // Skip empty row or summary/total rows
      if (!rawName && !rawSku) continue;
      const lowerName = rawName.toLowerCase();
      if (lowerName === 'jami' || lowerName === 'итого' || lowerName === 'total' || lowerName === 'всего') {
        continue;
      }

      // Quantity parsing
      const rawQtyVal = qtyColIdx >= 0 ? row[qtyColIdx] : 1;
      let qty = typeof rawQtyVal === 'number' ? rawQtyVal : parseInt(String(rawQtyVal).replace(/[^0-9]/g, ''), 10);
      if (isNaN(qty) || qty <= 0) qty = 1;

      // Price parsing
      const rawPriceVal = priceColIdx >= 0 ? row[priceColIdx] : 0;
      let price = typeof rawPriceVal === 'number' ? rawPriceVal : parseFloat(String(rawPriceVal).replace(/[^0-9.]/g, ''));
      if (isNaN(price)) price = 0;

      // Convert USD if selected
      let priceUZS = price;
      let priceUSD: number | undefined = undefined;
      if (currency === 'USD') {
        priceUSD = price;
        priceUZS = Math.round(price * exchangeRate);
      }

      // MATCHING LOGIC
      let matchedProduct: Product | undefined = undefined;
      let matchType: 'exact_name' | 'matched_sku' | 'matched_model_brand' | 'unmatched' = 'unmatched';

      // 0. Check manual user override first
      const manualId = manualProductMatches[r];
      if (manualId) {
        matchedProduct = existingProducts.find((p) => p.id === manualId);
        if (matchedProduct) matchType = 'exact_name';
      }

      // 1. Exact Name match (case-insensitive)
      if (!matchedProduct) {
        matchedProduct = existingProducts.find(
          (p) => p.name.toLowerCase().trim() === lowerName
        );
        if (matchedProduct) matchType = 'exact_name';
      }

      // 2. Exact or clean SKU match
      if (!matchedProduct && rawSku) {
        const cleanSku = rawSku.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        matchedProduct = existingProducts.find((p) => {
          if (p.sku.toLowerCase() === rawSku.toLowerCase()) return true;
          if (p.sku.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === cleanSku) return true;
          return false;
        });
        if (matchedProduct) matchType = 'matched_sku';
      }

      // 3. Smart substring / word token match
      if (!matchedProduct) {
        const cleanTokens = lowerName
          .split(/[\s,/_—-]+/)
          .filter((t) => t.length > 2 && !['dona', 'sht', 'dlya', 'uchun', 'ta'].includes(t));

        if (cleanTokens.length >= 2) {
          matchedProduct = existingProducts.find((p) => {
            const pName = p.name.toLowerCase();
            const pSku = p.sku.toLowerCase();
            const hitCount = cleanTokens.filter((tok) => pName.includes(tok) || pSku.includes(tok)).length;
            return hitCount >= 2 && hitCount >= Math.ceil(cleanTokens.length * 0.65);
          });
          if (matchedProduct) matchType = 'matched_model_brand';
        }
      }

      // Fallback price from existing product if price was 0 in Excel
      if (priceUZS <= 0 && matchedProduct) {
        priceUZS = matchedProduct.purchasePriceUZS || matchedProduct.dailyRate * 10;
      }

      const parsedRow: ExcelImportRow = {
        rowNumber: r,
        productName: rawName || matchedProduct?.name || 'Yangi mahsulot',
        sku: rawSku || matchedProduct?.sku || `SKU-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        brand: rawBrand || matchedProduct?.brand,
        quantity: qty,
        unitPriceUSD: priceUSD,
        unitPriceUZS: priceUZS,
        matchedProductId: matchedProduct?.id,
        matchedProductName: matchedProduct?.name,
        matchType,
        isValid: true,
        errors: []
      };

      all.push(parsedRow);

      if (matchedProduct) {
        found.push(parsedRow);
      } else {
        notFound.push(parsedRow);
      }
    }

    return { foundItems: found, notFoundItems: notFound, allProcessedRows: all };
  }, [step, rawRows, headerRowIdx, nameColIdx, qtyColIdx, priceColIdx, skuColIdx, brandColIdx, currency, exchangeRate, existingProducts, manualProductMatches]);

  // Action: Add ONLY found items ("Topilganlarini qo'shish")
  const handleAddFoundOnly = () => {
    if (foundItems.length === 0) {
      alert("Topilgan mahsulotlar mavjud emas!");
      return;
    }

    onConfirmImport({
      matchedRows: foundItems,
      newProductsToCreate: [],
      supplier: supplier.trim() || 'Excel ta\'minotchi',
      warehouse: warehouse || 'Bosh ombor',
      currency,
      exchangeRate
    });

    handleClose();
  };

  // Action: Add ALL items, automatically creating missing as new products
  const handleAddAllWithNew = () => {
    const newProducts: Product[] = [];
    const nowStr = new Date().toISOString().slice(0, 10);

    notFoundItems.forEach((nf) => {
      const autoSku = nf.sku || `SKU-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      const prod: Product = {
        id: `prod-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        name: nf.productName,
        sku: autoSku,
        brand: nf.brand || 'Boshqa',
        category: 'Asboblar va Uskunalar',
        group: 'Asosiy fond',
        dailyRate: Math.max(50000, Math.round(nf.unitPriceUZS * 0.05)),
        depositAmount: Math.max(200000, Math.round(nf.unitPriceUZS * 0.3)),
        purchasePriceUZS: nf.unitPriceUZS,
        totalQuantity: 0,
        serials: [],
        createdAt: nowStr
      };
      newProducts.push(prod);
      // Link the row to newly created product
      nf.matchedProductId = prod.id;
      nf.matchedProductName = prod.name;
    });

    onConfirmImport({
      matchedRows: allProcessedRows,
      newProductsToCreate: newProducts,
      supplier: supplier.trim() || 'Excel ta\'minotchi',
      warehouse: warehouse || 'Bosh ombor',
      currency,
      exchangeRate
    });

    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* MODAL HEADER & STEP PROGRESS */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Exceldan Import Qilish</span>
                {fileName && (
                  <span className="text-xs font-mono font-normal text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded">
                    {fileName}
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {step === 1 && "Excel faylni yuklang (.xlsx, .xls, .csv)"}
                {step === 2 && "Ustunlarni tizim maydonlariga xaritalash (Moslashtirish)"}
                {step === 3 && "Topilgan va topilmagan tovarlarni tasdiqlash"}
              </p>
            </div>
          </div>

          {/* Stepper indicators */}
          <div className="flex items-center gap-1.5 self-start sm:self-auto text-xs">
            <div
              className={`px-2.5 py-1 rounded-full font-bold flex items-center gap-1 transition-colors ${
                step === 1
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              <span>1</span>
              <span className="hidden sm:inline">Yuklash</span>
            </div>
            <span className="text-slate-300">→</span>
            <div
              className={`px-2.5 py-1 rounded-full font-bold flex items-center gap-1 transition-colors ${
                step === 2
                  ? 'bg-blue-600 text-white shadow-xs'
                  : step > 2
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              <span>2</span>
              <span className="hidden sm:inline">Xaritalash</span>
            </div>
            <span className="text-slate-300">→</span>
            <div
              className={`px-2.5 py-1 rounded-full font-bold flex items-center gap-1 transition-colors ${
                step === 3
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              <span>3</span>
              <span className="hidden sm:inline">Tasdiqlash</span>
            </div>

            <button
              onClick={handleClose}
              className="ml-2 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* STEP 1: FILE UPLOAD */}
          {step === 1 && (
            <div className="space-y-4 max-w-xl mx-auto py-6">
              <div className="p-8 border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl text-center bg-slate-50 hover:bg-blue-50/30 transition-all">
                <Upload className="w-12 h-12 text-blue-600 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-slate-900 mb-1">
                  Excel (.xlsx, .xls, .csv) faylni yuklang
                </h4>
                <p className="text-xs text-slate-500 mb-4 max-w-sm mx-auto">
                  Faylda mahsulot nomi, miqdori va narxi bo'lgan ustunlar bo'lishi kifoya. Keyingi bosqichda ustunlarni o'zingiz tanlaysiz.
                </p>

                <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-colors">
                  <Upload className="w-4 h-4" />
                  <span>Faylni tanlash</span>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-600 space-y-1.5">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-blue-600" />
                  <span>Foydali ma'lumot:</span>
                </div>
                <p>
                  Tizim ustunlar tartibini o'zi tushunadi. Agar Excel faylingizda ustun nomlari turlicha bo'lsa (masalan: <em>"Tovar nomi"</em> yoki <em>"Наименование"</em>), xaritalash bosqichida to'g'ri ustunni osongina belgilashingiz mumkin.
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: COLUMN MAPPING (XARITALASH) */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2.5">
                <Layers className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-xs text-blue-900">
                  <strong className="block font-bold">Excel ustunlarini xaritalash:</strong>
                  Quyidagi tizim maydonlariga Excel faylingizdagi mos ustunlarni tanlang. Biz avtomatik aniqlashga harakat qildik.
                </div>
              </div>

              {/* Column Mapping Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                {/* 1. Product Name */}
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Mahsulot nomi (Tovar) <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={nameColIdx}
                    onChange={(e) => setNameColIdx(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-semibold text-slate-900 focus:border-blue-500 focus:outline-none"
                  >
                    <option value={-1}>-- Tanlang --</option>
                    {headerCols.map((h, i) => (
                      <option key={i} value={i}>
                        {h} (Ustun {i + 1})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Quantity */}
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Miqdor (Soni) <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={qtyColIdx}
                    onChange={(e) => setQtyColIdx(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-semibold text-slate-900 focus:border-blue-500 focus:outline-none"
                  >
                    <option value={-1}>-- Tanlang --</option>
                    {headerCols.map((h, i) => (
                      <option key={i} value={i}>
                        {h} (Ustun {i + 1})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Unit Price */}
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Birlik narxi (Baho) <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={priceColIdx}
                    onChange={(e) => setPriceColIdx(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-semibold text-slate-900 focus:border-blue-500 focus:outline-none"
                  >
                    <option value={-1}>-- Tanlang --</option>
                    {headerCols.map((h, i) => (
                      <option key={i} value={i}>
                        {h} (Ustun {i + 1})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 4. SKU / Artikul */}
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Artikul / SKU (Ixtiyoriy)
                  </label>
                  <select
                    value={skuColIdx}
                    onChange={(e) => setSkuColIdx(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:border-blue-500 focus:outline-none"
                  >
                    <option value={-1}>-- Tanlanmagan --</option>
                    {headerCols.map((h, i) => (
                      <option key={i} value={i}>
                        {h} (Ustun {i + 1})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 5. Brand */}
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Brend / Ishlab chiqaruvchi (Ixtiyoriy)
                  </label>
                  <select
                    value={brandColIdx}
                    onChange={(e) => setBrandColIdx(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:border-blue-500 focus:outline-none"
                  >
                    <option value={-1}>-- Tanlanmagan --</option>
                    {headerCols.map((h, i) => (
                      <option key={i} value={i}>
                        {h} (Ustun {i + 1})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Valyuta */}
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Narx valyutasi
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value as any)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-semibold focus:border-blue-500 focus:outline-none"
                    >
                      <option value="UZS">SO'M (UZS)</option>
                      <option value="USD">AQSh Dollari ($)</option>
                    </select>
                    {currency === 'USD' && (
                      <input
                        type="number"
                        value={exchangeRate}
                        onChange={(e) => setExchangeRate(parseFloat(e.target.value) || defaultExchangeRate)}
                        placeholder="Kurs"
                        title="Valyuta kursi"
                        className="w-24 px-2 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Intake Details (If mode === intake) */}
              {targetMode === 'intake' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      Yetkazib beruvchi (Hamkor)
                    </label>
                    <input
                      type="text"
                      value={supplier}
                      onChange={(e) => setSupplier(e.target.value)}
                      placeholder="Masalan: Bosch Professional Uzbekistan"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      Qabul qilinadigan ombor
                    </label>
                    <select
                      value={warehouse}
                      onChange={(e) => setWarehouse(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="Bosh ombor">Bosh ombor (Markaziy)</option>
                      <option value="Chilonzor filiali">Chilonzor filiali</option>
                      <option value="Yunusobod filiali">Yunusobod filiali</option>
                      <option value="Sergeli ombori">Sergeli ombori</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Sample Preview of Mapped Columns */}
              {previewRows.length > 0 && nameColIdx >= 0 && (
                <div className="space-y-1.5">
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Xaritalash namunasi (Dastlabki {previewRows.length} qator):
                  </div>
                  <div className="border border-slate-200 rounded-xl overflow-hidden text-xs bg-white">
                    <table className="w-full text-left">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-3">Mahsulot nomi</th>
                          <th className="py-2 px-3 text-right">Miqdor</th>
                          <th className="py-2 px-3 text-right">Narx ({currency})</th>
                          {skuColIdx >= 0 && <th className="py-2 px-3">Artikul</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {previewRows.map((r, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-semibold text-slate-900">
                              {String(r[nameColIdx] || '-')}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                              {qtyColIdx >= 0 ? String(r[qtyColIdx] || 1) : 1}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-emerald-700 font-bold">
                              {priceColIdx >= 0 ? String(r[priceColIdx] || 0) : 0}
                            </td>
                            {skuColIdx >= 0 && (
                              <td className="py-2 px-3 font-mono text-slate-600">
                                {String(r[skuColIdx] || '-')}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: MATCHING & CONFIRMATION (MOSLASHTIRISH VA TASDIQLASH) */}
          {step === 3 && (
            <div className="space-y-5">
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-500">Jami qatorlar:</span>
                  <div className="font-mono font-bold text-slate-900 text-base mt-0.5">
                    {allProcessedRows.length} ta
                  </div>
                </div>

                <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                  <span className="text-emerald-700 font-medium">Topilgan mahsulotlar:</span>
                  <div className="font-mono font-bold text-emerald-800 text-base mt-0.5 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{foundItems.length} ta</span>
                  </div>
                </div>

                <div className={`${notFoundItems.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'} p-3 rounded-xl border`}>
                  <span className={notFoundItems.length > 0 ? 'text-amber-800 font-medium' : 'text-slate-500'}>
                    Katalogda topilmadi:
                  </span>
                  <div className={`font-mono font-bold text-base mt-0.5 flex items-center gap-1.5 ${notFoundItems.length > 0 ? 'text-amber-800' : 'text-slate-600'}`}>
                    {notFoundItems.length > 0 && <AlertTriangle className="w-4 h-4 text-amber-600" />}
                    <span>{notFoundItems.length} ta</span>
                  </div>
                </div>

                <div className="bg-blue-50 p-3 rounded-xl border border-blue-200">
                  <span className="text-blue-700 font-medium">Umumiy miqdor:</span>
                  <div className="font-mono font-bold text-blue-900 text-base mt-0.5">
                    {allProcessedRows.reduce((s, r) => s + r.quantity, 0)} dona
                  </div>
                </div>
              </div>

              {/* 1. TOPILGAN MAHSULOTLAR RO'YXATI */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Topilgan mahsulotlar ({foundItems.length} ta)</span>
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    Tizim katalogidan muvaffaqiyatli aniqlangan
                  </span>
                </div>

                {foundItems.length === 0 ? (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
                    Exceldagi tovarlar bilan tizimdagi mahsulotlar o'rtasida moslik topilmadi.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden text-xs bg-white max-h-56 overflow-y-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10">
                        <tr>
                          <th className="py-2 px-3">#</th>
                          <th className="py-2 px-3">Exceldagi nomi</th>
                          <th className="py-2 px-3">Tizimdagi mahsulot</th>
                          <th className="py-2 px-3 text-right">Miqdor</th>
                          <th className="py-2 px-3 text-right">Narxi</th>
                          <th className="py-2 px-3 text-center">Holat</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {foundItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-mono text-slate-400">{idx + 1}</td>
                            <td className="py-2 px-3 font-medium text-slate-900">
                              {item.productName}
                            </td>
                            <td className="py-2 px-3">
                              <span className="font-bold text-slate-900">{item.matchedProductName}</span>
                              <span className="ml-1 text-[10px] font-mono text-slate-500">({item.sku})</span>
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                              {item.quantity} dona
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                              {formatUZS(item.unitPriceUZS)}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                ✓ Topildi
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* 2. TOPILMAGAN MAHSULOTLAR RO'YXATI */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>
                      {notFoundItems.length > 0
                        ? `Topilmagan mahsulotlar (${notFoundItems.length} ta)`
                        : "Hech qanday mahsulot qolmadi (Hammasi topildi)"}
                    </span>
                  </h4>
                  {notFoundItems.length > 0 && (
                    <span className="text-[11px] text-amber-700">
                      Ushbu tovarlar katalogda yo'q
                    </span>
                  )}
                </div>

                {notFoundItems.length === 0 ? (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Ajoyib! Excel fayldagi barcha mahsulotlar tizimdan to'liq topildi.</span>
                  </div>
                ) : (
                  <div className="border border-amber-200 rounded-xl overflow-hidden text-xs bg-amber-50/20 max-h-56 overflow-y-auto">
                    <table className="w-full text-left">
                      <thead className="bg-amber-100/60 text-amber-900 font-bold border-b border-amber-200 sticky top-0 z-10">
                        <tr>
                          <th className="py-2 px-3">#</th>
                          <th className="py-2 px-3">Exceldagi nomi</th>
                          <th className="py-2 px-3 text-right">Miqdor</th>
                          <th className="py-2 px-3 text-right">Kiritilgan narx</th>
                          <th className="py-2 px-3 text-center">Tizimga biriktirish (Qo'lda)</th>
                          <th className="py-2 px-3 text-center">Harakat</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-amber-100">
                        {notFoundItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-amber-50/50">
                            <td className="py-2 px-3 font-mono text-slate-400">{idx + 1}</td>
                            <td className="py-2 px-3 font-bold text-slate-900">
                              {item.productName}
                              {item.sku && (
                                <span className="block text-[10px] font-mono font-normal text-slate-500">
                                  SKU: {item.sku}
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                              {item.quantity} dona
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-800 font-bold">
                              {formatUZS(item.unitPriceUZS)}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <select
                                value={manualProductMatches[item.rowNumber] || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setManualProductMatches((prev) => ({
                                    ...prev,
                                    [item.rowNumber]: val
                                  }));
                                }}
                                className="w-48 px-2 py-1 bg-white border border-slate-300 rounded text-[11px] text-slate-900 focus:outline-none focus:border-blue-500"
                              >
                                <option value="">-- Mavjud mahsulotga bog'lash --</option>
                                {existingProducts.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.name} ({p.sku})
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                Yangi yaratiladi
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div>
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((prev) => (prev - 1) as any)}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Ortga</span>
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
            >
              Bekor qilish
            </button>

            {step === 2 && (
              <button
                type="button"
                disabled={nameColIdx === -1 || qtyColIdx === -1}
                onClick={() => setStep(3)}
                className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer transition-colors"
              >
                <span>Keyingi: Moslashtirish</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {step === 3 && (
              <>
                {/* 1. Add Found items only */}
                <button
                  type="button"
                  disabled={foundItems.length === 0}
                  onClick={handleAddFoundOnly}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer transition-colors"
                  title="Faqat tizimda topilgan tovarlarni qo'shish"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Topilganlarini qo'shish ({foundItems.length} ta)</span>
                </button>

                {/* 2. Add All (with creating missing ones as new products) */}
                {notFoundItems.length > 0 && (
                  <button
                    type="button"
                    onClick={handleAddAllWithNew}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer transition-colors"
                    title="Barcha tovarlarni qo'shish, topilmaganlarni katalogda yangi mahsulot qilib ochish"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Barchasini qo'shish ({allProcessedRows.length} ta)</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
