import React, { useState, useMemo } from 'react';
import {
  Calculator,
  Truck,
  Layers,
  Users,
  Copy,
  Check,
  ArrowRight,
  Sparkles,
  Info,
  Calendar,
  Building,
  CreditCard,
  ShieldCheck,
  AlertCircle,
  Clock,
  Plus,
  Minus,
  RefreshCw,
  Barcode,
  Package,
  Tag,
  ChevronRight
} from 'lucide-react';
import {
  Product,
  Language,
  WasteTruckConfig,
  CraneConfig,
  LoaderPricingRules,
  Order
} from '../types';
import { formatUZS } from '../utils/pricing';

interface Props {
  language: Language;
  products: Product[];
  categories?: string[];
  wasteTruckConfigs?: WasteTruckConfig[];
  craneConfigs?: CraneConfig[];
  loaderRules?: LoaderPricingRules;
  onCreateOrderFromCalculator?: (data: any) => void;
}

type CalculatorTab = 'tools' | 'waste' | 'crane' | 'loaders';

export const RentalCalculatorView: React.FC<Props> = ({
  language,
  products,
  categories = [],
  wasteTruckConfigs = [],
  craneConfigs = [],
  loaderRules,
  onCreateOrderFromCalculator
}) => {
  const [activeTab, setActiveTab] = useState<CalculatorTab>('tools');
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedNotification(label);
    setTimeout(() => {
      setCopiedNotification(null);
    }, 2500);
  };

  // ==========================================
  // 1. TOOL / EQUIPMENT RENTAL CALCULATOR STATE
  // ==========================================
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || '');
  const [toolSearch, setToolSearch] = useState('');
  const [durationDays, setDurationDays] = useState<number>(3);
  const [toolQuantity, setToolQuantity] = useState<number>(1);
  const [hasDepositWaiver, setHasDepositWaiver] = useState<boolean>(false);
  const [includeDelivery, setIncludeDelivery] = useState<boolean>(false);
  const [deliveryFeeUZS, setDeliveryFeeUZS] = useState<number>(50000);

  // Custom manual rates (derive from "Narxlar ro‘yxati" by default, with manual input capability)
  const [customDailyRate, setCustomDailyRate] = useState<number | null>(null);
  const [customDeposit, setCustomDeposit] = useState<number | null>(null);
  const [customDiscountPercent, setCustomDiscountPercent] = useState<number | null>(null);

  // Do not render products until a search query is typed
  const filteredProducts = useMemo(() => {
    if (!toolSearch.trim()) {
      return [];
    }
    const query = toolSearch.toLowerCase().trim();
    return products.filter((p) => {
      const matchesName = p.name.toLowerCase().includes(query);
      const matchesSku = p.sku.toLowerCase().includes(query);
      const matchesCat = p.category ? p.category.toLowerCase().includes(query) : false;
      const matchesBarcode = p.barcode ? p.barcode.toLowerCase().includes(query) : false;
      return matchesName || matchesSku || matchesCat || matchesBarcode;
    });
  }, [products, toolSearch]);

  const selectedProduct = useMemo(() => {
    const found = products.find((p) => p.id === selectedProductId);
    if (found) return found;
    return products[0];
  }, [products, selectedProductId]);

  // Tool calculation logic with manual input override
  const toolCalc = useMemo(() => {
    if (!selectedProduct) {
      return {
        dailyRate: 0,
        subtotal: 0,
        discountPercent: 0,
        discountAmount: 0,
        finalRentalPrice: 0,
        depositPerItem: 0,
        totalDeposit: 0,
        deliveryFee: 0,
        grandTotal: 0
      };
    }
    const activeDailyRate = customDailyRate !== null ? customDailyRate : (selectedProduct.dailyRate || 100000);
    const baseSubtotal = activeDailyRate * durationDays * toolQuantity;

    // Volume / Long duration discount or product discount
    let autoDiscountPercent = selectedProduct.discountPercent || 0;
    if (durationDays >= 30) {
      autoDiscountPercent = Math.max(autoDiscountPercent, 15);
    } else if (durationDays >= 14) {
      autoDiscountPercent = Math.max(autoDiscountPercent, 10);
    } else if (durationDays >= 7) {
      autoDiscountPercent = Math.max(autoDiscountPercent, 5);
    }
    const discountPercent = customDiscountPercent !== null ? customDiscountPercent : autoDiscountPercent;

    const discountAmount = Math.round((baseSubtotal * discountPercent) / 100);
    const finalRentalPrice = Math.max(0, baseSubtotal - discountAmount);
    const depositPerItem = customDeposit !== null ? customDeposit : (selectedProduct.depositAmount || activeDailyRate * 3);
    const totalDeposit = hasDepositWaiver ? 0 : depositPerItem * toolQuantity;
    const delivery = includeDelivery ? deliveryFeeUZS : 0;
    const grandTotal = finalRentalPrice + totalDeposit + delivery;

    return {
      dailyRate: activeDailyRate,
      subtotal: baseSubtotal,
      discountPercent,
      discountAmount,
      finalRentalPrice,
      depositPerItem,
      totalDeposit,
      deliveryFee: delivery,
      grandTotal
    };
  }, [selectedProduct, customDailyRate, customDeposit, customDiscountPercent, durationDays, toolQuantity, hasDepositWaiver, includeDelivery, deliveryFeeUZS]);

  // ==========================================
  // 2. DYNAMIC GARBAGE / WASTE TRUCK SERVICE STATE
  // ==========================================
  // Dynamically include configured trucks and catalog items under waste/samosval category
  const wasteTrucksToUse = useMemo(() => {
    const catalogMachinery: WasteTruckConfig[] = products
      .filter((p) => p.category.toLowerCase().includes('samosval') || p.category.toLowerCase().includes('chiqindi'))
      .map((p) => ({
        id: p.id,
        truckName: p.name,
        capacityM3: 10,
        pricePerTrip: p.dailyRate || 650000,
        pricePerM3: 85000,
        loadingServicePrice: 150000
      }));

    const base = wasteTruckConfigs && wasteTruckConfigs.length > 0 ? wasteTruckConfigs : [];
    const merged = [...base, ...catalogMachinery];
    if (merged.length > 0) return merged;

    return [
      { id: 'wt-gazel', truckName: 'Gazel (Kichik hajm)', capacityM3: 3, pricePerTrip: 350000, pricePerM3: 120000, loadingServicePrice: 100000 },
      { id: 'wt-zil', truckName: 'ZIL Samosval (O‘rtacha)', capacityM3: 6, pricePerTrip: 550000, pricePerM3: 95000, loadingServicePrice: 150000 },
      { id: 'wt-kamaz', truckName: 'KamAZ Samosval (Katta)', capacityM3: 10, pricePerTrip: 850000, pricePerM3: 85000, loadingServicePrice: 200000 }
    ];
  }, [wasteTruckConfigs, products]);

  const [selectedTruckId, setSelectedTruckId] = useState<string>(wasteTrucksToUse[0]?.id || 'wt-zil');
  const [wasteTripsCount, setWasteTripsCount] = useState<number>(1);
  const [includeWasteLoading, setIncludeWasteLoading] = useState<boolean>(true);
  const [wasteBaggedType, setWasteBaggedType] = useState<'bagged' | 'loose'>('bagged');
  const [wasteFloor, setWasteFloor] = useState<number>(1);
  const [wasteHasElevator, setWasteHasElevator] = useState<boolean>(true);
  const [wasteDistanceToTruck, setWasteDistanceToTruck] = useState<number>(15); // meters

  // Custom rates for waste
  const [customTripPrice, setCustomTripPrice] = useState<number | null>(null);
  const [customWasteLoadingPrice, setCustomWasteLoadingPrice] = useState<number | null>(null);

  const selectedWasteTruck = useMemo(() => {
    return wasteTrucksToUse.find((t) => t.id === selectedTruckId) || wasteTrucksToUse[0];
  }, [wasteTrucksToUse, selectedTruckId]);

  const wasteCalc = useMemo(() => {
    if (!selectedWasteTruck) return { transportCost: 0, loadingCost: 0, grandTotal: 0 };

    const activeTripPrice = customTripPrice !== null ? customTripPrice : (selectedWasteTruck.pricePerTrip || 550000);
    const transportCost = activeTripPrice * wasteTripsCount;
    let loadingCost = 0;

    if (includeWasteLoading) {
      // Base loading per truck trip based on custom price or default loading service price
      const baseLoadingPerTrip = customWasteLoadingPrice !== null
        ? customWasteLoadingPrice
        : (selectedWasteTruck.loadingServicePrice || (selectedWasteTruck.capacityM3 || 6) * 45000);

      // Floor coefficient: if 1st floor = 0 extra. If higher:
      let floorSurcharge = 0;
      if (wasteFloor > 1) {
        if (wasteHasElevator) {
          floorSurcharge = 30000;
        } else {
          floorSurcharge = (wasteFloor - 1) * 35000;
        }
      }

      // Bagged vs Loose multiplier
      const bagMultiplier = wasteBaggedType === 'loose' ? 1.45 : 1.0;

      // Distance surcharge if > 20 meters
      const distanceSurcharge = wasteDistanceToTruck > 20 ? (wasteDistanceToTruck - 20) * 1500 : 0;

      loadingCost = Math.round(
        (baseLoadingPerTrip + floorSurcharge + distanceSurcharge) * bagMultiplier * wasteTripsCount
      );
    }

    return {
      transportCost,
      loadingCost,
      grandTotal: transportCost + loadingCost
    };
  }, [selectedWasteTruck, customTripPrice, customWasteLoadingPrice, wasteTripsCount, includeWasteLoading, wasteBaggedType, wasteFloor, wasteHasElevator, wasteDistanceToTruck]);

  // ==========================================
  // 3. DYNAMIC AUTO-CRANE SERVICE STATE
  // ==========================================
  // Dynamically include configured cranes and catalog items under crane/machinery category
  const cranesToUse = useMemo(() => {
    const catalogCranes: CraneConfig[] = products
      .filter((p) => p.category.toLowerCase().includes('kran') || p.category.toLowerCase().includes('maxsus texnika'))
      .map((p) => ({
        id: p.id,
        name: p.name,
        tonnage: 25,
        hourlyRate: Math.round((p.dailyRate || 2400000) / 8),
        dailyRate: p.dailyRate || 2400000,
        minHours: 4,
        multiDayDiscountPercent: 12
      }));

    const base = craneConfigs && craneConfigs.length > 0 ? craneConfigs : [];
    const merged = [...base, ...catalogCranes];
    if (merged.length > 0) return merged;

    return [
      { id: 'cr-16', name: 'Avtokran 16 t (Kamaz/Ural)', tonnage: 16, hourlyRate: 350000, dailyRate: 2400000, minHours: 4, multiDayDiscountPercent: 10 },
      { id: 'cr-25', name: 'Avtokran 25 t (XCMG / Zoomlion)', tonnage: 25, hourlyRate: 450000, dailyRate: 3200000, minHours: 4, multiDayDiscountPercent: 12 }
    ];
  }, [craneConfigs, products]);

  const [selectedCraneId, setSelectedCraneId] = useState<string>(cranesToUse[0]?.id || '');
  const [craneBillingType, setCraneBillingType] = useState<'hourly' | 'daily'>('hourly');
  const [craneQuantity, setCraneQuantity] = useState<number>(4); // hours or days
  const [craneHasBoomExtension, setCraneHasBoomExtension] = useState<boolean>(false);
  const [craneNightShift, setCraneNightShift] = useState<boolean>(false);

  // Custom rates for cranes
  const [customCraneHourly, setCustomCraneHourly] = useState<number | null>(null);
  const [customCraneDaily, setCustomCraneDaily] = useState<number | null>(null);
  const [customCraneDiscount, setCustomCraneDiscount] = useState<number | null>(null);

  const selectedCrane = useMemo(() => {
    return cranesToUse.find((c) => c.id === selectedCraneId) || cranesToUse[0];
  }, [cranesToUse, selectedCraneId]);

  const craneCalc = useMemo(() => {
    if (!selectedCrane) return { baseRate: 0, subtotal: 0, discount: 0, surcharges: 0, grandTotal: 0 };

    let baseRate = 0;
    let subtotal = 0;
    let discount = 0;

    const activeHourly = customCraneHourly !== null ? customCraneHourly : (selectedCrane.hourlyRate || 400000);
    const activeDaily = customCraneDaily !== null ? customCraneDaily : (selectedCrane.dailyRate || 2800000);
    const activeDiscountRate = customCraneDiscount !== null ? customCraneDiscount : (selectedCrane.multiDayDiscountPercent || 10);

    if (craneBillingType === 'hourly') {
      baseRate = activeHourly;
      subtotal = baseRate * craneQuantity;
      // Discount for 8+ hours
      if (craneQuantity >= 8) {
        discount = Math.round(subtotal * (activeDiscountRate / 100));
      }
    } else {
      baseRate = activeDaily;
      subtotal = baseRate * craneQuantity;
      if (craneQuantity >= 3) {
        discount = Math.round(subtotal * (activeDiscountRate / 100));
      }
    }

    let surcharges = 0;
    if (craneHasBoomExtension) {
      surcharges += 150000;
    }
    if (craneNightShift) {
      surcharges += Math.round(subtotal * 0.2); // 20% night surcharge
    }

    const grandTotal = subtotal - discount + surcharges;

    return {
      baseRate,
      subtotal,
      discount,
      surcharges,
      grandTotal
    };
  }, [selectedCrane, customCraneHourly, customCraneDaily, customCraneDiscount, craneBillingType, craneQuantity, craneHasBoomExtension, craneNightShift]);

  // ==========================================
  // 4. LOADERS / PORTERS (GRUSCHIK) STATE
  // ==========================================
  const [loaderMode, setLoaderMode] = useState<'weight' | 'bags' | 'oversized'>('bags');
  const [loaderBagsCount, setLoaderBagsCount] = useState<number>(30); // 50kg bags
  const [loaderWeightKg, setLoaderWeightKg] = useState<number>(1500);
  const [loaderOversizedItemName, setLoaderOversizedItemName] = useState<string>('Seyf / Og‘ir uskunalar');
  const [loaderOversizedCount, setLoaderOversizedCount] = useState<number>(1);
  const [loaderFloor, setLoaderFloor] = useState<number>(3);
  const [loaderHasElevator, setLoaderHasElevator] = useState<boolean>(false);
  const [loaderDistanceMeters, setLoaderDistanceMeters] = useState<number>(20);
  const [loaderPersonsCount, setLoaderPersonsCount] = useState<number>(2);

  const loaderCalc = useMemo(() => {
    let effectiveWeightKg = 0;
    let baseHandlingFee = 0;

    if (loaderMode === 'bags') {
      effectiveWeightKg = loaderBagsCount * 50;
      // 5,000 UZS per bag base unload
      baseHandlingFee = loaderBagsCount * 6000;
    } else if (loaderMode === 'weight') {
      effectiveWeightKg = loaderWeightKg;
      // 150 UZS per kg base
      baseHandlingFee = Math.round(loaderWeightKg * 140);
    } else {
      // Oversized (>50kg items)
      effectiveWeightKg = loaderOversizedCount * 120;
      baseHandlingFee = loaderOversizedCount * 150000;
    }

    // Floor carrying fee
    let floorFee = 0;
    if (loaderFloor > 1) {
      if (loaderHasElevator) {
        // Flat fee with elevator
        floorFee = Math.round(baseHandlingFee * 0.25);
      } else {
        // Per floor multiplier without elevator (25% increase per floor above 1st)
        floorFee = Math.round(baseHandlingFee * 0.22 * (loaderFloor - 1));
      }
    }

    // Distance carry surcharge (> 15m)
    let distanceFee = 0;
    if (loaderDistanceMeters > 15) {
      distanceFee = Math.round(((loaderDistanceMeters - 15) / 10) * baseHandlingFee * 0.1);
    }

    const totalBeforePorters = baseHandlingFee + floorFee + distanceFee;
    // Minimum charge: 150,000 UZS
    const grandTotal = Math.max(150000, totalBeforePorters);

    // Auto suggested loaders count
    const suggestedLoaders =
      effectiveWeightKg > 3000 || loaderFloor > 5
        ? 4
        : effectiveWeightKg > 1500 || loaderFloor > 3
        ? 3
        : 2;

    return {
      effectiveWeightKg,
      baseHandlingFee,
      floorFee,
      distanceFee,
      suggestedLoaders,
      grandTotal
    };
  }, [loaderMode, loaderBagsCount, loaderWeightKg, loaderOversizedCount, loaderFloor, loaderHasElevator, loaderDistanceMeters]);

  // Formatted summaries for iBox copying
  const toolSummaryText = useMemo(() => {
    if (!selectedProduct) return '';
    return `[SHOHRENT - IJARA HISOBI]
Asbob: ${selectedProduct.name} (${selectedProduct.sku})
Kunlik stavka: ${formatUZS(toolCalc.dailyRate)}
Ijara muddati: ${durationDays} kun x ${toolQuantity} ta
Chegirma: ${toolCalc.discountPercent}% (-${formatUZS(toolCalc.discountAmount)})
Jami ijara to'lovi: ${formatUZS(toolCalc.finalRentalPrice)}
Garov depoziti: ${formatUZS(toolCalc.totalDeposit)} ${hasDepositWaiver ? '(Garovsiz / Doimiy mijoz)' : ''}
Yetkazib berish: ${formatUZS(toolCalc.deliveryFee)}
--------------------------------
JAMI TO'LOV: ${formatUZS(toolCalc.grandTotal)}
(iBox tizimida to'lov uchun tayyor)`;
  }, [selectedProduct, durationDays, toolQuantity, hasDepositWaiver, toolCalc]);

  const wasteSummaryText = useMemo(() => {
    return `[SHOHRENT - CHIQINDI TASHISH HISOBI]
Transport: ${selectedWasteTruck?.truckName} (${selectedWasteTruck?.capacityM3} m³)
Reyslar soni: ${wasteTripsCount} ta
Transport summasi: ${formatUZS(wasteCalc.transportCost)}
Yuklash xizmati: ${includeWasteLoading ? 'Ha (Kiritilgan)' : 'Yo‘q (Faqat mashina)'}
${includeWasteLoading ? `Holat: ${wasteBaggedType === 'bagged' ? 'Qoplangan' : 'Qoplanmagan/sochilma'}
Qavat: ${wasteFloor}-qavat (${wasteHasElevator ? 'Lift mavjud' : 'Lift yo‘q/zina orqali'})
Yuklash to'lovi: ${formatUZS(wasteCalc.loadingCost)}` : ''}
--------------------------------
JAMI TO'LOV: ${formatUZS(wasteCalc.grandTotal)}
(iBox tizimida to'lov uchun tayyor)`;
  }, [selectedWasteTruck, wasteTripsCount, includeWasteLoading, wasteBaggedType, wasteFloor, wasteHasElevator, wasteCalc]);

  const craneSummaryText = useMemo(() => {
    return `[SHOHRENT - AVTOKRAN HISOBI]
Kran: ${selectedCrane?.name} (${selectedCrane?.tonnage} tonna)
Tarif turi: ${craneBillingType === 'hourly' ? 'Soatbay' : 'Kunbay (smena)'}
Davomiyligi: ${craneQuantity} ${craneBillingType === 'hourly' ? 'soat' : 'kun'}
Stavka: ${formatUZS(craneCalc.baseRate)}
Chegirma: -${formatUZS(craneCalc.discount)}
Qo'shimchalar (tunggi/strela): +${formatUZS(craneCalc.surcharges)}
--------------------------------
JAMI TO'LOV: ${formatUZS(craneCalc.grandTotal)}
(iBox tizimida to'lov uchun tayyor)`;
  }, [selectedCrane, craneBillingType, craneQuantity, craneCalc]);

  const loaderSummaryText = useMemo(() => {
    return `[SHOHRENT - GRUSCHIK XIZMATI HISOBI]
Yuk turi: ${loaderMode === 'bags' ? `${loaderBagsCount} ta qop (taxm. ${loaderCalc.effectiveWeightKg} kg)` : loaderMode === 'weight' ? `${loaderWeightKg} kg umumiy vazn` : `${loaderOversizedCount} ta og‘ir/gabaritli yuk`}
Qavat: ${loaderFloor}-qavat (${loaderHasElevator ? 'Lift bor' : 'Lift yo‘q, zina orqali'})
Tashish masofasi: ${loaderDistanceMeters} metr
Tavsiya etilgan ishchilar: ${loaderCalc.suggestedLoaders} nafar
Asosiy yuklash: ${formatUZS(loaderCalc.baseHandlingFee)}
Qavat ustamasi: ${formatUZS(loaderCalc.floorFee)}
--------------------------------
JAMI TO'LOV: ${formatUZS(loaderCalc.grandTotal)}
(iBox tizimida to'lov uchun tayyor)`;
  }, [loaderMode, loaderBagsCount, loaderWeightKg, loaderOversizedCount, loaderFloor, loaderHasElevator, loaderDistanceMeters, loaderCalc]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
            <Calculator className="w-3.5 h-3.5" />
            <span>Sotuvchi va Menejerlar Uchun Tezkor Kalkulyator</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Ijara va Xizmatlar Kalkulyatori (Shohrent)
          </h1>
          <p className="text-xs text-slate-600">
            Uskuna ijarasi, chiqindi mashinalari, avtokranlar va gruschik xizmatlari narxini bir zumda hisoblang va iBox kassa to'loviga o'tkazing.
          </p>
        </div>

        {copiedNotification && (
          <div className="px-4 py-2 bg-emerald-500 text-white rounded-xl shadow-md text-xs font-bold flex items-center gap-2 animate-in fade-in zoom-in-95">
            <Check className="w-4 h-4" />
            <span>{copiedNotification} nusxalandi!</span>
          </div>
        )}
      </div>

      {/* Tabs navigation */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('tools')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0 ${
            activeTab === 'tools'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>1. Arenda Asboblar Kalkulyatori</span>
        </button>

        <button
          onClick={() => setActiveTab('waste')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0 ${
            activeTab === 'waste'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>2. Chiqindi Moshina (Musir)</span>
        </button>

        <button
          onClick={() => setActiveTab('crane')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0 ${
            activeTab === 'crane'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>3. Avtokran Xizmati</span>
        </button>
f
        <button
          onClick={() => setActiveTab('loaders')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0 ${
            activeTab === 'loaders'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>4. Yuk Tashuvchilar (Gruschik)</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: RENTAL TOOLS & EQUIPMENT CALCULATOR */}
      {/* ========================================================= */}
      {activeTab === 'tools' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls column */}
          <div className="lg:col-span-7 space-y-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <div className="border-b border-slate-200 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-600" />
                <span>Asbobni tanlash va Ijara muddatini belgilash</span>
              </h2>
              <p className="text-xs text-slate-500">
                Ombordagi asbobni tanlang, kunlar sonini kiriting va hisoblangan summani tekshiring.
              </p>
            </div>

            {/* Category selection pills */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-blue-600" />
                  <span>Kategoriya bo'yicha saralash:</span>
                </span>
                <span className="text-[11px] text-slate-500 font-normal">
                  {filteredProducts.length} ta asbob mos keldi
                </span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setSelectedToolCategory('all')}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold transition-colors cursor-pointer shrink-0 ${
                    selectedToolCategory === 'all'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  Barchasi ({products.length})
                </button>
                {distinctCategories.map((cat) => {
                  const count = products.filter((p) => p.category === cat).length;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedToolCategory(cat)}
                      className={`px-3 py-1 rounded-full text-[11px] font-bold transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
                        selectedToolCategory === cat
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                      }`}
                    >
                      <span>{cat}</span>
                      <span className="text-[10px] font-mono opacity-80">({count})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Product selection search */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Asbob / Uskuna qidirish yoki Shtrix-kod skaneri:
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={toolSearch}
                  onChange={(e) => setToolSearch(e.target.value)}
                  placeholder="Nomi, SKU yoki Shtrix-kodni skanerlang / kiriting..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Quick product cards selector */}
              <div className="max-h-52 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
                {filteredProducts.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500">
                    Mos keladigan mahsulot topilmadi.
                  </div>
                ) : (
                  filteredProducts.map((p) => {
                    const isSelected = p.id === selectedProductId;
                    const availableCount = p.serials?.filter((s) => s.status === 'available').length || 0;
                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedProductId(p.id)}
                        className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors text-xs ${
                          isSelected
                            ? 'bg-blue-50 text-blue-900 font-bold border-l-4 border-blue-600'
                            : 'hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          {p.image ? (
                            <img
                              src={p.image}
                              alt={p.name}
                              className="w-9 h-9 object-cover rounded-lg border border-slate-200"
                            />
                          ) : (
                            <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center font-bold text-slate-500 text-[10px] uppercase border border-slate-200">
                              {p.sku.slice(0, 3)}
                            </div>
                          )}
                          <div>
                            <div className="font-semibold">{p.name}</div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-1.5 flex-wrap">
                              <span>{p.sku}</span>
                              <span>·</span>
                              <span className="text-slate-600">{p.category}</span>
                              {p.barcode && (
                                <>
                                  <span>·</span>
                                  <span className="font-mono text-emerald-700 flex items-center gap-0.5">
                                    <Barcode className="w-3 h-3" />
                                    <span>{p.barcode}</span>
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-mono font-bold text-blue-700">
                            {formatUZS(p.dailyRate)} / kun
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Mavjud:{' '}
                            <span
                              className={`font-bold ${
                                availableCount > 0 ? 'text-emerald-600' : 'text-rose-600'
                              }`}
                            >
                              {availableCount} ta
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Selected Tool Details Card (Rich Card with Description & Barcode) */}
            {selectedProduct && (
              <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-200 space-y-2 text-xs">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {selectedProduct.image ? (
                      <img
                        src={selectedProduct.image}
                        alt={selectedProduct.name}
                        className="w-14 h-14 object-cover rounded-xl border border-blue-200 shadow-2xs"
                      />
                    ) : (
                      <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center text-blue-600 border border-blue-200">
                        <Package className="w-6 h-6" />
                      </div>
                    )}
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
                        Tanlangan mahsulot kartasi:
                      </div>
                      <div className="font-bold text-slate-900 text-sm">{selectedProduct.name}</div>
                      <div className="text-[11px] text-slate-600 flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="px-1.5 py-0.2 bg-white rounded text-[10px] border border-blue-200 font-mono text-blue-800">
                          SKU: {selectedProduct.sku}
                        </span>
                        {selectedProduct.barcode && (
                          <span className="px-1.5 py-0.2 bg-emerald-50 rounded text-[10px] border border-emerald-200 font-mono text-emerald-800 flex items-center gap-1">
                            <Barcode className="w-3 h-3" />
                            <span>{selectedProduct.barcode}</span>
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500">
                          Ombor: {selectedProduct.warehouse || 'Bosh ombor'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-[10px] text-slate-500 font-medium">Kunlik ijara stavkasi</div>
                    <div className="text-base font-extrabold text-blue-700 font-mono">
                      {formatUZS(selectedProduct.dailyRate)}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Garov depoziti: <span className="font-bold text-slate-800">{formatUZS(selectedProduct.depositAmount || selectedProduct.dailyRate * 3)}</span>
                    </div>
                  </div>
                </div>

                {/* Rich Description ("Izoh") */}
                {selectedProduct.description ? (
                  <div className="p-2.5 bg-white/80 rounded-xl border border-blue-100 text-slate-700 text-xs leading-relaxed">
                    <div className="text-[10px] font-bold text-blue-800 flex items-center gap-1 mb-0.5">
                      <Sparkles className="w-3 h-3" />
                      <span>Mahsulot tavsifi va qo'llanish maqsadi:</span>
                    </div>
                    <p className="line-clamp-2">{selectedProduct.description}</p>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-400 italic">
                    Mahsulot kartasida qo'shimcha izoh kiritilmagan.
                  </div>
                )}
              </div>
            )}

            {/* Duration Input & Presets */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">Ijara muddati (Kun):</label>
                <div className="flex items-center gap-1.5">
                  {[1, 3, 7, 14, 30].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDurationDays(d)}
                      className={`px-2.5 py-1 text-[11px] rounded-lg font-bold border transition-colors cursor-pointer ${
                        durationDays === d
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {d} kun
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setDurationDays((prev) => Math.max(1, prev - 1))}
                  className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 flex items-center justify-center font-bold text-slate-700 cursor-pointer"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={durationDays}
                  onChange={(e) => setDurationDays(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-24 text-center py-2 px-3 bg-white border border-slate-300 rounded-xl text-base font-bold text-slate-900 focus:outline-none focus:border-blue-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setDurationDays((prev) => prev + 1)}
                  className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 flex items-center justify-center font-bold text-slate-700 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <span className="text-xs text-slate-600">
                  {durationDays >= 30 ? (
                    <span className="text-emerald-700 font-bold">🎉 30+ kun: 15% chegirma qo‘shildi!</span>
                  ) : durationDays >= 14 ? (
                    <span className="text-emerald-700 font-bold">🎉 14+ kun: 10% chegirma qo‘shildi!</span>
                  ) : durationDays >= 7 ? (
                    <span className="text-emerald-700 font-bold">🎉 7+ kun: 5% chegirma qo‘shildi!</span>
                  ) : (
                    'Oddiy kunlik hisob-kitob'
                  )}
                </span>
              </div>
            </div>

            {/* Quantity */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <div>
                <label className="block text-xs font-bold text-slate-700">Asboblar soni (dona):</label>
                <p className="text-[11px] text-slate-500">Mijoz bir nechta dona olsa ko‘paytiriladi</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setToolQuantity((prev) => Math.max(1, prev - 1))}
                  className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 flex items-center justify-center font-bold text-slate-700 cursor-pointer"
                >
                  -
                </button>
                <span className="font-mono font-bold text-sm text-slate-900 px-2">{toolQuantity}</span>
                <button
                  type="button"
                  onClick={() => setToolQuantity((prev) => prev + 1)}
                  className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 flex items-center justify-center font-bold text-slate-700 cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            {/* Additional options: Deposit waiver, Delivery */}
            <div className="space-y-2 border-t border-slate-100 pt-3 text-xs">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hasDepositWaiver}
                  onChange={(e) => setHasDepositWaiver(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <span className="text-slate-800 font-medium">
                  Doimiy ishonchli mijoz (Garovsiz berish - 0 UZS depozit)
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeDelivery}
                  onChange={(e) => setIncludeDelivery(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <span className="text-slate-800 font-medium">
                  Yetkazib berish xizmati (+{formatUZS(deliveryFeeUZS)})
                </span>
              </label>
            </div>
          </div>

          {/* Results Receipt Column */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-emerald-400" />
                  <span className="font-bold text-sm tracking-wide uppercase">
                    iBox Kassa Cheki
                  </span>
                </div>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-[10px] font-bold">
                  Avtomatik Hisob
                </span>
              </div>

              <div className="space-y-2.5 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Asbob:</span>
                  <span className="font-semibold text-white text-right">{selectedProduct?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Kunlik stavka:</span>
                  <span className="font-mono text-white">{formatUZS(toolCalc.dailyRate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Muddat & Miqdor:</span>
                  <span className="font-mono text-white">
                    {durationDays} kun x {toolQuantity} dona
                  </span>
                </div>

                {toolCalc.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-400 font-medium">
                    <span>Muddati uchun chegirma ({toolCalc.discountPercent}%):</span>
                    <span className="font-mono">-{formatUZS(toolCalc.discountAmount)}</span>
                  </div>
                )}

                <div className="flex justify-between border-t border-slate-800 pt-2 font-semibold">
                  <span className="text-slate-300">Ijara to'lovi (Sof):</span>
                  <span className="font-mono text-white">{formatUZS(toolCalc.finalRentalPrice)}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-400">
                    Garov depoziti {hasDepositWaiver ? '(Garovsiz)' : ''}:
                  </span>
                  <span className={`font-mono ${hasDepositWaiver ? 'text-slate-500' : 'text-amber-400'}`}>
                    {formatUZS(toolCalc.totalDeposit)}
                  </span>
                </div>

                {includeDelivery && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Yetkazib berish:</span>
                    <span className="font-mono text-white">{formatUZS(toolCalc.deliveryFee)}</span>
                  </div>
                )}
              </div>

              {/* Total Display */}
              <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700 space-y-1 text-center">
                <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                  Mijozdan olinadigan jami summa:
                </div>
                <div className="text-2xl font-black text-emerald-400 font-mono tracking-tight">
                  {formatUZS(toolCalc.grandTotal)}
                </div>
                <div className="text-[10px] text-slate-400">
                  (Ijara: {formatUZS(toolCalc.finalRentalPrice)} + Garov: {formatUZS(toolCalc.totalDeposit)})
                </div>
              </div>

              {/* Actions */}
              )}
                <button
                  type="button"
                  onClick={() => copyToClipboard(toolSummaryText, 'Asbob hisobi')}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                >
                  <Copy className="w-4 h-4" />
                  <span>iBox uchun nusxalash (Kassaga)</span>
                </button>

                {onCreateOrderFromCalculator && (
                  <button
                    type="button"
                    onClick={() =>
                      onCreateOrderFromCalculator({
                        type: 'tool',
                        product: selectedProduct,
                        durationDays,
                        quantity: toolQuantity,
                        totalPrice: toolCalc.finalRentalPrice,
                        deposit: toolCalc.totalDeposit
                      })
                    }
                    className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Buyurtmaga qo‘shish</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Staff hint */}
            <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <p>
                <strong>Sotuvchi uchun eslatma:</strong> Garov puli (depozit) asbob qaytarilganda to‘liq mijozga qaytariladi yoki keyingi ijaraga hisoblanadi. iBox'da ijara va garovni alohida ko‘rsatish tavsiya etiladi.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: GARBAGE REMOVAL / WASTE TRUCK SERVICE (PETROVICH) */}
      {/* ========================================================= */}
      {activeTab === 'waste' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <div className="border-b border-slate-200 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Truck className="w-5 h-5 text-emerald-600" />
                <span>Qurilish Chiqindisini Olib Ketish ("Musir Moshina")</span>
              </h2>
              <p className="text-xs text-slate-500">
                Moshina turi, yuklash xizmati, qavat va lift mavjudligiga qarab aniq narxni hisoblang.
              </p>
            </div>

            {/* Truck Selector Cards */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">Chiqindi mashinasi turi:</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {wasteTrucksToUse.map((truck) => {
                  const isSelected = truck.id === selectedTruckId;
                  return (
                    <div
                      key={truck.id}
                      onClick={() => setSelectedTruckId(truck.id)}
                      className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50/50 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-slate-900">{truck.truckName}</span>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-mono text-[10px] rounded-md font-bold">
                          {truck.capacityM3} m³
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        1 reys narxi:{' '}
                        <span className="font-bold font-mono text-emerald-700">
                          {formatUZS(truck.pricePerTrip)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Trips count */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <div>
                <label className="block text-xs font-bold text-slate-700">Reyslar soni:</label>
                <p className="text-[11px] text-slate-500">Nechta mashina kerak?</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setWasteTripsCount((prev) => Math.max(1, prev - 1))}
                  className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 flex items-center justify-center font-bold text-slate-700 cursor-pointer"
                >
                  -
                </button>
                <span className="font-mono font-bold text-sm text-slate-900 px-2">
                  {wasteTripsCount} ta reys
                </span>
                <button
                  type="button"
                  onClick={() => setWasteTripsCount((prev) => prev + 1)}
                  className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 flex items-center justify-center font-bold text-slate-700 cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            {/* Loading Service Toggle */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-xs text-slate-900 block">
                    Yuklash xizmati (Gruschiklar mashinaga ortib berishi)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Obyektdan mashinagacha olib chiqib ortish
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeWasteLoading}
                    onChange={(e) => setIncludeWasteLoading(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Parameters when loading is included */}
              {includeWasteLoading && (
                <div className="space-y-4 pt-3 border-t border-slate-200 animate-in fade-in duration-150">
                  {/* Bagged vs Loose */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Chiqindi qadoqlanganligi turi:
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <div
                        onClick={() => setWasteBaggedType('bagged')}
                        className={`p-3 rounded-lg border cursor-pointer text-xs ${
                          wasteBaggedType === 'bagged'
                            ? 'bg-emerald-50 border-emerald-500 font-bold text-emerald-900'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="font-bold">✓ Qoplangan chiqindi</div>
                        <div className="text-[10px] text-slate-500">
                          Qoplarga solingan g‘isht, suvoq, plitka
                        </div>
                      </div>

                      <div
                        onClick={() => setWasteBaggedType('loose')}
                        className={`p-3 rounded-lg border cursor-pointer text-xs ${
                          wasteBaggedType === 'loose'
                            ? 'bg-emerald-50 border-emerald-500 font-bold text-emerald-900'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="font-bold">⚠️ Qoplanmagan / Sochilma</div>
                        <div className="text-[10px] text-slate-500">
                          To‘kilgan shlak, qorishma, gabarit (ustama +45%)
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Floor Level & Elevator */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Chiqariladigan qavat (Etaj):
                      </label>
                      <select
                        value={wasteFloor}
                        onChange={(e) => setWasteFloor(parseInt(e.target.value))}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                      >
                        <option value={1}>1-qavat (Hovli / Podval / 1-etaj)</option>
                        {Array.from({ length: 24 }, (_, i) => i + 2).map((floor) => (
                          <option key={floor} value={floor}>
                            {floor}-qavat
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Yuk lifti (Elevator):
                      </label>
                      <select
                        value={wasteHasElevator ? 'yes' : 'no'}
                        onChange={(e) => setWasteHasElevator(e.target.value === 'yes')}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                      >
                        <option value="yes">✓ Lift bor (ishlayapti)</option>
                        <option value="no">✕ Lift yo‘q (Zina orqali tushirish)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Receipt column */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-emerald-400" />
                  <span className="font-bold text-sm tracking-wide uppercase">
                    Musir Moshina Hisobi
                  </span>
                </div>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-[10px] font-bold">
                  iBox Tayyor
                </span>
              </div>

              <div className="space-y-2.5 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Mashina:</span>
                  <span className="font-semibold text-white">{selectedWasteTruck?.truckName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Reyslar:</span>
                  <span className="font-mono text-white">{wasteTripsCount} ta</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Mashina transporti:</span>
                  <span className="font-mono text-white">{formatUZS(wasteCalc.transportCost)}</span>
                </div>

                <div className="flex justify-between border-t border-slate-800 pt-2">
                  <span className="text-slate-400">Yuklash xizmati:</span>
                  <span className={`font-mono ${includeWasteLoading ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {includeWasteLoading ? `+${formatUZS(wasteCalc.loadingCost)}` : '0 UZS (Mijoz o‘zi ortadi)'}
                  </span>
                </div>

                {includeWasteLoading && (
                  <div className="bg-slate-800/50 p-2.5 rounded-lg text-[11px] text-slate-400 space-y-1">
                    <div>Holat: {wasteBaggedType === 'bagged' ? 'Qoplangan' : 'Qoplanmagan / sochilma'}</div>
                    <div>Qavat: {wasteFloor}-qavat ({wasteHasElevator ? 'Lift mavjud' : 'Zina orqali'})</div>
                  </div>
                )}
              </div>

              <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700 space-y-1 text-center">
                <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                  Jami xizmat summasi:
                </div>
                <div className="text-2xl font-black text-emerald-400 font-mono tracking-tight">
                  {formatUZS(wasteCalc.grandTotal)}
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => copyToClipboard(wasteSummaryText, 'Chiqindi moshina hisobi')}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                >
                  <Copy className="w-4 h-4" />
                  <span>iBox uchun nusxalash (Kassaga)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: AUTO-CRANE SERVICE CALCULATOR */}
      {/* ========================================================= */}
      {activeTab === 'crane' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <div className="border-b border-slate-200 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building className="w-5 h-5 text-amber-600" />
                <span>Avtokran Xizmati Kalkulyatori (Tonna va Smena)</span>
              </h2>
              <p className="text-xs text-slate-500">
                Kran yuk ko‘tarish quvvati (tonnaj), soatbay yoki kunbay to‘lov stavkasi bo‘yicha hisoblash.
              </p>
            </div>

            {/* Crane selection cards */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">Kran quvvati (Tonnaj):</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {cranesToUse.map((crane) => {
                  const isSelected = crane.id === selectedCraneId;
                  return (
                    <div
                      key={crane.id}
                      onClick={() => setSelectedCraneId(crane.id)}
                      className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-amber-600 bg-amber-50/50 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-slate-900">{crane.name}</span>
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-900 font-mono text-[10px] rounded-md font-bold">
                          {crane.tonnage} tonna
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 space-y-0.5">
                        <div>
                          Soatiga: <strong className="text-amber-800 font-mono">{formatUZS(crane.hourlyRate)}</strong>
                        </div>
                        <div>
                          Smena (kun): <strong className="text-amber-800 font-mono">{formatUZS(crane.dailyRate)}</strong>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Billing method toggle: Hourly vs Daily */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <label className="block text-xs font-bold text-slate-700">To'lov hisoblash usuli:</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setCraneBillingType('hourly');
                    setCraneQuantity(4);
                  }}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                    craneBillingType === 'hourly'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  Soatbay (Soatiga hisoblash)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCraneBillingType('daily');
                    setCraneQuantity(1);
                  }}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                    craneBillingType === 'daily'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  Kunbay / Smena (8 soatlik to‘liq)
                </button>
              </div>

              {/* Quantity Slider / input */}
              <div className="pt-2">
                <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                  <span>
                    Davomiyligi: {craneQuantity} {craneBillingType === 'hourly' ? 'soat' : 'smena (kun)'}
                  </span>
                  <span className="text-slate-500 font-normal">
                    {craneBillingType === 'hourly' ? 'Min: 4 soat' : 'Min: 1 smena'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setCraneQuantity((prev) =>
                        craneBillingType === 'hourly' ? Math.max(4, prev - 1) : Math.max(1, prev - 1)
                      )
                    }
                    className="w-9 h-9 rounded-lg bg-slate-200 hover:bg-slate-300 font-bold text-slate-800"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={craneBillingType === 'hourly' ? 4 : 1}
                    value={craneQuantity}
                    onChange={(e) => setCraneQuantity(parseInt(e.target.value) || 1)}
                    className="w-20 text-center py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setCraneQuantity((prev) => prev + 1)}
                    className="w-9 h-9 rounded-lg bg-slate-200 hover:bg-slate-300 font-bold text-slate-800"
                  >
                    +
                  </button>
                  <span className="text-[11px] text-slate-500">
                    {craneBillingType === 'daily' && craneQuantity >= 3
                      ? '🎉 3+ kunga ko‘p kunlik chegirma!'
                      : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* Special Surcharges */}
            <div className="space-y-2 border-t border-slate-100 pt-3 text-xs">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={craneHasBoomExtension}
                  onChange={(e) => setCraneHasBoomExtension(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                />
                <span className="text-slate-800 font-medium">
                  Gusyok / Qo‘shimcha strela uzaytirgich kerak (+150 000 UZS)
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={craneNightShift}
                  onChange={(e) => setCraneNightShift(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                />
                <span className="text-slate-800 font-medium">
                  Tungi smena (21:00 dan keyin +20% ustama)
                </span>
              </label>
            </div>
          </div>

          {/* Receipt column */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Building className="w-5 h-5 text-amber-400" />
                  <span className="font-bold text-sm tracking-wide uppercase">
                    Avtokran Cheki
                  </span>
                </div>
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-[10px] font-bold">
                  iBox Tayyor
                </span>
              </div>

              <div className="space-y-2.5 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Kran:</span>
                  <span className="font-semibold text-white">{selectedCrane?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Tarif:</span>
                  <span className="font-mono text-white">
                    {craneBillingType === 'hourly' ? 'Soatbay' : 'Kunbay'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Vaqt:</span>
                  <span className="font-mono text-white">
                    {craneQuantity} {craneBillingType === 'hourly' ? 'soat' : 'kun'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Stavka:</span>
                  <span className="font-mono text-white">{formatUZS(craneCalc.baseRate)}</span>
                </div>

                {craneCalc.discount > 0 && (
                  <div className="flex justify-between text-emerald-400 font-medium">
                    <span>Hajm chegirmasi:</span>
                    <span className="font-mono">-{formatUZS(craneCalc.discount)}</span>
                  </div>
                )}

                {craneCalc.surcharges > 0 && (
                  <div className="flex justify-between text-amber-300 font-medium">
                    <span>Qo‘shimcha xizmatlar:</span>
                    <span className="font-mono">+{formatUZS(craneCalc.surcharges)}</span>
                  </div>
                )}
              </div>

              <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700 space-y-1 text-center">
                <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                  Jami xizmat summasi:
                </div>
                <div className="text-2xl font-black text-amber-400 font-mono tracking-tight">
                  {formatUZS(craneCalc.grandTotal)}
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => copyToClipboard(craneSummaryText, 'Avtokran hisobi')}
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                >
                  <Copy className="w-4 h-4" />
                  <span>iBox uchun nusxalash (Kassaga)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: LOADERS / PORTERS (GRUSCHIK) CALCULATOR */}
      {/* ========================================================= */}
      {activeTab === 'loaders' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <div className="border-b border-slate-200 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                <span>Yuk Tashuvchilar ("Gruschik") Xizmati</span>
              </h2>
              <p className="text-xs text-slate-500">
                Qoplar soni, umumiy og‘irlik (kg), qavat va lift bor-yo‘qligiga qarab yuk tashish qiymatini aniq hisoblang.
              </p>
            </div>

            {/* Cargo Type Selection */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">Yuk turi va hisoblash shakli:</label>
              <div className="grid grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setLoaderMode('bags')}
                  className={`p-3 rounded-xl border text-xs font-bold text-left transition-colors cursor-pointer ${
                    loaderMode === 'bags'
                      ? 'bg-purple-50 border-purple-600 text-purple-900 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="font-bold">Qoplar bo‘yicha</div>
                  <div className="text-[10px] text-slate-500">Sement, rotband, qum</div>
                </button>

                <button
                  type="button"
                  onClick={() => setLoaderMode('weight')}
                  className={`p-3 rounded-xl border text-xs font-bold text-left transition-colors cursor-pointer ${
                    loaderMode === 'weight'
                      ? 'bg-purple-50 border-purple-600 text-purple-900 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="font-bold">Umumiy vazn (kg)</div>
                  <div className="text-[10px] text-slate-500">Qurilish mollar massasi</div>
                </button>

                <button
                  type="button"
                  onClick={() => setLoaderMode('oversized')}
                  className={`p-3 rounded-xl border text-xs font-bold text-left transition-colors cursor-pointer ${
                    loaderMode === 'oversized'
                      ? 'bg-purple-50 border-purple-600 text-purple-900 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="font-bold">Og‘ir / Nogabarit</div>
                  <div className="text-[10px] text-slate-500">Seyf, uskuna, stanok</div>
                </button>
              </div>
            </div>

            {/* Inputs based on Mode */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
              {loaderMode === 'bags' && (
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                    <span>Qoplar soni (har biri 50 kg):</span>
                    <span className="font-mono text-purple-700">{loaderBagsCount} ta qop (~{loaderBagsCount * 50} kg)</span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={200}
                    step={5}
                    value={loaderBagsCount}
                    onChange={(e) => setLoaderBagsCount(parseInt(e.target.value))}
                    className="w-full accent-purple-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>5 qop</span>
                    <span>100 qop</span>
                    <span>200 qop</span>
                  </div>
                </div>
              )}

              {loaderMode === 'weight' && (
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                    <span>Umumiy vazn:</span>
                    <span className="font-mono text-purple-700">{loaderWeightKg} kg</span>
                  </div>
                  <input
                    type="range"
                    min={100}
                    max={10000}
                    step={100}
                    value={loaderWeightKg}
                    onChange={(e) => setLoaderWeightKg(parseInt(e.target.value))}
                    className="w-full accent-purple-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>100 kg</span>
                    <span>5,000 kg</span>
                    <span>10,000 kg</span>
                  </div>
                </div>
              )}

              {loaderMode === 'oversized' && (
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Yuk turi:</label>
                    <input
                      type="text"
                      value={loaderOversizedItemName}
                      onChange={(e) => setLoaderOversizedItemName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Soni (dona):</label>
                    <input
                      type="number"
                      min={1}
                      value={loaderOversizedCount}
                      onChange={(e) => setLoaderOversizedCount(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Floor and Elevator */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Qavat (Etaj):</label>
                  <select
                    value={loaderFloor}
                    onChange={(e) => setLoaderFloor(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                  >
                    <option value={1}>1-qavat (Podval / Hovli)</option>
                    {Array.from({ length: 19 }, (_, i) => i + 2).map((floor) => (
                      <option key={floor} value={floor}>
                        {floor}-qavat
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Lift holati:</label>
                  <select
                    value={loaderHasElevator ? 'yes' : 'no'}
                    onChange={(e) => setLoaderHasElevator(e.target.value === 'yes')}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                  >
                    <option value="yes">✓ Lift bor (yuk lifti mavjud)</option>
                    <option value="no">✕ Lift yo‘q (Zina orqali qo‘lda ko‘tarish)</option>
                  </select>
                </div>
              </div>

              {/* Carrying distance */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                  <span>Mashinagacha masofa:</span>
                  <span className="font-mono text-purple-700">{loaderDistanceMeters} metr</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={100}
                  step={5}
                  value={loaderDistanceMeters}
                  onChange={(e) => setLoaderDistanceMeters(parseInt(e.target.value))}
                  className="w-full accent-purple-600"
                />
              </div>
            </div>
          </div>

          {/* Receipt column */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-400" />
                  <span className="font-bold text-sm tracking-wide uppercase">
                    Gruschik Xizmati Cheki
                  </span>
                </div>
                <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full text-[10px] font-bold">
                  iBox Tayyor
                </span>
              </div>

              <div className="space-y-2.5 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Yuk turi:</span>
                  <span className="font-semibold text-white">
                    {loaderMode === 'bags'
                      ? `${loaderBagsCount} ta qop`
                      : loaderMode === 'weight'
                      ? `${loaderWeightKg} kg`
                      : `${loaderOversizedCount} ta og‘ir yuk`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Qavat:</span>
                  <span className="font-mono text-white">
                    {loaderFloor}-qavat ({loaderHasElevator ? 'Lift mavjud' : 'Zina orqali'})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Tavsiya etilgan ishchilar:</span>
                  <span className="font-mono text-emerald-400 font-bold">
                    {loaderCalc.suggestedLoaders} nafar gruschik
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-800 pt-2">
                  <span className="text-slate-400">Asosiy tushirish/ortish:</span>
                  <span className="font-mono text-white">{formatUZS(loaderCalc.baseHandlingFee)}</span>
                </div>
                {loaderCalc.floorFee > 0 && (
                  <div className="flex justify-between text-amber-300">
                    <span>Qavat uchun ustama:</span>
                    <span className="font-mono">+{formatUZS(loaderCalc.floorFee)}</span>
                  </div>
                )}
              </div>

              <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700 space-y-1 text-center">
                <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                  Jami xizmat summasi:
                </div>
                <div className="text-2xl font-black text-purple-400 font-mono tracking-tight">
                  {formatUZS(loaderCalc.grandTotal)}
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => copyToClipboard(loaderSummaryText, 'Gruschik hisobi')}
                  className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                >
                  <Copy className="w-4 h-4" />
                  <span>iBox uchun nusxalash (Kassaga)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
