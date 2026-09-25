import React, { useState } from 'react';
import {
  Layers,
  Wrench,
  Truck,
  Building,
  Users,
  Plus,
  Search,
  Hash,
  CheckCircle,
  Clock,
  AlertTriangle,
  X,
  Sliders,
  DollarSign,
  Calculator,
  ArrowRight
} from 'lucide-react';
import {
  CraneConfig,
  Language,
  LoaderPricingRules,
  Product,
  SerialNumber,
  SerialStatus,
  WasteTruckConfig
} from '../types';
import { translations } from '../i18n/translations';
import {
  calculateCraneService,
  calculateLoaderService,
  calculateWasteRemovalService,
  formatUZS
} from '../utils/pricing';

interface Props {
  language: Language;
  products: Product[];
  wasteTrucks: WasteTruckConfig[];
  cranes: CraneConfig[];
  loaderRules: LoaderPricingRules;
  onSaveProduct: (newProduct: Product) => void;
  onUpdateProductSerials: (productId: string, serials: SerialNumber[]) => void;
  onSaveWasteTrucks: (trucks: WasteTruckConfig[]) => void;
  onSaveCranes: (cranes: CraneConfig[]) => void;
  onSaveLoaderRules: (rules: LoaderPricingRules) => void;
  onNavigateToOrder?: (orderId: string) => void;
}

export const ProductsServicesView: React.FC<Props> = ({
  language,
  products,
  wasteTrucks,
  cranes,
  loaderRules,
  onSaveProduct,
  onUpdateProductSerials,
  onSaveWasteTrucks,
  onSaveCranes,
  onSaveLoaderRules,
  onNavigateToOrder
}) => {
  const t = translations[language];

  // Active top-level subtab: 'products' | 'services'
  const [activeTab, setActiveTab] = useState<'products' | 'services'>('products');

  // Products filtering & modals
  const [productSearch, setProductSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [inspectingProduct, setInspectingProduct] = useState<Product | null>(null);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);

  // New Product Form state
  const [formName, setFormName] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formCategory, setFormCategory] = useState('Perforatorlar va Asboblar');
  const [formGroup, setFormGroup] = useState('Og‘ir elektr asboblar');
  const [formDailyRate, setFormDailyRate] = useState(150000);
  const [formDeposit, setFormDeposit] = useState(1500000);
  const [formPurchasePrice, setFormPurchasePrice] = useState(4500000);
  const [formInitialQty, setFormInitialQty] = useState(5);
  const [formCustomSerials, setFormCustomSerials] = useState('');

  // Services subtab: 'waste' | 'cranes' | 'loaders'
  const [activeServiceTab, setActiveServiceTab] = useState<'waste' | 'cranes' | 'loaders'>('waste');

  // Live Loaders Calculator interactive tester
  const [testWeight, setTestWeight] = useState(250);
  const [testFloors, setTestFloors] = useState(3);
  const [testHasElevator, setTestHasElevator] = useState(false);
  const [testIsOversize, setTestIsOversize] = useState(false);

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.sku.toLowerCase().includes(productSearch.toLowerCase());
    const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
    return matchSearch && matchCat;
  });

  const categories = Array.from(new Set(products.map((p) => p.category)));

  // Calculate live gruschik test price
  const testLoaderResult = calculateLoaderService({
    weightKg: testWeight,
    floorCount: testFloors,
    hasElevator: testHasElevator,
    isOversized: testIsOversize,
    rules: loaderRules
  });

  // Handle Add Product Submit
  const handleAddProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formSku) return;

    // Build serials
    let serialNumbersList: string[] = [];
    if (formCustomSerials.trim()) {
      serialNumbersList = formCustomSerials
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
    }

    // If fewer provided than initial quantity, auto-generate remaining
    while (serialNumbersList.length < formInitialQty) {
      const idx = serialNumbersList.length + 1;
      const pad = idx.toString().padStart(2, '0');
      serialNumbersList.push(`SN-${formSku.toUpperCase()}-${pad}`);
    }

    const serialObjects: SerialNumber[] = serialNumbersList.map((sn) => ({
      id: `sn-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      serialNumber: sn,
      status: 'available',
      assignedDate: new Date().toISOString().slice(0, 10)
    }));

    const newProd: Product = {
      id: `prod-${Date.now()}`,
      name: formName,
      sku: formSku.toUpperCase(),
      category: formCategory,
      group: formGroup,
      image: '/src/assets/images/shohrent_power_tools_1790179546047.jpg',
      dailyRate: formDailyRate,
      depositAmount: formDeposit,
      purchasePriceUZS: formPurchasePrice,
      totalQuantity: serialObjects.length,
      serials: serialObjects,
      createdAt: new Date().toISOString().slice(0, 10)
    };

    onSaveProduct(newProd);
    setIsAddProductModalOpen(false);

    // Reset
    setFormName('');
    setFormSku('');
    setFormCustomSerials('');
  };

  // Update serial status in inspector
  const handleToggleSerialStatus = (
    serialId: string,
    newStatus: SerialStatus,
    notes?: string
  ) => {
    if (!inspectingProduct) return;
    const updatedSerials = inspectingProduct.serials.map((s) =>
      s.id === serialId ? { ...s, status: newStatus, notes: notes ?? s.notes } : s
    );
    onUpdateProductSerials(inspectingProduct.id, updatedSerials);
    setInspectingProduct({
      ...inspectingProduct,
      serials: updatedSerials
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Segmented Controls: Tab A vs Tab B */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2 p-1 bg-slate-900 border border-slate-800 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('products')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'products'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>{t.tabProducts}</span>
            <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-slate-950/30 font-mono">
              {products.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('services')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'services'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>{t.tabServices}</span>
            <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-slate-950/30 font-mono">
              3 tur
            </span>
          </button>
        </div>

        {activeTab === 'products' && (
          <button
            onClick={() => setIsAddProductModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{t.addProductBtn}</span>
          </button>
        )}
      </div>

      {/* TAB A: PRODUCTS CATALOG */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          {/* Search & Category Filter bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder={language === 'uz' ? 'Mahsulot nomi yoki artikul (SKU)...' : 'Поиск по названию или SKU...'}
                className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-slate-800 text-amber-400 border border-amber-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t.filterAll}
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === cat
                      ? 'bg-slate-800 text-amber-400 border border-amber-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts.map((prod) => {
              const availableCount = prod.serials.filter((s) => s.status === 'available').length;
              const rentedCount = prod.serials.filter((s) => s.status === 'rented').length;
              const maintenanceCount = prod.serials.filter((s) => s.status === 'maintenance').length;

              return (
                <div
                  key={prod.id}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl overflow-hidden flex flex-col justify-between transition-colors shadow-sm group"
                >
                  <div className="p-4 space-y-3">
                    {/* Header: Title & SKU */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-mono text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          {prod.sku}
                        </span>
                        <h3 className="text-sm font-bold text-white mt-1.5 line-clamp-2">
                          {prod.name}
                        </h3>
                      </div>
                      <div className="w-12 h-12 rounded-lg bg-slate-950 border border-slate-800 overflow-hidden shrink-0">
                        <img
                          src={prod.image}
                          alt={prod.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>

                    <div className="text-xs text-slate-400">
                      <span>{prod.category}</span> · <span>{prod.group}</span>
                    </div>

                    {/* Rates */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-xs">
                      <div>
                        <div className="text-[10px] text-slate-500">{t.dailyPrice}</div>
                        <div className="font-mono font-bold text-white">
                          {formatUZS(prod.dailyRate)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500">{t.depositFee}</div>
                        <div className="font-mono font-bold text-amber-400">
                          {formatUZS(prod.depositAmount)}
                        </div>
                      </div>
                    </div>

                    {/* Serial Numbers Status Overview */}
                    <div className="p-2.5 bg-slate-950/80 rounded-lg border border-slate-800/60 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <div>
                          <span className="text-emerald-400 font-bold font-mono">
                            {availableCount}
                          </span>
                          <span className="text-[10px] text-slate-500 ml-1">Mavjud</span>
                        </div>
                        <div>
                          <span className="text-blue-400 font-bold font-mono">
                            {rentedCount}
                          </span>
                          <span className="text-[10px] text-slate-500 ml-1">Ijarada</span>
                        </div>
                        {maintenanceCount > 0 && (
                          <div>
                            <span className="text-amber-400 font-bold font-mono">
                              {maintenanceCount}
                            </span>
                            <span className="text-[10px] text-slate-500 ml-1">Ta‘mirda</span>
                          </div>
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">
                        Jami: {prod.serials.length}
                      </span>
                    </div>
                  </div>

                  {/* Footer Button: Inspect Serials */}
                  <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 font-mono">
                      {prod.serials.length} ta seriya
                    </span>
                    <button
                      onClick={() => setInspectingProduct(prod)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Hash className="w-3.5 h-3.5" />
                      <span>{t.viewSerials}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB B: SERVICES SECTION */}
      {activeTab === 'services' && (
        <div className="space-y-6">
          {/* Subtabs for Services */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <button
              onClick={() => setActiveServiceTab('waste')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 ${
                activeServiceTab === 'waste'
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>{t.serviceWasteTitle}</span>
            </button>
            <button
              onClick={() => setActiveServiceTab('cranes')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 ${
                activeServiceTab === 'cranes'
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Building className="w-4 h-4" />
              <span>{t.serviceCranesTitle}</span>
            </button>
            <button
              onClick={() => setActiveServiceTab('loaders')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 ${
                activeServiceTab === 'loaders'
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>{t.serviceLoadersTitle}</span>
            </button>
          </div>

          {/* Sub-tab 1: Waste Removal */}
          {activeServiceTab === 'waste' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">{t.serviceWasteTitle}</h3>
                  <p className="text-xs text-slate-400">
                    {language === 'uz'
                      ? 'Administrator tomonidan boshqariladigan samosval va yuk mashinalari hajmlari'
                      : 'Управление парком самосвалов и ценами вывоза мусора за рейс и кубометр'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {wasteTrucks.map((truck, idx) => (
                  <div
                    key={truck.id}
                    className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
                          <Truck className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">{truck.truckName}</h4>
                          <span className="text-xs font-mono text-slate-400">
                            Sig‘imi: {truck.capacityM3} m³
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800 text-xs">
                      <div>
                        <span className="text-slate-500">{t.pricePerTrip}</span>
                        <div className="font-mono font-bold text-emerald-400 text-sm">
                          {formatUZS(truck.pricePerTrip)}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-500">{t.pricePerM3}</span>
                        <div className="font-mono font-bold text-slate-200">
                          {formatUZS(truck.pricePerM3)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sub-tab 2: Cranes & Heavy Machinery */}
          {activeServiceTab === 'cranes' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-white">{t.serviceCranesTitle}</h3>
                <p className="text-xs text-slate-400">
                  {language === 'uz'
                    ? 'Soatlik stavkalar, minimal ish soatlari va ko‘p kunlik chegirmalar bilan avtokranlar parki'
                    : 'Парк автокранов с почасовыми ставками, минимальным заказом и скидками'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {cranes.map((crane) => (
                  <div
                    key={crane.id}
                    className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
                          <Building className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">{crane.name}</h4>
                          <span className="text-xs font-mono text-amber-400 font-semibold">
                            Yuk ko‘tarish: {crane.tonnage} Tonna
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-mono text-slate-400 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                        Min. {crane.minHours} soat
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-xs">
                      <div>
                        <span className="text-slate-500">{t.hourlyRate}</span>
                        <div className="font-mono font-bold text-emerald-400">
                          {formatUZS(crane.hourlyRate)}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-500">{t.dailyRate}</span>
                        <div className="font-mono font-bold text-white">
                          {formatUZS(crane.dailyRate)}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-500">3+ kun chegirma</span>
                        <div className="font-mono font-bold text-amber-400">
                          {crane.multiDayDiscountPercent}%
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sub-tab 3: Hand Labor / Loaders with Smart Calculator */}
          {activeServiceTab === 'loaders' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Cols: Smart Dynamic Calculator Tester */}
              <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Calculator className="w-5 h-5 text-amber-400" />
                  <h3 className="text-sm font-bold text-white">{t.loaderCalcTitle}</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Weight */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      {t.weightKg}
                    </label>
                    <input
                      type="number"
                      min="10"
                      step="10"
                      value={testWeight}
                      onChange={(e) => setTestWeight(Math.max(10, parseInt(e.target.value) || 10))}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-mono"
                    />
                  </div>

                  {/* Floor count */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      {t.floorCount}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={testFloors}
                      onChange={(e) => setTestFloors(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-mono"
                    />
                  </div>

                  {/* Elevator status */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      {t.elevatorStatus}
                    </label>
                    <select
                      value={testHasElevator ? 'yes' : 'no'}
                      onChange={(e) => setTestHasElevator(e.target.value === 'yes')}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                    >
                      <option value="yes">{t.elevatorYes}</option>
                      <option value="no">{t.elevatorNo}</option>
                    </select>
                  </div>

                  {/* Oversize Dimension */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      {t.dimensionType}
                    </label>
                    <select
                      value={testIsOversize ? 'oversize' : 'standard'}
                      onChange={(e) => setTestIsOversize(e.target.value === 'oversize')}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                    >
                      <option value="standard">{t.dimensionStandard}</option>
                      <option value="oversize">{t.dimensionOversize}</option>
                    </select>
                  </div>
                </div>

                {/* Calculation Output Card */}
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-4">
                  <div className="space-y-1">
                    <span className="text-xs text-slate-400">{t.calcResultPersons}:</span>
                    <div className="text-xl font-bold font-mono text-amber-400">
                      {testLoaderResult.recommendedPersons} {t.personsCount}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Taxminiy vaqt: ~{testLoaderResult.estimatedHours} soat
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <span className="text-xs text-slate-400">{t.calcResultPrice}:</span>
                    <div className="text-2xl font-bold font-mono text-emerald-400 tabular-nums">
                      {formatUZS(testLoaderResult.totalPriceUZS)}
                    </div>
                    {testLoaderResult.floorFee > 0 && (
                      <div className="text-[10px] text-amber-400">
                        Zina ustamasi: +{formatUZS(testLoaderResult.floorFee)}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Col: Admin Config Rules */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Sliders className="w-4 h-4 text-slate-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    Administrator stavkalari
                  </h4>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-slate-400">1 kishi soatlik stavkasi:</span>
                    <div className="font-mono font-bold text-white mt-0.5">
                      {formatUZS(loaderRules.baseHourlyPerPerson)}
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400">Zina uchun qavat ko‘tarish (50kg):</span>
                    <div className="font-mono font-bold text-white mt-0.5">
                      {formatUZS(loaderRules.ratePerFloorNoElevator)}
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400">Nogabarit koeffitsienti:</span>
                    <div className="font-mono font-bold text-amber-400 mt-0.5">
                      {loaderRules.oversizeMultiplier}x
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* INSPECT SERIALS MODAL (CRITICAL REQUIREMENT) */}
      {inspectingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-white">{t.serialsModalTitle}</h3>
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {inspectingProduct.name} ({inspectingProduct.sku})
                </div>
              </div>
              <button
                onClick={() => setInspectingProduct(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-2 flex-1">
              <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-400 flex items-center justify-between">
                <span>{t.serialsRequiredNote}</span>
                <span className="font-mono font-bold text-white">
                  Jami: {inspectingProduct.serials.length} dona
                </span>
              </div>

              <div className="space-y-2 pt-2">
                {inspectingProduct.serials.map((sn, idx) => (
                  <div
                    key={sn.id}
                    className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-slate-500 w-6">#{idx + 1}</span>
                      <span className="font-mono font-bold text-amber-400 text-sm">
                        {sn.serialNumber}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {sn.currentOrderId && (
                        <span className="text-[11px] text-blue-400 flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3" />
                          {sn.currentOrderId}
                        </span>
                      )}

                      <select
                        value={sn.status}
                        onChange={(e) =>
                          handleToggleSerialStatus(
                            sn.id,
                            e.target.value as SerialStatus
                          )
                        }
                        className={`text-xs px-2.5 py-1 rounded font-medium border ${
                          sn.status === 'available'
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                            : sn.status === 'rented'
                            ? 'bg-blue-950 text-blue-300 border-blue-800'
                            : sn.status === 'maintenance'
                            ? 'bg-amber-950 text-amber-300 border-amber-800'
                            : 'bg-rose-950 text-rose-300 border-rose-800'
                        }`}
                      >
                        <option value="available">{t.statusAvailable}</option>
                        <option value="rented">{t.statusRented}</option>
                        <option value="maintenance">{t.statusMaintenance}</option>
                        <option value="decommissioned">{t.statusDecommissioned}</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setInspectingProduct(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg"
              >
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD NEW PRODUCT MODAL */}
      {isAddProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">{t.addProductBtn}</h3>
              </div>
              <button
                onClick={() => setIsAddProductModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddProductSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {t.productName} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Masalan: Bosch GBH 2-28 D Perforator"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {t.productSku} (Artikul) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value)}
                    placeholder="BSH-GBH228"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">{t.category}</label>
                  <input
                    type="text"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">{t.group}</label>
                  <input
                    type="text"
                    value={formGroup}
                    onChange={(e) => setFormGroup(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">{t.dailyPrice}</label>
                  <input
                    type="number"
                    value={formDailyRate}
                    onChange={(e) => setFormDailyRate(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">{t.depositFee}</label>
                  <input
                    type="number"
                    value={formDeposit}
                    onChange={(e) => setFormDeposit(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {language === 'uz' ? 'Dona (Soni)' : 'Количество'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formInitialQty}
                    onChange={(e) => setFormInitialQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  {t.addSerialsLabel} ({formInitialQty} dona avtomatik yoki har qatorga bittadan)
                </label>
                <textarea
                  rows={3}
                  value={formCustomSerials}
                  onChange={(e) => setFormCustomSerials(e.target.value)}
                  placeholder={`SN-${formSku || 'SKU'}-01\nSN-${formSku || 'SKU'}-02\n...`}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddProductModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 text-slate-950 font-bold rounded-lg"
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
