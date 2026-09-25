import React, { useState } from 'react';
import {
  Truck,
  Plus,
  Trash2,
  Edit2,
  HardHat,
  Users,
  Settings,
  Save,
  CheckCircle,
  X,
  Layers,
  ArrowUpDown,
  Building
} from 'lucide-react';
import {
  CraneConfig,
  Language,
  LoaderPricingRules,
  WasteTruckConfig
} from '../types';
import { formatUZS } from '../utils/pricing';

interface Props {
  language: Language;
  wasteTrucks: WasteTruckConfig[];
  cranes: CraneConfig[];
  loaderRules: LoaderPricingRules;
  onSaveWasteTrucks: (trucks: WasteTruckConfig[]) => void;
  onSaveCranes: (cranes: CraneConfig[]) => void;
  onSaveLoaderRules: (rules: LoaderPricingRules) => void;
}

export const ServicesManagementView: React.FC<Props> = ({
  language,
  wasteTrucks,
  cranes,
  loaderRules,
  onSaveWasteTrucks,
  onSaveCranes,
  onSaveLoaderRules
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'waste' | 'crane' | 'loaders'>('waste');

  // Waste Truck Creation Modal
  const [isAddTruckModalOpen, setIsAddTruckModalOpen] = useState(false);
  const [truckName, setTruckName] = useState('');
  const [capacityM3, setCapacityM3] = useState<string>('10');
  const [pricePerTrip, setPricePerTrip] = useState<string>('600000');
  const [pricePerM3, setPricePerM3] = useState<string>('60000');
  const [loadingServicePrice, setLoadingServicePrice] = useState<string>('150000');

  // Crane Creation Modal
  const [isAddCraneModalOpen, setIsAddCraneModalOpen] = useState(false);
  const [craneName, setCraneName] = useState('');
  const [tonnage, setTonnage] = useState<number>(16);
  const [hourlyRate, setHourlyRate] = useState<number>(350000);
  const [dailyRate, setDailyRate] = useState<number>(2500000);
  const [craneDiscountPercent, setCraneDiscountPercent] = useState<number>(10);
  const [craneDiscountHourly, setCraneDiscountHourly] = useState<number>(300000);
  const [craneDiscountDaily, setCraneDiscountDaily] = useState<number>(2200000);
  const [minHours, setMinHours] = useState<number>(4);
  const [multiDayDiscountPercent, setMultiDayDiscountPercent] = useState<number>(15);

  // Edit Modals
  const [editingTruck, setEditingTruck] = useState<WasteTruckConfig | null>(null);
  const [editingCrane, setEditingCrane] = useState<CraneConfig | null>(null);

  // Editable Loader rules
  const [editableLoaderRules, setEditableLoaderRules] = useState<LoaderPricingRules>({ ...loaderRules });
  const [loaderSavedSuccess, setLoaderSavedSuccess] = useState(false);

  // Save Edited Truck
  const handleUpdateTruck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTruck || !editingTruck.truckName.trim()) return;

    const updated = wasteTrucks.map((t) => (t.id === editingTruck.id ? editingTruck : t));
    onSaveWasteTrucks(updated);
    setEditingTruck(null);
  };

  // Save Edited Crane
  const handleUpdateCrane = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCrane || !editingCrane.name.trim()) return;

    const updated = cranes.map((c) => (c.id === editingCrane.id ? editingCrane : c));
    onSaveCranes(updated);
    setEditingCrane(null);
  };

  // Add Waste Truck
  const handleCreateTruck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!truckName.trim()) return;

    const newTruck: WasteTruckConfig = {
      id: `truck-${Date.now()}`,
      truckName: truckName.trim(),
      capacityM3: parseFloat(capacityM3) || 0,
      pricePerTrip: parseFloat(pricePerTrip) || 0,
      pricePerM3: parseFloat(pricePerM3) || 0,
      loadingServicePrice: parseFloat(loadingServicePrice) || 0
    };

    onSaveWasteTrucks([...wasteTrucks, newTruck]);
    setIsAddTruckModalOpen(false);

    // Reset
    setTruckName('');
    setCapacityM3('10');
    setPricePerTrip('600000');
    setPricePerM3('60000');
    setLoadingServicePrice('150000');
  };

  const handleDeleteTruck = (id: string) => {
    if (confirm("Ushbu chiqindi mashinasini o'chirmoqchimisiz?")) {
      onSaveWasteTrucks(wasteTrucks.filter((t) => t.id !== id));
    }
  };

  // Add Crane
  const handleCreateCrane = (e: React.FormEvent) => {
    e.preventDefault();
    if (!craneName.trim()) return;

    const newCrane: CraneConfig = {
      id: `crane-${Date.now()}`,
      name: craneName.trim(),
      tonnage,
      hourlyRate,
      dailyRate,
      minHours,
      multiDayDiscountPercent
    };

    onSaveCranes([...cranes, newCrane]);
    setIsAddCraneModalOpen(false);
    setCraneName('');
  };

  const handleDeleteCrane = (id: string) => {
    if (confirm("Ushbu kranni o'chirmoqchimisiz?")) {
      onSaveCranes(cranes.filter((c) => c.id !== id));
    }
  };

  // Save Loader rules
  const handleSaveLoaders = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveLoaderRules(editableLoaderRules);
    setLoaderSavedSuccess(true);
    setTimeout(() => setLoaderSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-600" />
            <span>Xizmatlar Boshqaruvi</span>
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Chiqindi olib ketish mashinalari, kranlar va yuk tashuvchilar (gruschik) narxlarini sozlash
          </p>
        </div>

        {/* Sub-tabs */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
          <button
            onClick={() => setActiveSubTab('waste')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              activeSubTab === 'waste'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Chiqindi (Musir)</span>
          </button>
          <button
            onClick={() => setActiveSubTab('crane')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              activeSubTab === 'crane'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <HardHat className="w-3.5 h-3.5" />
            <span>Kran va Texnika</span>
          </button>
          <button
            onClick={() => setActiveSubTab('loaders')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              activeSubTab === 'loaders'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Yuk tashuvchi (Gruschik)</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: CHIQINDI OLIB KETISH (WASTE TRUCKS) */}
      {activeSubTab === 'waste' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Mavjud Chiqindi Mashinalari ({wasteTrucks.length} ta)
            </h2>

            <button
              onClick={() => setIsAddTruckModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm shadow-blue-500/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Yangi mashina qo'shish</span>
            </button>
          </div>

          {wasteTrucks.length === 0 ? (
            <div className="p-8 text-center bg-white border border-slate-200 rounded-xl">
              <Truck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <div className="text-sm font-bold text-slate-900">Mashinalar mavjud emas</div>
              <div className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Siz o'zingiz mashinalarni qo'shishingiz va narxlarini belgilashingiz mumkin.
              </div>
              <button
                onClick={() => setIsAddTruckModalOpen(true)}
                className="mt-3 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg"
              >
                + Birinchi mashinani qo'shish
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {wasteTrucks.map((truck) => (
                <div
                  key={truck.id}
                  className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{truck.truckName}</h3>
                      <div className="text-xs text-blue-700 font-mono font-semibold">
                        Sig'imi: {truck.capacityM3} m³
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingTruck({ ...truck })}
                        className="p-1 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                        title="Tarif va narxlarni o'zgartirish"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTruck(truck.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        title="O'chirish"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-lg text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">1 reys narxi:</span>
                      <span className="font-mono font-bold text-slate-900">
                        {formatUZS(truck.pricePerTrip)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">1 m³ narxi:</span>
                      <span className="font-mono font-bold text-slate-900">
                        {formatUZS(truck.pricePerM3)}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200/60 pt-1">
                      <span className="text-slate-500">Yuklash xizmati (Gruschiklar):</span>
                      <span className="font-mono font-bold text-emerald-700">
                        {formatUZS(truck.loadingServicePrice || 150000)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: KRANLAR VA OG'IR TEXNIKA (CRANES) */}
      {activeSubTab === 'crane' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Mavjud Kranlar ({cranes.length} ta)
            </h2>

            <button
              onClick={() => setIsAddCraneModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm shadow-blue-500/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Yangi kran qo'shish</span>
            </button>
          </div>

          {cranes.length === 0 ? (
            <div className="p-8 text-center bg-white border border-slate-200 rounded-xl">
              <HardHat className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <div className="text-sm font-bold text-slate-900">Kranlar mavjud emas</div>
              <div className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Kranning nomi, tonnaji, soatlik va kunlik narxlarini hamda chegirmalarini o'zingiz kiritishingiz mumkin.
              </div>
              <button
                onClick={() => setIsAddCraneModalOpen(true)}
                className="mt-3 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg"
              >
                + Birinchi kranni qo'shish
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cranes.map((crane) => (
                <div
                  key={crane.id}
                  className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{crane.name}</h3>
                      <div className="text-xs text-blue-700 font-mono font-semibold">
                        Tonnaj: {crane.tonnage} Tonna
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingCrane({ ...crane })}
                        className="p-1 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                        title="Tarif va narxlarni o'zgartirish"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCrane(crane.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        title="O'chirish"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-lg text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-500">1 soatlik stavka:</span>
                      <span className="font-mono font-bold text-slate-900">
                        {formatUZS(crane.hourlyRate)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">1 kunlik stavka:</span>
                      <span className="font-mono font-bold text-slate-900">
                        {formatUZS(crane.dailyRate)}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-600">
                      <span>Minimal buyurtma:</span>
                      <span className="font-mono">{crane.minHours} soat</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-emerald-700 font-semibold">
                      <span>Ko'p kunlik chegirma:</span>
                      <span>{crane.multiDayDiscountPercent}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 3: YUK TASHUVCHILAR / GRUSCHIK TARIFLARI */}
      {activeSubTab === 'loaders' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs max-w-2xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span>Yuk tashuvchilar (Gruschik) Tarik Kalkulyatori</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Kg, qavat, lift va nogabarit uchun belgilangan narxlar buyurtma hisob-kitobida avtomatik qo'llanadi.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveLoaders} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  1 soatlik ish stavkasi (1 odam uchun, so'm)
                </label>
                <input
                  type="number"
                  value={editableLoaderRules.baseHourlyPerPerson}
                  onChange={(e) =>
                    setEditableLoaderRules({
                      ...editableLoaderRules,
                      baseHourlyPerPerson: parseFloat(e.target.value) || 0
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  1 kg og'irlik stavkasi (so'm / kg)
                </label>
                <input
                  type="number"
                  value={editableLoaderRules.pricePerKg}
                  onChange={(e) =>
                    setEditableLoaderRules({
                      ...editableLoaderRules,
                      pricePerKg: parseFloat(e.target.value) || 0
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Zina bo'lsa har bir qavat uchun to'lov (so'm)
                </label>
                <input
                  type="number"
                  value={editableLoaderRules.ratePerFloorNoElevator}
                  onChange={(e) =>
                    setEditableLoaderRules({
                      ...editableLoaderRules,
                      ratePerFloorNoElevator: parseFloat(e.target.value) || 0
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Lift mavjud bo'lsa qo'shimcha to'lov (so'm)
                </label>
                <input
                  type="number"
                  value={editableLoaderRules.elevatorFee}
                  onChange={(e) =>
                    setEditableLoaderRules({
                      ...editableLoaderRules,
                      elevatorFee: parseFloat(e.target.value) || 0
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">
                  Katta o'lchamli / Nogabarit koeffitsienti
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={editableLoaderRules.oversizeMultiplier}
                  onChange={(e) =>
                    setEditableLoaderRules({
                      ...editableLoaderRules,
                      oversizeMultiplier: parseFloat(e.target.value) || 1
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Masalan: 1.3 degani umumiy yuklash xizmatiga 30% qo'shiladi.
                </span>
              </div>
            </div>

            {loaderSavedSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>Gruschik tariflari muvaffaqiyatli saqlandi!</span>
              </div>
            )}

            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm"
              >
                <Save className="w-4 h-4" />
                <span>Tariflarni saqlash</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CREATE WASTE TRUCK MODAL */}
      {isAddTruckModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Yangi Chiqindi Mashinasi Qo'shish</h3>
              </div>
              <button onClick={() => setIsAddTruckModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTruck} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mashina nomi *</label>
                  <input
                    type="text"
                    required
                    value={truckName}
                    onChange={(e) => setTruckName(e.target.value)}
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
                    value={capacityM3}
                    onChange={(e) => setCapacityM3(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">1 reys narxi (so'm)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={pricePerTrip}
                    onChange={(e) => setPricePerTrip(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Har 1 m³ narxi (so'm)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={pricePerM3}
                    onChange={(e) => setPricePerM3(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Yuklash xizmati / Gruschiklar narxi (mashinaga ortib berish, so'm)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={loadingServicePrice}
                  onChange={(e) => setLoadingServicePrice(e.target.value)}
                  placeholder="150000"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddTruckModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold"
                >
                  Mashinani saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE CRANE MODAL */}
      {isAddCraneModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <HardHat className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Yangi Kran Qo'shish</h3>
              </div>
              <button onClick={() => setIsAddCraneModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCrane} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kran nomi *</label>
                  <input
                    type="text"
                    required
                    value={craneName}
                    onChange={(e) => setCraneName(e.target.value)}
                    placeholder="Masalan: XCMG 25T Avtokran"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tonnaj (T) *</label>
                  <input
                    type="number"
                    required
                    value={tonnage}
                    onChange={(e) => setTonnage(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">1 soatlik stavka (so'm)</label>
                  <input
                    type="number"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">1 kunlik stavka (so'm)</label>
                  <input
                    type="number"
                    value={dailyRate}
                    onChange={(e) => setDailyRate(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Minimal ish soati</label>
                  <input
                    type="number"
                    value={minHours}
                    onChange={(e) => setMinHours(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ko'p kunlik chegirma (%)</label>
                  <input
                    type="number"
                    value={multiDayDiscountPercent}
                    onChange={(e) => setMultiDayDiscountPercent(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddCraneModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold"
                >
                  Kranni saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT WASTE TRUCK MODAL */}
      {editingTruck && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Mashina Tarifini O'zgartirish</h3>
              </div>
              <button onClick={() => setEditingTruck(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateTruck} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mashina nomi *</label>
                  <input
                    type="text"
                    required
                    value={editingTruck.truckName}
                    onChange={(e) => setEditingTruck({ ...editingTruck, truckName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Sig'imi (m³) *</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={editingTruck.capacityM3}
                    onChange={(e) => setEditingTruck({ ...editingTruck, capacityM3: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">1 reys narxi (so'm) *</label>
                  <input
                    type="number"
                    required
                    value={editingTruck.pricePerTrip}
                    onChange={(e) => setEditingTruck({ ...editingTruck, pricePerTrip: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold text-blue-700"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Har 1 m³ narxi (so'm) *</label>
                  <input
                    type="number"
                    required
                    value={editingTruck.pricePerM3}
                    onChange={(e) => setEditingTruck({ ...editingTruck, pricePerM3: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold text-blue-700"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingTruck(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold cursor-pointer shadow-xs"
                >
                  Tarifni saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CRANE MODAL */}
      {editingCrane && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Kran Tarifini O'zgartirish</h3>
              </div>
              <button onClick={() => setEditingCrane(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateCrane} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kran nomi *</label>
                  <input
                    type="text"
                    required
                    value={editingCrane.name}
                    onChange={(e) => setEditingCrane({ ...editingCrane, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tonnaj (T) *</label>
                  <input
                    type="number"
                    required
                    value={editingCrane.tonnage}
                    onChange={(e) => setEditingCrane({ ...editingCrane, tonnage: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">1 soatlik stavka (so'm) *</label>
                  <input
                    type="number"
                    required
                    value={editingCrane.hourlyRate}
                    onChange={(e) => setEditingCrane({ ...editingCrane, hourlyRate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold text-blue-700"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">1 kunlik stavka (so'm) *</label>
                  <input
                    type="number"
                    required
                    value={editingCrane.dailyRate}
                    onChange={(e) => setEditingCrane({ ...editingCrane, dailyRate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold text-blue-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Minimal ish soati</label>
                  <input
                    type="number"
                    value={editingCrane.minHours}
                    onChange={(e) => setEditingCrane({ ...editingCrane, minHours: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ko'p kunlik chegirma (%)</label>
                  <input
                    type="number"
                    value={editingCrane.multiDayDiscountPercent}
                    onChange={(e) => setEditingCrane({ ...editingCrane, multiDayDiscountPercent: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingCrane(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold cursor-pointer shadow-xs"
                >
                  Tarifni saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
