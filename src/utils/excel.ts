import * as XLSX from 'xlsx';
import { IntakeRecord, Order, Product, ExcelImportRow } from '../types';

export function parseExcelKirim(
  fileData: ArrayBuffer,
  existingProducts: Product[],
  defaultExchangeRate: number
): {
  rows: ExcelImportRow[];
  supplier?: string;
  warehouse?: string;
  currency: 'UZS' | 'USD';
  exchangeRate: number;
  totalQuantity: number;
  totalSumUZS: number;
  unmatchedProducts: string[];
  errors: string[];
} {
  const workbook = XLSX.read(fileData, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  if (!worksheet) {
    return {
      rows: [],
      currency: 'UZS',
      exchangeRate: defaultExchangeRate,
      totalQuantity: 0,
      totalSumUZS: 0,
      unmatchedProducts: [],
      errors: ['Excel faylda sahifa topilmadi']
    };
  }

  // Read raw 2D array of rows to reliably detect the header row
  const rawSheetRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  if (rawSheetRows.length === 0) {
    return {
      rows: [],
      currency: 'UZS',
      exchangeRate: defaultExchangeRate,
      totalQuantity: 0,
      totalSumUZS: 0,
      unmatchedProducts: [],
      errors: ['Excel fayl bo\'sh']
    };
  }

  // Find header row: look through first 6 rows for header keywords
  let headerRowIndex = 0;
  for (let r = 0; r < Math.min(rawSheetRows.length, 6); r++) {
    const rowValues = rawSheetRows[r].map((v) => String(v).toLowerCase());
    const hasHeaderKeywords = rowValues.some((val) =>
      val.includes('nom') ||
      val.includes('mahsulot') ||
      val.includes('tovar') ||
      val.includes('name') ||
      val.includes('наименование') ||
      val.includes('товар') ||
      val.includes('miqdor') ||
      val.includes('soni') ||
      val.includes('narx') ||
      val.includes('price') ||
      val.includes('кол') ||
      val.includes('цена')
    );
    if (hasHeaderKeywords) {
      headerRowIndex = r;
      break;
    }
  }

  // Column map based on detected header row
  const headerCols = rawSheetRows[headerRowIndex].map((c) => String(c).trim());
  const colMap: { [key: string]: number } = {};

  headerCols.forEach((colName, colIdx) => {
    const clean = colName.toLowerCase().replace(/[^a-z0-9а-яўқғҳ]/gi, '');
    if (clean.includes('nom') || clean.includes('mahsulot') || clean.includes('tovar') || clean.includes('name') || clean.includes('наименование') || clean.includes('товар') || clean.includes('item')) {
      if (colMap['name'] === undefined) colMap['name'] = colIdx;
    } else if (clean.includes('artikul') || clean.includes('sku') || clean.includes('артикул') || clean.includes('kod')) {
      if (colMap['sku'] === undefined) colMap['sku'] = colIdx;
    } else if (clean.includes('miqdor') || clean.includes('soni') || clean.includes('qty') || clean.includes('count') || clean.includes('кол') || clean.includes('dona') || clean.includes('количество')) {
      if (colMap['qty'] === undefined) colMap['qty'] = colIdx;
    } else if (clean.includes('usd') || clean.includes('dollar') || clean.includes('валюта')) {
      if (colMap['price_usd'] === undefined) colMap['price_usd'] = colIdx;
    } else if (clean.includes('narx') || clean.includes('summa') || clean.includes('baho') || clean.includes('цена') || clean.includes('stoimost') || clean.includes('price') || clean.includes('uzs') || clean.includes('som')) {
      if (colMap['price_uzs'] === undefined) colMap['price_uzs'] = colIdx;
    } else if (clean.includes('firma') || clean.includes('brend') || clean.includes('brand') || clean.includes('ishlab') || clean.includes('производитель')) {
      if (colMap['brand'] === undefined) colMap['brand'] = colIdx;
    } else if (clean.includes('model') || clean.includes('marka') || clean.includes('модель')) {
      if (colMap['model'] === undefined) colMap['model'] = colIdx;
    } else if (clean.includes('yetkazib') || clean.includes('postavshik') || clean.includes('поставщик') || clean.includes('supplier')) {
      if (colMap['supplier'] === undefined) colMap['supplier'] = colIdx;
    } else if (clean.includes('ombor') || clean.includes('sklad') || clean.includes('склад') || clean.includes('warehouse')) {
      if (colMap['warehouse'] === undefined) colMap['warehouse'] = colIdx;
    }
  });

  // Fallback defaults if columns weren't identified
  if (colMap['name'] === undefined) colMap['name'] = 0;
  if (colMap['qty'] === undefined) colMap['qty'] = headerCols.length > 1 ? 1 : 0;
  if (colMap['price_uzs'] === undefined) colMap['price_uzs'] = headerCols.length > 2 ? 2 : 1;

  const rows: ExcelImportRow[] = [];
  const generalErrors: string[] = [];
  const unmatchedProducts: string[] = [];

  let supplier = '';
  let warehouse = 'Bosh ombor';
  let currency: 'UZS' | 'USD' = 'UZS';
  let exchangeRate = defaultExchangeRate;

  // Process data rows (start right after header row)
  for (let r = headerRowIndex + 1; r < rawSheetRows.length; r++) {
    const rawRow = rawSheetRows[r];
    if (!rawRow || rawRow.length === 0) continue;

    const rowNum = r + 1;
    const errors: string[] = [];

    const rawName = String(rawRow[colMap['name']] || '').trim();
    const rawSku = colMap['sku'] !== undefined ? String(rawRow[colMap['sku']] || '').trim() : '';
    const rawBrand = colMap['brand'] !== undefined ? String(rawRow[colMap['brand']] || '').trim() : '';
    const rawModel = colMap['model'] !== undefined ? String(rawRow[colMap['model']] || '').trim() : '';

    if (colMap['supplier'] !== undefined && !supplier && rawRow[colMap['supplier']]) {
      supplier = String(rawRow[colMap['supplier']]).trim();
    }
    if (colMap['warehouse'] !== undefined && rawRow[colMap['warehouse']]) {
      warehouse = String(rawRow[colMap['warehouse']]).trim();
    }

    // Skip empty lines or pure total lines (e.g. "Jami", "Итого", "Total")
    if (!rawName && !rawSku && !rawModel) continue;
    if (rawName.toLowerCase() === 'jami' || rawName.toLowerCase() === 'итого' || rawName.toLowerCase() === 'total') {
      continue;
    }

    // Parse quantity
    const rawQtyVal = rawRow[colMap['qty']];
    let rawQty = typeof rawQtyVal === 'number' ? rawQtyVal : parseInt(String(rawQtyVal).replace(/[^0-9]/g, ''), 10);
    if (isNaN(rawQty) || rawQty <= 0) {
      rawQty = 1; // Default to 1 instead of throwing error/skipping!
    }

    // Parse price UZS
    const rawPriceUZSVal = rawRow[colMap['price_uzs']];
    let rawPriceUZS = typeof rawPriceUZSVal === 'number' ? rawPriceUZSVal : parseFloat(String(rawPriceUZSVal).replace(/[^0-9.]/g, ''));
    if (isNaN(rawPriceUZS)) rawPriceUZS = 0;

    // Parse price USD
    let rawPriceUSD = 0;
    if (colMap['price_usd'] !== undefined) {
      const rawPriceUSDVal = rawRow[colMap['price_usd']];
      rawPriceUSD = typeof rawPriceUSDVal === 'number' ? rawPriceUSDVal : parseFloat(String(rawPriceUSDVal).replace(/[^0-9.]/g, ''));
      if (isNaN(rawPriceUSD)) rawPriceUSD = 0;
      if (rawPriceUSD > 0 && rawPriceUZS === 0) {
        currency = 'USD';
        rawPriceUZS = Math.round(rawPriceUSD * exchangeRate);
      }
    }

    // SMART PRODUCT MATCHING LOGIC
    // 1. Exact Name match (case-insensitive)
    let matchedProduct = existingProducts.find(
      (p) => p.name.toLowerCase() === rawName.toLowerCase()
    );
    let matchType: 'exact_name' | 'matched_sku' | 'matched_model_brand' | 'unmatched' = 'unmatched';

    if (matchedProduct) {
      matchType = 'exact_name';
    } else if (rawSku) {
      // 2. Exact or normalized SKU match
      const skuMatch = existingProducts.find(
        (p) =>
          p.sku.toLowerCase() === rawSku.toLowerCase() ||
          p.sku.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === rawSku.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
      );
      if (skuMatch) {
        matchedProduct = skuMatch;
        matchType = 'matched_sku';
      }
    }

    // 3. Smart Brand & Model matching if still unmatched
    if (!matchedProduct) {
      const nameParts = rawName.toLowerCase().split(/[\s,/-]+/).filter((p: string) => p.length > 1);

      const candidate = existingProducts.find((p) => {
        const prodNameLower = p.name.toLowerCase();
        const prodSkuLower = p.sku.toLowerCase();

        if (rawBrand && rawModel) {
          const brandMatch = prodNameLower.includes(rawBrand.toLowerCase()) || (p.brand && p.brand.toLowerCase().includes(rawBrand.toLowerCase()));
          const modelMatch = prodNameLower.includes(rawModel.toLowerCase()) || (p.model && p.model.toLowerCase().includes(rawModel.toLowerCase())) || prodSkuLower.includes(rawModel.toLowerCase());
          if (brandMatch && modelMatch) return true;
        }

        if (rawModel && rawModel.length >= 3) {
          if (prodNameLower.includes(rawModel.toLowerCase()) || prodSkuLower.includes(rawModel.toLowerCase())) {
            return true;
          }
        }

        if (nameParts.length >= 2) {
          const matchedParts = nameParts.filter((part: string) => prodNameLower.includes(part) || prodSkuLower.includes(part));
          if (matchedParts.length >= 2 && matchedParts.length >= Math.ceil(nameParts.length * 0.6)) {
            return true;
          }
        }

        return false;
      });

      if (candidate) {
        matchedProduct = candidate;
        matchType = 'matched_model_brand';
      }
    }

    if (!matchedProduct) {
      matchType = 'unmatched';
      const label = rawName || (rawBrand && rawModel ? `${rawBrand} ${rawModel}` : rawSku) || `Qator #${rowNum}`;
      if (!unmatchedProducts.includes(label)) {
        unmatchedProducts.push(label);
      }
    }

    // Determine final UZS price
    let finalPriceUZS = rawPriceUZS;
    if (finalPriceUZS <= 0 && rawPriceUSD > 0) {
      finalPriceUZS = Math.round(rawPriceUSD * exchangeRate);
    }
    if (finalPriceUZS <= 0 && matchedProduct) {
      finalPriceUZS = matchedProduct.purchasePriceUZS || 0;
    }

    rows.push({
      rowNumber: rowNum,
      productName: rawName || matchedProduct?.name || (rawBrand && rawModel ? `${rawBrand} ${rawModel}` : 'Yangi mahsulot'),
      sku: rawSku || matchedProduct?.sku || `SKU-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      brand: rawBrand || matchedProduct?.brand,
      model: rawModel || matchedProduct?.model,
      quantity: rawQty,
      unitPriceUSD: rawPriceUSD || (currency === 'USD' ? Math.round(finalPriceUZS / exchangeRate) : undefined),
      unitPriceUZS: finalPriceUZS,
      matchedProductId: matchedProduct?.id,
      matchedProductName: matchedProduct?.name,
      matchType,
      isValid: true,
      errors
    });
  }

  // If supplier wasn't in excel file, default to standard supplier label
  if (!supplier) {
    supplier = "Excel orqali ta'minotchi";
  }

  const totalQuantity = rows.reduce((s, r) => s + r.quantity, 0);
  const totalSumUZS = rows.reduce((s, r) => s + r.quantity * r.unitPriceUZS, 0);

  return {
    rows,
    supplier,
    warehouse,
    currency,
    exchangeRate,
    totalQuantity,
    totalSumUZS,
    unmatchedProducts,
    errors: generalErrors
  };
}

export async function parseKirimExcel(
  file: File,
  existingProducts: Product[],
  defaultExchangeRate: number
): Promise<{
  rows: ExcelImportRow[];
  supplier?: string;
  warehouse?: string;
  currency: 'UZS' | 'USD';
  exchangeRate: number;
  totalQuantity: number;
  totalSumUZS: number;
  unmatchedProducts: string[];
  errors: string[];
}> {
  const buffer = await file.arrayBuffer();
  return parseExcelKirim(buffer, existingProducts, defaultExchangeRate);
}

export function exportSingleKirimToExcel(record: IntakeRecord) {
  const itemRows = record.items.map((it, idx) => ({
    '№': idx + 1,
    'Kirim ID': record.id,
    'Sana': record.date,
    'Yetkazib beruvchi': record.supplier,
    'Ombor': record.warehouse || 'Bosh ombor',
    'Mahsulot nomi': it.productName,
    'Artikul / SKU': it.sku,
    'Miqdor': it.quantity,
    'Birlik narxi (so‘m)': it.unitPriceUZS,
    'Jami summa (so‘m)': it.totalPriceUZS,
    'Razmeshenie holati': (it.placedQuantity ?? 0) >= it.quantity ? 'To‘liq qabul qilingan' : `${it.placedQuantity || 0}/${it.quantity} qabul qilindi`,
    'Seriya raqamlari': it.generatedSerials.length > 0 ? it.generatedSerials.join(', ') : 'Kutilmoqda',
    'Operator': record.operator
  }));

  const ws = XLSX.utils.json_to_sheet(itemRows);
  ws['!cols'] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 18 },
    { wch: 28 },
    { wch: 16 },
    { wch: 32 },
    { wch: 16 },
    { wch: 10 },
    { wch: 18 },
    { wch: 18 },
    { wch: 22 },
    { wch: 35 },
    { wch: 16 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Kirim_${record.id}`);
  const safeSupplier = (record.supplier || 'Yetkazib_beruvchi').replace(/[^a-zA-Z0-9]/g, '_');
  XLSX.writeFile(wb, `Shohrent_Kirim_${record.id}_${safeSupplier}.xlsx`);
}

export function downloadKirimTemplate() {
  const sampleData = [
    {
      'Yetkazib beruvchi': 'Bosch Professional Uzbekistan',
      'Ombor': 'Bosh ombor',
      'Valyuta': 'UZS',
      'Kurs': 12850,
      'Mahsulot nomi': 'Bosch GBH 2-28 D Perforator',
      'Artikul / SKU': 'BSH-GBH228',
      'Miqdor': 5,
      'Narx (USD)': 220,
      'Narx (UZS)': 2827000
    },
    {
      'Yetkazib beruvchi': 'Hilti Tashkent Distribyutor',
      'Ombor': 'Bosh ombor',
      'Valyuta': 'USD',
      'Kurs': 12850,
      'Mahsulot nomi': 'Hilti TE 3000-AVR Betonteshgich',
      'Artikul / SKU': 'HLT-TE3000',
      'Miqdor': 2,
      'Narx (USD)': 1200,
      'Narx (UZS)': 15420000
    },
    {
      'Yetkazib beruvchi': 'Wacker Neuson Central Asia',
      'Ombor': 'Yunusobod ombori',
      'Valyuta': 'UZS',
      'Kurs': 12850,
      'Mahsulot nomi': 'Vibroplita Wacker DPU 6555',
      'Artikul / SKU': 'WCK-DPU6555',
      'Miqdor': 1,
      'Narx (USD)': 0,
      'Narx (UZS)': 18500000
    }
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  ws['!cols'] = [
    { wch: 28 }, // Yetkazib beruvchi
    { wch: 16 }, // Ombor
    { wch: 10 }, // Valyuta
    { wch: 10 }, // Kurs
    { wch: 34 }, // Mahsulot nomi
    { wch: 16 }, // Artikul / SKU
    { wch: 10 }, // Miqdor
    { wch: 14 }, // Narx USD
    { wch: 18 }  // Narx UZS
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Kirim_Shabloni');
  XLSX.writeFile(wb, 'Shohrent_Kirim_Shabloni.xlsx');
}

export function exportKirimToExcel(records: IntakeRecord[]) {
  const exportRows = records.flatMap(rec =>
    rec.items.map(item => ({
      'Kirim ID': rec.id,
      'Sana': rec.date,
      'Yetkazib beruvchi': rec.supplier,
      'Ombor': rec.warehouse || 'Bosh ombor',
      'Operator': rec.operator,
      'Valyuta': rec.currency,
      'Kurs': rec.exchangeRate,
      'Mahsulot': item.productName,
      'Artikul (SKU)': item.sku,
      'Miqdor': item.quantity,
      'Birlik narxi (so‘m)': item.unitPriceUZS,
      'Jami summa (so‘m)': item.totalPriceUZS,
      'Razmeshenie holati': (item.placedQuantity ?? 0) >= item.quantity ? 'To‘liq kiritilgan' : 'Seriyalar kutilmoqda',
      'Seriya raqamlari': item.generatedSerials.join(', ')
    }))
  );

  const ws = XLSX.utils.json_to_sheet(exportRows);
  ws['!cols'] = [
    { wch: 14 },
    { wch: 18 },
    { wch: 26 },
    { wch: 16 },
    { wch: 16 },
    { wch: 10 },
    { wch: 10 },
    { wch: 32 },
    { wch: 16 },
    { wch: 10 },
    { wch: 18 },
    { wch: 18 },
    { wch: 20 },
    { wch: 35 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Kirim_Reyestri');
  XLSX.writeFile(wb, `Shohrent_Kirim_Reyestri_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportOrdersToExcel(orders: Order[]) {
  const exportRows = orders.map(ord => ({
    'Buyurtma ID': ord.id,
    'Sana': ord.orderDate,
    'Mijoz': ord.clientName,
    'Telefon': ord.clientPhone,
    'Sotuvchi': ord.salespersonName,
    'Holati':
      ord.status === 'new'
        ? 'Yangi'
        : ord.status === 'active'
        ? 'Ishda / Obyektda'
        : ord.status === 'returning_today'
        ? 'Qaytib keladigan'
        : ord.status === 'overdue'
        ? 'Muddati o‘tgan'
        : 'Yopilgan',
    'To‘lov holati':
      ord.paymentStatus === 'paid'
        ? 'To‘langan'
        : ord.paymentStatus === 'partial'
        ? 'Qisman to‘langan'
        : 'To‘lanmagan',
    'Jami summa (so‘m)': ord.grandTotalUZS,
    'Olingan pul (so‘m)': ord.paidAmountUZS,
    'Qolgan qarz (so‘m)': ord.remainingAmountUZS,
    'To‘lov muddati': ord.paymentDueDate || '-',
    'Uskunalar': ord.tools.map(t => `${t.productName} (SN: ${t.serialNumber})`).join('; '),
    'Xizmatlar summasi (so‘m)': ord.subtotalServicesUZS,
    'Depozit (so‘m)': ord.depositTotalUZS,
    'Yetkazish manzili': ord.deliveryAddress
  }));

  const ws = XLSX.utils.json_to_sheet(exportRows);
  ws['!cols'] = [
    { wch: 14 },
    { wch: 14 },
    { wch: 24 },
    { wch: 18 },
    { wch: 20 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 16 },
    { wch: 38 },
    { wch: 22 },
    { wch: 16 },
    { wch: 30 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Buyurtmalar');
  XLSX.writeFile(wb, `Shohrent_Buyurtmalar_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportProductsWithSerials(products: Product[]) {
  const rows = products.flatMap(p =>
    p.serials.map(s => ({
      'Mahsulot': p.name,
      'Artikul / SKU': p.sku,
      'Kategoriya': p.category,
      'Guruh': p.group,
      'Seriya Raqami (SN)': s.serialNumber,
      'Holati':
        s.status === 'available'
          ? 'Omborda mavjud'
          : s.status === 'rented'
          ? 'Ijarada'
          : s.status === 'maintenance'
          ? 'Ta‘mirda'
          : 'Hisobdan chiqarilgan',
      'Biriktirilgan Buyurtma': s.currentOrderId || '-',
      'Mijoz': s.currentClientName || '-',
      'Kunlik narxi (so‘m)': p.dailyRate,
      'Garov depoziti (so‘m)': p.depositAmount
    }))
  );

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    { wch: 32 },
    { wch: 16 },
    { wch: 20 },
    { wch: 20 },
    { wch: 22 },
    { wch: 18 },
    { wch: 22 },
    { wch: 22 },
    { wch: 18 },
    { wch: 18 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Inventar_Seriyalar');
  XLSX.writeFile(wb, `Shohrent_Seriyalar_Reyestri_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportFullProductsCatalogToExcel(products: Product[]) {
  const rows = products.map((p) => {
    const availableCount = p.serials.filter((s) => s.status === 'available').length;
    const rentedCount = p.serials.filter((s) => s.status === 'rented').length;
    const maintenanceCount = p.serials.filter((s) => s.status === 'maintenance').length;

    return {
      'Mahsulot nomi': p.name,
      'Artikul / SKU': p.sku,
      'Shtrix-kod': p.barcode || '-',
      'Kategoriya': p.category,
      'Omborxona': p.warehouse || 'Bosh ombor',
      'Yaratgan xodim': p.createdBy || 'Boshqaruvchi',
      'Tavsif (Izoh)': p.description || '-',
      'Kunlik stavka (so‘m)': p.dailyRate,
      'Garov depoziti (so‘m)': p.depositAmount,
      'Xarid narxi (so‘m)': p.purchasePriceUZS,
      'Jami soni': p.totalQuantity,
      'Omborda mavjud': availableCount,
      'Ijarada': rentedCount,
      'Ta‘mirda / Servis': maintenanceCount,
      'Yaratilgan sana': p.createdAt
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    { wch: 30 },
    { wch: 16 },
    { wch: 18 },
    { wch: 22 },
    { wch: 18 },
    { wch: 20 },
    { wch: 35 },
    { wch: 20 },
    { wch: 20 },
    { wch: 20 },
    { wch: 12 },
    { wch: 16 },
    { wch: 12 },
    { wch: 18 },
    { wch: 16 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Mahsulotlar_Katalogi');
  XLSX.writeFile(wb, `Shohrent_Mahsulotlar_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportProductMovementsToExcel(products: Product[]) {
  const allMovements = products.flatMap((p) => {
    const list = p.movementHistory && p.movementHistory.length > 0
      ? p.movementHistory
      : [];

    return list.map((m) => {
      let typeLabel = 'Boshqa';
      switch (m.type) {
        case 'intake':
          typeLabel = 'Kirim qilingan';
          break;
        case 'rent':
          typeLabel = 'Ijaraga berilgan (Mijozda)';
          break;
        case 'return':
          typeLabel = 'Omborga qaytarilgan';
          break;
        case 'technician':
          typeLabel = 'Ustaga berilgan (Ta\'mir)';
          break;
        case 'maintenance':
          typeLabel = 'Servisdan qaytgan';
          break;
        case 'transfer':
          typeLabel = 'Omborlararo ko‘chirilgan';
          break;
        case 'write_off':
          typeLabel = 'Hisobdan chiqarilgan';
          break;
      }

      return {
        'Sana': m.date,
        'Mahsulot nomi': m.productName || p.name,
        'Artikul / SKU': p.sku,
        'Seriya raqami (SN)': m.serialNumber || '-',
        'Harakat turi': typeLabel,
        'Mijoz': m.clientName || '-',
        'Buyurtma #': m.orderId || '-',
        'Usta / Texnik': m.technicianName || '-',
        'Omborxona': m.warehouse || p.warehouse || 'Bosh ombor',
        'Mas\'ul xodim': m.operator || 'Tizim',
        'Sabab / Tavsif': m.reason || '-',
        'Summa (so‘m)': m.costUZS || 0,
        'Qo‘shimcha izoh': m.notes || '-'
      };
    });
  });

  if (allMovements.length === 0) {
    // If no movements yet, export a clean header template with sample
    allMovements.push({
      'Sana': new Date().toISOString().slice(0, 10),
      'Mahsulot nomi': 'Namuna: Bosch GBH 2-28',
      'Artikul / SKU': 'BSH-228',
      'Seriya raqami (SN)': 'SN-1001',
      'Harakat turi': 'Ustaga berilgan (Ta\'mir)',
      'Mijoz': '-',
      'Buyurtma #': '-',
      'Usta / Texnik': 'Usta Mahmud (Profilaktika)',
      'Omborxona': 'Bosh ombor',
      'Mas\'ul xodim': 'Shohjaxon',
      'Sabab / Tavsif': 'Muntazam moylash va cho‘tka almashtirish',
      'Summa (so‘m)': 45000,
      'Qo‘shimcha izoh': '1 kunda tayyor bo‘ladi'
    });
  }

  const ws = XLSX.utils.json_to_sheet(allMovements);
  ws['!cols'] = [
    { wch: 14 },
    { wch: 28 },
    { wch: 16 },
    { wch: 18 },
    { wch: 24 },
    { wch: 20 },
    { wch: 16 },
    { wch: 22 },
    { wch: 18 },
    { wch: 20 },
    { wch: 30 },
    { wch: 16 },
    { wch: 25 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Mahsulot_Harakatlari');
  XLSX.writeFile(wb, `Shohrent_Harakatlar_Tarixi_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function parseExcelProducts(fileData: ArrayBuffer): Partial<Product>[] {
  const workbook = XLSX.read(fileData, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  if (!worksheet) return [];

  const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  if (rawRows.length <= 1) return [];

  const headerRow = rawRows[0].map((h) => String(h).toLowerCase().trim());
  const nameIdx = headerRow.findIndex((h) => h.includes('nom') || h.includes('name') || h.includes('наименование'));
  const skuIdx = headerRow.findIndex((h) => h.includes('sku') || h.includes('artikul') || h.includes('артикул'));
  const barcodeIdx = headerRow.findIndex((h) => h.includes('shtrix') || h.includes('barcode') || h.includes('штрих'));
  const catIdx = headerRow.findIndex((h) => h.includes('kategoriya') || h.includes('category') || h.includes('категория'));
  const rateIdx = headerRow.findIndex((h) => h.includes('stavka') || h.includes('kunlik') || h.includes('narx'));
  const depositIdx = headerRow.findIndex((h) => h.includes('garov') || h.includes('depozit') || h.includes('залог'));
  const descIdx = headerRow.findIndex((h) => h.includes('izoh') || h.includes('tavsif') || h.includes('desc'));
  const warehouseIdx = headerRow.findIndex((h) => h.includes('ombor') || h.includes('sklad') || h.includes('склад'));

  const parsedProducts: Partial<Product>[] = [];

  for (let r = 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    const name = nameIdx >= 0 ? String(row[nameIdx] || '').trim() : '';
    if (!name) continue;

    const sku = skuIdx >= 0 && row[skuIdx] ? String(row[skuIdx]).trim() : `SKU-${Date.now().toString().slice(-4)}`;
    const barcode = barcodeIdx >= 0 && row[barcodeIdx] ? String(row[barcodeIdx]).trim() : undefined;
    const category = catIdx >= 0 && row[catIdx] ? String(row[catIdx]).trim() : 'Asboblar va Uskunalar';
    const dailyRate = rateIdx >= 0 ? parseFloat(String(row[rateIdx]).replace(/[^0-9.]/g, '')) || 100000 : 100000;
    const depositAmount = depositIdx >= 0 ? parseFloat(String(row[depositIdx]).replace(/[^0-9.]/g, '')) || 300000 : 300000;
    const description = descIdx >= 0 && row[descIdx] ? String(row[descIdx]).trim() : '';
    const warehouse = warehouseIdx >= 0 && row[warehouseIdx] ? String(row[warehouseIdx]).trim() : 'Bosh ombor';

    parsedProducts.push({
      name,
      sku,
      barcode,
      category,
      dailyRate,
      depositAmount,
      purchasePriceUZS: dailyRate * 10,
      description,
      warehouse
    });
  }

  return parsedProducts;
}
