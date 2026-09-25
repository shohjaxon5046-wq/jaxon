import { IntakeRecord, IntakeItem, Product, AuditLogEntry, SerialNumber } from '../types';
import { formatUZS } from '../utils/pricing';

export interface IntakeEditItemPayload {
  productId?: string;
  productName: string;
  sku?: string;
  quantity: number | string;
  unitPriceUSD?: number | string;
  unitPriceUZS: number | string;
  placedQuantity?: number;
  generatedSerials?: string[];
}

export interface IntakeEditPayload {
  supplier: string;
  warehouse: string;
  currency: 'UZS' | 'USD';
  exchangeRate: number;
  date: string;
  notes?: string;
  items: IntakeEditItemPayload[];
}

export interface StockAdjustmentResult {
  productId: string;
  productName: string;
  oldQty: number;
  newQty: number;
  deltaQty: number;
  oldPriceUZS: number;
  newPriceUZS: number;
  warehouse: string;
  action: 'added' | 'modified' | 'removed';
}

export interface IntakeUpdateResult {
  updatedRecord: IntakeRecord;
  updatedProducts: Product[];
  auditLog: AuditLogEntry;
  stockAdjustments: StockAdjustmentResult[];
}

export class IntakeService {
  /**
   * Validate intake edit payload before applying
   */
  static validateIntakeEdit(payload: IntakeEditPayload): { valid: boolean; error?: string } {
    if (!payload.supplier || !payload.supplier.trim()) {
      return { valid: false, error: 'Yetkazib beruvchi nomini kiritish majburiy.' };
    }

    if (!payload.warehouse || !payload.warehouse.trim()) {
      return { valid: false, error: 'Qabul omborini tanlash majburiy.' };
    }

    if (!payload.items || payload.items.length === 0) {
      return { valid: false, error: 'Kirim hujjatida kamida bitta mahsulot qatori bo‘lishi shart.' };
    }

    for (let i = 0; i < payload.items.length; i++) {
      const item = payload.items[i];
      if (!item.productName || !item.productName.trim()) {
        return { valid: false, error: `${i + 1}-qatordagi mahsulot nomini to‘ldiring.` };
      }

      const qty = typeof item.quantity === 'number' ? item.quantity : parseInt(String(item.quantity)) || 0;
      if (qty <= 0) {
        return { valid: false, error: `"${item.productName}" uchun miqdor kamida 1 bo‘lishi kerak.` };
      }

      const placed = item.placedQuantity || 0;
      if (placed > 0 && qty < placed) {
        return {
          valid: false,
          error: `"${item.productName}" uchun ${placed} ta seriya raqami allaqachon razmeshenie qilingan. Miqdorni ${placed} dan kamaytirib bo‘lmaydi.`
        };
      }
    }

    return { valid: true };
  }

  /**
   * Apply edits to an intake document and synchronize warehouse inventory balances
   */
  static applyIntakeEditAndSyncStock(
    currentRecord: IntakeRecord,
    payload: IntakeEditPayload,
    currentProducts: Product[],
    operatorName: string
  ): IntakeUpdateResult {
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const updatedProducts = currentProducts.map((p) => ({ ...p, serials: [...p.serials] }));
    const stockAdjustments: StockAdjustmentResult[] = [];
    const changeDescriptions: string[] = [];

    const exchangeRate = payload.exchangeRate > 0 ? payload.exchangeRate : 12800;
    const trimmedSupplier = payload.supplier.trim();
    const warehouse = payload.warehouse.trim();

    // Map existing items by productId or normalized name for diffing
    const oldItemsMap = new Map<string, IntakeItem>();
    currentRecord.items.forEach((item) => {
      const key = item.productId || item.productName.toLowerCase().trim();
      oldItemsMap.set(key, item);
    });

    const newIntakeItems: IntakeItem[] = [];

    payload.items.forEach((itemPayload, idx) => {
      const pName = itemPayload.productName.trim();
      const qty = typeof itemPayload.quantity === 'number' ? itemPayload.quantity : parseInt(String(itemPayload.quantity)) || 1;
      const priceUZS =
        typeof itemPayload.unitPriceUZS === 'number'
          ? itemPayload.unitPriceUZS
          : parseFloat(String(itemPayload.unitPriceUZS)) || 0;
      const priceUSD =
        payload.currency === 'USD'
          ? typeof itemPayload.unitPriceUSD === 'number'
            ? itemPayload.unitPriceUSD
            : parseFloat(String(itemPayload.unitPriceUSD || '')) || Math.round(priceUZS / exchangeRate)
          : parseFloat((priceUZS / exchangeRate).toFixed(2));

      // Match product in warehouse
      let prod = itemPayload.productId
        ? updatedProducts.find((p) => p.id === itemPayload.productId)
        : updatedProducts.find((p) => p.name.toLowerCase().trim() === pName.toLowerCase().trim());

      const oldItem =
        (itemPayload.productId && oldItemsMap.get(itemPayload.productId)) ||
        oldItemsMap.get(pName.toLowerCase().trim());

      const oldQty = oldItem ? oldItem.quantity : 0;
      const oldPrice = oldItem ? oldItem.unitPriceUZS : 0;
      const deltaQty = qty - oldQty;

      if (!prod) {
        // Create new product if not present
        const autoSku = itemPayload.sku || `SKU-${pName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
        prod = {
          id: itemPayload.productId || `prod-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
          name: pName,
          sku: autoSku,
          category: 'Asboblar va Uskunalar',
          group: 'Asosiy fond',
          warehouse: warehouse,
          unit: 'dona',
          dailyRate: Math.round(priceUZS * 0.05) || 100000,
          depositAmount: Math.round(priceUZS * 0.3) || 500000,
          purchasePriceUZS: priceUZS,
          totalQuantity: 0,
          serials: [],
          createdBy: operatorName,
          createdAt: nowStr.slice(0, 10),
          movementHistory: [
            {
              id: `mov-${Date.now()}-${idx}`,
              productId: itemPayload.productId || '',
              productName: pName,
              type: 'intake',
              date: payload.date ? payload.date.slice(0, 10) : nowStr.slice(0, 10),
              operator: operatorName,
              reason: `Kirim #${currentRecord.id} tahririda yangi tovar qo'shildi (${qty} dona)`,
              createdAt: new Date().toISOString()
            }
          ]
        };
        updatedProducts.push(prod);

        stockAdjustments.push({
          productId: prod.id,
          productName: pName,
          oldQty: 0,
          newQty: qty,
          deltaQty: qty,
          oldPriceUZS: 0,
          newPriceUZS: priceUZS,
          warehouse,
          action: 'added'
        });
        changeDescriptions.push(`Tovar qo'shildi: "${pName}" (${qty} dona, ${formatUZS(priceUZS)})`);
      } else {
        // Product exists: update warehouse, price, and synchronize stock balances
        prod.warehouse = warehouse;
        if (priceUZS > 0) {
          prod.purchasePriceUZS = priceUZS;
        }

        // Stock quantity synchronization
        if (deltaQty !== 0 || priceUZS !== oldPrice) {
          // If product uses serial numbers
          if (prod.serials && prod.serials.length > 0) {
            if (deltaQty < 0) {
              // Safely trim excess available serials if user decreased intake quantity
              const toRemove = Math.abs(deltaQty);
              let removed = 0;
              prod.serials = prod.serials.filter((sn) => {
                if (removed < toRemove && sn.status === 'available') {
                  removed++;
                  return false;
                }
                return true;
              });
              prod.totalQuantity = prod.serials.length;
            } else {
              // Positive delta: will be placed in Razmeshenie
              prod.totalQuantity = Math.max(prod.serials.length, (prod.totalQuantity || 0) + deltaQty);
            }
          } else {
            // General quantity stock
            prod.totalQuantity = Math.max(0, (prod.totalQuantity || 0) + deltaQty);
          }

          // Register in product movement history
          prod.movementHistory = [
            {
              id: `mov-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
              productId: prod.id,
              productName: prod.name,
              type: 'intake',
              date: payload.date ? payload.date.slice(0, 10) : nowStr.slice(0, 10),
              operator: operatorName,
              reason: `Kirim #${currentRecord.id} tahrirlash orqali ombor balansi yangilandi: ${oldQty} -> ${qty} (${deltaQty > 0 ? '+' : ''}${deltaQty} dona), narx: ${formatUZS(priceUZS)}`,
              createdAt: new Date().toISOString()
            },
            ...(prod.movementHistory || [])
          ];

          stockAdjustments.push({
            productId: prod.id,
            productName: prod.name,
            oldQty,
            newQty: qty,
            deltaQty,
            oldPriceUZS: oldPrice,
            newPriceUZS: priceUZS,
            warehouse,
            action: 'modified'
          });

          if (deltaQty !== 0) {
            changeDescriptions.push(
              `"${prod.name}" miqdori: ${oldQty} -> ${qty} (${deltaQty > 0 ? '+' : ''}${deltaQty} dona)`
            );
          }
          if (priceUZS !== oldPrice) {
            changeDescriptions.push(
              `"${prod.name}" narxi: ${formatUZS(oldPrice)} -> ${formatUZS(priceUZS)}`
            );
          }
        }
      }

      // Check placed status
      const placed = itemPayload.placedQuantity || (oldItem ? oldItem.placedQuantity || 0 : 0);
      newIntakeItems.push({
        productId: prod.id,
        productName: prod.name,
        sku: prod.sku,
        quantity: qty,
        unitPriceUSD: priceUSD,
        unitPriceUZS: priceUZS,
        totalPriceUZS: qty * priceUZS,
        needsPlacement: placed < qty,
        placedQuantity: placed,
        generatedSerials: itemPayload.generatedSerials || (oldItem ? oldItem.generatedSerials || [] : [])
      });
    });

    // Check for removed items from old intake
    currentRecord.items.forEach((oldItem) => {
      const stillExists = payload.items.some(
        (it) =>
          (it.productId && it.productId === oldItem.productId) ||
          it.productName.toLowerCase().trim() === oldItem.productName.toLowerCase().trim()
      );

      if (!stillExists) {
        // Item was removed from intake: reduce product balance accordingly
        const prod = updatedProducts.find((p) => p.id === oldItem.productId || p.name.toLowerCase().trim() === oldItem.productName.toLowerCase().trim());
        if (prod) {
          if (prod.serials && prod.serials.length > 0) {
            let removed = 0;
            prod.serials = prod.serials.filter((sn) => {
              if (removed < oldItem.quantity && sn.status === 'available') {
                removed++;
                return false;
              }
              return true;
            });
            prod.totalQuantity = prod.serials.length;
          } else {
            prod.totalQuantity = Math.max(0, (prod.totalQuantity || 0) - oldItem.quantity);
          }

          prod.movementHistory = [
            {
              id: `mov-${Date.now()}-rm-${Math.random().toString(36).substr(2, 4)}`,
              productId: prod.id,
              productName: prod.name,
              type: 'placement',
              date: payload.date ? payload.date.slice(0, 10) : nowStr.slice(0, 10),
              operator: operatorName,
              reason: `Kirim #${currentRecord.id} tahririda tovar qatori o'chirildi (-${oldItem.quantity} dona)`,
              createdAt: new Date().toISOString()
            },
            ...(prod.movementHistory || [])
          ];

          stockAdjustments.push({
            productId: prod.id,
            productName: prod.name,
            oldQty: oldItem.quantity,
            newQty: 0,
            deltaQty: -oldItem.quantity,
            oldPriceUZS: oldItem.unitPriceUZS,
            newPriceUZS: 0,
            warehouse,
            action: 'removed'
          });

          changeDescriptions.push(`Tovar qatori o'chirildi: "${oldItem.productName}" (-${oldItem.quantity} dona)`);
        }
      }
    });

    // Recalculate totals
    const totalAmountUZS = newIntakeItems.reduce((sum, it) => sum + it.totalPriceUZS, 0);
    const totalAmountUSD =
      payload.currency === 'USD' || exchangeRate > 0
        ? Math.round(totalAmountUZS / exchangeRate)
        : 0;
    const isFullyPlaced = newIntakeItems.every((it) => (it.placedQuantity || 0) >= it.quantity);

    // Audit logs for document updates
    if (currentRecord.supplier !== trimmedSupplier) {
      changeDescriptions.push(`Yetkazib beruvchi: "${currentRecord.supplier}" -> "${trimmedSupplier}"`);
    }
    if (currentRecord.warehouse !== warehouse) {
      changeDescriptions.push(`Ombor: "${currentRecord.warehouse}" -> "${warehouse}"`);
    }
    if (currentRecord.date !== payload.date) {
      changeDescriptions.push(`Sana: "${currentRecord.date}" -> "${payload.date}"`);
    }
    if (currentRecord.totalAmountUZS !== totalAmountUZS) {
      changeDescriptions.push(`Jami summa: ${formatUZS(currentRecord.totalAmountUZS)} -> ${formatUZS(totalAmountUZS)}`);
    }

    const auditLog: AuditLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: nowStr,
      operator: operatorName,
      action: "Kirim tahrirlandi va ombor balansi sinxronlandi",
      details: changeDescriptions.length > 0 ? changeDescriptions.join('; ') : "Kirim ma'lumotlari yangilandi"
    };

    const updatedRecord: IntakeRecord = {
      ...currentRecord,
      supplier: trimmedSupplier,
      warehouse: warehouse,
      date: payload.date,
      currency: payload.currency,
      exchangeRate: exchangeRate,
      totalAmountUZS,
      totalAmountUSD,
      items: newIntakeItems,
      notes: payload.notes || '',
      isFullyPlaced,
      updatedAt: nowStr,
      auditLogs: [auditLog, ...(currentRecord.auditLogs || [])]
    };

    return {
      updatedRecord,
      updatedProducts,
      auditLog,
      stockAdjustments
    };
  }
}
