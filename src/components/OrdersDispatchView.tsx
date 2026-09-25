import React, { useState, useMemo } from 'react';
import {
  ShoppingCart,
  Plus,
  FileSpreadsheet,
  Search,
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Printer,
  X,
  User,
  Truck,
  HardHat,
  Users,
  Edit2,
  DollarSign,
  AlertCircle,
  ArrowRight,
  Filter,
  Eye,
  Phone,
  MapPin,
  History
} from 'lucide-react';
import {
  Client,
  CraneConfig,
  Language,
  LoaderPricingRules,
  Order,
  OrderStatus,
  OrderToolItem,
  PaymentMethod,
  PaymentStatus,
  Product,
  Salesperson,
  SerialNumber,
  ServicePartner,
  WasteTruckConfig
} from '../types';
import { formatUZS, generateRandomCode } from '../utils/pricing';
import { exportOrdersToExcel } from '../utils/excel';
import { PrintableInvoiceModal } from './PrintableInvoiceModal';

// Built-in fallback machinery if custom list is empty
const DEFAULT_TRUCKS: WasteTruckConfig[] = [
  { id: 'wt-1', truckName: 'ZIL-130 (Chiqindi)', capacityM3: 6, pricePerTrip: 600000, pricePerM3: 60000, floorHandlingFee: 15000, elevatorFee: 5000, oversizedFee: 50000, isAvailable: true },
  { id: 'wt-2', truckName: 'KamAZ 55111 (Og‘ir chiqindi)', capacityM3: 10, pricePerTrip: 950000, pricePerM3: 80000, floorHandlingFee: 20000, elevatorFee: 10000, oversizedFee: 80000, isAvailable: true },
  { id: 'wt-3', truckName: 'Gazel (Kichik hajm)', capacityM3: 4, pricePerTrip: 400000, pricePerM3: 50000, floorHandlingFee: 15000, elevatorFee: 5000, oversizedFee: 30000, isAvailable: true }
];

const DEFAULT_CRANES: CraneConfig[] = [
  { id: 'cr-1', name: 'Avtokran XCMG 25t', tonnage: 25, hourlyRate: 400000, minHours: 3, dailyRate: 2800000, multiDayDiscountPercent: 10, isAvailable: true },
  { id: 'cr-2', name: 'Avtokran Zoomlion 16t', tonnage: 16, hourlyRate: 320000, minHours: 3, dailyRate: 2200000, multiDayDiscountPercent: 10, isAvailable: true },
  { id: 'cr-3', name: 'KamAZ Manipulyator 7t', tonnage: 7, hourlyRate: 250000, minHours: 2, dailyRate: 1800000, multiDayDiscountPercent: 5, isAvailable: true }
];

interface Props {
  language: Language;
  orders: Order[];
  products: Product[];
  clients: Client[];
  salespersons: Salesperson[];
  wasteTrucks: WasteTruckConfig[];
  cranes: CraneConfig[];
  loaderRules: LoaderPricingRules;
  partners?: ServicePartner[];
  onSaveNewOrder: (order: Order, updatedProducts: Product[], updatedClients: Client[]) => void;
  onUpdateOrder: (updatedOrder: Order, updatedProducts: Product[]) => void;
  onCompleteReturn: (orderId: string, updatedProducts: Product[]) => void;
}

export const OrdersDispatchView: React.FC<Props> = ({
  language,
  orders,
  products,
  clients,
  salespersons,
  wasteTrucks,
  cranes,
  loaderRules,
  partners = [],
  onSaveNewOrder,
  onUpdateOrder,
  onCompleteReturn
}) => {
  // Use custom or default options
  const activeTrucks = wasteTrucks.length > 0 ? wasteTrucks : DEFAULT_TRUCKS;
  const activeCranes = cranes.length > 0 ? cranes : DEFAULT_CRANES;

  // Tablo / Tab Filter: Barchasi, Yangi, Ishda, Qaytib keladiganlar, Muddati o'tganlar, Yopilgan
  const [tabFilter, setTabFilter] = useState<
    'all' | 'new' | 'active' | 'returning_today' | 'overdue' | 'completed'
  >('all');

  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [inspectingOrder, setInspectingOrder] = useState<Order | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<Order | null>(null);
  const [returningOrder, setReturningOrder] = useState<Order | null>(null);
  const [selectedAuditOrder, setSelectedAuditOrder] = useState<Order | null>(null);

  // New Order Form state
  const [selectedSalespersonId, setSelectedSalespersonId] = useState(salespersons[0]?.id || '');
  const [selectedClientId, setSelectedClientId] = useState(clients[0]?.id || '');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('paid');
  const [paidAmountUZS, setPaidAmountUZS] = useState<number | ''>('');
  const [paymentDueDate, setPaymentDueDate] = useState<string>('');

  // Selected Tools for New Order
  const [selectedTools, setSelectedTools] = useState<
    {
      productId: string;
      serialNumberId: string;
      durationDays: number | '';
    }[]
  >([]);

  // Selected Waste Services
  const [selectedWaste, setSelectedWaste] = useState<
    {
      truckConfigId: string;
      tripsCount: number | '';
      m3Volume: number;
      floorCount: number | '';
      hasElevator: boolean;
      isBagged: boolean;
      isOversized: boolean;
      partnerId?: string;
      partnerName?: string;
    }[]
  >([]);

  // Selected Crane Services
  const [selectedCranes, setSelectedCranes] = useState<
    {
      craneConfigId: string;
      pricingType: 'hourly' | 'daily';
      hours: number | '';
      days: number | '';
      partnerId?: string;
      partnerName?: string;
    }[]
  >([]);

  // Selected Loader Services
  const [selectedLoaders, setSelectedLoaders] = useState<
    {
      numberOfLoaders: number | '';
      hours: number | '';
      weightKg: number | '';
      floorCount: number | '';
      hasElevator: boolean;
      isOversized: boolean;
      partnerId?: string;
      partnerName?: string;
    }[]
  >([]);

  // Calculations for New Order Form
  const calculatedNewOrder = useMemo(() => {
    let subtotalTools = 0;
    let depositTools = 0;
    const toolsList: OrderToolItem[] = [];

    selectedTools.forEach((st) => {
      const prod = products.find((p) => p.id === st.productId);
      const days = typeof st.durationDays === 'number' ? st.durationDays : parseInt(st.durationDays) || 1;
      if (prod) {
        const lineTotal = prod.dailyRate * days;
        subtotalTools += lineTotal;
        depositTools += prod.depositAmount;

        const serial = prod.serials.find((s) => s.id === st.serialNumberId);
        const snValue = serial ? serial.serialNumber : 'SN-UNKNOWN';
        toolsList.push({
          productId: prod.id,
          productName: prod.name,
          sku: prod.sku,
          serialNumberId: st.serialNumberId,
          serialNumber: snValue,
          serialNumberValue: snValue,
          durationDays: days,
          dailyRateUZS: prod.dailyRate,
          depositUZS: prod.depositAmount,
          lineTotalUZS: lineTotal,
          totalUZS: lineTotal
        });
      }
    });

    let subtotalServices = 0;

    // Waste calculations
    const wasteList: any[] = [];
    selectedWaste.forEach((w) => {
      const truck = activeTrucks.find((t) => t.id === w.truckConfigId) || activeTrucks[0];
      if (truck) {
        const trips = typeof w.tripsCount === 'number' ? w.tripsCount : parseInt(w.tripsCount) || 1;
        const floors = typeof w.floorCount === 'number' ? w.floorCount : parseInt(w.floorCount) || 1;
        const base = truck.pricePerTrip * trips;
        const floorCost = !w.hasElevator && floors > 1 ? (floors - 1) * (truck.floorHandlingFee || 15000) : 0;
        const elevatorCost = w.hasElevator ? (truck.elevatorFee || 5000) : 0;
        const overCost = w.isOversized ? (truck.oversizedFee || 50000) : 0;
        const total = base + floorCost + elevatorCost + overCost;

        subtotalServices += total;
        wasteList.push({
          truckConfigId: truck.id,
          truckName: truck.truckName,
          capacityM3: truck.capacityM3,
          tripsCount: trips,
          m3Volume: w.m3Volume || truck.capacityM3,
          floorCount: floors,
          hasElevator: w.hasElevator,
          isBagged: w.isBagged,
          isOversized: w.isOversized,
          partnerId: w.partnerId,
          partnerName: w.partnerName,
          totalPriceUZS: total
        });
      }
    });

    // Crane calculations
    const craneList: any[] = [];
    selectedCranes.forEach((c) => {
      const crane = activeCranes.find((cr) => cr.id === c.craneConfigId) || activeCranes[0];
      if (crane) {
        let total = 0;
        const hours = typeof c.hours === 'number' ? c.hours : parseInt(c.hours) || 3;
        const days = typeof c.days === 'number' ? c.days : parseInt(c.days) || 1;

        if (c.pricingType === 'hourly') {
          const billedHours = Math.max(hours, crane.minHours);
          total = billedHours * crane.hourlyRate;
        } else {
          total = days * crane.dailyRate;
          if (days >= 3) {
            total = Math.round(total * (1 - (crane.multiDayDiscountPercent || 10) / 100));
          }
        }

        subtotalServices += total;
        craneList.push({
          craneConfigId: crane.id,
          craneName: crane.name,
          tonnage: crane.tonnage,
          pricingType: c.pricingType,
          hours,
          days,
          partnerId: c.partnerId,
          partnerName: c.partnerName,
          totalPriceUZS: total
        });
      }
    });

    // Loader calculations
    const loaderList: any[] = [];
    selectedLoaders.forEach((l) => {
      const loaders = typeof l.numberOfLoaders === 'number' ? l.numberOfLoaders : parseInt(l.numberOfLoaders) || 2;
      const hours = typeof l.hours === 'number' ? l.hours : parseInt(l.hours) || 2;
      const weight = typeof l.weightKg === 'number' ? l.weightKg : parseInt(l.weightKg) || 0;
      const floors = typeof l.floorCount === 'number' ? l.floorCount : parseInt(l.floorCount) || 1;

      const hourlyCost = loaders * hours * loaderRules.baseHourlyPerPerson;
      const weightCost = weight * (loaderRules.pricePerKg || 100);
      const floorCost = !l.hasElevator && floors > 1 ? (floors - 1) * loaderRules.ratePerFloorNoElevator : 0;
      const elevatorCost = l.hasElevator ? (loaderRules.elevatorFee || 5000) : 0;
      const total = hourlyCost + weightCost + floorCost + elevatorCost;

      subtotalServices += total;
      loaderList.push({
        numberOfLoaders: loaders,
        hours,
        weightKg: weight,
        floorCount: floors,
        hasElevator: l.hasElevator,
        isOversized: l.isOversized,
        partnerId: l.partnerId,
        partnerName: l.partnerName,
        totalPriceUZS: total
      });
    });

    const grandTotal = subtotalTools + depositTools + subtotalServices;

    return {
      subtotalTools,
      depositTools,
      subtotalServices,
      grandTotal,
      toolsList,
      wasteList,
      craneList,
      loaderList
    };
  }, [selectedTools, selectedWaste, selectedCranes, selectedLoaders, products, activeTrucks, activeCranes, loaderRules]);

  // Tablo Filter
  const now = new Date().toISOString().slice(0, 10);
  const tabCounts = useMemo(() => {
    return {
      all: orders.length,
      new: orders.filter((o) => o.status === 'active' && o.orderDate === now).length,
      active: orders.filter((o) => o.status === 'active').length,
      returning_today: orders.filter((o) => {
        if (o.status !== 'active') return false;
        return o.tools.some((t) => {
          const startDate = new Date(o.orderDate);
          const returnDate = new Date(startDate);
          returnDate.setDate(startDate.getDate() + t.durationDays);
          return returnDate.toISOString().slice(0, 10) === now;
        });
      }).length,
      overdue: orders.filter((o) => {
        if (o.status !== 'active') return false;
        return o.tools.some((t) => {
          const startDate = new Date(o.orderDate);
          const returnDate = new Date(startDate);
          returnDate.setDate(startDate.getDate() + t.durationDays);
          return returnDate.toISOString().slice(0, 10) < now;
        });
      }).length,
      completed: orders.filter((o) => o.status === 'completed').length
    };
  }, [orders, now]);

  // Filtered Orders List
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchSearch =
        order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.clientPhone.includes(searchQuery) ||
        order.tools.some((t) => t.productName.toLowerCase().includes(searchQuery.toLowerCase()));

      let matchTab = true;
      if (tabFilter === 'new') {
        matchTab = order.status === 'active' && order.orderDate === now;
      } else if (tabFilter === 'active') {
        matchTab = order.status === 'active';
      } else if (tabFilter === 'returning_today') {
        matchTab =
          order.status === 'active' &&
          order.tools.some((t) => {
            const startDate = new Date(order.orderDate);
            const returnDate = new Date(startDate);
            returnDate.setDate(startDate.getDate() + t.durationDays);
            return returnDate.toISOString().slice(0, 10) === now;
          });
      } else if (tabFilter === 'overdue') {
        matchTab =
          order.status === 'active' &&
          order.tools.some((t) => {
            const startDate = new Date(order.orderDate);
            const returnDate = new Date(startDate);
            returnDate.setDate(startDate.getDate() + t.durationDays);
            return returnDate.toISOString().slice(0, 10) < now;
          });
      } else if (tabFilter === 'completed') {
        matchTab = order.status === 'completed';
      }

      return matchSearch && matchTab;
    });
  }, [orders, searchQuery, tabFilter, now]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    if (salespersons.length > 0) setSelectedSalespersonId(salespersons[0].id);
    if (clients.length > 0) setSelectedClientId(clients[0].id);
    setDeliveryAddress('');
    setOrderNotes('');
    setSelectedTools([]);
    setSelectedWaste([]);
    setSelectedCranes([]);
    setSelectedLoaders([]);
    setPaymentMethod('cash');
    setPaymentStatus('paid');
    setPaidAmountUZS('');
    setPaymentDueDate('');
    setIsCreateModalOpen(true);
  };

  // Add tool item row
  const handleAddToolRow = () => {
    const availableProduct = products.find((p) => p.serials.some((s) => s.status === 'available'));
    if (!availableProduct) {
      alert("Hozirda omborda bo'sh asboblar mavjud emas! Avval yangi tovar kirim qiling.");
      return;
    }
    const firstSerial = availableProduct.serials.find((s) => s.status === 'available');
    setSelectedTools([
      ...selectedTools,
      {
        productId: availableProduct.id,
        serialNumberId: firstSerial?.id || '',
        durationDays: 1
      }
    ]);
  };

  // Submit New Order
  const handleSubmitNewOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const salesperson = salespersons.find((s) => s.id === selectedSalespersonId) || salespersons[0];
    const client = clients.find((c) => c.id === selectedClientId) || clients[0];

    if (!salesperson || !client) {
      alert("Iltimos, sotuvchi va mijozni tanlang!");
      return;
    }

    if (
      calculatedNewOrder.toolsList.length === 0 &&
      calculatedNewOrder.wasteList.length === 0 &&
      calculatedNewOrder.craneList.length === 0 &&
      calculatedNewOrder.loaderList.length === 0
    ) {
      alert("Buyurtmaga kamida bitta asbob yoki xizmat qo'shing!");
      return;
    }

    const orderId = generateRandomCode('ORD');
    const nowStr = new Date().toISOString().slice(0, 10);

    const paid = paymentStatus === 'paid'
      ? calculatedNewOrder.grandTotal
      : (typeof paidAmountUZS === 'number' ? paidAmountUZS : parseFloat(paidAmountUZS) || 0);
    const remaining = Math.max(0, calculatedNewOrder.grandTotal - paid);

    const newOrder: Order = {
      id: orderId,
      orderDate: nowStr,
      salespersonId: salesperson.id,
      salespersonName: salesperson.fullName,
      clientId: client.id,
      clientName: client.fullName,
      clientPhone: client.phone,
      deliveryAddress: deliveryAddress || client.address,
      status: 'active',
      tools: calculatedNewOrder.toolsList,
      wasteServices: calculatedNewOrder.wasteList,
      craneServices: calculatedNewOrder.craneList,
      loaderServices: calculatedNewOrder.loaderList,
      subtotalToolsUZS: calculatedNewOrder.subtotalTools,
      subtotalServicesUZS: calculatedNewOrder.subtotalServices,
      depositTotalUZS: calculatedNewOrder.depositTools,
      grandTotalUZS: calculatedNewOrder.grandTotal,
      paymentStatus,
      paidAmountUZS: paid,
      remainingAmountUZS: remaining,
      paymentDueDate: remaining > 0 ? paymentDueDate : undefined,
      paymentMethod,
      notes: orderNotes,
      createdAt: new Date().toISOString(),
      auditLogs: [
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
          operator: salesperson.fullName,
          action: "Buyurtma yaratildi",
          details: `Buyurtma faollashtirildi. Jami summa: ${formatUZS(calculatedNewOrder.grandTotal)}. Mijoz: ${client.fullName}`
        }
      ]
    };

    // Mark rented serial numbers
    const updatedProducts = products.map((prod) => {
      const rentedForThis = calculatedNewOrder.toolsList.filter((t) => t.productId === prod.id);
      if (rentedForThis.length === 0) return prod;

      const newSerials = prod.serials.map((sn) => {
        if (rentedForThis.some((r) => r.serialNumberId === sn.id)) {
          return {
            ...sn,
            status: 'rented' as const,
            currentOrderId: orderId,
            currentClientName: client.fullName
          };
        }
        return sn;
      });

      return {
        ...prod,
        serials: newSerials
      };
    });

    // Update client stats
    const updatedClients = clients.map((c) => {
      if (c.id === client.id) {
        return {
          ...c,
          totalOrdersCount: c.totalOrdersCount + 1,
          totalSpentUZS: c.totalSpentUZS + calculatedNewOrder.grandTotal,
          activeRentalsCount: c.activeRentalsCount + calculatedNewOrder.toolsList.length,
          currentBalanceUZS: c.currentBalanceUZS - remaining
        };
      }
      return c;
    });

    onSaveNewOrder(newOrder, updatedProducts, updatedClients);
    setIsCreateModalOpen(false);
  };

  // Save Edited Order
  const handleSaveEditedOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;

    const prevOrder = orders.find((o) => o.id === editingOrder.id);
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const changes: string[] = [];

    const paid = editingOrder.paymentStatus === 'paid' ? editingOrder.grandTotalUZS : editingOrder.paidAmountUZS;
    const remaining = Math.max(0, editingOrder.grandTotalUZS - paid);

    if (prevOrder) {
      if (prevOrder.status !== editingOrder.status) {
        changes.push(`Holat: "${prevOrder.status}" -> "${editingOrder.status}"`);
      }
      if (prevOrder.paymentStatus !== editingOrder.paymentStatus) {
        changes.push(`To'lov: "${prevOrder.paymentStatus}" -> "${editingOrder.paymentStatus}"`);
      }
      if (prevOrder.paidAmountUZS !== paid) {
        changes.push(`To'langan summa: ${formatUZS(prevOrder.paidAmountUZS)} -> ${formatUZS(paid)}`);
      }
      if (prevOrder.deliveryAddress !== editingOrder.deliveryAddress) {
        changes.push(`Manzil: "${prevOrder.deliveryAddress}" -> "${editingOrder.deliveryAddress}"`);
      }
      if (prevOrder.notes !== editingOrder.notes) {
        changes.push(`Izoh o'zgartirildi`);
      }
    }

    const updated = {
      ...editingOrder,
      paidAmountUZS: paid,
      remainingAmountUZS: remaining,
      auditLogs: [
        ...(editingOrder.auditLogs || []),
        {
          id: `log-${Date.now()}`,
          timestamp: nowStr,
          operator: editingOrder.salespersonName || 'Operator',
          action: "Buyurtma tahrirlandi",
          details: changes.length > 0 ? changes.join('; ') : "Buyurtma ma'lumotlari yangilandi"
        }
      ]
    };

    onUpdateOrder(updated, products);
    setEditingOrder(null);
    if (inspectingOrder?.id === updated.id) {
      setInspectingOrder(updated);
    }
  };

  // Complete return of equipment
  const handleConfirmReturn = () => {
    if (!returningOrder) return;

    // Free up serial numbers
    const updatedProducts = products.map((prod) => {
      const matchingTools = returningOrder.tools.filter((t) => t.productId === prod.id);
      if (matchingTools.length === 0) return prod;

      const newSerials = prod.serials.map((sn) => {
        if (matchingTools.some((t) => t.serialNumberId === sn.id)) {
          return {
            ...sn,
            status: 'available' as const,
            currentOrderId: undefined,
            currentClientName: undefined
          };
        }
        return sn;
      });

      return {
        ...prod,
        serials: newSerials
      };
    });

    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const updatedOrderWithAudit = {
      ...returningOrder,
      status: 'completed' as const,
      auditLogs: [
        ...(returningOrder.auditLogs || []),
        {
          id: `log-${Date.now()}`,
          timestamp: nowStr,
          operator: returningOrder.salespersonName || 'Operator',
          action: "Vozvrat (Qaytarildi)",
          details: "Ijara asboblari mijozdan to'liq qaytarib olindi. Buyurtma yopildi."
        }
      ]
    };

    onUpdateOrder(updatedOrderWithAudit, updatedProducts);
    onCompleteReturn(returningOrder.id, updatedProducts);
    setReturningOrder(null);
    setInspectingOrder(null);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-blue-600" />
            <span>Buyurtmalar</span>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {filteredOrders.length} ta buyurtma
            </span>
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Ijaralar va xizmatlar hisobi. Tafsilotlar, olingan pul va qarzlarni ko'rish uchun buyurtma ustiga bosing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportOrdersToExcel(orders)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-300 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Excelga eksport</span>
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm shadow-blue-500/20 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Yangi buyurtma</span>
          </button>
        </div>
      </div>

      {/* TABLO BO'LIMI (Yangi, Ishda, Qaytib keladiganlar, Muddati o'tib ketganlar, Yopilgan) */}
      <div className="flex flex-wrap gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-xs text-xs font-bold">
        <button
          onClick={() => setTabFilter('all')}
          className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
            tabFilter === 'all'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <span>Barcha buyurtmalar</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${tabFilter === 'all' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
            {tabCounts.all}
          </span>
        </button>

        <button
          onClick={() => setTabFilter('new')}
          className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
            tabFilter === 'new'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <span>Yangi</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${tabFilter === 'new' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
            {tabCounts.new}
          </span>
        </button>

        <button
          onClick={() => setTabFilter('active')}
          className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
            tabFilter === 'active'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <span>Ishda / Obyektda</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${tabFilter === 'active' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
            {tabCounts.active}
          </span>
        </button>

        <button
          onClick={() => setTabFilter('returning_today')}
          className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
            tabFilter === 'returning_today'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
              : 'text-amber-700 bg-amber-50 hover:bg-amber-100'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Qaytib keladiganlar</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-amber-200 text-amber-950">
            {tabCounts.returning_today}
          </span>
        </button>

        <button
          onClick={() => setTabFilter('overdue')}
          className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
            tabFilter === 'overdue'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-rose-700 bg-rose-50 hover:bg-rose-100'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Muddati o'tib ketganlar</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-rose-200 text-rose-950">
            {tabCounts.overdue}
          </span>
        </button>

        <button
          onClick={() => setTabFilter('completed')}
          className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
            tabFilter === 'completed'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
          }`}
        >
          <CheckCircle className="w-3.5 h-3.5" />
          <span>Qabul qilingan / Yopilgan</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-emerald-200 text-emerald-950">
            {tabCounts.completed}
          </span>
        </button>
      </div>

      {/* Search Input */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buyurtma ID, Mijoz, Telefon yoki Mahsulot..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* ORDERS TABLE - Cleaned up: ID, Sana, Mijoz, Sotuvchi, Holati, To'lov Holati, Jami summa */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Buyurtma ID</th>
                <th className="py-3 px-4">Sana</th>
                <th className="py-3 px-4">Mijoz</th>
                <th className="py-3 px-4">Sotuvchi</th>
                <th className="py-3 px-4">Holati</th>
                <th className="py-3 px-4">To'lov Holati</th>
                <th className="py-3 px-4 text-right">Jami summa</th>
                <th className="py-3 px-4 text-center">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    Buyurtmalar topilmadi.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  return (
                    <tr
                      key={order.id}
                      onClick={() => setInspectingOrder(order)}
                      className="hover:bg-blue-50/50 transition-colors cursor-pointer"
                      title="Buyurtma tafsilotlarini ko'rish uchun bosing"
                    >
                      {/* ID */}
                      <td className="py-3 px-4 font-mono font-bold text-blue-600 hover:underline">
                        {order.id}
                      </td>

                      {/* Date */}
                      <td className="py-3 px-4 text-slate-600 font-mono">{order.orderDate}</td>

                      {/* Client */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{order.clientName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{order.clientPhone}</div>
                      </td>

                      {/* Salesperson */}
                      <td className="py-3 px-4 text-slate-700">{order.salespersonName}</td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {order.status === 'active' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                            <Clock className="w-3 h-3" />
                            Ishda / Obyektda
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle className="w-3 h-3" />
                            Qabul qilingan
                          </span>
                        )}
                      </td>

                      {/* Payment Status */}
                      <td className="py-3 px-4">
                        {order.paymentStatus === 'paid' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle className="w-3 h-3" />
                            To'langan
                          </span>
                        )}
                        {order.paymentStatus === 'partial' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            <AlertCircle className="w-3 h-3" />
                            Qisman to'langan
                          </span>
                        )}
                        {order.paymentStatus === 'unpaid' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                            <AlertTriangle className="w-3 h-3" />
                            To'lanmagan
                          </span>
                        )}
                      </td>

                      {/* Grand Total */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 text-sm tabular-nums">
                        {formatUZS(order.grandTotalUZS)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setInspectingOrder(order)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded cursor-pointer"
                            title="Ko'rish"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingOrder({ ...order })}
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-slate-100 rounded cursor-pointer"
                            title="Tahrirlash (Izmenit)"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setSelectedAuditOrder(order)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded cursor-pointer"
                            title="O'zgartirishlar tarixi (Audit jurnali)"
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

      {/* INSPECT ORDER DETAILS MODAL (Shows Jami summa, Olingan pul, Qolgan qarz, Qachon pul beradi, and Actions) */}
      {inspectingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-xs">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-blue-600" />
                  <h3 className="text-base font-bold text-slate-900">
                    Buyurtma Tafsilotlari: {inspectingOrder.id}
                  </h3>
                </div>
                <div className="text-xs text-slate-600 mt-0.5">
                  Sana: {inspectingOrder.orderDate} · Sotuvchi: {inspectingOrder.salespersonName}
                </div>
              </div>
              <button
                onClick={() => setInspectingOrder(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Financial Breakdown (Jami, Olingan pul, Qolgan qarz, Qachon pul beradi) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">
                    Jami summa:
                  </span>
                  <div className="font-mono font-bold text-slate-900 text-base mt-0.5">
                    {formatUZS(inspectingOrder.grandTotalUZS)}
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">
                    Olingan pul:
                  </span>
                  <div className="font-mono font-bold text-emerald-700 text-base mt-0.5">
                    {formatUZS(inspectingOrder.paidAmountUZS)}
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">
                    Qolgan qarz:
                  </span>
                  <div className={`font-mono font-bold text-base mt-0.5 ${inspectingOrder.remainingAmountUZS > 0 ? 'text-rose-600' : 'text-slate-600'}`}>
                    {formatUZS(inspectingOrder.remainingAmountUZS)}
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">
                    To'lov muddati:
                  </span>
                  <div className="font-bold text-slate-800 text-xs mt-1">
                    {inspectingOrder.paymentDueDate || "Ko'rsatilmagan"}
                  </div>
                </div>
              </div>

              {/* Client & Delivery Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Mijoz ma'lumotlari:</div>
                  <div className="font-bold text-slate-900 mt-1">{inspectingOrder.clientName}</div>
                  <div className="text-slate-600 font-mono">{inspectingOrder.clientPhone}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Yetkazish manzili:</div>
                  <div className="text-slate-800 mt-1">{inspectingOrder.deliveryAddress || "Obyekt manzili kiritilmagan"}</div>
                </div>
              </div>

              {/* Tools List */}
              {inspectingOrder.tools.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-bold uppercase tracking-wider text-slate-800">
                    Ijaradagi Asboblar ({inspectingOrder.tools.length} ta)
                  </h4>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-3">Asbob nomi</th>
                          <th className="py-2 px-3 font-mono">Seriya (SN)</th>
                          <th className="py-2 px-3 text-center">Muddati</th>
                          <th className="py-2 px-3 text-right">Kunlik stavka</th>
                          <th className="py-2 px-3 text-right">Jami</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {inspectingOrder.tools.map((t, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-bold text-slate-900">{t.productName}</td>
                            <td className="py-2 px-3 font-mono font-bold text-blue-700">{t.serialNumberValue}</td>
                            <td className="py-2 px-3 text-center font-mono">{t.durationDays} kun</td>
                            <td className="py-2 px-3 text-right font-mono text-slate-600">{formatUZS(t.dailyRateUZS)}</td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">{formatUZS(t.lineTotalUZS)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Services List */}
              {(inspectingOrder.wasteServices?.length > 0 || inspectingOrder.craneServices?.length > 0 || inspectingOrder.loaderServices?.length > 0) && (
                <div className="space-y-2">
                  <h4 className="font-bold uppercase tracking-wider text-slate-800">
                    Qo'shilgan Xizmatlar
                  </h4>
                  <div className="space-y-1.5">
                    {inspectingOrder.wasteServices?.map((w, idx) => (
                      <div key={idx} className="p-2.5 bg-amber-50/60 border border-amber-200 rounded-lg flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-amber-900">Musir: {w.truckName}</span>
                            {w.partnerName && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                                Hamkor: {w.partnerName}
                              </span>
                            )}
                          </div>
                          <span className="text-slate-600 text-xs">({w.tripsCount} reys, {w.floorCount}-qavat, {w.hasElevator ? 'Lift bor' : 'Zina'})</span>
                        </div>
                        <span className="font-mono font-bold text-slate-900">{formatUZS(w.totalPriceUZS)}</span>
                      </div>
                    ))}

                    {inspectingOrder.craneServices?.map((c, idx) => (
                      <div key={idx} className="p-2.5 bg-indigo-50/60 border border-indigo-200 rounded-lg flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-indigo-900">Kran: {c.craneName}</span>
                            {c.partnerName && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-300">
                                Hamkor: {c.partnerName}
                              </span>
                            )}
                          </div>
                          <span className="text-slate-600 text-xs">({c.pricingType === 'hourly' ? `${c.hours} soat` : `${c.days} kun`})</span>
                        </div>
                        <span className="font-mono font-bold text-slate-900">{formatUZS(c.totalPriceUZS)}</span>
                      </div>
                    ))}

                    {inspectingOrder.loaderServices?.map((l, idx) => (
                      <div key={idx} className="p-2.5 bg-emerald-50/60 border border-emerald-200 rounded-lg flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-emerald-900">Yuk tashuvchilar: {l.numberOfLoaders} kishi</span>
                            {l.partnerName && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                                Brigada: {l.partnerName}
                              </span>
                            )}
                          </div>
                          <span className="text-slate-600 text-xs">({l.hours} soat, {l.weightKg} kg, {l.floorCount}-qavat)</span>
                        </div>
                        <span className="font-mono font-bold text-slate-900">{formatUZS(l.totalPriceUZS)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ACTION BUTTONS (Tahrirlash, Qabul qilish, Chop etish) */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {/* Print Invoice */}
                <button
                  onClick={() => setSelectedInvoiceOrder(inspectingOrder)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold border border-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-blue-600" />
                  <span>Chop etish (Chek / Faktura)</span>
                </button>

                {/* Edit */}
                <button
                  onClick={() => {
                    setEditingOrder({ ...inspectingOrder });
                  }}
                  className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg font-bold border border-amber-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Edit2 className="w-4 h-4 text-amber-600" />
                  <span>Tahrirlash (Izmenit)</span>
                </button>

                {/* Audit History */}
                <button
                  onClick={() => setSelectedAuditOrder(inspectingOrder)}
                  className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 rounded-lg font-bold border border-indigo-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="O'zgartirishlar tarixi"
                >
                  <History className="w-4 h-4 text-indigo-600" />
                  <span>Audit Tarixi</span>
                </button>

                {/* Return button if active */}
                {inspectingOrder.status === 'active' && (
                  <button
                    onClick={() => setReturningOrder(inspectingOrder)}
                    className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg font-bold border border-emerald-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4 text-emerald-600" />
                    <span>Qabul qilish (Vozvrat)</span>
                  </button>
                )}
              </div>

              <button
                onClick={() => setInspectingOrder(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg cursor-pointer"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT PAST ORDER MODAL */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Buyurtmani tahrirlash: {editingOrder.id}
                </h3>
              </div>
              <button
                onClick={() => setEditingOrder(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedOrder} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Buyurtma holati</label>
                  <select
                    value={editingOrder.status}
                    onChange={(e) =>
                      setEditingOrder({
                        ...editingOrder,
                        status: e.target.value as OrderStatus
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold"
                  >
                    <option value="active">Ishda / Obyektda</option>
                    <option value="completed">Qabul qilingan / Yopilgan</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">To'lov holati</label>
                  <select
                    value={editingOrder.paymentStatus}
                    onChange={(e) =>
                      setEditingOrder({
                        ...editingOrder,
                        paymentStatus: e.target.value as PaymentStatus
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold"
                  >
                    <option value="paid">To'langan</option>
                    <option value="partial">Qisman to'langan</option>
                    <option value="unpaid">To'lanmagan</option>
                  </select>
                </div>
              </div>

              {/* Payment amounts */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">Jami summa (so'm)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={editingOrder.grandTotalUZS}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditingOrder({
                        ...editingOrder,
                        grandTotalUZS: val === '' ? 0 : parseFloat(val) || 0
                      });
                    }}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-900 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">Olingan pul (so'm)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={editingOrder.paidAmountUZS}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditingOrder({
                        ...editingOrder,
                        paidAmountUZS: val === '' ? 0 : parseFloat(val) || 0
                      });
                    }}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-emerald-700 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">Qachon pul beradi?</label>
                  <input
                    type="date"
                    value={editingOrder.paymentDueDate || ''}
                    onChange={(e) =>
                      setEditingOrder({
                        ...editingOrder,
                        paymentDueDate: e.target.value
                      })
                    }
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Yetkazish manzili</label>
                <input
                  type="text"
                  value={editingOrder.deliveryAddress}
                  onChange={(e) =>
                    setEditingOrder({ ...editingOrder, deliveryAddress: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Izohlar / Qo'shimcha</label>
                <textarea
                  rows={2}
                  value={editingOrder.notes || ''}
                  onChange={(e) => setEditingOrder({ ...editingOrder, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingOrder(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm cursor-pointer"
                >
                  O'zgarishlarni saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE NEW ORDER MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-xs">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Yangi Buyurtma Rasmiylashtirish</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitNewOrder} className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Salesperson & Client */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Sotuvchi (Menejer) *</label>
                  <select
                    value={selectedSalespersonId}
                    onChange={(e) => setSelectedSalespersonId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold"
                  >
                    {salespersons.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.fullName} ({s.phone})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mijoz *</label>
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold"
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.fullName} - {c.phone}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Yetkazish manzili</label>
                <input
                  type="text"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Toshkent sh., Yunusobod 4-mavze 12-uy..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              {/* 1. ASBOBLAR IJARASI */}
              <div className="pt-2 border-t border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold uppercase text-slate-800 tracking-wider flex items-center gap-1.5">
                    <span>1. Ijaraga beriladigan asboblar</span>
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddToolRow}
                    className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Asbob qo'shish</span>
                  </button>
                </div>

                {selectedTools.length === 0 ? (
                  <div className="p-3 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-slate-500 text-center">
                    Hali asbob qo'shilmadi. "+ Asbob qo'shish" tugmasini bosing.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedTools.map((st, idx) => {
                      const prod = products.find((p) => p.id === st.productId);
                      const availableSerials = prod?.serials.filter((s) => s.status === 'available') || [];

                      return (
                        <div key={idx} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap items-center gap-2">
                          <div className="flex-1 min-w-[180px]">
                            <label className="block text-[10px] text-slate-500 mb-0.5">Asbob</label>
                            <select
                              value={st.productId}
                              onChange={(e) => {
                                const newP = products.find((p) => p.id === e.target.value);
                                const firstAvail = newP?.serials.find((s) => s.status === 'available');
                                const updated = [...selectedTools];
                                updated[idx].productId = e.target.value;
                                updated[idx].serialNumberId = firstAvail?.id || '';
                                setSelectedTools(updated);
                              }}
                              className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-slate-900"
                            >
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} ({p.serials.filter((s) => s.status === 'available').length} ta mavjud)
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="w-48">
                            <label className="block text-[10px] text-slate-500 mb-0.5">
                              Unikal Seriya (SN) *
                            </label>
                            <select
                              value={st.serialNumberId}
                              onChange={(e) => {
                                const updated = [...selectedTools];
                                updated[idx].serialNumberId = e.target.value;
                                setSelectedTools(updated);
                              }}
                              className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-slate-900 font-mono font-bold"
                            >
                              {availableSerials.length === 0 ? (
                                <option value="">Omborda bo'sh seriya yo'q</option>
                              ) : (
                                availableSerials.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.serialNumber}
                                  </option>
                                ))
                              )}
                            </select>
                          </div>

                          <div className="w-24">
                            <label className="block text-[10px] text-slate-500 mb-0.5">Kunlar</label>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={st.durationDays}
                              onChange={(e) => {
                                const updated = [...selectedTools];
                                const val = e.target.value;
                                updated[idx].durationDays = val === '' ? '' : parseInt(val) || 1;
                                setSelectedTools(updated);
                              }}
                              placeholder="1"
                              className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-slate-900 font-mono"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => setSelectedTools(selectedTools.filter((_, i) => i !== idx))}
                            className="p-1 text-slate-400 hover:text-rose-600 self-end cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 2. CHIQINDI (MUSIR) OLIB KETISH */}
              <div className="pt-2 border-t border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold uppercase text-amber-800 tracking-wider flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-amber-600" />
                    <span>2. Chiqindi olib ketish (Musir)</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedWaste([
                        ...selectedWaste,
                        {
                          truckConfigId: activeTrucks[0]?.id || 'wt-1',
                          tripsCount: 1,
                          m3Volume: activeTrucks[0]?.capacityM3 || 6,
                          floorCount: 1,
                          hasElevator: true,
                          isBagged: true,
                          isOversized: false
                        }
                      ])
                    }
                    className="text-xs text-amber-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Chiqindi xizmatini qo'shish</span>
                  </button>
                </div>

                {selectedWaste.length === 0 ? (
                  <div className="p-2.5 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-slate-400 text-center">
                    Chiqindi xizmati kiritilmagan.
                  </div>
                ) : (
                  selectedWaste.map((w, idx) => (
                    <div key={idx} className="p-3 bg-amber-50/50 border border-amber-200 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <select
                          value={w.truckConfigId}
                          onChange={(e) => {
                            const updated = [...selectedWaste];
                            updated[idx].truckConfigId = e.target.value;
                            setSelectedWaste(updated);
                          }}
                          className="px-2.5 py-1 bg-white border border-slate-300 rounded font-bold text-slate-900"
                        >
                          {activeTrucks.map((wt) => (
                            <option key={wt.id} value={wt.id}>
                              {wt.truckName} ({wt.capacityM3} m³) - {formatUZS(wt.pricePerTrip)}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setSelectedWaste(selectedWaste.filter((_, i) => i !== idx))}
                          className="text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div>
                          <label className="block text-[10px] text-slate-500">Reys soni:</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={w.tripsCount}
                            onChange={(e) => {
                              const updated = [...selectedWaste];
                              const val = e.target.value;
                              updated[idx].tripsCount = val === '' ? '' : parseInt(val) || 1;
                              setSelectedWaste(updated);
                            }}
                            placeholder="1"
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] text-slate-500">Qavat:</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={w.floorCount}
                            onChange={(e) => {
                              const updated = [...selectedWaste];
                              const val = e.target.value;
                              updated[idx].floorCount = val === '' ? '' : parseInt(val) || 1;
                              setSelectedWaste(updated);
                            }}
                            placeholder="1"
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono"
                          />
                        </div>

                        <div className="flex items-center gap-1.5 pt-4">
                          <input
                            type="checkbox"
                            checked={w.hasElevator}
                            onChange={(e) => {
                              const updated = [...selectedWaste];
                              updated[idx].hasElevator = e.target.checked;
                              setSelectedWaste(updated);
                            }}
                          />
                          <label className="text-[11px] text-slate-700">Lift bor</label>
                        </div>

                        <div className="flex items-center gap-1.5 pt-4">
                          <input
                            type="checkbox"
                            checked={w.isOversized}
                            onChange={(e) => {
                              const updated = [...selectedWaste];
                              updated[idx].isOversized = e.target.checked;
                              setSelectedWaste(updated);
                            }}
                          />
                          <label className="text-[11px] text-slate-700">Nogabarit</label>
                        </div>
                      </div>

                      {/* Partner Assignment */}
                      <div className="pt-2 border-t border-amber-200/60 flex items-center gap-2">
                        <label className="text-[10px] text-amber-900 font-bold whitespace-nowrap">
                          Pudratchi / Hamkor:
                        </label>
                        <select
                          value={w.partnerId || ''}
                          onChange={(e) => {
                            const p = partners.find((pt) => pt.id === e.target.value);
                            const updated = [...selectedWaste];
                            updated[idx].partnerId = e.target.value || undefined;
                            updated[idx].partnerName = p ? p.name : undefined;
                            setSelectedWaste(updated);
                          }}
                          className="flex-1 px-2 py-1 bg-white border border-amber-300 rounded text-slate-900 text-xs font-semibold"
                        >
                          <option value="">Hamkor biriktirilmagan (O'zimiz)</option>
                          {partners
                            .filter((p) => p.serviceType === 'waste_truck' || p.serviceType === 'all')
                            .map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.phone}) - {p.vehicleOrEquipmentDetails || 'Musir moshina'}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* 3. KRAN VA OG'IR TEXNIKA */}
              <div className="pt-2 border-t border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold uppercase text-indigo-800 tracking-wider flex items-center gap-1.5">
                    <HardHat className="w-4 h-4 text-indigo-600" />
                    <span>3. Kran va Og'ir texnika</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedCranes([
                        ...selectedCranes,
                        {
                          craneConfigId: activeCranes[0]?.id || 'cr-1',
                          pricingType: 'hourly',
                          hours: 3,
                          days: 1
                        }
                      ])
                    }
                    className="text-xs text-indigo-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Kran qo'shish</span>
                  </button>
                </div>

                {selectedCranes.length === 0 ? (
                  <div className="p-2.5 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-slate-400 text-center">
                    Kran xizmati kiritilmagan.
                  </div>
                ) : (
                  selectedCranes.map((c, idx) => (
                    <div key={idx} className="p-3 bg-indigo-50/50 border border-indigo-200 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <select
                          value={c.craneConfigId}
                          onChange={(e) => {
                            const updated = [...selectedCranes];
                            updated[idx].craneConfigId = e.target.value;
                            setSelectedCranes(updated);
                          }}
                          className="px-2.5 py-1 bg-white border border-slate-300 rounded font-bold text-slate-900"
                        >
                          {activeCranes.map((cr) => (
                            <option key={cr.id} value={cr.id}>
                              {cr.name} ({cr.tonnage}t) - {formatUZS(cr.hourlyRate)}/soat
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setSelectedCranes(selectedCranes.filter((_, i) => i !== idx))}
                          className="text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] text-slate-500">Tarif turi:</label>
                          <select
                            value={c.pricingType}
                            onChange={(e) => {
                              const updated = [...selectedCranes];
                              updated[idx].pricingType = e.target.value as any;
                              setSelectedCranes(updated);
                            }}
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded"
                          >
                            <option value="hourly">Soatlik</option>
                            <option value="daily">Kunlik (smena)</option>
                          </select>
                        </div>

                        {c.pricingType === 'hourly' ? (
                          <div>
                            <label className="block text-[10px] text-slate-500">Soat soni:</label>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={c.hours}
                              onChange={(e) => {
                                const updated = [...selectedCranes];
                                const val = e.target.value;
                                updated[idx].hours = val === '' ? '' : parseInt(val) || 1;
                                setSelectedCranes(updated);
                              }}
                              placeholder="3"
                              className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono"
                            />
                          </div>
                        ) : (
                          <div>
                            <label className="block text-[10px] text-slate-500">Kun soni:</label>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={c.days}
                              onChange={(e) => {
                                const updated = [...selectedCranes];
                                const val = e.target.value;
                                updated[idx].days = val === '' ? '' : parseInt(val) || 1;
                                setSelectedCranes(updated);
                              }}
                              placeholder="1"
                              className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono"
                            />
                          </div>
                        )}
                      </div>

                      {/* Partner Assignment */}
                      <div className="pt-2 border-t border-indigo-200/60 flex items-center gap-2">
                        <label className="text-[10px] text-indigo-900 font-bold whitespace-nowrap">
                          Pudratchi / Hamkor:
                        </label>
                        <select
                          value={c.partnerId || ''}
                          onChange={(e) => {
                            const p = partners.find((pt) => pt.id === e.target.value);
                            const updated = [...selectedCranes];
                            updated[idx].partnerId = e.target.value || undefined;
                            updated[idx].partnerName = p ? p.name : undefined;
                            setSelectedCranes(updated);
                          }}
                          className="flex-1 px-2 py-1 bg-white border border-indigo-300 rounded text-slate-900 text-xs font-semibold"
                        >
                          <option value="">Hamkor biriktirilmagan (O'zimiz)</option>
                          {partners
                            .filter((p) => p.serviceType === 'crane' || p.serviceType === 'all')
                            .map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.phone}) - {p.vehicleOrEquipmentDetails || 'Avtokran'}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* 4. YUK TASHUVCHILAR (GRUSCHIK) */}
              <div className="pt-2 border-t border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold uppercase text-emerald-800 tracking-wider flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-emerald-600" />
                    <span>4. Yuk tashuvchilar (Gruschik)</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedLoaders([
                        ...selectedLoaders,
                        {
                          numberOfLoaders: 2,
                          hours: 2,
                          weightKg: 200,
                          floorCount: 1,
                          hasElevator: true,
                          isOversized: false
                        }
                      ])
                    }
                    className="text-xs text-emerald-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Gruschik qo'shish</span>
                  </button>
                </div>

                {selectedLoaders.length === 0 ? (
                  <div className="p-2.5 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-slate-400 text-center">
                    Yuk tashuvchilar xizmati kiritilmagan.
                  </div>
                ) : (
                  selectedLoaders.map((l, idx) => (
                    <div key={idx} className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">Gruschiklar brigadasi #{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedLoaders(selectedLoaders.filter((_, i) => i !== idx))}
                          className="text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div>
                          <label className="block text-[10px] text-slate-500">Ishchilar soni:</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={l.numberOfLoaders}
                            onChange={(e) => {
                              const updated = [...selectedLoaders];
                              const val = e.target.value;
                              updated[idx].numberOfLoaders = val === '' ? '' : parseInt(val) || 1;
                              setSelectedLoaders(updated);
                            }}
                            placeholder="2"
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] text-slate-500">Soat:</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={l.hours}
                            onChange={(e) => {
                              const updated = [...selectedLoaders];
                              const val = e.target.value;
                              updated[idx].hours = val === '' ? '' : parseInt(val) || 1;
                              setSelectedLoaders(updated);
                            }}
                            placeholder="2"
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] text-slate-500">Og'irligi (kg):</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={l.weightKg}
                            onChange={(e) => {
                              const updated = [...selectedLoaders];
                              const val = e.target.value;
                              updated[idx].weightKg = val === '' ? '' : parseInt(val) || 0;
                              setSelectedLoaders(updated);
                            }}
                            placeholder="100"
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] text-slate-500">Qavat:</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={l.floorCount}
                            onChange={(e) => {
                              const updated = [...selectedLoaders];
                              const val = e.target.value;
                              updated[idx].floorCount = val === '' ? '' : parseInt(val) || 1;
                              setSelectedLoaders(updated);
                            }}
                            placeholder="1"
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-4 pt-1">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={l.hasElevator}
                            onChange={(e) => {
                              const updated = [...selectedLoaders];
                              updated[idx].hasElevator = e.target.checked;
                              setSelectedLoaders(updated);
                            }}
                          />
                          <label className="text-[11px] text-slate-700">Lift bor</label>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={l.isOversized}
                            onChange={(e) => {
                              const updated = [...selectedLoaders];
                              updated[idx].isOversized = e.target.checked;
                              setSelectedLoaders(updated);
                            }}
                          />
                          <label className="text-[11px] text-slate-700">Nogabarit yuk</label>
                        </div>
                      </div>

                      {/* Partner Assignment */}
                      <div className="pt-2 border-t border-emerald-200/60 flex items-center gap-2">
                        <label className="text-[10px] text-emerald-900 font-bold whitespace-nowrap">
                          Pudratchi / Brigada:
                        </label>
                        <select
                          value={l.partnerId || ''}
                          onChange={(e) => {
                            const p = partners.find((pt) => pt.id === e.target.value);
                            const updated = [...selectedLoaders];
                            updated[idx].partnerId = e.target.value || undefined;
                            updated[idx].partnerName = p ? p.name : undefined;
                            setSelectedLoaders(updated);
                          }}
                          className="flex-1 px-2 py-1 bg-white border border-emerald-300 rounded text-slate-900 text-xs font-semibold"
                        >
                          <option value="">Brigada biriktirilmagan (O'zimiz)</option>
                          {partners
                            .filter((p) => p.serviceType === 'loader' || p.serviceType === 'all')
                            .map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.phone}) - {p.vehicleOrEquipmentDetails || 'Yukchilar'}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* PAYMENT SECTION & GRAND TOTAL BREAKDOWN */}
              <div className="pt-3 border-t border-slate-200 bg-blue-50/50 p-4 rounded-xl space-y-3">
                <div className="flex flex-wrap items-center justify-between text-xs border-b border-blue-100 pb-2">
                  <div className="space-y-0.5">
                    <div>Asboblar ijarasi: <span className="font-mono font-bold text-slate-900">{formatUZS(calculatedNewOrder.subtotalTools)}</span></div>
                    <div>Garov depoziti: <span className="font-mono text-slate-600">{formatUZS(calculatedNewOrder.depositTools)}</span></div>
                    <div>Qo'shimcha xizmatlar: <span className="font-mono text-slate-600">{formatUZS(calculatedNewOrder.subtotalServices)}</span></div>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-slate-500 uppercase font-bold tracking-wider">Jami to'lov:</span>
                    <div className="text-xl font-bold font-mono text-blue-700">
                      {formatUZS(calculatedNewOrder.grandTotal)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 mb-0.5">To'lov holati</label>
                    <select
                      value={paymentStatus}
                      onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-900 font-semibold"
                    >
                      <option value="paid">To'liq to'langan</option>
                      <option value="partial">Qisman to'langan</option>
                      <option value="unpaid">To'lanmagan (Nasiya)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                      Olingan pul (so'm)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={paymentStatus === 'paid' ? calculatedNewOrder.grandTotal : paidAmountUZS}
                      disabled={paymentStatus === 'paid'}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPaidAmountUZS(val === '' ? '' : parseFloat(val) || 0);
                      }}
                      placeholder="0"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-900 font-mono disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                      Qachon pul beradi? (Muddati)
                    </label>
                    <input
                      type="date"
                      value={paymentDueDate}
                      onChange={(e) => setPaymentDueDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-900 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Izohlar</label>
                <textarea
                  rows={2}
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="Qo'shimcha kelishuvlar yoki ma'lumotlar..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
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
                  <span>Buyurtmani rasmiylashtirish</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM RETURN MODAL */}
      {returningOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center gap-2 text-emerald-600">
              <RotateCcw className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-900">
                Asboblarni qabul qilish: {returningOrder.id}
              </h3>
            </div>

            <p className="text-slate-600">
              Mijoz <strong>{returningOrder.clientName}</strong> tomonidan ijaraga olingan uskunalar omborga qaytarildimi?
              Tasdiqlangach, asboblarning seriya raqamlari yana omborda <strong>mavjud (bo'sh)</strong> holatga o'tadi.
            </p>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              {returningOrder.tools.map((t, idx) => (
                <div key={idx} className="flex justify-between font-mono">
                  <span>{t.productName}</span>
                  <span className="font-bold text-blue-700">{t.serialNumberValue}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                onClick={() => setReturningOrder(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg cursor-pointer"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleConfirmReturn}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs cursor-pointer"
              >
                Qabul qilishni tasdiqlash
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINTABLE INVOICE MODAL */}
      {selectedInvoiceOrder && (
        <PrintableInvoiceModal
          language={language}
          order={selectedInvoiceOrder}
          onClose={() => setSelectedInvoiceOrder(null)}
        />
      )}

      {/* AUDIT LOG MODAL FOR ORDERS */}
      {selectedAuditOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">
                  O'zgartirishlar tarixi: {selectedAuditOrder.id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedAuditOrder(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto text-xs">
              {(!selectedAuditOrder.auditLogs || selectedAuditOrder.auditLogs.length === 0) ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-500">
                  <p className="font-semibold text-slate-700">Yaratilgan sana: {selectedAuditOrder.orderDate}</p>
                  <p className="text-[11px] mt-1">Ushbu buyurtma bo'yicha boshqa o'zgartirishlar kiritilmagan.</p>
                </div>
              ) : (
                selectedAuditOrder.auditLogs.map((log) => (
                  <div key={log.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <div className="flex items-center justify-between text-slate-500 text-[11px]">
                      <span className="font-bold text-indigo-700">{log.action}</span>
                      <span className="font-mono">{log.timestamp}</span>
                    </div>
                    <div className="text-slate-800 font-medium">{log.details}</div>
                    <div className="text-[10px] text-slate-500">Mas'ul: {log.operator}</div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-200">
              <button
                onClick={() => setSelectedAuditOrder(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-semibold text-xs cursor-pointer"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
