import React, { useState, useMemo } from 'react';
import {
  Layers,
  Plus,
  Search,
  Upload,
  Image as ImageIcon,
  CheckCircle,
  Clock,
  Wrench,
  XCircle,
  X,
  FileSpreadsheet,
  QrCode,
  Hash,
  Eye,
  Trash2,
  Tag,
  FolderTree,
  Edit2,
  Barcode,
  Building,
  User,
  Filter,
  RefreshCw,
  Sparkles,
  ArrowUpDown,
  Download,
  AlertCircle,
  AlertTriangle,
  Package
} from 'lucide-react';
import { Language, Product, SerialNumber, SerialStatus, ProductMovement } from '../types';
import { formatUZS } from '../utils/pricing';
import {
  exportProductsWithSerials,
  exportFullProductsCatalogToExcel,
  exportProductMovementsToExcel,
  parseExcelProducts
} from '../utils/excel';
import { ProductDetailCardModal } from './ProductDetailCardModal';

interface Props {
  language: Language;
  products: Product[];
  categories?: string[];
  currentUser?: string;
  onSaveProduct: (product: Product) => void;
  onDeleteProduct?: (productId: string) => void;
  onUpdateProductSerials: (productId: string, serials: SerialNumber[]) => void;
  onSaveCategories?: (categories: string[]) => void;
  onNavigateToOrder?: (orderId: string) => void;
}

export const ProductsCatalogView: React.FC<Props> = ({
  language,
  products,
  categories = [
    'Asboblar va Uskunalar',
    'Perforatorlar va Asboblar',
    'Generatorlar',
    'Samosvallar va Chiqindi',
    'Kranlar va Maxsus Texnika',
    'Payvandlash uskunalari',
    'Kompressorlar'
  ],
  currentUser = 'Boshqaruvchi',
  onSaveProduct,
  onDeleteProduct,
  onUpdateProductSerials,
  onSaveCategories,
  onNavigateToOrder
}) => {
  // Search & Advanced Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [selectedWarehouseFilter, setSelectedWarehouseFilter] = useState('all');
  const [selectedAvailabilityFilter, setSelectedAvailabilityFilter] = useState<'all' | 'in_stock' | 'out_of_stock'>('all');
  const [selectedCreatorFilter, setSelectedCreatorFilter] = useState('all');

  // Modals state
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Edit existing product state
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editGroup, setEditGroup] = useState('Asosiy fond');
  const [editBarcode, setEditBarcode] = useState('');
  const [editUnit, setEditUnit] = useState('dona');
  const [editDescription, setEditDescription] = useState('');
  const [editDailyRate, setEditDailyRate] = useState<number>(0);
  const [editDepositAmount, setEditDepositAmount] = useState<number>(0);
  const [editPurchasePrice, setEditPurchasePrice] = useState<number>(0);
  const [editWarehouse, setEditWarehouse] = useState('Bosh ombor');

  const handleOpenEditModal = (p: Product) => {
    setEditingProduct(p);
    setEditName(p.name);
    setEditCategory(p.category);
    setEditGroup(p.group || 'Asosiy fond');
    setEditBarcode(p.barcode || '');
    setEditUnit(p.unit || 'dona');
    setEditDescription(p.description || '');
    setEditDailyRate(p.dailyRate || 0);
    setEditDepositAmount(p.depositAmount || 0);
    setEditPurchasePrice(p.purchasePriceUZS || 0);
    setEditWarehouse(p.warehouse || 'Bosh ombor');
  };

  const handleSaveEditedProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editName.trim()) return;

    const updated: Product = {
      ...editingProduct,
      name: editName.trim(),
      category: editCategory,
      group: editGroup,
      barcode: editBarcode.trim() || undefined,
      unit: editUnit,
      description: editDescription.trim() || undefined,
      dailyRate: editDailyRate,
      depositAmount: editDepositAmount,
      purchasePriceUZS: editPurchasePrice,
      warehouse: editWarehouse
    };

    onSaveProduct(updated);
    setEditingProduct(null);
  };

  // Form State for creating new product (SKU, Prices, and Warehouse removed per requirements)
  const [name, setName] = useState('');
  const [category, setCategory] = useState(categories[0] || 'Asboblar va Uskunalar');
  const [group, setGroup] = useState('Asosiy fond');
  const [barcode, setBarcode] = useState('');
  const [unit, setUnit] = useState('');
  const [isCustomUnit, setIsCustomUnit] = useState(false);
  const [unitError, setUnitError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [imagePreview, setImagePreview] = useState<string>('');

  const handleOpenAddModal = () => {
    setName('');
    setCategory(categories[0] || 'Asboblar va Uskunalar');
    setGroup('Asosiy fond');
    setBarcode('');
    setUnit('');
    setIsCustomUnit(false);
    setUnitError(null);
    setNameError(null);
    setDescription('');
    setImagePreview('');
    setIsAddModalOpen(true);
  };

  // Category management modal state
  const [newCatInput, setNewCatInput] = useState('');
  const [editingCategory, setEditingCategory] = useState<{ original: string; current: string } | null>(null);

  // Extract distinct warehouses and creators from current products
  const warehouseList = useMemo(() => {
    const list = Array.from(new Set(products.map((p) => p.warehouse || 'Bosh ombor'))).filter(Boolean);
    if (!list.includes('Bosh ombor')) list.unshift('Bosh ombor');
    if (!list.includes('Chilonzor filiali')) list.push('Chilonzor filiali');
    if (!list.includes('Yunusobod ombori')) list.push('Yunusobod ombori');
    return list;
  }, [products]);

  const creatorList = useMemo(() => {
    return Array.from(new Set(products.map((p) => p.createdBy || 'Boshqaruvchi'))).filter(Boolean);
  }, [products]);

  // Handle local gallery image upload
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Generate random 13-digit EAN barcode
  const handleGenerateBarcode = () => {
    const prefix = '478'; // Uzbekistan EAN prefix
    const randomBody = Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
    // Calculate simple check digit
    const code12 = prefix + randomBody;
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(code12[i], 10) * (i % 2 === 0 ? 1 : 3);
    }
    const check = (10 - (sum % 10)) % 10;
    setBarcode(`${code12}${check}`);
  };

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    setNameError(null);
    setUnitError(null);

    let hasError = false;

    if (!name.trim()) {
      setNameError("Iltimos, mahsulot nomini kiriting!");
      hasError = true;
    }

    if (!unit || !unit.trim()) {
      setUnitError("O'lchov birligini tanlash majburiy! (Masalan: dona, kg, metr)");
      hasError = true;
    }

    if (hasError) {
      return;
    }

    // Auto-generate unique SKU without user input
    const cleanSlug = name.trim().replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase() || 'ITEM';
    const autoSku = `SKU-${cleanSlug}-${Math.floor(100 + Math.random() * 900)}`;
    const nowStr = new Date().toISOString().slice(0, 10);
    const newProdId = `prod-${Date.now()}`;

    const initialMovement: ProductMovement = {
      id: `mov-${Date.now()}`,
      productId: newProdId,
      productName: name.trim(),
      type: 'intake',
      date: nowStr,
      operator: currentUser,
      reason: "Yangi mahsulot kartasi yaratildi (Ombor biriktirilmagan)",
      notes: description.trim() || undefined,
      createdAt: new Date().toISOString()
    };

    const newProduct: Product = {
      id: newProdId,
      name: name.trim(),
      sku: autoSku,
      barcode: barcode.trim() || undefined,
      category,
      group,
      warehouse: undefined, // Warehouse is assigned later during stock reception ("Kirim")
      unit: unit.trim(),
      description: description.trim() || undefined,
      createdBy: currentUser,
      dailyRate: 0, // Managed and set inside Product Catalog ("Katalog / Tariflar")
      depositAmount: 0,
      purchasePriceUZS: 0,
      totalQuantity: 0,
      serials: [],
      image: imagePreview || undefined,
      movementHistory: [initialMovement],
      createdAt: nowStr
    };

    onSaveProduct(newProduct);
    setIsAddModalOpen(false);

    // Reset form
    setName('');
    setBarcode('');
    setUnit('');
    setIsCustomUnit(false);
    setUnitError(null);
    setNameError(null);
    setDescription('');
    setImagePreview('');
  };

  // Add new category
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    setCategoryError(null);
    const trimmed = newCatInput.trim();
    if (!trimmed) return;
    if (categories.includes(trimmed)) {
      setCategoryError("Ushbu kategoriya allaqachon mavjud!");
      return;
    }
    const updated = [...categories, trimmed];
    if (onSaveCategories) onSaveCategories(updated);
    setNewCatInput('');
  };

  // Delete category confirmation handler
  const handleConfirmDeleteCategory = () => {
    if (!categoryToDelete) return;
    const updated = categories.filter((c) => c !== categoryToDelete);
    if (onSaveCategories) onSaveCategories(updated);
    if (category === categoryToDelete && updated.length > 0) {
      setCategory(updated[0]);
    }
    setCategoryToDelete(null);
  };

  // Save renamed category
  const handleSaveRenamedCategory = () => {
    if (!editingCategory || !editingCategory.current.trim()) return;
    const { original, current } = editingCategory;
    const updated = categories.map((c) => (c === original ? current.trim() : c));
    if (onSaveCategories) onSaveCategories(updated);
    setEditingCategory(null);
  };

  // Handle Excel Import file
  const handleImportExcelFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result as ArrayBuffer;
        const imported = parseExcelProducts(buffer);
        if (imported.length === 0) {
          alert("Excel faylda mos mahsulotlar topilmadi yoki fayl bo'sh.");
          return;
        }

        let addedCount = 0;
        imported.forEach((p) => {
          if (!p.name) return;
          const newProd: Product = {
            id: `prod-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            name: p.name,
            sku: p.sku || `SKU-${Date.now().toString().slice(-5)}`,
            barcode: p.barcode,
            category: p.category || categories[0] || 'Asboblar va Uskunalar',
            group: 'Asosiy fond',
            warehouse: p.warehouse || 'Bosh ombor',
            unit: 'dona',
            description: p.description || '',
            createdBy: currentUser,
            dailyRate: p.dailyRate || 100000,
            depositAmount: p.depositAmount || 300000,
            purchasePriceUZS: p.purchasePriceUZS || 1000000,
            totalQuantity: 0,
            serials: [],
            createdAt: new Date().toISOString().slice(0, 10),
            movementHistory: [
              {
                id: `mov-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                productId: `prod-${Date.now()}`,
                productName: p.name,
                type: 'intake',
                date: new Date().toISOString().slice(0, 10),
                operator: currentUser,
                warehouse: p.warehouse || 'Bosh ombor',
                reason: 'Excel fayl orqali import qilindi'
              }
            ]
          };
          onSaveProduct(newProd);
          addedCount++;
        });

        alert(`Muvaffaqiyatli: ${addedCount} ta mahsulot katalogga qo'shildi!`);
        setIsImportModalOpen(false);
      } catch (err: any) {
        alert("Faylni o'qishda xatolik yuz berdi: " + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // FILTERING LOGIC
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      // 1. Search query (Name, SKU, or Barcode)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = product.name.toLowerCase().includes(q);
        const matchesSku = product.sku.toLowerCase().includes(q);
        const matchesBarcode = product.barcode ? product.barcode.toLowerCase().includes(q) : false;
        if (!matchesName && !matchesSku && !matchesBarcode) {
          return false;
        }
      }

      // 2. Category filter
      if (selectedCategoryFilter !== 'all' && product.category !== selectedCategoryFilter) {
        return false;
      }

      // 3. Warehouse filter
      if (selectedWarehouseFilter !== 'all') {
        const pWarehouse = product.warehouse || 'Bosh ombor';
        if (pWarehouse !== selectedWarehouseFilter) return false;
      }

      // 4. Availability filter (Ombor bor / yo'q)
      const availableCount = product.serials.filter((s) => s.status === 'available').length;
      if (selectedAvailabilityFilter === 'in_stock' && availableCount <= 0) {
        return false;
      }
      if (selectedAvailabilityFilter === 'out_of_stock' && availableCount > 0) {
        return false;
      }

      // 5. Creator filter
      if (selectedCreatorFilter !== 'all') {
        const pCreator = product.createdBy || 'Boshqaruvchi';
        if (pCreator !== selectedCreatorFilter) return false;
      }

      return true;
    });
  }, [
    products,
    searchQuery,
    selectedCategoryFilter,
    selectedWarehouseFilter,
    selectedAvailabilityFilter,
    selectedCreatorFilter
  ]);

  return (
    <div className="space-y-5">
      {/* HEADER SECTION */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="w-6 h-6 text-blue-600" />
            <span>Mahsulotlar</span>
            <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {filteredProducts.length} / {products.length} ta mahsulot
            </span>
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Qurilish asboblari kartalari, shtrix-kodlar, to'liq harakat tarixi va omborlararo nazorat
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Management Button */}
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-300 transition-colors cursor-pointer"
          >
            <FolderTree className="w-4 h-4 text-indigo-600" />
            <span>Kategoriyalar ({categories.length})</span>
          </button>

          {/* Export Catalog to Excel */}
          <button
            onClick={() => exportFullProductsCatalogToExcel(products)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-300 transition-colors cursor-pointer"
            title="Barcha mahsulotlar va stavkalarni Excelga eksport qilish"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Katalog Eksport</span>
          </button>

          {/* Import Products from Excel */}
          <label className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-300 transition-colors cursor-pointer">
            <Upload className="w-4 h-4 text-blue-600" />
            <span>Exceldan Import</span>
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              className="hidden"
              onChange={handleImportExcelFile}
            />
          </label>

          {/* Add Product Button */}
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-blue-500/20 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Yangi mahsulot</span>
          </button>
        </div>
      </div>

      {/* ADVANCED FILTERING PANEL */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700 border-b border-slate-100 pb-2">
          <span className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-blue-600" />
            <span>Filtrlar va Qidiruv</span>
          </span>

          {(searchQuery || selectedCategoryFilter !== 'all' || selectedWarehouseFilter !== 'all' || selectedAvailabilityFilter !== 'all' || selectedCreatorFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategoryFilter('all');
                setSelectedWarehouseFilter('all');
                setSelectedAvailabilityFilter('all');
                setSelectedCreatorFilter('all');
              }}
              className="text-blue-600 hover:underline text-[11px] cursor-pointer"
            >
              Filtrlarni tozalash
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {/* 1. Search Query */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Nomi, SKU yoki Shtrix-kod..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* 2. Category Filter */}
          <div>
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500"
            >
              <option value="all">Barcha kategoriyalar ({categories.length})</option>
              {categories.map((c, i) => (
                <option key={i} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Warehouse Filter */}
          <div>
            <select
              value={selectedWarehouseFilter}
              onChange={(e) => setSelectedWarehouseFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500"
            >
              <option value="all">Barcha omborlar</option>
              {warehouseList.map((w, i) => (
                <option key={i} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Availability Status Filter */}
          <div>
            <select
              value={selectedAvailabilityFilter}
              onChange={(e) => setSelectedAvailabilityFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500"
            >
              <option value="all">Ombor holati (Barchasi)</option>
              <option value="in_stock">✅ Omborda bor (Mavjud &gt; 0)</option>
              <option value="out_of_stock">❌ Omborda yo'q (Band / Tugagan)</option>
            </select>
          </div>

          {/* 5. Creator Filter */}
          <div>
            <select
              value={selectedCreatorFilter}
              onChange={(e) => setSelectedCreatorFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500"
            >
              <option value="all">Barcha mas'ul xodimlar</option>
              {creatorList.map((cr, i) => (
                <option key={i} value={cr}>
                  {cr}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* PRODUCTS TABLE */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Rasm</th>
                <th className="py-3 px-4">Mahsulot Nomi va Tavsif</th>
                <th className="py-3 px-4">Shtrix-kod / SKU</th>
                <th className="py-3 px-4">Kategoriya & Ombor</th>
                <th className="py-3 px-4 text-right">Kunlik Stavka</th>
                <th className="py-3 px-4 text-center">Mavjud (Omborda)</th>
                <th className="py-3 px-4 text-center">Ijarada</th>
                <th className="py-3 px-4 text-center">Boshqaruv</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 space-y-2">
                    <Package className="w-8 h-8 text-slate-400 mx-auto" />
                    <p>Mahsulotlar topilmadi.</p>
                    <p className="text-[11px] text-slate-400">
                      Filtrlarni o'zgartiring yoki "+ Yangi mahsulot" orqali yangisini qo'shing.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const availableCount = product.serials.filter((s) => s.status === 'available').length;
                  const rentedCount = product.serials.filter((s) => s.status === 'rented').length;
                  const maintenanceCount = product.serials.filter((s) => s.status === 'maintenance').length;
                  const hasStock = availableCount > 0;

                  return (
                    <tr
                      key={product.id}
                      onClick={() => setSelectedProductForDetail(product)}
                      className="hover:bg-blue-50/50 transition-colors cursor-pointer group"
                      title="Batafsil ma'lumot va harakatlar tarixini ko'rish uchun bosing"
                    >
                      {/* Product Image */}
                      <td className="py-3 px-4 w-14">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-11 h-11 object-cover rounded-xl border border-slate-200 shadow-2xs group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="w-11 h-11 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 border border-slate-200">
                            <ImageIcon className="w-5 h-5" />
                          </div>
                        )}
                      </td>

                      {/* Product Name & Rich Description */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                          <span>{product.name}</span>
                          {product.movementHistory && product.movementHistory.length > 0 && (
                            <span className="text-[10px] font-mono text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                              {product.movementHistory.length} ta harakat
                            </span>
                          )}
                        </div>
                        {product.description ? (
                          <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                            {product.description}
                          </p>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Izoh kiritilmagan</span>
                        )}
                      </td>

                      {/* Barcode & SKU */}
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-blue-700 text-xs">{product.sku}</div>
                        {product.barcode ? (
                          <div className="flex items-center gap-1 text-[11px] font-mono text-emerald-700 mt-0.5">
                            <Barcode className="w-3.5 h-3.5" />
                            <span>{product.barcode}</span>
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">—</div>
                        )}
                      </td>

                      {/* Category & Warehouse */}
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full font-semibold text-[10px] border border-slate-200 block w-fit">
                          {product.category || 'Umumiy'}
                        </span>
                        <span className="text-[10px] text-slate-500 mt-1 block flex items-center gap-1">
                          <Building className="w-3 h-3 text-slate-400" />
                          <span>{product.warehouse || 'Bosh ombor'}</span>
                        </span>
                      </td>

                      {/* Daily Rate */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {formatUZS(product.dailyRate)}
                      </td>

                      {/* Available Count */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`font-mono font-bold px-2 py-0.5 rounded-full text-xs ${
                            hasStock
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {availableCount} <span className="text-[10px] font-normal">/ {product.totalQuantity}</span>
                        </span>
                      </td>

                      {/* Rented Count */}
                      <td className="py-3 px-4 text-center font-mono font-bold text-amber-700">
                        {rentedCount}
                        {maintenanceCount > 0 && (
                          <span className="text-[10px] text-slate-500 font-normal ml-1">
                            ({maintenanceCount} ta'mir)
                          </span>
                        )}
                      </td>

                      {/* Management Buttons */}
                      <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedProductForDetail(product)}
                            className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-bold text-xs border border-blue-200 transition-colors inline-flex items-center gap-1 cursor-pointer"
                            title="Mahsulot kartasi va harakatlar tarixi"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Karta</span>
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(product)}
                            className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg font-bold text-xs border border-amber-300 transition-colors inline-flex items-center gap-1 cursor-pointer"
                            title="Mahsulotni tahrirlash"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-amber-700" />
                            <span>Tahrirlash</span>
                          </button>
                          {onDeleteProduct && (
                            <button
                              onClick={() => setProductToDelete(product)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-rose-200"
                              title="Mahsulotni o'chirish"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
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

      {/* MODAL 1: ADD NEW PRODUCT MODAL (RICH WITH DESCRIPTION & BARCODE) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Yangi Mahsulot Qo'shish</h3>
                  <p className="text-xs text-slate-500">Mahsulot tavsifi, shtrix-kod va ijara stavkalarini kiriting</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4 text-xs">
              {/* Product Name */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Mahsulot Nomi <span className="text-rose-500 font-extrabold">* (Majburiy)</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (nameError) setNameError(null);
                  }}
                  placeholder="Masalan: Bosch GBH 2-28 Og'ir Perforator..."
                  className={`w-full px-3 py-2 rounded-xl text-slate-900 focus:outline-none transition-colors ${
                    nameError
                      ? 'bg-rose-50 border-2 border-rose-500 focus:border-rose-600'
                      : 'bg-slate-50 border border-slate-300 focus:border-blue-500'
                  }`}
                />
                {nameError && (
                  <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{nameError}</span>
                  </p>
                )}
              </div>

              {/* Kategoriya & O'lchov birligi (Strictly Required) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Kategoriya *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500"
                  >
                    {categories.map((c, i) => (
                      <option key={i} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-blue-600" />
                      <span>O'lchov birligi <span className="text-rose-500 font-extrabold">* (Majburiy)</span></span>
                    </span>
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
                    className={`w-full px-3 py-2 rounded-xl text-slate-900 font-medium transition-colors cursor-pointer ${
                      unitError
                        ? 'bg-rose-50 border-2 border-rose-500 text-rose-900 focus:outline-none focus:border-rose-600'
                        : 'bg-slate-50 border border-slate-300 focus:outline-none focus:border-blue-500'
                    }`}
                  >
                    <option value="">-- O'lchov birligini tanlang (Majburiy) --</option>
                    <option value="dona">dona (Soni / Bo'lak)</option>
                    <option value="kg">kg (Kilogramm / Og'irlik)</option>
                    <option value="metr">metr (Uzunlik / Kabel)</option>
                    <option value="L">L (Litr / Hajm)</option>
                    <option value="m2">m² (Kvadrat metr / Maydon)</option>
                    <option value="komplekt">komplekt (To'plam / Jamlanma)</option>
                    <option value="qop">qop (Qop / Paket)</option>
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
                        placeholder="O'lchov birligini yozing (masalan: rulon, pachka)..."
                        className="w-full px-3 py-1.5 bg-white border border-blue-400 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-blue-600"
                        autoFocus
                      />
                    </div>
                  )}

                  {unitError && (
                    <div className="mt-1.5 p-2 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-1.5 text-[11px] text-rose-700 font-bold animate-in fade-in">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span>{unitError}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Barcode & Auto-code */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Barcode className="w-3.5 h-3.5 text-slate-600" />
                    <span>Shtrix-kod (Shtrix-kod skaner yoki 13 talik EAN)</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleGenerateBarcode}
                    className="text-[10px] text-blue-600 font-bold hover:underline cursor-pointer"
                  >
                    Avto-kod generatsiya
                  </button>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    placeholder="Shtrix-kodni skaner qiling yoki kiriting..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Detailed Description ("Izoh") */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>Mahsulot haqida to'liq izoh (nima ekanligi va nima uchun ishlatilishi) *</span>
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ushbu asbobning xususiyatlari, qanday ishlar uchun mo'ljallanganligi va texnik tavsifini yozing..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Informative Guidance Banners (Pricing in Catalog, Warehouse in Reception) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-blue-900 text-[11px]">
                    <Tag className="w-3.5 h-3.5 text-blue-600" />
                    <span>Narxlar va Tariflar</span>
                  </div>
                  <p className="text-[10px] text-blue-700 leading-relaxed">
                    Narxlar bu yerda belgilanmaydi. Mahsulot yaratilgach, <strong>"Katalog (Tariflar)"</strong> bo'limida kunlik stavka va garov depoziti boshqariladi.
                  </p>
                </div>

                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900 text-[11px]">
                    <Building className="w-3.5 h-3.5 text-amber-600" />
                    <span>Omborxona Biriktirish</span>
                  </div>
                  <p className="text-[10px] text-amber-700 leading-relaxed">
                    Ombor bu yerda tanlanmaydi. Mahsulot amalda omborga qabul qilinayotgan paytda <strong>"Kirim"</strong> bo'limida omborga biriktiriladi.
                  </p>
                </div>
              </div>

              {/* Local Image Upload */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Galereyadan Rasm Yuklash
                </label>
                <div className="flex items-center gap-3">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-14 h-14 object-cover rounded-xl border border-slate-200"
                    />
                  ) : (
                    <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 border border-slate-200">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                  )}

                  <label className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-300 cursor-pointer flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-blue-600" />
                    <span>Rasm tanlash</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageFileChange}
                    />
                  </label>
                </div>
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-sm shadow-blue-500/20 cursor-pointer"
                >
                  Mahsulotni Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT EXISTING PRODUCT */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Mahsulotni Tahrirlash</h3>
                  <p className="text-xs text-slate-500 font-mono">ID: {editingProduct.id} · SKU: {editingProduct.sku}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingProduct(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedProduct} className="space-y-4 text-xs">
              {/* Product Name */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Mahsulot Nomi <span className="text-rose-500 font-extrabold">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Mahsulot nomi..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Category & Group */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Kategoriya</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Guruh</label>
                  <select
                    value={editGroup}
                    onChange={(e) => setEditGroup(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="Asosiy fond">Asosiy fond</option>
                    <option value="Aylanma asboblar">Aylanma asboblar</option>
                    <option value="Ehtiyot qismlar">Ehtiyot qismlar</option>
                    <option value="Sarf materiallari">Sarf materiallari</option>
                  </select>
                </div>
              </div>

              {/* Barcode & Unit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Shtrix-kod (EAN-13 / Barcode)</label>
                  <input
                    type="text"
                    value={editBarcode}
                    onChange={(e) => setEditBarcode(e.target.value)}
                    placeholder="Masalan: 4780012345678"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">O'lchov Birligi</label>
                  <select
                    value={editUnit}
                    onChange={(e) => setEditUnit(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="dona">dona</option>
                    <option value="komplekt">komplekt</option>
                    <option value="metr">metr</option>
                    <option value="kg">kg</option>
                    <option value="L">litr (L)</option>
                    <option value="m2">m²</option>
                  </select>
                </div>
              </div>

              {/* Rates: Daily Rate & Deposit & Purchase Price */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Kunlik Ijara (so'm)</label>
                  <input
                    type="number"
                    value={editDailyRate || ''}
                    onChange={(e) => setEditDailyRate(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-blue-700"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Garov Depoziti (so'm)</label>
                  <input
                    type="number"
                    value={editDepositAmount || ''}
                    onChange={(e) => setEditDepositAmount(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-indigo-700"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Kirim Narxi (so'm)</label>
                  <input
                    type="number"
                    value={editPurchasePrice || ''}
                    onChange={(e) => setEditPurchasePrice(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-slate-700"
                  />
                </div>
              </div>

              {/* Warehouse */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Ombor</label>
                <input
                  type="text"
                  value={editWarehouse}
                  onChange={(e) => setEditWarehouse(e.target.value)}
                  placeholder="Bosh ombor..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Mahsulot Tavsifi / Izoh</label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Ushbu mahsulot nima maqsadda ishlatiladi, qanday xususiyatlarga ega..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl font-bold shadow-sm cursor-pointer"
                >
                  O'zgarishlarni Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CATEGORY MANAGEMENT */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <FolderTree className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">Mahsulot Kategoriyalarini Boshqarish</h3>
              </div>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Add New Category Input */}
            <form onSubmit={handleAddCategory} className="flex gap-2">
              <input
                type="text"
                required
                value={newCatInput}
                onChange={(e) => setNewCatInput(e.target.value)}
                placeholder="Yangi kategoriya nomi (masalan: Vibroplitlar)..."
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-1 cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Qo'shish</span>
              </button>
            </form>

            {/* Existing Categories List */}
            <div className="space-y-2 pt-2">
              <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                Mavjud kategoriyalar ({categories.length} ta):
              </h4>

              <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1 border border-slate-200 rounded-xl p-2 bg-slate-50">
                {categories.map((cat, idx) => {
                  const productCount = products.filter((p) => p.category === cat).length;
                  const isEditingThis = editingCategory?.original === cat;

                  return (
                    <div
                      key={idx}
                      className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-2 shadow-2xs"
                    >
                      {isEditingThis ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            value={editingCategory.current}
                            onChange={(e) => setEditingCategory({ ...editingCategory, current: e.target.value })}
                            className="flex-1 px-2 py-1 bg-slate-50 border border-blue-500 rounded-lg text-slate-900 text-xs"
                          />
                          <button
                            type="button"
                            onClick={handleSaveRenamedCategory}
                            className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg font-bold text-[11px] cursor-pointer"
                          >
                            Saqlash
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCategory(null)}
                            className="px-2 py-1 bg-slate-200 text-slate-700 rounded-lg text-[11px] cursor-pointer"
                          >
                            Bekor
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <Tag className="w-3.5 h-3.5 text-indigo-500" />
                            <span className="font-semibold text-slate-900">{cat}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              ({productCount} ta mahsulot)
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setEditingCategory({ original: cat, current: cat })}
                              className="p-1 text-slate-400 hover:text-blue-600 rounded cursor-pointer"
                              title="Nomini o'zgartirish"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setCategoryToDelete(cat)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                              title="O'chirish"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: PRODUCT DETAIL CARD & LIFECYCLE HISTORY MODAL */}
      {selectedProductForDetail && (
        <ProductDetailCardModal
          isOpen={true}
          product={selectedProductForDetail}
          onClose={() => setSelectedProductForDetail(null)}
          onUpdateProduct={(updated) => {
            onSaveProduct(updated);
            setSelectedProductForDetail(updated);
          }}
          onDeleteProduct={onDeleteProduct ? (prodId) => {
            onDeleteProduct(prodId);
            setSelectedProductForDetail(null);
          } : undefined}
          onNavigateToOrder={onNavigateToOrder}
          currentUser={currentUser}
        />
      )}

      {/* MODAL 4: DELETE PRODUCT CONFIRMATION MODAL */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Mahsulotni o'chirish
                </h3>
              </div>
              <button
                onClick={() => setProductToDelete(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <div className="font-bold text-slate-900 text-sm">{productToDelete.name}</div>
                <div className="flex flex-wrap gap-2 text-[11px] text-slate-500 font-mono">
                  <span>SKU: {productToDelete.sku}</span>
                  <span>•</span>
                  <span>Omborda: {productToDelete.totalQuantity} {productToDelete.unit || 'dona'}</span>
                </div>
              </div>

              {productToDelete.serials.some((s) => s.status === 'rented') ? (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 leading-relaxed space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-rose-950">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Diqqat: Ushbu mahsulot hozirda ijarada!</span>
                  </div>
                  <p>
                    Ushbu mahsulotning ba'zi seriya raqamlari mijozlarga ijaraga berilgan. O'chirish buyurtmalar hisobotida nomutanosiblik keltirib chiqarishi mumkin. Haqiqatan ham o'chirmoqchimisiz?
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 leading-relaxed">
                  Ushbu mahsulotni katalogdan butunlay o'chirishni tasdiqlaysizmi?
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold cursor-pointer"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteProduct) {
                    onDeleteProduct(productToDelete.id);
                  }
                  setProductToDelete(null);
                }}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ha, o'chirish</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: DELETE CATEGORY CONFIRMATION MODAL */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Kategoriyani o'chirish
                </h3>
              </div>
              <button
                onClick={() => setCategoryToDelete(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="font-bold text-slate-900">{categoryToDelete}</span>
              </div>

              {products.filter((p) => p.category === categoryToDelete).length > 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 leading-relaxed space-y-1">
                  <div className="font-bold flex items-center gap-1 text-amber-950">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Diqqat: Ushbu kategoriyada mahsulotlar mavjud!</span>
                  </div>
                  <p>
                    Ushbu kategoriyaga <strong>{products.filter((p) => p.category === categoryToDelete).length} ta</strong> mahsulot biriktirilgan. Haqiqatan ham ushbu kategoriyani o'chirmoqchimisiz?
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700">
                  Ushbu kategoriyani o'chirishni tasdiqlaysizmi?
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold cursor-pointer"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCategory}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ha, o'chirish</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
