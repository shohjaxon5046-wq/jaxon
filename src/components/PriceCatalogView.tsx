import React, { useState } from 'react';
import {
  Tag,
  DollarSign,
  Package,
  Truck,
  HardHat,
  Users,
  Edit2,
  Check,
  Save,
  Search,
  Plus,
  Trash2,
  X,
  Sparkles,
  RotateCcw,
  Lock
} from 'lucide-react';
import {
  Language,
  Product,
  WasteTruckConfig,
  CraneConfig,
  LoaderPricingRules
} from '../types';
import { formatUZS } from '../utils/pricing';

interface Props {
  language: Language;
  products: Product[];
  wasteTrucks: WasteTruckConfig[];
  cranes: CraneConfig[];
  loaderRules: LoaderPricingRules;
  onUpdateProductPrice: (productId: string, dailyRate: number, deposit: number) => void;
  onUpdateWasteTruckPrice: (truckId: string, pricePerTrip: number, pricePerM3: number) => void;
  onUpdateCranePrice: (craneId: string, hourlyRate: number, dailyRate: number) => void;
  onUpdateLoaderRules: (rules: LoaderPricingRules) => void;
  onSaveProducts?: (products: Product[]) => void;
  onSaveWasteTrucks?: (trucks: WasteTruckConfig[]) => void;
  onSaveCranes?: (cranes: CraneConfig[]) => void;
  onAddProduct?: (newProd: Product) => void;
  onAddWasteTruck?: (newTruck: WasteTruckConfig) => void;
  onAddCrane?: (newCrane: CraneConfig) => void;
  onDeleteWasteTruck?: (truckId: string) => void;
  onDeleteCrane?: (craneId: string) => void;
  onDeleteProduct?: (productId: string) => void;
}

export const PriceCatalogView: React.FC<Props> = ({
  language,
  products,
  wasteTrucks,
  cranes,
  loaderRules,
  onUpdateProductPrice,
  onUpdateWasteTruckPrice,
  onUpdateCranePrice,
  onUpdateLoaderRules,
  onSaveProducts,
  onSaveWasteTrucks,
  onSaveCranes,
  onAddProduct,
  onAddWasteTruck,
  onAddCrane,
  onDeleteWasteTruck,
  onDeleteCrane,
  onDeleteProduct
}) => {
  const [activeSection, setActiveSection] = useState<'all' | 'products' | 'waste' | 'cranes' | 'loaders'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Editing state for products
  const [editingProdId, setEditingProdId] = useState<string | null>(null);
  const [editProdName, setEditProdName] = useState<string>('');
  const [editDailyRate, setEditDailyRate] = useState<string>('');
  const [editDeposit, setEditDeposit] = useState<string>('');
  const [editDiscountPercent, setEditDiscountPercent] = useState<string>('0');

  // Editing state for waste trucks
  const [editingTruckId, setEditingTruckId] = useState<string | null>(null);
  const [editTruckName, setEditTruckName] = useState<string>('');
  const [editTruckCapacity, setEditTruckCapacity] = useState<string>('');
  const [editTripPrice, setEditTripPrice] = useState<string>('');
  const [editM3Price, setEditM3Price] = useState<string>('');
  const [editLoadingPrice, setEditLoadingPrice] = useState<string>('');

  // Editing state for cranes
  const [editingCraneId, setEditingCraneId] = useState<string | null>(null);
  const [editCraneName, setEditCraneName] = useState<string>('');
  const [editCraneTonnage, setEditCraneTonnage] = useState<string>('');
  const [editCraneHourly, setEditCraneHourly] = useState<string>('');
  const [editCraneDaily, setEditCraneDaily] = useState<string>('');
  const [editCraneDiscount, setEditCraneDiscount] = useState<string>('');

  // Editing state for loaders
  const [isEditingLoaders, setIsEditingLoaders] = useState(false);
  const [loaderHourly, setLoaderHourly] = useState(loaderRules.baseHourlyPerPerson.toString());
  const [loaderPerKg, setLoaderPerKg] = useState((loaderRules.pricePerKg || 100).toString());
  const [loaderPerFloor, setLoaderPerFloor] = useState(loaderRules.ratePerFloorNoElevator.toString());
  const [loaderElevator, setLoaderElevator] = useState((loaderRules.elevatorFee || 5000).toString());

  // Modal State for Adding New Item
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'product' | 'truck' | 'crane'; id: string; name: string } | null>(null);

  const handleConfirmDeleteItem = () => {
    if (!itemToDelete) return;
    if (itemToDelete.type === 'product' && onDeleteProduct) {
      onDeleteProduct(itemToDelete.id);
    } else if (itemToDelete.type === 'truck' && onDeleteWasteTruck) {
      onDeleteWasteTruck(itemToDelete.id);
    } else if (itemToDelete.type === 'crane' && onDeleteCrane) {
      onDeleteCrane(itemToDelete.id);
    }
    setItemToDelete(null);
  };
  const [newProdName, setNewProdName] = useState('');
  const [newProdDailyRate, setNewProdDailyRate] = useState('70000');
  const [newProdDeposit, setNewProdDeposit] = useState('800000');
  const [newProdDiscount, setNewProdDiscount] = useState('0');

  const [isAddTruckModalOpen, setIsAddTruckModalOpen] = useState(false);
  const [newTruckName, setNewTruckName] = useState('');
  const [newTruckCapacity, setNewTruckCapacity] = useState('10');
  const [newTruckTripPrice, setNewTruckTripPrice] = useState('600000');
  const [newTruckM3Price, setNewTruckM3Price] = useState('60000');
  const [newTruckLoadingServicePrice, setNewTruckLoadingServicePrice] = useState('150000');

  const [isAddCraneModalOpen, setIsAddCraneModalOpen] = useState(false);
  const [newCraneName, setNewCraneName] = useState('');
  const [newCraneTonnage, setNewCraneTonnage] = useState('25');
  const [newCraneHourly, setNewCraneHourly] = useState('350000');
  const [newCraneDaily, setNewCraneDaily] = useState('2500000');
  const [newCraneDiscountPercent, setNewCraneDiscountPercent] = useState('10');
  const [newCraneDiscountHourly, setNewCraneDiscountHourly] = useState('300000');
  const [newCraneDiscountDaily, setNewCraneDiscountDaily] = useState('2200000');

  // Save edited product
  const handleSaveProductPrice = (prodId: string) => {
    const dr = parseFloat(editDailyRate) || 0;
    const dp = parseFloat(editDeposit) || 0;
    const disc = parseFloat(editDiscountPercent) || 0;
    if (onSaveProducts) {
      const updated = products.map((p) =>
        p.id === prodId ? { ...p, dailyRate: dr, depositAmount: dp, discountPercent: disc } : p
      );
      onSaveProducts(updated);
    } else {
      onUpdateProductPrice(prodId, dr, dp);
    }
    setEditingProdId(null);
  };

  // Save edited waste truck
  const handleSaveTruckPrice = (truckId: string) => {
    const trip = parseFloat(editTripPrice) || 0;
    const m3 = parseFloat(editM3Price) || 0;
    const cap = parseFloat(editTruckCapacity) || 10;
    const loading = parseFloat(editLoadingPrice) || 0;
    if (onSaveWasteTrucks) {
      const updated = wasteTrucks.map((t) =>
        t.id === truckId
          ? {
              ...t,
              capacityM3: cap,
              pricePerTrip: trip,
              pricePerM3: m3,
              loadingServicePrice: loading
            }
          : t
      );
      onSaveWasteTrucks(updated);
    } else {
      onUpdateWasteTruckPrice(truckId, trip, m3);
    }
    setEditingTruckId(null);
  };

  // Save edited crane
  const handleSaveCranePrice = (craneId: string) => {
    const hr = parseFloat(editCraneHourly) || 0;
    const dr = parseFloat(editCraneDaily) || 0;
    const ton = parseFloat(editCraneTonnage) || 16;
    const disc = parseFloat(editCraneDiscount) || 0;
    if (onSaveCranes) {
      const updated = cranes.map((c) =>
        c.id === craneId
          ? {
              ...c,
              tonnage: ton,
              hourlyRate: hr,
              dailyRate: dr,
              multiDayDiscountPercent: disc,
              discountPercent: disc
            }
          : c
      );
      onSaveCranes(updated);
    } else {
      onUpdateCranePrice(craneId, hr, dr);
    }
    setEditingCraneId(null);
  };

  // Save loader rules
  const handleSaveLoaders = () => {
    onUpdateLoaderRules({
      ...loaderRules,
      baseHourlyPerPerson: parseFloat(loaderHourly) || 75000,
      pricePerKg: parseFloat(loaderPerKg) || 100,
      ratePerFloorNoElevator: parseFloat(loaderPerFloor) || 15000,
      elevatorFee: parseFloat(loaderElevator) || 5000
    });
    setIsEditingLoaders(false);
  };

  // Create Product handler
  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim()) return;

    const newProd: Product = {
      id: `prod-${Date.now()}`,
      name: newProdName.trim(),
      sku: `SKU-${Date.now().toString().slice(-4)}`,
      category: 'Asboblar va Uskunalar',
      group: 'Elektr asboblar',
      dailyRate: parseFloat(newProdDailyRate) || 0,
      depositAmount: parseFloat(newProdDeposit) || 0,
      discountPercent: parseFloat(newProdDiscount) || 0,
      purchasePriceUZS: 0,
      totalQuantity: 0,
      serials: [],
      createdAt: new Date().toISOString().split('T')[0]
    };

    if (onAddProduct) {
      onAddProduct(newProd);
    } else if (onSaveProducts) {
      onSaveProducts([...products, newProd]);
    }
    setIsAddProductModalOpen(false);
    setNewProdName('');
    setNewProdDailyRate('70000');
    setNewProdDeposit('800000');
    setNewProdDiscount('0');
  };

  // Create Waste Truck handler
  const handleCreateTruck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTruckName.trim()) return;

    const newTruck: WasteTruckConfig = {
      id: `truck-${Date.now()}`,
      truckName: newTruckName.trim(),
      capacityM3: parseFloat(newTruckCapacity) || 10,
      pricePerTrip: parseFloat(newTruckTripPrice) || 0,
      pricePerM3: parseFloat(newTruckM3Price) || 0,
      loadingServicePrice: parseFloat(newTruckLoadingServicePrice) || 0
    };

    if (onAddWasteTruck) {
      onAddWasteTruck(newTruck);
    } else if (onSaveWasteTrucks) {
      onSaveWasteTrucks([...wasteTrucks, newTruck]);
    }
    setIsAddTruckModalOpen(false);
    setNewTruckName('');
    setNewTruckCapacity('10');
    setNewTruckTripPrice('600000');
    setNewTruckM3Price('60000');
    setNewTruckLoadingServicePrice('150000');
  };

  // Create Crane handler
  const handleCreateCrane = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCraneName.trim()) return;

    const discPercent = parseFloat(newCraneDiscountPercent) || 0;
    const newCrane: CraneConfig = {
      id: `crane-${Date.now()}`,
      name: newCraneName.trim(),
      tonnage: parseFloat(newCraneTonnage) || 25,
      hourlyRate: parseFloat(newCraneHourly) || 0,
      dailyRate: parseFloat(newCraneDaily) || 0,
      discountPercent: discPercent,
      discountHourlyRate: parseFloat(newCraneDiscountHourly) || 0,
      discountDailyRate: parseFloat(newCraneDiscountDaily) || 0,
      minHours: 4,
      multiDayDiscountPercent: discPercent
    };

    if (onAddCrane) {
      onAddCrane(newCrane);
    } else if (onSaveCranes) {
      onSaveCranes([...cranes, newCrane]);
    }
    setIsAddCraneModalOpen(false);
    setNewCraneName('');
    setNewCraneTonnage('25');
    setNewCraneHourly('350000');
    setNewCraneDaily('2500000');
    setNewCraneDiscountPercent('10');
    setNewCraneDiscountHourly('300000');
    setNewCraneDiscountDaily('2200000');
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Tag className="w-5 h-5 text-blue-600" />
            <span>Narxlar ro‘yxati</span>
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Barcha mahsulotlar va xizmatlar tariflarini bevosita shu yerdan qo'shing va o'zgartiring
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Section switcher */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setActiveSection('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                activeSection === 'all' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Barchasi
            </button>
            <button
              onClick={() => setActiveSection('products')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                activeSection === 'products' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mahsulotlar ({products.length})
            </button>
            <button
              onClick={() => setActiveSection('waste')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                activeSection === 'waste' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Chiqindi ({wasteTrucks.length})
            </button>
            <button
              onClick={() => setActiveSection('cranes')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                activeSection === 'cranes' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Kranlar ({cranes.length})
            </button>
            <button
              onClick={() => setActiveSection('loaders')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                activeSection === 'loaders' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Yuk tashuvchilar
            </button>
          </div>
        </div>
      </div>

      {/* 1. MAHSULOTLAR VA ASBOBLAR NARXLARI */}
      {(activeSection === 'all' || activeSection === 'products') && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs space-y-3 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Mahsulotlar va Asboblar Ijara Narxlari
                </h2>
                <span className="text-[11px] text-slate-500 font-medium">
                  O'lchov birligi: <strong>1 kunlik ijara / 1 dona</strong>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {products.length === 0 && (
                <button
                  onClick={handleLoadDefaultProducts}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Namunaviy asboblar</span>
                </button>
              )}
              <button
                onClick={() => setIsAddProductModalOpen(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Mahsulot narxini qo'shish</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Mahsulot nomi</th>
                  <th className="py-2.5 px-3">O'lchov birligi</th>
                  <th className="py-2.5 px-3 text-right">Ijara narxi (so'm/kun)</th>
                  <th className="py-2.5 px-3 text-right">Garov depoziti (so'm)</th>
                  <th className="py-2.5 px-3 text-right">Chegirma (%)</th>
                  <th className="py-2.5 px-3 text-center">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      <div className="space-y-2">
                        <Package className="w-8 h-8 text-slate-300 mx-auto" />
                        <p className="text-slate-600 font-medium">Hozircha mahsulotlar kiritilmagan.</p>
                        <div className="flex justify-center gap-2 pt-1">
                          <button
                            onClick={() => setIsAddProductModalOpen(true)}
                            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg font-bold text-xs cursor-pointer"
                          >
                            + Yangi mahsulot qo'shish
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  products.map((prod) => {
                    const isEditing = editingProdId === prod.id;
                    return (
                      <tr key={prod.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          {isEditing ? (
                            <div className="flex items-center gap-1.5 py-1 px-2 bg-slate-100 border border-slate-200 rounded text-slate-700 select-none">
                              <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate" title="Katalogda mahsulot nomi o'zgartirilmaydi, faqat narxlar o'zgartiriladi">{prod.name}</span>
                            </div>
                          ) : (
                            prod.name
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          1 kunlik ijara
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          {isEditing ? (
                            <input
                              type="text"
                              inputMode="numeric"
                              value={editDailyRate}
                              onChange={(e) => setEditDailyRate(e.target.value)}
                              className="w-28 px-2 py-1 bg-white border border-blue-500 rounded text-right"
                            />
                          ) : (
                            formatUZS(prod.dailyRate)
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                          {isEditing ? (
                            <input
                              type="text"
                              inputMode="numeric"
                              value={editDeposit}
                              onChange={(e) => setEditDeposit(e.target.value)}
                              className="w-28 px-2 py-1 bg-white border border-blue-500 rounded text-right"
                            />
                          ) : (
                            formatUZS(prod.depositAmount)
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-bold">
                          {isEditing ? (
                            <input
                              type="text"
                              inputMode="numeric"
                              value={editDiscountPercent}
                              onChange={(e) => setEditDiscountPercent(e.target.value)}
                              className="w-16 px-2 py-1 bg-white border border-blue-500 rounded text-right"
                              placeholder="%"
                            />
                          ) : (
                            prod.discountPercent ? `${prod.discountPercent}%` : '0%'
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => handleSaveProductPrice(prod.id)}
                                  className="p-1 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer"
                                  title="Saqlash"
                                >
                                  <Save className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setEditingProdId(null)}
                                  className="p-1 text-slate-400 hover:bg-slate-100 rounded cursor-pointer"
                                  title="Bekor qilish"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => {
                                    setEditingProdId(prod.id);
                                    setEditProdName(prod.name);
                                    setEditDailyRate(prod.dailyRate.toString());
                                    setEditDeposit(prod.depositAmount.toString());
                                    setEditDiscountPercent((prod.discountPercent || 0).toString());
                                  }}
                                  className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded cursor-pointer"
                                  title="Narxni o'zgartirish"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                {onDeleteProduct && (
                                  <button
                                    onClick={() => setItemToDelete({ type: 'product', id: prod.id, name: prod.name })}
                                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                                    title="O'chirish"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </>
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
      )}

      {/* 2. CHIQINDI (MUSIR) TARIFLARI */}
      {(activeSection === 'all' || activeSection === 'waste') && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs space-y-3 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-amber-600" />
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Chiqindilarni Olib Ketish (Musir) Tariflari
                </h2>
                <span className="text-[11px] text-slate-500 font-medium">
                  O'lchov birligi: <strong>Reys va Hajm (m³)</strong>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAddTruckModalOpen(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Yangi chiqindi mashinasi tarifini qo'shish</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Mashina turi</th>
                  <th className="py-2.5 px-3">Sig'imi (m³)</th>
                  <th className="py-2.5 px-3 text-right">Reys narxi (so'm/reys)</th>
                  <th className="py-2.5 px-3 text-right">1 m³ narxi (so'm)</th>
                  <th className="py-2.5 px-3 text-right">Yuklash xizmati (Gruschiklar)</th>
                  <th className="py-2.5 px-3 text-center">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {wasteTrucks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      <div className="space-y-2">
                        <Truck className="w-8 h-8 text-slate-300 mx-auto" />
                        <p className="text-slate-600 font-medium">Chiqindi mashinalari ro'yxati bo'sh.</p>
                        <div className="flex justify-center gap-2 pt-1">
                          <button
                            onClick={() => setIsAddTruckModalOpen(true)}
                            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg font-bold text-xs cursor-pointer"
                          >
                            + Yangi mashina qo'shish
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  wasteTrucks.map((truck) => {
                    const isEditing = editingTruckId === truck.id;
                    return (
                      <tr key={truck.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          {isEditing ? (
                            <div className="flex items-center gap-1.5 py-1 px-2 bg-slate-100 border border-slate-200 rounded text-slate-700 select-none">
                              <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate" title="Katalogda nom o'zgartirilmaydi, faqat narxlar o'zgartiriladi">{truck.truckName}</span>
                            </div>
                          ) : (
                            truck.truckName
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 font-mono">
                          {isEditing ? (
                            <input
                              type="text"
                              inputMode="numeric"
                              value={editTruckCapacity}
                              onChange={(e) => setEditTruckCapacity(e.target.value)}
                              className="w-20 px-2 py-1 bg-white border border-blue-500 rounded"
                            />
                          ) : (
                            `${truck.capacityM3} m³`
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          {isEditing ? (
                            <input
                              type="text"
                              inputMode="numeric"
                              value={editTripPrice}
                              onChange={(e) => setEditTripPrice(e.target.value)}
                              className="w-28 px-2 py-1 bg-white border border-blue-500 rounded text-right"
                            />
                          ) : (
                            formatUZS(truck.pricePerTrip)
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                          {isEditing ? (
                            <input
                              type="text"
                              inputMode="numeric"
                              value={editM3Price}
                              onChange={(e) => setEditM3Price(e.target.value)}
                              className="w-28 px-2 py-1 bg-white border border-blue-500 rounded text-right"
                            />
                          ) : (
                            formatUZS(truck.pricePerM3)
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-bold">
                          {isEditing ? (
                            <input
                              type="text"
                              inputMode="numeric"
                              value={editLoadingPrice}
                              onChange={(e) => setEditLoadingPrice(e.target.value)}
                              className="w-28 px-2 py-1 bg-white border border-blue-500 rounded text-right"
                              placeholder="so'm"
                            />
                          ) : (
                            formatUZS(truck.loadingServicePrice || 150000)
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => handleSaveTruckPrice(truck.id)}
                                  className="p-1 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer"
                                  title="Saqlash"
                                >
                                  <Save className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setEditingTruckId(null)}
                                  className="p-1 text-slate-400 hover:bg-slate-100 rounded cursor-pointer"
                                  title="Bekor qilish"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => {
                                    setEditingTruckId(truck.id);
                                    setEditTruckName(truck.truckName);
                                    setEditTruckCapacity(truck.capacityM3.toString());
                                    setEditTripPrice(truck.pricePerTrip.toString());
                                    setEditM3Price(truck.pricePerM3.toString());
                                    setEditLoadingPrice((truck.loadingServicePrice || 150000).toString());
                                  }}
                                  className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded cursor-pointer"
                                  title="Narxni o'zgartirish"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                {onDeleteWasteTruck && (
                                  <button
                                    onClick={() => setItemToDelete({ type: 'truck', id: truck.id, name: truck.truckName })}
                                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                                    title="O'chirish"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </>
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
      )}

      {/* 3. KRANLAR VA OG'IR TEXNIKA TARIFLARI */}
      {(activeSection === 'all' || activeSection === 'cranes') && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs space-y-3 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <HardHat className="w-5 h-5 text-indigo-600" />
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Kranlar va Og'ir Texnika Tariflari
                </h2>
                <span className="text-[11px] text-slate-500 font-medium">
                  O'lchov birligi: <strong>Soat / Kun (Smena)</strong>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAddCraneModalOpen(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Yangi kran/texnika tarifini qo'shish</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Texnika nomi</th>
                  <th className="py-2.5 px-3">Tonnaj</th>
                  <th className="py-2.5 px-3 text-right">Soatlik narx (so'm/soat)</th>
                  <th className="py-2.5 px-3 text-right">Kunlik narx (so'm/smena)</th>
                  <th className="py-2.5 px-3 text-right">Chegirma (%)</th>
                  <th className="py-2.5 px-3 text-center">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cranes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      <div className="space-y-2">
                        <HardHat className="w-8 h-8 text-slate-300 mx-auto" />
                        <p className="text-slate-600 font-medium">Kranlar va og'ir texnikalar ro'yxati bo'sh.</p>
                        <div className="flex justify-center gap-2 pt-1">
                          <button
                            onClick={() => setIsAddCraneModalOpen(true)}
                            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg font-bold text-xs cursor-pointer"
                          >
                            + Yangi kran qo'shish
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  cranes.map((crane) => {
                    const isEditing = editingCraneId === crane.id;
                    return (
                      <tr key={crane.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          {isEditing ? (
                            <div className="flex items-center gap-1.5 py-1 px-2 bg-slate-100 border border-slate-200 rounded text-slate-700 select-none">
                              <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate" title="Katalogda nom o'zgartirilmaydi, faqat narxlar o'zgartiriladi">{crane.name}</span>
                            </div>
                          ) : (
                            crane.name
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 font-mono">
                          {isEditing ? (
                            <input
                              type="text"
                              inputMode="numeric"
                              value={editCraneTonnage}
                              onChange={(e) => setEditCraneTonnage(e.target.value)}
                              className="w-20 px-2 py-1 bg-white border border-blue-500 rounded"
                            />
                          ) : (
                            `${crane.tonnage} t`
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          {isEditing ? (
                            <input
                              type="text"
                              inputMode="numeric"
                              value={editCraneHourly}
                              onChange={(e) => setEditCraneHourly(e.target.value)}
                              className="w-28 px-2 py-1 bg-white border border-blue-500 rounded text-right"
                            />
                          ) : (
                            formatUZS(crane.hourlyRate)
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                          {isEditing ? (
                            <input
                              type="text"
                              inputMode="numeric"
                              value={editCraneDaily}
                              onChange={(e) => setEditCraneDaily(e.target.value)}
                              className="w-28 px-2 py-1 bg-white border border-blue-500 rounded text-right"
                            />
                          ) : (
                            formatUZS(crane.dailyRate)
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-bold">
                          {isEditing ? (
                            <input
                              type="text"
                              inputMode="numeric"
                              value={editCraneDiscount}
                              onChange={(e) => setEditCraneDiscount(e.target.value)}
                              className="w-16 px-2 py-1 bg-white border border-blue-500 rounded text-right"
                              placeholder="%"
                            />
                          ) : (
                            crane.multiDayDiscountPercent || crane.discountPercent
                              ? `${crane.multiDayDiscountPercent || crane.discountPercent}%`
                              : '0%'
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => handleSaveCranePrice(crane.id)}
                                  className="p-1 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer"
                                  title="Saqlash"
                                >
                                  <Save className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setEditingCraneId(null)}
                                  className="p-1 text-slate-400 hover:bg-slate-100 rounded cursor-pointer"
                                  title="Bekor qilish"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => {
                                    setEditingCraneId(crane.id);
                                    setEditCraneName(crane.name);
                                    setEditCraneTonnage(crane.tonnage.toString());
                                    setEditCraneHourly(crane.hourlyRate.toString());
                                    setEditCraneDaily(crane.dailyRate.toString());
                                    setEditCraneDiscount((crane.multiDayDiscountPercent || crane.discountPercent || 0).toString());
                                  }}
                                  className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded cursor-pointer"
                                  title="Narxni o'zgartirish"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                {onDeleteCrane && (
                                  <button
                                    onClick={() => setItemToDelete({ type: 'crane', id: crane.id, name: crane.name })}
                                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                                    title="O'chirish"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </>
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
      )}

      {/* 4. YUK TASHUVCHILAR (GRUSCHIK) TARIFLARI */}
      {(activeSection === 'all' || activeSection === 'loaders') && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs space-y-3 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" />
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Yuk Tashuvchilar (Gruschik) Tariflari
                </h2>
                <span className="text-[11px] text-slate-500 font-medium">
                  Soatlik, vazn (kg), qavat (zina) va lift tariflari
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isEditingLoaders ? (
                <>
                  <button
                    onClick={handleSaveLoaders}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Tariflarni saqlash</span>
                  </button>
                  <button
                    onClick={() => {
                      setLoaderHourly(loaderRules.baseHourlyPerPerson.toString());
                      setLoaderPerKg((loaderRules.pricePerKg || 100).toString());
                      setLoaderPerFloor(loaderRules.ratePerFloorNoElevator.toString());
                      setLoaderElevator((loaderRules.elevatorFee || 5000).toString());
                      setIsEditingLoaders(false);
                    }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Bekor qilish</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditingLoaders(true)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Tariflarni o'zgartirish</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="text-slate-500 text-[11px]">1 kishi / soatlik stavka:</span>
              {isEditingLoaders ? (
                <input
                  type="text"
                  inputMode="numeric"
                  value={loaderHourly}
                  onChange={(e) => setLoaderHourly(e.target.value)}
                  className="w-full px-2 py-1 bg-white border border-blue-500 rounded font-mono font-bold text-slate-900"
                />
              ) : (
                <div className="font-mono font-bold text-slate-900 text-sm">
                  {formatUZS(loaderRules.baseHourlyPerPerson)} / soat
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="text-slate-500 text-[11px]">1 kg yuk ko'tarish narxi:</span>
              {isEditingLoaders ? (
                <input
                  type="text"
                  inputMode="numeric"
                  value={loaderPerKg}
                  onChange={(e) => setLoaderPerKg(e.target.value)}
                  className="w-full px-2 py-1 bg-white border border-blue-500 rounded font-mono font-bold text-slate-900"
                />
              ) : (
                <div className="font-mono font-bold text-slate-900 text-sm">
                  {formatUZS(loaderRules.pricePerKg || 100)} / kg
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="text-slate-500 text-[11px]">Zina qavati (liftsiz):</span>
              {isEditingLoaders ? (
                <input
                  type="text"
                  inputMode="numeric"
                  value={loaderPerFloor}
                  onChange={(e) => setLoaderPerFloor(e.target.value)}
                  className="w-full px-2 py-1 bg-white border border-blue-500 rounded font-mono font-bold text-slate-900"
                />
              ) : (
                <div className="font-mono font-bold text-slate-900 text-sm">
                  {formatUZS(loaderRules.ratePerFloorNoElevator)} / qavat
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="text-slate-500 text-[11px]">Lift mavjud bo'lsa to'lov:</span>
              {isEditingLoaders ? (
                <input
                  type="text"
                  inputMode="numeric"
                  value={loaderElevator}
                  onChange={(e) => setLoaderElevator(e.target.value)}
                  className="w-full px-2 py-1 bg-white border border-blue-500 rounded font-mono font-bold text-slate-900"
                />
              ) : (
                <div className="font-mono font-bold text-slate-900 text-sm">
                  {formatUZS(loaderRules.elevatorFee || 5000)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD PRODUCT */}
      {isAddProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white border border-slate-300 rounded-2xl shadow-xl overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Yangi Mahsulot Narxini Qo'shish</h3>
              </div>
              <button
                onClick={() => setIsAddProductModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="p-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Mahsulot / Asbob nomi *</label>
                <input
                  type="text"
                  required
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  placeholder="Masalan: Perforator Bosch GBH 2-26"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kunlik ijara (so'm) *</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={newProdDailyRate}
                    onChange={(e) => setNewProdDailyRate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Garov depoziti (so'm) *</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={newProdDeposit}
                    onChange={(e) => setNewProdDeposit(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Chegirma (%)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={newProdDiscount}
                    onChange={(e) => setNewProdDiscount(e.target.value)}
                    placeholder="Masalan: 10"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold text-emerald-700"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddProductModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs cursor-pointer"
                >
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD WASTE TRUCK */}
      {isAddTruckModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white border border-slate-300 rounded-2xl shadow-xl overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900">Yangi Chiqindi Mashinasi Qo'shish</h3>
              </div>
              <button
                onClick={() => setIsAddTruckModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTruck} className="p-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mashina nomi *</label>
                  <input
                    type="text"
                    required
                    value={newTruckName}
                    onChange={(e) => setNewTruckName(e.target.value)}
                    placeholder="Masalan: ZIL 130 Samosval"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Sig'imi (m³) *</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={newTruckCapacity}
                    onChange={(e) => setNewTruckCapacity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">1 reys narxi (so'm) *</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={newTruckTripPrice}
                    onChange={(e) => setNewTruckTripPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Har 1 m³ narxi (so'm) *</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={newTruckM3Price}
                    onChange={(e) => setNewTruckM3Price(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Yuklash xizmati / Gruschiklar (so'm/mashina)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={newTruckLoadingServicePrice}
                  onChange={(e) => setNewTruckLoadingServicePrice(e.target.value)}
                  placeholder="Masalan: 150000"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold text-emerald-700"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddTruckModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs cursor-pointer"
                >
                  Mashinani saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD CRANE */}
      {isAddCraneModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white border border-slate-300 rounded-2xl shadow-xl overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardHat className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Yangi Kran/Texnika Qo'shish</h3>
              </div>
              <button
                onClick={() => setIsAddCraneModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCrane} className="p-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Texnika nomi *</label>
                  <input
                    type="text"
                    required
                    value={newCraneName}
                    onChange={(e) => setNewCraneName(e.target.value)}
                    placeholder="Masalan: Kran XCMG 25T"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tonnaj (tonna) *</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={newCraneTonnage}
                    onChange={(e) => setNewCraneTonnage(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Soatlik narx (so'm) *</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={newCraneHourly}
                    onChange={(e) => setNewCraneHourly(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kunlik narx (so'm/smena) *</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={newCraneDaily}
                    onChange={(e) => setNewCraneDaily(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-[11px]">Chegirma (%)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={newCraneDiscountPercent}
                    onChange={(e) => setNewCraneDiscountPercent(e.target.value)}
                    placeholder="%"
                    className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold text-emerald-700"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-[11px]">Chegirmali soatlik</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={newCraneDiscountHourly}
                    onChange={(e) => setNewCraneDiscountHourly(e.target.value)}
                    placeholder="so'm"
                    className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-[11px]">Chegirmali kunlik</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={newCraneDiscountDaily}
                    onChange={(e) => setNewCraneDiscountDaily(e.target.value)}
                    placeholder="so'm"
                    className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono text-[11px]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddCraneModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs cursor-pointer"
                >
                  Kran tarifini saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-600" />
                <h3 className="text-base font-bold text-slate-900">
                  {itemToDelete.type === 'product' && "Mahsulot tarifini o'chirish"}
                  {itemToDelete.type === 'truck' && "Chiqindi mashinasi tarifini o'chirish"}
                  {itemToDelete.type === 'crane' && "Kran tarifini o'chirish"}
                </h3>
              </div>
              <button
                onClick={() => setItemToDelete(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
              <div className="font-bold text-slate-900 text-sm">{itemToDelete.name}</div>
              <p className="text-slate-600">
                Ushbu pozitsiyani katalogdan o'chirishni tasdiqlaysizmi?
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold cursor-pointer"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteItem}
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
