import React, { useState, useMemo } from 'react';
import {
  PackagePlus,
  Search,
  Filter,
  Calendar,
  Building,
  User,
  DollarSign,
  FileSpreadsheet,
  Upload,
  Plus,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Clock,
  Eye,
  Edit2,
  History,
  X,
  ArrowRight,
  QrCode,
  Archive,
  RotateCcw,
  Sparkles,
  Save,
  Package,
  AlertCircle
} from 'lucide-react';
import { Language, IntakeRecord, Product, IntakeItem, AuditLogEntry, ExcelImportRow } from '../types';
import { formatUZS, formatUSD, generateRandomCode } from '../utils/pricing';
import { exportKirimToExcel, exportSingleKirimToExcel, parseKirimExcel } from '../utils/excel';
import { ProductPickerInput } from './ProductPickerInput';
import { NewProductModal } from './NewProductModal';
import { ExcelImportModal, MappedImportResult } from './ExcelImportModal';
import { IntakeService } from '../services/intakeService';

interface Props {
  language: Language;
  intakeRecords: IntakeRecord[];
  products: Product[];
  exchangeRate: number;
  currentUser: string;
  onSaveNewIntake: (record: IntakeRecord, updatedProducts: Product[]) => void;
  onUpdatePastIntake: (record: IntakeRecord, updatedProducts?: Product[]) => void;
  onDeleteIntake?: (id: string, reason: string) => void;
  onRestoreIntake?: (id: string) => void;
  onPermanentDeleteIntake?: (id: string) => void;
  onSaveProduct?: (newProd: Product) => void;
  onNavigateToPlacement?: () => void;
}

export const InventoryIntakeView: React.FC<Props> = ({
  language,
  intakeRecords,
  products,
  exchangeRate,
  currentUser,
  onSaveNewIntake,
  onUpdatePastIntake,
  onDeleteIntake,
  onRestoreIntake,
  onPermanentDeleteIntake,
  onSaveProduct,
  onNavigateToPlacement
}) => {
  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [excelImportTarget, setExcelImportTarget] = useState<'intake' | 'form'>('intake');
  const [inspectingRecord, setInspectingRecord] = useState<IntakeRecord | null>(null);
  const [expandedSerialItemIdx, setExpandedSerialItemIdx] = useState<number | null>(null);
  const [selectedAuditRecord, setSelectedAuditRecord] = useState<IntakeRecord | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<IntakeRecord | null>(null);
  const [permanentDeletingRecord, setPermanentDeletingRecord] = useState<IntakeRecord | null>(null);
  const [deleteReasonInput, setDeleteReasonInput] = useState('');

  // Comprehensive Edit Modal State
  const [editingRecord, setEditingRecord] = useState<IntakeRecord | null>(null);
  const [editSupplier, setEditSupplier] = useState('');
  const [editWarehouse, setEditWarehouse] = useState('Bosh ombor');
  const [editCurrency, setEditCurrency] = useState<'UZS' | 'USD'>('UZS');
  const [editExchangeRate, setEditExchangeRate] = useState(exchangeRate || 12800);
  const [editDate, setEditDate] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editItems, setEditItems] = useState<
    Array<{
      productId?: string;
      productName: string;
      sku?: string;
      quantity: number | string;
      unitPriceUSD?: number | string;
      unitPriceUZS: number | string;
      placedQuantity?: number;
      generatedSerials?: string[];
      originalQuantity?: number;
      originalPriceUZS?: number;
    }>
  >([]);
  const [editError, setEditError] = useState<string | null>(null);

  // Status Filter ('active' | 'deleted' | 'all')
  const [statusFilter, setStatusFilter] = useState<'active' | 'deleted' | 'all'>('active');

  // Filters state (Kun, Yetkazib beruvchi, Ombor, Operator)
  const [filterDate, setFilterDate] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('all');
  const [filterWarehouse, setFilterWarehouse] = useState('all');
  const [filterOperator, setFilterOperator] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // New Intake Form state
  const [formSupplier, setFormSupplier] = useState('');
  const [formWarehouse, setFormWarehouse] = useState('Bosh ombor');
  const [formCurrency, setFormCurrency] = useState<'UZS' | 'USD'>('UZS');
  const [formExchangeRate, setFormExchangeRate] = useState(exchangeRate);
  const [formNotes, setFormNotes] = useState('');
  const [unmatchedWarning, setUnmatchedWarning] = useState<string[]>([]);
  const [formItems, setFormItems] = useState<
    {
      productId?: string;
      productName: string;
      quantity: number | '';
      unitPriceUSD?: number | '';
      unitPriceUZS: number | '';
    }[]
  >([]);

  // Excel import state
  const [excelRows, setExcelRows] = useState<ExcelImportRow[]>([]);
  const [excelSupplier, setExcelSupplier] = useState('');
  const [excelWarehouse, setExcelWarehouse] = useState('Bosh ombor');
  const [excelCurrency, setExcelCurrency] = useState<'UZS' | 'USD'>('UZS');
  const [excelUnmatched, setExcelUnmatched] = useState<string[]>([]);

  // Filter options
  const uniqueSuppliers = Array.from(new Set(intakeRecords.map((r) => r.supplier))).filter(Boolean);
  const uniqueWarehouses = Array.from(new Set(intakeRecords.map((r) => r.warehouse || 'Bosh ombor')));
  const uniqueOperators = Array.from(new Set(intakeRecords.map((r) => r.operator))).filter(Boolean);

  // Counts for tabs
  const activeCount = intakeRecords.filter((r) => r.status !== 'deleted').length;
  const deletedCount = intakeRecords.filter((r) => r.status === 'deleted').length;

  // Filtered Records
  const filteredRecords = useMemo(() => {
    return intakeRecords.filter((rec) => {
      // Status filter
      if (statusFilter === 'active' && rec.status === 'deleted') return false;
      if (statusFilter === 'deleted' && rec.status !== 'deleted') return false;

      const matchSearch =
        rec.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.supplier.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.items.some((i) => i.productName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchDate = !filterDate || rec.date.startsWith(filterDate);
      const matchSupplier = filterSupplier === 'all' || rec.supplier === filterSupplier;
      const matchWarehouse = filterWarehouse === 'all' || (rec.warehouse || 'Bosh ombor') === filterWarehouse;
      const matchOperator = filterOperator === 'all' || rec.operator === filterOperator;

      return matchSearch && matchDate && matchSupplier && matchWarehouse && matchOperator;
    });
  }, [intakeRecords, statusFilter, searchQuery, filterDate, filterSupplier, filterWarehouse, filterOperator]);

  // Handle Soft Delete
  const handleConfirmDelete = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deletingRecord) return;
    const reason = deleteReasonInput.trim() || 'Operator tomonidan arxivlandi';
    if (onDeleteIntake) {
      onDeleteIntake(deletingRecord.id, reason);
    } else {
      const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);
      const updated: IntakeRecord = {
        ...deletingRecord,
        status: 'deleted',
        deletedAt: nowStr,
        deletedBy: currentUser,
        deleteReason: reason,
        auditLogs: [
          ...(deletingRecord.auditLogs || []),
          {
            id: `log-${Date.now()}`,
            timestamp: nowStr,
            operator: currentUser,
            action: "Kirim o'chirildi (arxivlandi)",
            details: `Sabab: ${reason}`
          }
        ]
      };
      onUpdatePastIntake(updated);
    }
    setDeletingRecord(null);
    setDeleteReasonInput('');
  };

  // Handle Restore
  const handleConfirmRestore = (record: IntakeRecord) => {
    if (onRestoreIntake) {
      onRestoreIntake(record.id);
    } else {
      const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);
      const updated: IntakeRecord = {
        ...record,
        status: 'active',
        deletedAt: undefined,
        deletedBy: undefined,
        deleteReason: undefined,
        auditLogs: [
          ...(record.auditLogs || []),
          {
            id: `log-${Date.now()}`,
            timestamp: nowStr,
            operator: currentUser,
            action: "Kirim qayta tiklandi",
            details: "Arxivlangan kirim yozuvi faol holatga qaytarildi"
          }
        ]
      };
      onUpdatePastIntake(updated);
    }
  };

  // Handle Permanent Delete
  const handleConfirmPermanentDelete = () => {
    if (!permanentDeletingRecord) return;
    if (onPermanentDeleteIntake) {
      onPermanentDeleteIntake(permanentDeletingRecord.id);
    }
    setPermanentDeletingRecord(null);
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setFormSupplier('');
    setFormWarehouse('Bosh ombor');
    setFormCurrency('UZS');
    setFormExchangeRate(exchangeRate);
    setFormNotes('');
    setFormItems([
      {
        productName: '',
        quantity: '',
        unitPriceUZS: ''
      }
    ]);
    setIsCreateModalOpen(true);
  };

  // Add Item row in form
  const handleAddItemRow = () => {
    setFormItems([
      ...formItems,
      {
        productName: '',
        quantity: '',
        unitPriceUZS: ''
      }
    ]);
  };

  // Remove Item row safely (always retain at least 1 row)
  const handleRemoveItemRow = (idx: number) => {
    setFormItems((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      return next.length > 0 ? next : [{ productName: '', quantity: '', unitPriceUZS: '' }];
    });
  };

  // Handle item change
  const handleItemFieldChange = (idx: number, field: string, val: any) => {
    const updated = [...formItems];
    const item = { ...updated[idx], [field]: val };

    // Auto currency conversion
    if (formCurrency === 'USD') {
      if (field === 'unitPriceUSD') {
        const numVal = typeof val === 'number' ? val : parseFloat(val) || 0;
        item.unitPriceUSD = val;
        item.unitPriceUZS = Math.round(numVal * formExchangeRate);
      }
    } else {
      if (field === 'unitPriceUZS') {
        const numVal = typeof val === 'number' ? val : parseFloat(val) || 0;
        item.unitPriceUZS = val;
        item.unitPriceUSD = formExchangeRate > 0 ? Math.round(numVal / formExchangeRate) : 0;
      }
    }

    // Auto product recognition if matching an existing product name
    if (field === 'productName' && typeof val === 'string') {
      const match = products.find((p) => p.name.toLowerCase() === val.trim().toLowerCase());
      if (match) {
        item.productId = match.id;
        if (match.purchasePriceUZS && !item.unitPriceUZS) {
          item.unitPriceUZS = match.purchasePriceUZS;
        }
      }
    }

    updated[idx] = item;
    setFormItems(updated);
  };

  // One-click selection and population handler for intake rows
  const handleSelectProductForItem = (idx: number, prod: Product) => {
    setFormItems((prev) => {
      const updated = [...prev];
      const current = { ...updated[idx] };
      current.productName = prod.name;
      current.productId = prod.id;
      // Auto-populate purchase price if set in product
      if (prod.purchasePriceUZS && (!current.unitPriceUZS || current.unitPriceUZS === 0)) {
        current.unitPriceUZS = prod.purchasePriceUZS;
        if (formExchangeRate > 0) {
          current.unitPriceUSD = Math.round(prod.purchasePriceUZS / formExchangeRate);
        }
      }
      // Ensure quantity defaults to at least 1 so calculations work immediately
      if (!current.quantity || current.quantity === 0) {
        current.quantity = 1;
      }
      updated[idx] = current;
      return updated;
    });

    // Seamlessly focus quantity input so user can enter quantity and price right away
    setTimeout(() => {
      const qtyInput = document.getElementById(`intake-item-qty-${idx}`);
      if (qtyInput) {
        (qtyInput as HTMLInputElement).focus();
        (qtyInput as HTMLInputElement).select();
      }
    }, 40);
  };

  // Save New Intake
  const handleSaveIntake = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSupplier.trim()) return;

    const intakeId = generateRandomCode('IN');
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);

    const updatedProducts = [...products];
    const intakeItems: IntakeItem[] = [];

    formItems.forEach((item) => {
      const pName = item.productName.trim();
      if (!pName) return;

      const qty = typeof item.quantity === 'number' ? item.quantity : parseInt(item.quantity) || 1;
      const priceUZS = typeof item.unitPriceUZS === 'number' ? item.unitPriceUZS : parseFloat(item.unitPriceUZS) || 0;
      const priceUSD = typeof item.unitPriceUSD === 'number' ? item.unitPriceUSD : parseFloat(item.unitPriceUSD || '') || undefined;

      // Find or create product - prioritize productId if assigned
      let prod = item.productId
        ? updatedProducts.find((p) => p.id === item.productId)
        : updatedProducts.find((p) => p.name.toLowerCase() === pName.toLowerCase());

      if (!prod) {
        const autoSku = `SKU-${pName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
        prod = {
          id: item.productId || `prod-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          name: pName,
          sku: autoSku,
          category: 'Asboblar va Uskunalar',
          group: 'Asosiy fond',
          warehouse: formWarehouse, // Warehouse location assigned during reception
          unit: 'dona',
          dailyRate: Math.round(priceUZS * 0.05) || 100000,
          depositAmount: Math.round(priceUZS * 0.3) || 500000,
          purchasePriceUZS: priceUZS,
          totalQuantity: 0,
          serials: [],
          createdBy: currentUser,
          createdAt: nowStr.slice(0, 10)
        };
        updatedProducts.push(prod);
      } else {
        // Assign / update warehouse location during reception
        prod.warehouse = formWarehouse;
        if (priceUZS > 0 && !prod.purchasePriceUZS) {
          prod.purchasePriceUZS = priceUZS;
        }
      }

      intakeItems.push({
        productId: prod.id,
        productName: prod.name,
        sku: prod.sku,
        quantity: qty,
        unitPriceUSD: priceUSD,
        unitPriceUZS: priceUZS,
        totalPriceUZS: qty * priceUZS,
        needsPlacement: true,
        placedQuantity: 0,
        generatedSerials: []
      });
    });

    if (intakeItems.length === 0) return;

    const totalUZS = intakeItems.reduce((s, it) => s + it.totalPriceUZS, 0);
    const newRecord: IntakeRecord = {
      id: intakeId,
      supplier: formSupplier,
      warehouse: formWarehouse,
      operator: currentUser,
      date: nowStr,
      currency: formCurrency,
      exchangeRate: formExchangeRate,
      totalAmountUZS: totalUZS,
      totalAmountUSD: Math.round(totalUZS / formExchangeRate),
      items: intakeItems,
      notes: formNotes,
      isFullyPlaced: false,
      createdAt: new Date().toISOString(),
      auditLogs: [
        {
          id: `log-${Date.now()}`,
          timestamp: nowStr,
          operator: currentUser,
          action: 'Yaratildi',
          details: `Yangi kirim yaratildi. Jami summa: ${formatUZS(totalUZS)}. Razmesheniega yuborildi.`
        }
      ]
    };

    onSaveNewIntake(newRecord, updatedProducts);
    setIsCreateModalOpen(false);

    // AUTOMATIC TRANSITION TO RAZMESHENIE
    if (onNavigateToPlacement) {
      onNavigateToPlacement();
    }
  };

  // Excel Import Completed (Handles both top-level and inside-form targets)
  const handleExcelImportCompleted = (result: MappedImportResult) => {
    const {
      matchedRows,
      newProductsToCreate,
      supplier: resSupplier,
      warehouse: resWarehouse,
      currency: resCurrency,
      exchangeRate: resExchangeRate
    } = result;

    if (matchedRows.length === 0) return;

    let updatedProducts = [...products];
    if (newProductsToCreate && newProductsToCreate.length > 0) {
      newProductsToCreate.forEach((np) => {
        if (!updatedProducts.some((p) => p.id === np.id)) {
          updatedProducts.push(np);
          if (onSaveProduct) onSaveProduct(np);
        }
      });
    }

    if (excelImportTarget === 'form') {
      // User was inside Create Modal and imported into form
      if (resSupplier) setFormSupplier(resSupplier);
      if (resWarehouse) setFormWarehouse(resWarehouse);
      if (resCurrency) setFormCurrency(resCurrency);
      if (resExchangeRate) setFormExchangeRate(resExchangeRate);

      const newItems = matchedRows.map((r) => ({
        productId: r.matchedProductId,
        productName: r.productName,
        quantity: r.quantity,
        unitPriceUSD: r.unitPriceUSD,
        unitPriceUZS: r.unitPriceUZS
      }));
      setFormItems(newItems);
      setIsExcelModalOpen(false);
      return;
    }

    // Direct intake record creation
    const supplierToUse = resSupplier.trim() || 'Excel yetkazib beruvchi';
    const intakeId = generateRandomCode('IN');
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);

    const intakeItems: IntakeItem[] = [];

    matchedRows.forEach((row) => {
      let prod = updatedProducts.find(
        (p) =>
          (row.matchedProductId && p.id === row.matchedProductId) ||
          p.name.toLowerCase() === row.productName.toLowerCase()
      );

      if (!prod) {
        const autoSku = row.sku || `SKU-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        prod = {
          id: `prod-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          name: row.productName,
          sku: autoSku,
          category: 'Asboblar va Uskunalar',
          group: 'Asosiy fond',
          warehouse: resWarehouse || 'Bosh ombor',
          dailyRate: Math.round(row.unitPriceUZS * 0.05) || 120000,
          depositAmount: Math.round(row.unitPriceUZS * 0.3) || 600000,
          purchasePriceUZS: row.unitPriceUZS,
          totalQuantity: 0,
          serials: [],
          createdAt: nowStr.slice(0, 10)
        };
        updatedProducts.push(prod);
      } else {
        prod.warehouse = resWarehouse || prod.warehouse || 'Bosh ombor';
      }

      intakeItems.push({
        productId: prod.id,
        productName: prod.name,
        sku: prod.sku,
        quantity: row.quantity,
        unitPriceUSD: row.unitPriceUSD,
        unitPriceUZS: row.unitPriceUZS,
        totalPriceUZS: row.quantity * row.unitPriceUZS,
        needsPlacement: true,
        placedQuantity: 0,
        generatedSerials: []
      });
    });

    const totalUZS = intakeItems.reduce((s, it) => s + it.totalPriceUZS, 0);
    const newRecord: IntakeRecord = {
      id: intakeId,
      supplier: supplierToUse,
      warehouse: resWarehouse || 'Bosh ombor',
      operator: currentUser,
      date: nowStr,
      currency: resCurrency,
      exchangeRate: resExchangeRate,
      totalAmountUZS: totalUZS,
      totalAmountUSD: Math.round(totalUZS / resExchangeRate),
      items: intakeItems,
      notes: 'Excel orqali import qilindi',
      isFullyPlaced: false,
      createdAt: new Date().toISOString(),
      auditLogs: [
        {
          id: `log-${Date.now()}`,
          timestamp: nowStr,
          operator: currentUser,
          action: 'Excel Import',
          details: `Excel orqali ${intakeItems.length} ta tovar kiritildi. Razmesheniega yuborildi.`
        }
      ]
    };

    onSaveNewIntake(newRecord, updatedProducts);
    setIsExcelModalOpen(false);

    // AUTOMATIC TRANSITION TO RAZMESHENIE
    if (onNavigateToPlacement) {
      onNavigateToPlacement();
    }
  };

  // Edit Past Record (Izmenit) Handlers
  const handleStartEditRecord = (record: IntakeRecord) => {
    setEditingRecord(record);
    setEditSupplier(record.supplier || '');
    setEditWarehouse(record.warehouse || 'Bosh ombor');
    setEditCurrency(record.currency || 'UZS');
    setEditExchangeRate(record.exchangeRate || exchangeRate || 12800);
    setEditDate(record.date || new Date().toISOString().replace('T', ' ').slice(0, 16));
    setEditNotes(record.notes || '');
    setEditError(null);
    setEditItems(
      record.items && record.items.length > 0
        ? record.items.map((it) => ({
            productId: it.productId,
            productName: it.productName,
            sku: it.sku,
            quantity: it.quantity,
            unitPriceUSD: it.unitPriceUSD !== undefined ? it.unitPriceUSD : '',
            unitPriceUZS: it.unitPriceUZS !== undefined ? it.unitPriceUZS : 0,
            placedQuantity: it.placedQuantity || 0,
            generatedSerials: it.generatedSerials || [],
            originalQuantity: it.quantity,
            originalPriceUZS: it.unitPriceUZS
          }))
        : [{ productName: '', quantity: 1, unitPriceUZS: '', unitPriceUSD: '', originalQuantity: 0, originalPriceUZS: 0 }]
    );
  };

  const handleAddEditItemRow = () => {
    setEditError(null);
    setEditItems((prev) => [
      ...prev,
      {
        productName: '',
        quantity: 1,
        unitPriceUZS: '',
        unitPriceUSD: ''
      }
    ]);
  };

  const handleRemoveEditItemRow = (idx: number) => {
    if (editItems.length <= 1) {
      setEditError("Kirim hujjatida kamida bitta tovar bo'lishi shart.");
      return;
    }
    const item = editItems[idx];
    if (item.placedQuantity && item.placedQuantity > 0) {
      if (
        !confirm(
          `Diqqat: Ushbu tovardan ${item.placedQuantity} ta seriya raqami allaqachon biriktirilgan. Rostdan ham ushbu qatorni o'chirmoqchimisiz?`
        )
      ) {
        return;
      }
    }
    setEditError(null);
    setEditItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleEditItemFieldChange = (
    idx: number,
    field: 'productName' | 'quantity' | 'unitPriceUSD' | 'unitPriceUZS',
    val: any
  ) => {
    setEditError(null);
    const updated = [...editItems];
    const item = { ...updated[idx], [field]: val };

    if (editCurrency === 'USD') {
      if (field === 'unitPriceUSD') {
        const numVal = typeof val === 'number' ? val : parseFloat(val) || 0;
        item.unitPriceUSD = val;
        item.unitPriceUZS = Math.round(numVal * editExchangeRate);
      }
    } else {
      if (field === 'unitPriceUZS') {
        const numVal = typeof val === 'number' ? val : parseFloat(val) || 0;
        item.unitPriceUZS = val;
        item.unitPriceUSD = editExchangeRate > 0 ? parseFloat((numVal / editExchangeRate).toFixed(2)) : 0;
      }
    }

    if (field === 'productName' && typeof val === 'string') {
      const match = products.find((p) => p.name.toLowerCase() === val.trim().toLowerCase());
      if (match) {
        item.productId = match.id;
        item.sku = match.sku;
        if (match.purchasePriceUZS && (!item.unitPriceUZS || item.unitPriceUZS === 0 || item.unitPriceUZS === '')) {
          item.unitPriceUZS = match.purchasePriceUZS;
          if (editExchangeRate > 0) {
            item.unitPriceUSD = parseFloat((match.purchasePriceUZS / editExchangeRate).toFixed(2));
          }
        }
      }
    }

    updated[idx] = item;
    setEditItems(updated);
  };

  const handleSelectProductForEditItem = (idx: number, prod: Product) => {
    setEditError(null);
    setEditItems((prev) => {
      const updated = [...prev];
      const current = { ...updated[idx] };
      current.productName = prod.name;
      current.productId = prod.id;
      current.sku = prod.sku;
      if (prod.purchasePriceUZS && (!current.unitPriceUZS || current.unitPriceUZS === 0 || current.unitPriceUZS === '')) {
        current.unitPriceUZS = prod.purchasePriceUZS;
        if (editExchangeRate > 0) {
          current.unitPriceUSD = parseFloat((prod.purchasePriceUZS / editExchangeRate).toFixed(2));
        }
      }
      if (!current.quantity || current.quantity === 0) {
        current.quantity = 1;
      }
      updated[idx] = current;
      return updated;
    });
  };

  // Dynamic totals for Edit Modal
  const calculatedEditTotalUZS = useMemo(() => {
    return editItems.reduce((acc, it) => {
      const q = typeof it.quantity === 'number' ? it.quantity : parseFloat(String(it.quantity)) || 0;
      const p = typeof it.unitPriceUZS === 'number' ? it.unitPriceUZS : parseFloat(String(it.unitPriceUZS)) || 0;
      return acc + q * p;
    }, 0);
  }, [editItems]);

  const calculatedEditTotalUSD = useMemo(() => {
    return editExchangeRate > 0 ? Math.round(calculatedEditTotalUZS / editExchangeRate) : 0;
  }, [calculatedEditTotalUZS, editExchangeRate]);

  // Save Comprehensive Edited Record & Sync Stock Adjustments via IntakeService
  const handleSaveEditedRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    setEditError(null);

    const validation = IntakeService.validateIntakeEdit({
      supplier: editSupplier,
      warehouse: editWarehouse,
      currency: editCurrency,
      exchangeRate: editExchangeRate,
      date: editDate,
      notes: editNotes,
      items: editItems
    });

    if (!validation.valid) {
      setEditError(validation.error || "Ma'lumotlar to'liq kiritilmadi.");
      return;
    }

    const { updatedRecord, updatedProducts } = IntakeService.applyIntakeEditAndSyncStock(
      editingRecord,
      {
        supplier: editSupplier,
        warehouse: editWarehouse,
        currency: editCurrency,
        exchangeRate: editExchangeRate,
        date: editDate,
        notes: editNotes,
        items: editItems
      },
      products,
      currentUser
    );

    onUpdatePastIntake(updatedRecord, updatedProducts);
    setEditingRecord(null);

    // Automatic redirect to Joylashtirish (placement) page
    if (onNavigateToPlacement) {
      onNavigateToPlacement();
    }
  };

  return (
    <div className="space-y-5">
      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Kirim (Inventar qabuli)</span>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {filteredRecords.length} ta yozuv
            </span>
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Yetkazib beruvchilardan tovarlarni qabul qilish. Saqlash bosilgach avtomatik Joylashtirish bo'limiga o'tadi.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Excel Export */}
          <button
            onClick={() => exportKirimToExcel(intakeRecords)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-300 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Excelga eksport</span>
          </button>

          {/* Excel Import */}
          <button
            onClick={() => {
              setExcelImportTarget('intake');
              setIsExcelModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-300 transition-colors cursor-pointer"
          >
            <Upload className="w-4 h-4 text-blue-600" />
            <span>Exceldan import</span>
          </button>

          {/* New Intake Button */}
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Yangi kirim yaratish</span>
          </button>
        </div>
      </div>

      {/* FILTERS TOOLBAR */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
          <Filter className="w-3.5 h-3.5 text-blue-600" />
          <span>Filtrlar</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {/* Search ID/Supplier */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Qidirish (ID, yetkazib beruvchi)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Date Filter */}
          <div className="relative">
            <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Supplier Filter */}
          <div>
            <select
              value={filterSupplier}
              onChange={(e) => setFilterSupplier(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500"
            >
              <option value="all">Barcha yetkazib beruvchilar</option>
              {uniqueSuppliers.map((sup) => (
                <option key={sup} value={sup}>
                  {sup}
                </option>
              ))}
            </select>
          </div>

          {/* Warehouse Filter */}
          <div>
            <select
              value={filterWarehouse}
              onChange={(e) => setFilterWarehouse(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500"
            >
              <option value="all">Barcha omborlar</option>
              {uniqueWarehouses.map((wh) => (
                <option key={wh} value={wh}>
                  {wh}
                </option>
              ))}
            </select>
          </div>

          {/* Operator Filter */}
          <div>
            <select
              value={filterOperator}
              onChange={(e) => setFilterOperator(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500"
            >
              <option value="all">Barcha operatorlar</option>
              {uniqueOperators.map((op) => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </select>
          </div>
        </div>

        {(filterDate || filterSupplier !== 'all' || filterWarehouse !== 'all' || filterOperator !== 'all' || searchQuery) && (
          <div className="flex justify-end">
            <button
              onClick={() => {
                setFilterDate('');
                setFilterSupplier('all');
                setFilterWarehouse('all');
                setFilterOperator('all');
                setSearchQuery('');
              }}
              className="text-xs text-blue-600 hover:underline font-medium"
            >
              Filtrlarni tozalash
            </button>
          </div>
        )}
      </div>

      {/* Table Status Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 px-1 pt-2">
        <button
          onClick={() => setStatusFilter('active')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            statusFilter === 'active'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Faol kirimlar</span>
          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-mono">
            {activeCount}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter('deleted')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            statusFilter === 'deleted'
              ? 'border-rose-600 text-rose-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Archive className="w-3.5 h-3.5" />
          <span>O'chirilganlar / Arxiv</span>
          {deletedCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-mono">
              {deletedCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setStatusFilter('all')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            statusFilter === 'all'
              ? 'border-slate-800 text-slate-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Barcha kirimlar</span>
          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-mono">
            {intakeRecords.length}
          </span>
        </button>
      </div>

      {/* INTAKE TABLE */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Kirim ID</th>
                <th className="py-3 px-4">Sana va vaqt</th>
                <th className="py-3 px-4">Yetkazib beruvchi</th>
                <th className="py-3 px-4">Ombor</th>
                <th className="py-3 px-4">Operator</th>
                <th className="py-3 px-4 text-right">Jami summa (so‘m)</th>
                <th className="py-3 px-4 text-center">Joylashtirish</th>
                <th className="py-3 px-4 text-center">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    {statusFilter === 'deleted'
                      ? "O'chirilgan kirimlar mavjud emas."
                      : "Kirim yozuvlari mavjud emas. Yuqoridagi \"+ Yangi kirim yaratish\" tugmasini bosing."}
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => {
                  const isDeleted = record.status === 'deleted';
                  const totalUnits = record.items.reduce((s, i) => s + i.quantity, 0);
                  const placedUnits = record.items.reduce((s, i) => s + (i.placedQuantity || 0), 0);
                  const isPlaced = placedUnits >= totalUnits;

                  return (
                    <tr
                      key={record.id}
                      className={`transition-colors cursor-pointer ${
                        isDeleted ? 'bg-rose-50/40 text-slate-500 hover:bg-rose-50/80' : 'hover:bg-blue-50/50'
                      }`}
                      onClick={() => setInspectingRecord(record)}
                      title="Nimalar kirim qilinganini ko'rish uchun bosing"
                    >
                      {/* Kirim ID */}
                      <td className="py-3 px-4 font-mono font-bold">
                        <div className="flex items-center gap-1.5">
                          <span className={isDeleted ? 'text-rose-700 line-through' : 'text-blue-600 hover:underline'}>
                            {record.id}
                          </span>
                          {isDeleted && (
                            <span className="px-1.5 py-0.5 bg-rose-100 text-rose-800 rounded text-[10px] font-bold border border-rose-200">
                              Arxiv / O'chirilgan
                            </span>
                          )}
                        </div>
                        {isDeleted && record.deleteReason && (
                          <div className="text-[10px] text-rose-600 italic font-sans mt-0.5 truncate max-w-xs">
                            Sabab: {record.deleteReason}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-mono">{record.date}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{record.supplier}</td>
                      <td className="py-3 px-4 text-slate-600">{record.warehouse || 'Bosh ombor'}</td>
                      <td className="py-3 px-4 text-slate-700">{record.operator}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                        {formatUZS(record.totalAmountUZS)}
                        {record.currency === 'USD' && (
                          <div className="text-[10px] text-emerald-600 font-normal">
                            ({formatUSD(record.totalAmountUSD)})
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        {isDeleted ? (
                          <span className="text-[11px] text-slate-400 italic">Arxivlangan</span>
                        ) : isPlaced ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle className="w-3 h-3" />
                            Kiritilgan
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              if (onNavigateToPlacement) onNavigateToPlacement();
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 px-3 py-1 rounded-lg border border-amber-300 transition-colors shadow-xs"
                            title="Joylashtirish (seriyalarni kiritish) bo'limiga o'tish"
                          >
                            <QrCode className="w-3.5 h-3.5 text-amber-700" />
                            <span>Joylashtirish ({placedUnits}/{totalUnits})</span>
                          </button>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          {/* Export single Kirim to Excel */}
                          <button
                            onClick={() => exportSingleKirimToExcel(record)}
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer transition-colors"
                            title="Ushbu Kirimni Excelga yuklab olish"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                          </button>

                          <button
                            onClick={() => setInspectingRecord(record)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded cursor-pointer"
                            title="Ko'rish"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {!isDeleted ? (
                            <>
                              <button
                                onClick={() => handleStartEditRecord(record)}
                                className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-slate-100 rounded cursor-pointer transition-colors"
                                title="Tahrirlash (Izmenit)"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => {
                                  setDeletingRecord(record);
                                  setDeleteReasonInput('');
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                                title="Kirimni o'chirish / arxivlash"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleConfirmRestore(record)}
                                className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded cursor-pointer"
                                title="Kirimni qayta tiklash (Arxivdan chiqarish)"
                              >
                                <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                              </button>
                              <button
                                onClick={() => setPermanentDeletingRecord(record)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                                title="Kirimni butunlay o'chirish"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                              </button>
                            </>
                          )}

                          <button
                            onClick={() => setSelectedAuditRecord(record)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded"
                            title="Audit jurnali (O'zgartirishlar tarixi)"
                          >
                            <History className="w-3.5 h-3.5" />
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

      {/* INSPECT KIRIM ITEMS MODAL */}
      {inspectingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <PackagePlus className="w-5 h-5 text-blue-600" />
                  <h3 className="text-base font-bold text-slate-900">
                    Kirim tarkibi: {inspectingRecord.id}
                  </h3>
                </div>
                <div className="text-xs text-slate-600 mt-0.5">
                  {inspectingRecord.supplier} · {inspectingRecord.warehouse} · {inspectingRecord.date}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => exportSingleKirimToExcel(inspectingRecord)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold border border-emerald-300 transition-colors cursor-pointer"
                  title="Ushbu Kirimni Excelga yuklab olish"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Excel eksport</span>
                </button>
                <button
                  onClick={() => setInspectingRecord(null)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                <div>
                  <span className="text-slate-500">Yetkazib beruvchi:</span>
                  <div className="font-bold text-slate-900">{inspectingRecord.supplier}</div>
                </div>
                <div>
                  <span className="text-slate-500">Ombor:</span>
                  <div className="font-bold text-slate-900">{inspectingRecord.warehouse || 'Bosh ombor'}</div>
                </div>
                <div>
                  <span className="text-slate-500">Operator:</span>
                  <div className="font-bold text-slate-900">{inspectingRecord.operator}</div>
                </div>
                <div>
                  <span className="text-slate-500">Jami qiymati:</span>
                  <div className="font-mono font-bold text-blue-700">
                    {formatUZS(inspectingRecord.totalAmountUZS)}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Qabul qilingan mahsulotlar ro'yxati
                </h4>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-bold">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Mahsulot nomi</th>
                        <th className="py-2.5 px-3 text-right">Miqdor</th>
                        <th className="py-2.5 px-3 text-right">Birlik narxi</th>
                        <th className="py-2.5 px-3 text-right">Jami summa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {inspectingRecord.items.map((item, idx) => {
                        const isExpanded = expandedSerialItemIdx === idx;
                        const hasSerials = item.generatedSerials && item.generatedSerials.length > 0;
                        return (
                          <tr
                            key={idx}
                            onClick={() => {
                              if (hasSerials) {
                                setExpandedSerialItemIdx(isExpanded ? null : idx);
                              }
                            }}
                            className={`transition-colors ${hasSerials ? 'cursor-pointer hover:bg-blue-50/50' : 'hover:bg-slate-50'}`}
                            title={hasSerials ? "Seriya raqamlarini ko'rish uchun bosing" : undefined}
                          >
                            <td className="py-2.5 px-3 font-mono text-slate-400">{idx + 1}</td>
                            <td className="py-2.5 px-3 font-bold text-slate-900">
                              <div className="flex items-center gap-2">
                                <span>{item.productName}</span>
                                {hasSerials && (
                                  <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                                    <QrCode className="w-3 h-3 text-blue-500" />
                                    <span>{item.generatedSerials.length} ta seriya</span>
                                  </span>
                                )}
                              </div>
                              {hasSerials && isExpanded && (
                                <div className="mt-1.5 p-2 bg-blue-50/70 border border-blue-200 rounded-lg text-[10px] text-blue-900 font-mono space-y-1">
                                  <div className="font-bold text-blue-950 flex items-center gap-1 text-[11px]">
                                    <CheckCircle className="w-3 h-3 text-blue-600" />
                                    <span>Biriktirilgan seriya raqamlari:</span>
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {item.generatedSerials.map((sn, sIdx) => (
                                      <span key={sIdx} className="px-1.5 py-0.5 bg-white border border-blue-200 rounded text-blue-800 font-bold">
                                        {sn}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                              {item.quantity} dona
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                              {formatUZS(item.unitPriceUZS)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                              {formatUZS(item.totalPriceUZS)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {inspectingRecord.notes && (
                <div className="text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-slate-500 font-medium">Izoh: </span>
                  <span className="text-slate-800">{inspectingRecord.notes}</span>
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {inspectingRecord.status !== 'deleted' && (
                  <button
                    onClick={() => {
                      const rec = inspectingRecord;
                      setInspectingRecord(null);
                      handleStartEditRecord(rec);
                    }}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span>Tahrirlash</span>
                  </button>
                )}
              </div>

              <button
                onClick={() => setInspectingRecord(null)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs rounded-lg cursor-pointer"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE NEW INTAKE MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PackagePlus className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Yangi Kirim Yaratish</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setExcelImportTarget('form');
                    setIsExcelModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg font-bold border border-emerald-300 cursor-pointer transition-colors shadow-xs"
                >
                  <Upload className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Excel orqali to'ldirish</span>
                </button>

                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Warning banner if Excel contained unmatched products */}
            {unmatchedWarning.length > 0 && (
              <div className="m-4 mb-0 p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">Diqqat! Quyidagi tovarlar tizimdan topilmadi:</strong>
                  <div className="text-[11px] mt-0.5 font-mono text-amber-800">
                    {unmatchedWarning.join(', ')}
                  </div>
                  <div className="text-[10px] text-amber-700 mt-1">
                    Bu tovarlar yangi mahsulot sifatida ochiladi. Istasangiz ularning model va firma nomini to'g'irlashingiz mumkin.
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSaveIntake} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Yetkazib beruvchi nomi *
                  </label>
                  <input
                    type="text"
                    required
                    value={formSupplier}
                    onChange={(e) => setFormSupplier(e.target.value)}
                    placeholder="Masalan: Bosch Uzbekistan"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Qabul ombori</label>
                  <select
                    value={formWarehouse}
                    onChange={(e) => setFormWarehouse(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500"
                  >
                    <option value="Bosh ombor">Bosh ombor</option>
                    <option value="Chilonzor filiali">Chilonzor filiali</option>
                    <option value="Yunusobod filiali">Yunusobod filiali</option>
                    <option value="Sergeli logistika">Sergeli logistika</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Valyuta</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFormCurrency('UZS')}
                      className={`flex-1 py-2 rounded-lg font-bold border ${
                        formCurrency === 'UZS'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-slate-50 text-slate-700 border-slate-300'
                      }`}
                    >
                      SO'M
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormCurrency('USD')}
                      className={`flex-1 py-2 rounded-lg font-bold border ${
                        formCurrency === 'USD'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-slate-50 text-slate-700 border-slate-300'
                      }`}
                    >
                      USD ($)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Operator</label>
                  <input
                    type="text"
                    disabled
                    value={currentUser}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-600 font-medium cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Items Table - Single Tovar Nomi column */}
              <div className="pt-2 border-t border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold uppercase tracking-wider text-slate-800">
                    Qabul qilinayotgan tovarlar
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Qator qo'shish</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {formItems.map((item, idx) => {
                    const qtyNum = typeof item.quantity === 'number' ? item.quantity : parseFloat(item.quantity) || 0;
                    const priceNum = typeof item.unitPriceUZS === 'number' ? item.unitPriceUZS : parseFloat(item.unitPriceUZS) || 0;
                    const rowTotal = qtyNum * priceNum;

                    return (
                      <div
                        key={idx}
                        className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col md:flex-row md:items-center gap-3"
                      >
                        {/* Mahsulot Nomi Tanlash yoki Yangi Yaratish */}
                        <div className="flex-1">
                          <label className="block text-[10px] text-slate-500 mb-0.5">
                            Mahsulot nomi (Qidirish va bir bosishda tanlash) *
                          </label>
                          <ProductPickerInput
                            value={item.productName}
                            selectedProductId={item.productId}
                            products={products}
                            placeholder="Mahsulot nomi, brend, model yoki shtrix-kod..."
                            onChangeText={(val) => handleItemFieldChange(idx, 'productName', val)}
                            onSelectProduct={(prod) => handleSelectProductForItem(idx, prod)}
                            onSaveNewProduct={(newProd) => {
                              if (onSaveProduct) onSaveProduct(newProd);
                              handleSelectProductForItem(idx, newProd);
                            }}
                          />
                        </div>

                        {/* Quantity with full clearable input */}
                        <div className="w-32">
                          <label className="block text-[10px] text-slate-500 mb-0.5 truncate">
                            Miqdor ({products.find((p) => p.id === item.productId)?.unit || 'dona'})
                          </label>
                          <input
                            id={`intake-item-qty-${idx}`}
                            type="text"
                            inputMode="numeric"
                            value={item.quantity}
                            onChange={(e) => {
                              const val = e.target.value;
                              handleItemFieldChange(idx, 'quantity', val === '' ? '' : parseInt(val) || 0);
                            }}
                            placeholder="1"
                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono focus:outline-none focus:border-blue-500"
                          />
                        </div>

                        {/* Price with full clearable input */}
                        {formCurrency === 'USD' ? (
                          <div className="w-36">
                            <label className="block text-[10px] text-slate-500 mb-0.5">Narx ($)</label>
                            <input
                              id={`intake-item-price-${idx}`}
                              type="text"
                              inputMode="numeric"
                              value={item.unitPriceUSD}
                              onChange={(e) => {
                                const val = e.target.value;
                                handleItemFieldChange(idx, 'unitPriceUSD', val === '' ? '' : parseFloat(val) || 0);
                              }}
                              placeholder="0"
                              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono focus:outline-none focus:border-blue-500"
                            />
                          </div>
                        ) : (
                          <div className="w-44">
                            <label className="block text-[10px] text-slate-500 mb-0.5">
                              Narx (so'm)
                            </label>
                            <input
                              id={`intake-item-price-${idx}`}
                              type="text"
                              inputMode="numeric"
                              value={item.unitPriceUZS}
                              onChange={(e) => {
                                const val = e.target.value;
                                handleItemFieldChange(idx, 'unitPriceUZS', val === '' ? '' : parseFloat(val) || 0);
                              }}
                              placeholder="0"
                              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono focus:outline-none focus:border-blue-500"
                            />
                          </div>
                        )}

                        <div className="w-36 text-right">
                          <label className="block text-[10px] text-slate-500 mb-0.5">Jami UZS</label>
                          <div className="font-mono font-bold text-slate-900 text-xs py-1.5">
                            {formatUZS(rowTotal)}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 self-end md:self-center cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Eslatma:</strong> "Kirimni saqlash" tugmasini bosishingiz bilan tizim avtomatik tarzda yangi vazifa sifatida <strong>Joylashtirish</strong> bo'limiga o'tkazadi va har bir tovar uchun seriya raqamlarini kiritishni taklif qiladi.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-sm cursor-pointer flex items-center gap-1.5"
                >
                  <span>Kirimni saqlash</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EXCEL IMPORT MODAL */}
      <ExcelImportModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        existingProducts={products}
        defaultExchangeRate={exchangeRate}
        targetMode={excelImportTarget === 'form' ? 'order' : 'intake'}
        defaultSupplier={excelImportTarget === 'form' ? formSupplier : ''}
        defaultWarehouse={excelImportTarget === 'form' ? formWarehouse : 'Bosh ombor'}
        onConfirmImport={handleExcelImportCompleted}
      />

      {/* COMPREHENSIVE EDIT INTAKE RECORD MODAL */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">
                      Kirimni tahrirlash: {editingRecord.id}
                    </h3>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        editingRecord.status === 'deleted'
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {editingRecord.status === 'deleted' ? 'Arxivlangan' : 'Faol'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Yetkazib beruvchi, ombor, mahsulotlar ro'yxati, soni va narxlarini to'liq o'zgartirish
                  </p>
                </div>
              </div>

              <button
                onClick={() => setEditingRecord(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Message */}
            {editError && (
              <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2 shadow-xs">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="font-semibold">{editError}</span>
              </div>
            )}

            {/* Form Body */}
            <form onSubmit={handleSaveEditedRecord} className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
              {/* Informational Sync Banner */}
              <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl flex items-start gap-3">
                <Package className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="font-bold text-blue-900">
                    Avtomatik Ombor Zaxirasi Sinxronizatsiyasi
                  </div>
                  <p className="text-[11px] text-blue-700 leading-relaxed">
                    Ushbu kirim hujjatidagi Yetkazib beruvchi, Ombor, tovarlar soni yoki narxlari o'zgartirilsa, tizim jami summani avtomatik qayta hisoblaydi va tegishli ombordagi mahsulot qoldiqlari (zaxirasi) hamda yetkazib beruvchi hisob-kitobini to'g'rilaydi.
                  </p>
                </div>
              </div>

              {/* Top document parameters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Yetkazib beruvchi nomi *
                  </label>
                  <input
                    type="text"
                    required
                    list="supplier-suggestions-edit"
                    value={editSupplier}
                    onChange={(e) => setEditSupplier(e.target.value)}
                    placeholder="Yetkazib beruvchi nomi..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium focus:outline-none focus:border-amber-500"
                  />
                  <datalist id="supplier-suggestions-edit">
                    {Array.from(new Set(intakeRecords.map((r) => r.supplier).filter(Boolean))).map((sName) => (
                      <option key={sName} value={sName} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Qabul ombori *</label>
                  <select
                    value={editWarehouse}
                    onChange={(e) => setEditWarehouse(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="Bosh ombor">Bosh ombor</option>
                    <option value="Chilonzor filiali">Chilonzor filiali</option>
                    <option value="Yunusobod filiali">Yunusobod filiali</option>
                    <option value="Sergeli logistika">Sergeli logistika</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Valyuta</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditCurrency('UZS')}
                      className={`flex-1 py-2 rounded-lg font-bold border transition-colors cursor-pointer ${
                        editCurrency === 'UZS'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      SO'M
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditCurrency('USD')}
                      className={`flex-1 py-2 rounded-lg font-bold border transition-colors cursor-pointer ${
                        editCurrency === 'USD'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      USD ($)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Hujjat sanasi</label>
                  <input
                    type="text"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    placeholder="YYYY-MM-DD HH:mm"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                {editCurrency === 'USD' && (
                  <div className="sm:col-span-2 md:col-span-4 pt-2 border-t border-slate-200 flex items-center gap-3">
                    <label className="font-bold text-slate-700 whitespace-nowrap">
                      Valyuta kursi (1 USD = ? so'm):
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={editExchangeRate}
                      onChange={(e) => setEditExchangeRate(parseFloat(e.target.value) || 0)}
                      className="w-36 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold text-xs focus:outline-none focus:border-amber-500"
                    />
                    <span className="text-slate-500 text-[11px]">
                      Narxlar avtomatik so'mga konvertatsiya qilinadi.
                    </span>
                  </div>
                )}
              </div>

              {/* Items Table / List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-amber-600" />
                    <h4 className="font-bold uppercase tracking-wider text-slate-800 text-xs">
                      Qabul qilingan mahsulotlar ro'yxati ({editItems.length} ta)
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddEditItemRow}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg font-bold text-xs transition-colors cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Qator qo'shish</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {editItems.map((item, idx) => {
                    const qtyNum =
                      typeof item.quantity === 'number'
                        ? item.quantity
                        : parseFloat(String(item.quantity)) || 0;
                    const priceNum =
                      typeof item.unitPriceUZS === 'number'
                        ? item.unitPriceUZS
                        : parseFloat(String(item.unitPriceUZS)) || 0;
                    const rowTotal = qtyNum * priceNum;
                    const matchedProduct = products.find(
                      (p) =>
                        p.id === item.productId ||
                        p.name.toLowerCase() === item.productName.toLowerCase()
                    );
                    const unitLabel = matchedProduct?.unit || 'dona';
                    const placedCount = item.placedQuantity || 0;
                    const origQty = item.originalQuantity !== undefined ? item.originalQuantity : qtyNum;
                    const diffQty = qtyNum - origQty;
                    const origPrice = item.originalPriceUZS !== undefined ? item.originalPriceUZS : priceNum;
                    const diffPrice = priceNum - origPrice;

                    return (
                      <div
                        key={idx}
                        className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col md:flex-row md:items-center gap-3 transition-all hover:border-slate-300 hover:shadow-xs"
                      >
                        {/* Product Picker */}
                        <div className="flex-1 min-w-[200px]">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1.5">
                              <label className="text-[11px] font-bold text-slate-700">
                                Mahsulot #{idx + 1} *
                              </label>
                              {matchedProduct?.sku && (
                                <span className="text-[10px] font-mono text-slate-500 bg-slate-200/70 px-1 rounded">
                                  {matchedProduct.sku}
                                </span>
                              )}
                            </div>
                            {placedCount > 0 && (
                              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-300 rounded px-1.5 py-0.5 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3 text-emerald-600" />
                                <span>Razmeshenie: {placedCount} ta</span>
                              </span>
                            )}
                          </div>
                          <ProductPickerInput
                            value={item.productName}
                            selectedProductId={item.productId}
                            products={products}
                            placeholder="Mahsulot nomi, brend, model yoki shtrix-kod..."
                            onChangeText={(val) =>
                              handleEditItemFieldChange(idx, 'productName', val)
                            }
                            onSelectProduct={(prod) =>
                              handleSelectProductForEditItem(idx, prod)
                            }
                            onSaveNewProduct={(newProd) => {
                              if (onSaveProduct) onSaveProduct(newProd);
                              handleSelectProductForEditItem(idx, newProd);
                            }}
                          />

                          {matchedProduct && (
                            <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-500">
                              <span>
                                Joriy ombor zaxirasi:{' '}
                                <strong className="font-mono text-slate-800">
                                  {matchedProduct.totalQuantity || 0}
                                </strong>{' '}
                                {unitLabel}
                              </span>
                              {diffQty !== 0 && (
                                <span className="font-mono font-bold text-blue-600">
                                  ➔ yangi zaxira:{' '}
                                  {Math.max(
                                    0,
                                    (matchedProduct.totalQuantity || 0) + diffQty
                                  )}{' '}
                                  {unitLabel}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Quantity */}
                        <div className="w-32">
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[11px] font-bold text-slate-700 truncate">
                              Soni ({unitLabel}) *
                            </label>
                            {diffQty !== 0 && (
                              <span
                                className={`text-[10px] font-mono font-bold ${
                                  diffQty > 0 ? 'text-emerald-600' : 'text-rose-600'
                                }`}
                              >
                                {diffQty > 0 ? `+${diffQty}` : diffQty}
                              </span>
                            )}
                          </div>
                          <input
                            type="text"
                            inputMode="numeric"
                            required
                            value={item.quantity}
                            onChange={(e) => {
                              const val = e.target.value;
                              handleEditItemFieldChange(
                                idx,
                                'quantity',
                                val === '' ? '' : parseInt(val) || 0
                              );
                            }}
                            placeholder="1"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold focus:outline-none focus:border-amber-500"
                          />
                        </div>

                        {/* Price */}
                        {editCurrency === 'USD' ? (
                          <div className="w-36">
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[11px] font-bold text-slate-700">
                                Narx ($) *
                              </label>
                            </div>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={item.unitPriceUSD}
                              onChange={(e) => {
                                const val = e.target.value;
                                handleEditItemFieldChange(
                                  idx,
                                  'unitPriceUSD',
                                  val === '' ? '' : parseFloat(val) || 0
                                );
                              }}
                              placeholder="0"
                              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold focus:outline-none focus:border-amber-500"
                            />
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                              ≈ {formatUZS(priceNum)}
                            </div>
                          </div>
                        ) : (
                          <div className="w-40">
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[11px] font-bold text-slate-700">
                                Narxi (so'm) *
                              </label>
                              {diffPrice !== 0 && (
                                <span
                                  className={`text-[10px] font-mono font-bold ${
                                    diffPrice > 0 ? 'text-amber-600' : 'text-emerald-600'
                                  }`}
                                >
                                  {diffPrice > 0 ? `+` : ''}
                                  {formatUZS(diffPrice)}
                                </span>
                              )}
                            </div>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={item.unitPriceUZS}
                              onChange={(e) => {
                                const val = e.target.value;
                                handleEditItemFieldChange(
                                  idx,
                                  'unitPriceUZS',
                                  val === '' ? '' : parseFloat(val) || 0
                                );
                              }}
                              placeholder="0"
                              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        )}

                        {/* Subtotal */}
                        <div className="w-36 text-right">
                          <label className="block text-[11px] text-slate-500 mb-1">
                            Qator jami
                          </label>
                          <div className="font-mono font-bold text-sm text-slate-900">
                            {formatUZS(rowTotal)}
                          </div>
                        </div>

                        {/* Delete row button */}
                        <div className="flex items-end justify-center pt-2 md:pt-4">
                          <button
                            type="button"
                            onClick={() => handleRemoveEditItemRow(idx)}
                            disabled={editItems.length <= 1}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Qatorni o'chirish"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Qo'shimcha izoh</label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Kirim bo'yicha qo'shimcha eslatmalar..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Submit button inside form for Enter key support */}
              <button type="submit" className="hidden" />
            </form>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-4 text-xs">
                <div>
                  <span className="text-slate-500">Jami tovarlar: </span>
                  <span className="font-mono font-bold text-slate-900">
                    {editItems.reduce(
                      (s, it) =>
                        s +
                        (typeof it.quantity === 'number'
                          ? it.quantity
                          : parseInt(String(it.quantity)) || 0),
                      0
                    )}{' '}
                    ta
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Jami qiymat: </span>
                  <span className="font-mono font-bold text-blue-700 text-sm">
                    {formatUZS(calculatedEditTotalUZS)}
                  </span>
                  {editCurrency === 'USD' && (
                    <span className="font-mono text-slate-500 text-xs ml-1">
                      ({formatUSD(calculatedEditTotalUSD)})
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-xs cursor-pointer transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditedRecord}
                  className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>O'zgarishlarni saqlash</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AUDIT LOG MODAL */}
      {selectedAuditRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Audit Tarixi: {selectedAuditRecord.id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedAuditRecord(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto text-xs">
              {selectedAuditRecord.auditLogs.map((log) => (
                <div key={log.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <div className="flex items-center justify-between text-slate-500 text-[11px]">
                    <span className="font-bold text-indigo-700">{log.action}</span>
                    <span className="font-mono">{log.timestamp}</span>
                  </div>
                  <div className="text-slate-800">{log.details}</div>
                  <div className="text-[10px] text-slate-500">Operator: {log.operator}</div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedAuditRecord(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-semibold text-xs cursor-pointer"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SOFT DELETE CONFIRMATION MODAL */}
      {deletingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Kirimni o'chirish (arxivlash): {deletingRecord.id}
                </h3>
              </div>
              <button
                onClick={() => setDeletingRecord(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
              <p className="font-semibold">Eslatma:</p>
              Ushbu kirim butunlay o'chib ketmaydi, u arxivga saqlanadi. Istalgan payt <strong>"O'chirilganlar / Arxiv"</strong> bo'limiga o'tib, uni qayta tiklashingiz mumkin.
            </div>

            <form onSubmit={handleConfirmDelete} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  O'chirish sababi (izoh) *
                </label>
                <textarea
                  required
                  rows={3}
                  value={deleteReasonInput}
                  onChange={(e) => setDeleteReasonInput(e.target.value)}
                  placeholder="Masalan: Tovar xato kiritilgan, yetkazib beruvchi bekor qildi..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setDeletingRecord(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>O'chirish va arxivlash</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PERMANENT DELETE CONFIRMATION MODAL */}
      {permanentDeletingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Butunlay o'chirish: {permanentDeletingRecord.id}
                </h3>
              </div>
              <button
                onClick={() => setPermanentDeletingRecord(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 leading-relaxed space-y-1">
              <p className="font-bold text-rose-950 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Diqqat: Ushbu amalni bekor qilib bo'lmaydi!</span>
              </p>
              <p>
                Ushbu kirim yozuvi va uning barcha audit loglari bazadan butunlay o'chiriladi.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setPermanentDeletingRecord(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold cursor-pointer"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                onClick={handleConfirmPermanentDelete}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ha, butunlay o'chirish</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
