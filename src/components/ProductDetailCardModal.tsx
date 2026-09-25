import React, { useState } from 'react';
import {
  X,
  Layers,
  Tag,
  Building,
  Calendar,
  User,
  Wrench,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Plus,
  FileSpreadsheet,
  QrCode,
  DollarSign,
  Package,
  FileText,
  Truck,
  RotateCcw,
  ShieldCheck,
  Barcode,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Trash2
} from 'lucide-react';
import { Product, ProductMovement, MovementType, SerialNumber, SerialStatus } from '../types';
import { formatUZS } from '../utils/pricing';

interface Props {
  isOpen: boolean;
  product: Product | null;
  onClose: () => void;
  onUpdateProduct: (updated: Product) => void;
  onDeleteProduct?: (productId: string) => void;
  onNavigateToOrder?: (orderId: string) => void;
  currentUser?: string;
}

export const ProductDetailCardModal: React.FC<Props> = ({
  isOpen,
  product,
  onClose,
  onUpdateProduct,
  onDeleteProduct,
  onNavigateToOrder,
  currentUser = 'Boshqaruvchi'
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'history' | 'serials'>('info');
  const [isAddMovementOpen, setIsAddMovementOpen] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [selectedSerialForTimeline, setSelectedSerialForTimeline] = useState<SerialNumber | null>(null);

  // New movement form state
  const [movementType, setMovementType] = useState<MovementType>('technician');
  const [movementSerial, setMovementSerial] = useState<string>('');
  const [technicianName, setTechnicianName] = useState('');
  const [clientName, setClientName] = useState('');
  const [orderId, setOrderId] = useState('');
  const [reason, setReason] = useState('');
  const [costUZS, setCostUZS] = useState<number>(0);
  const [movementNotes, setMovementNotes] = useState('');
  const [movementDate, setMovementDate] = useState(new Date().toISOString().slice(0, 10));

  if (!isOpen || !product) return null;

  const availableCount = product.serials.filter((s) => s.status === 'available').length;
  const rentedCount = product.serials.filter((s) => s.status === 'rented').length;
  const maintenanceCount = product.serials.filter((s) => s.status === 'maintenance').length;
  const movements = product.movementHistory || [];

  const handleAddMovement = (e: React.FormEvent) => {
    e.preventDefault();

    const newMovement: ProductMovement = {
      id: `mov-${Date.now()}`,
      productId: product.id,
      productName: product.name,
      serialNumber: movementSerial || undefined,
      type: movementType,
      date: movementDate,
      operator: currentUser,
      clientName: clientName.trim() || undefined,
      orderId: orderId.trim() || undefined,
      technicianName: technicianName.trim() || undefined,
      warehouse: product.warehouse || 'Bosh ombor',
      reason: reason.trim() || undefined,
      costUZS: costUZS > 0 ? costUZS : undefined,
      notes: movementNotes.trim() || undefined,
      createdAt: new Date().toISOString()
    };

    // If movement is technician, update the serial status to maintenance if selected
    let updatedSerials = [...product.serials];
    if (movementSerial) {
      updatedSerials = updatedSerials.map((s) => {
        if (s.serialNumber === movementSerial) {
          if (movementType === 'technician') {
            return { ...s, status: 'maintenance' as SerialStatus, notes: reason || 'Ustaga berilgan' };
          } else if (movementType === 'return' || movementType === 'maintenance') {
            return { ...s, status: 'available' as SerialStatus, currentOrderId: undefined, currentClientName: undefined };
          } else if (movementType === 'rent') {
            return { ...s, status: 'rented' as SerialStatus, currentClientName: clientName, currentOrderId: orderId };
          }
        }
        return s;
      });
    }

    const updatedProduct: Product = {
      ...product,
      serials: updatedSerials,
      movementHistory: [newMovement, ...movements]
    };

    onUpdateProduct(updatedProduct);
    setIsAddMovementOpen(false);

    // Reset form
    setTechnicianName('');
    setClientName('');
    setOrderId('');
    setReason('');
    setCostUZS(0);
    setMovementNotes('');
    setMovementSerial('');
  };

  const handleQuickStatusChange = (serialNumber: string, newStatus: SerialStatus) => {
    const updatedSerials = product.serials.map((s) => {
      if (s.serialNumber === serialNumber) {
        return { ...s, status: newStatus };
      }
      return s;
    });

    let newMovType: MovementType = 'return';
    let movReason = 'Holat yangilandi';
    if (newStatus === 'maintenance') {
      newMovType = 'technician';
      movReason = 'Ustaga topshirildi / Ta\'mirga olindi';
    } else if (newStatus === 'available') {
      newMovType = 'return';
      movReason = 'Omborda mavjud qilindi';
    } else if (newStatus === 'rented') {
      newMovType = 'rent';
      movReason = 'Ijaraga berildi';
    } else if (newStatus === 'decommissioned') {
      newMovType = 'write_off';
      movReason = 'Hisobdan chiqarildi';
    }

    const autoMovement: ProductMovement = {
      id: `mov-${Date.now()}`,
      productId: product.id,
      productName: product.name,
      serialNumber,
      type: newMovType,
      date: new Date().toISOString().slice(0, 10),
      operator: currentUser,
      warehouse: product.warehouse || 'Bosh ombor',
      reason: movReason,
      createdAt: new Date().toISOString()
    };

    onUpdateProduct({
      ...product,
      serials: updatedSerials,
      movementHistory: [autoMovement, ...movements]
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* HEADER SECTION */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            {product.image ? (
              <img
                src={product.image}
                alt={product.name}
                className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-xl border-2 border-white/20 shadow-md bg-white shrink-0"
              />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/10 rounded-xl flex items-center justify-center text-blue-300 border border-white/15 shrink-0">
                <Package className="w-8 h-8" />
              </div>
            )}

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  {product.category}
                </span>
                <span className="font-mono text-xs text-amber-300 font-bold bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                  SKU: {product.sku}
                </span>
                {product.barcode && (
                  <span className="inline-flex items-center gap-1 font-mono text-[11px] text-emerald-300 font-bold bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20">
                    <Barcode className="w-3.5 h-3.5" />
                    <span>{product.barcode}</span>
                  </span>
                )}
              </div>

              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                {product.name}
              </h2>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
                <span className="flex items-center gap-1">
                  <Building className="w-3.5 h-3.5 text-blue-400" />
                  <span>{product.warehouse || 'Bosh ombor'}</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Yaratgan: {product.createdBy || 'Boshqaruvchi'}</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{product.createdAt}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onDeleteProduct && (
              <button
                onClick={() => setIsConfirmingDelete(true)}
                className="p-1.5 text-rose-300 hover:text-white hover:bg-rose-600/30 rounded-lg transition-colors cursor-pointer"
                title="Mahsulotni o'chirish"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* METRICS STRIP */}
        <div className="grid grid-cols-2 sm:grid-cols-4 bg-slate-50 border-b border-slate-200 divide-x divide-slate-200 text-xs">
          <div className="p-3 text-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Kunlik Ijara</span>
            <span className="text-base font-black text-slate-900 font-mono">
              {formatUZS(product.dailyRate)}
            </span>
          </div>

          <div className="p-3 text-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Garov Depoziti</span>
            <span className="text-base font-black text-indigo-700 font-mono">
              {formatUZS(product.depositAmount)}
            </span>
          </div>

          <div className="p-3 text-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Omborda Mavjud</span>
            <span className="text-base font-black text-emerald-700 font-mono">
              {availableCount} <span className="text-xs text-slate-500 font-normal">/ {product.totalQuantity} dona</span>
            </span>
          </div>

          <div className="p-3 text-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Ijarada / Ta'mirda</span>
            <span className="text-base font-black text-amber-700 font-mono">
              {rentedCount} <span className="text-xs text-slate-500 font-normal">ijarada</span> · {maintenanceCount} <span className="text-xs text-slate-500 font-normal">servis</span>
            </span>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex border-b border-slate-200 px-6 bg-white gap-4">
          <button
            onClick={() => setActiveTab('info')}
            className={`py-3 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'info'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Mahsulot Tavsifi va Ma'lumotlari</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`py-3 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Mahsulot harakati ({movements.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('serials')}
            className={`py-3 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'serials'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>Seriya Raqamlari ({product.serials.length})</span>
          </button>
        </div>

        {/* MODAL CONTENT BODY */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: PRODUCT INFO & DESCRIPTION */}
          {activeTab === 'info' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Rich Description Box */}
              <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span>Mahsulot haqida to'liq izoh va foydalanish sohasi:</span>
                </div>
                {product.description ? (
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {product.description}
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 italic">
                    Ushbu mahsulot uchun izoh kiritilmagan. Tahrirlash orqali uning nima ekanligi va nima maqsadda ishlatilishini yozib qo'yishingiz mumkin.
                  </p>
                )}
              </div>

              {/* Barcode & Inventory details grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white">
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                    <Barcode className="w-4 h-4 text-slate-600" />
                    <span>Shtrix-kod va Identifikatsiya</span>
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-500">Shtrix-kod (Barcode):</span>
                      <span className="font-mono font-bold text-slate-900">
                        {product.barcode || 'Mavjud emas'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-500">Artikul (SKU):</span>
                      <span className="font-mono font-bold text-blue-700">{product.sku}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-500">Brend / Ishlab chiqaruvchi:</span>
                      <span className="font-bold text-slate-800">{product.brand || 'Ko‘rsatilmagan'}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">O‘lchov birligi:</span>
                      <span className="font-bold text-slate-800">{product.unit || 'dona'}</span>
                    </div>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white">
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                    <Building className="w-4 h-4 text-slate-600" />
                    <span>Omborxona va Joylashuv</span>
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-500">Asosiy ombor:</span>
                      <span className="font-bold text-slate-900">{product.warehouse || 'Bosh ombor'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-500">Guruh:</span>
                      <span className="font-bold text-slate-800">{product.group || 'Asosiy fond'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-500">Xarid qiymati:</span>
                      <span className="font-mono font-bold text-slate-900">{formatUZS(product.purchasePriceUZS)}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Yaratgan mas'ul:</span>
                      <span className="font-bold text-indigo-700">{product.createdBy || 'Boshqaruvchi'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LIFECYCLE / MOVEMENT HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Mahsulot Harakati Tarixi</h3>
                  <p className="text-xs text-slate-500">Kirim, ijaraga berish, ustaga topshirish va qaytarish jurnali</p>
                </div>

                <button
                  onClick={() => setIsAddMovementOpen(!isAddMovementOpen)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Harakat qo'shish (Ustaga / Mijozga)</span>
                </button>
              </div>

              {/* Collapsible Form: Add new movement */}
              {isAddMovementOpen && (
                <form
                  onSubmit={handleAddMovement}
                  className="bg-slate-50 border border-blue-200 rounded-xl p-4 space-y-3 text-xs"
                >
                  <div className="font-bold text-slate-900 flex items-center justify-between border-b border-slate-200 pb-2">
                    <span>Yangi harakat qaydini yozish</span>
                    <button
                      type="button"
                      onClick={() => setIsAddMovementOpen(false)}
                      className="text-slate-400 hover:text-slate-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Harakat turi *
                      </label>
                      <select
                        value={movementType}
                        onChange={(e) => setMovementType(e.target.value as MovementType)}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                      >
                        <option value="technician">Ustaga berilgan (Ta'mir / Profilaktika)</option>
                        <option value="return">Omborga qaytarilgan (Mavjud bo'ldi)</option>
                        <option value="rent">Ijaraga berilgan (Mijozga)</option>
                        <option value="transfer">Boshqa omborga o'tkazilgan</option>
                        <option value="write_off">Hisobdan chiqarilgan</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Seriya raqami (agar aniq seriya bo'lsa)
                      </label>
                      <select
                        value={movementSerial}
                        onChange={(e) => setMovementSerial(e.target.value)}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono"
                      >
                        <option value="">Barcha seriyalar / Tanlanmagan</option>
                        {product.serials.map((s) => (
                          <option key={s.id} value={s.serialNumber}>
                            {s.serialNumber} ({s.status})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Sana *
                      </label>
                      <input
                        type="date"
                        required
                        value={movementDate}
                        onChange={(e) => setMovementDate(e.target.value)}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                      />
                    </div>
                  </div>

                  {/* Context inputs depending on type */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {movementType === 'technician' && (
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Usta / Texnik / Servis ustaxonasi nomi *
                        </label>
                        <input
                          type="text"
                          required
                          value={technicianName}
                          onChange={(e) => setTechnicianName(e.target.value)}
                          placeholder="Masalan: Usta Shuhrat (Bosch Servis)"
                          className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                        />
                      </div>
                    )}

                    {movementType === 'rent' && (
                      <>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Mijoz nomi *
                          </label>
                          <input
                            type="text"
                            required
                            value={clientName}
                            onChange={(e) => setClientName(e.target.value)}
                            placeholder="Mijoz ismi yoki tashkilot"
                            className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Buyurtma ID
                          </label>
                          <input
                            type="text"
                            value={orderId}
                            onChange={(e) => setOrderId(e.target.value)}
                            placeholder="ORD-1002"
                            className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono"
                          />
                        </div>
                      </>
                    )}

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Sabab yoki batafsil tavsif
                      </label>
                      <input
                        type="text"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Masalan: Rejali moylash, cho'tka almashtirish yoki nosozlik"
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Xarajat summasi (so'm)
                      </label>
                      <input
                        type="number"
                        value={costUZS || ''}
                        onChange={(e) => setCostUZS(Number(e.target.value))}
                        placeholder="0"
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Qo'shimcha izoh
                    </label>
                    <input
                      type="text"
                      value={movementNotes}
                      onChange={(e) => setMovementNotes(e.target.value)}
                      placeholder="Qo'shimcha tafsilotlar..."
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setIsAddMovementOpen(false)}
                      className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-bold cursor-pointer"
                    >
                      Bekor qilish
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold cursor-pointer"
                    >
                      Harakatni saqlash
                    </button>
                  </div>
                </form>
              )}

              {/* Movements Timeline List */}
              {movements.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl text-slate-500 text-xs space-y-2">
                  <Clock className="w-8 h-8 text-slate-400 mx-auto" />
                  <p>Hozircha harakat tarixi mavjud emas.</p>
                  <p className="text-[11px] text-slate-400">
                    Ushbu asbob ustaga berilganda yoki ijaraga topshirilganda yuqoridagi "+ Harakat qo'shish" orqali jurnalga yozib boring.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {movements.map((mov) => {
                    let badgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
                    let typeIcon = <RotateCcw className="w-3.5 h-3.5" />;
                    let title = 'Omborga qaytarilgan';

                    if (mov.type === 'technician') {
                      badgeColor = 'bg-amber-50 text-amber-800 border-amber-200';
                      typeIcon = <Wrench className="w-3.5 h-3.5" />;
                      title = `Ustaga berilgan (${mov.technicianName || 'Usta'})`;
                    } else if (mov.type === 'rent') {
                      badgeColor = 'bg-indigo-50 text-indigo-700 border-indigo-200';
                      typeIcon = <User className="w-3.5 h-3.5" />;
                      title = `Ijaraga berilgan (${mov.clientName || 'Mijoz'})`;
                    } else if (mov.type === 'intake') {
                      badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                      typeIcon = <Package className="w-3.5 h-3.5" />;
                      title = 'Kirim qilingan';
                    }

                    return (
                      <div
                        key={mov.id}
                        className="p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50/70 transition-colors text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] border ${badgeColor}`}>
                              {typeIcon}
                              <span>{title}</span>
                            </span>
                            {mov.serialNumber && (
                              <span className="font-mono text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-bold">
                                SN: {mov.serialNumber}
                              </span>
                            )}
                            <span className="text-slate-400 font-mono text-[11px]">{mov.date}</span>
                          </div>

                          <div className="text-slate-800 font-medium">
                            {mov.reason || mov.notes || 'Harakat amalga oshirildi'}
                          </div>

                          <div className="text-[11px] text-slate-500 flex items-center gap-2">
                            <span>Mas'ul: <strong>{mov.operator}</strong></span>
                            {mov.warehouse && <span>· Ombor: {mov.warehouse}</span>}
                            {mov.orderId && (
                              <span
                                onClick={() => onNavigateToOrder && onNavigateToOrder(mov.orderId!)}
                                className="text-blue-600 font-bold hover:underline cursor-pointer flex items-center gap-0.5"
                              >
                                <span>Buyurtma #{mov.orderId}</span>
                                <ExternalLink className="w-3 h-3" />
                              </span>
                            )}
                          </div>
                        </div>

                        {mov.costUZS !== undefined && mov.costUZS > 0 && (
                          <div className="text-right shrink-0">
                            <div className="text-[10px] text-slate-500">Xarajat / To'lov</div>
                            <div className="font-mono font-bold text-slate-900 text-xs">
                              {formatUZS(mov.costUZS)}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: INDIVIDUAL SERIAL NUMBERS */}
          {activeTab === 'serials' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Seriya Raqamlari Nazorati</h3>
                  <p className="text-xs text-slate-500">Har bir uskunaning joriy holati va tezkor boshqaruv</p>
                </div>
                <div className="text-xs text-slate-500 font-mono">
                  Jami: <strong>{product.serials.length} dona</strong>
                </div>
              </div>

              {product.serials.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl text-slate-500 text-xs">
                  Ushbu mahsulotga hali seriya raqamlari kiritilmagan. Kirim qilgandan so'ng "Joylashtirish" bo'limida seriyalar yaratiladi.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Seriya Raqami (Xronologiya uchun bosing)</th>
                        <th className="py-2.5 px-3 text-center">Joriy Holat</th>
                        <th className="py-2.5 px-3">Mijoz / Buyurtma</th>
                        <th className="py-2.5 px-3 text-right">Joylashtirilgan sana</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {product.serials.map((s, idx) => (
                        <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3 font-mono text-slate-400">{idx + 1}</td>
                          <td className="py-2.5 px-3">
                            <button
                              type="button"
                              onClick={() => setSelectedSerialForTimeline(s)}
                              className="font-mono font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1.5 cursor-pointer text-left"
                              title="Ushbu seriya xronologiyasi va to'liq tarixini ko'rish uchun bosing"
                            >
                              <QrCode className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span>{s.serialNumber}</span>
                            </button>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {s.status === 'available' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                Omborda mavjud
                              </span>
                            )}
                            {s.status === 'rented' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                                Ijarada
                              </span>
                            )}
                            {s.status === 'maintenance' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                Ustada / Ta'mirda
                              </span>
                            )}
                            {s.status === 'decommissioned' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                                Hisobdan chiqqan
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {s.currentClientName ? (
                              <div>
                                <span className="font-bold text-slate-900">{s.currentClientName}</span>
                                {s.currentOrderId && (
                                  <span className="text-[10px] font-mono text-slate-400 ml-1">
                                    (#{s.currentOrderId})
                                  </span>
                                )}
                              </div>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-500 text-[11px]">
                            {s.placementDate || s.assignedDate || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* SERIAL TIMELINE MODAL */}
        {selectedSerialForTimeline && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 space-y-4 max-h-[88vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 font-mono flex items-center gap-2">
                      <span>{selectedSerialForTimeline.serialNumber}</span>
                      <span
                        className={`text-[10px] font-sans px-2 py-0.5 rounded-full font-bold ${
                          selectedSerialForTimeline.status === 'available'
                            ? 'bg-emerald-100 text-emerald-800'
                            : selectedSerialForTimeline.status === 'rented'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {selectedSerialForTimeline.status === 'available'
                          ? 'Omborda'
                          : selectedSerialForTimeline.status === 'rented'
                          ? 'Ijarada'
                          : 'Ta\'mirda'}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 font-sans">
                      {product.name} ({product.sku})
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedSerialForTimeline(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Timeline Overview Info */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Kirim Sanasi</span>
                  <span className="font-semibold text-slate-900 font-mono">
                    {selectedSerialForTimeline.inboundDate || product.createdAt || 'Asosiy kirim'}
                  </span>
                  {selectedSerialForTimeline.inboundId && (
                    <div className="text-[10px] text-blue-600 font-mono">
                      Hujjat: {selectedSerialForTimeline.inboundId}
                    </div>
                  )}
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Joylashtirish Sanasi</span>
                  <span className="font-semibold text-slate-900 font-mono">
                    {selectedSerialForTimeline.placementDate || selectedSerialForTimeline.assignedDate || '—'}
                  </span>
                  <div className="text-[10px] text-emerald-700">
                    Holati: faol inventarda
                  </div>
                </div>
              </div>

              {/* Chronological Timeline Stream */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  <span>Xronologik Harakatlar Tarixi</span>
                </h4>

                {(() => {
                  const serialMovements = (product.movementHistory || []).filter(
                    (m) => !m.serialNumber || m.serialNumber === selectedSerialForTimeline.serialNumber
                  );

                  return (
                    <div className="space-y-2.5 border-l-2 border-blue-200 ml-3 pl-4">
                      {/* 1. Inbound Milestone */}
                      <div className="relative text-xs space-y-0.5">
                        <div className="absolute -left-[23px] top-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-emerald-800">Omborga Kirim Qilindi</span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {selectedSerialForTimeline.inboundDate || product.createdAt || '—'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600">
                          {selectedSerialForTimeline.inboundId ? `Kirim hujjati ID: ${selectedSerialForTimeline.inboundId}` : "Birlamchi kirim orqali qabul qilindi"}
                        </p>
                      </div>

                      {/* 2. Placement Milestone */}
                      <div className="relative text-xs space-y-0.5">
                        <div className="absolute -left-[23px] top-0.5 w-3 h-3 rounded-full bg-blue-500 border-2 border-white" />
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-blue-800">Joylashtirildi (Seriya Biriktirildi)</span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {selectedSerialForTimeline.placementDate || selectedSerialForTimeline.assignedDate || '—'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 font-mono">
                          SN: {selectedSerialForTimeline.serialNumber} · {selectedSerialForTimeline.notes || "Ombor javoniga joylashtirildi"}
                        </p>
                      </div>

                      {/* 3. Movements History: Rents, Returns, Maintenance */}
                      {serialMovements.map((mov) => {
                        let dotColor = 'bg-blue-500';
                        let movTitle = 'Harakat amalga oshirildi';

                        if (mov.type === 'rent') {
                          dotColor = 'bg-indigo-500';
                          movTitle = `Ijaraga berildi (${mov.clientName || 'Mijoz'})`;
                        } else if (mov.type === 'return') {
                          dotColor = 'bg-emerald-500';
                          movTitle = 'Omborga qaytarildi';
                        } else if (mov.type === 'technician') {
                          dotColor = 'bg-amber-500';
                          movTitle = `Ta'mirga / Ustaga berildi (${mov.technicianName || 'Usta'})`;
                        } else if (mov.type === 'maintenance') {
                          dotColor = 'bg-teal-500';
                          movTitle = 'Servis / Profilaktika yakunlandi';
                        }

                        return (
                          <div key={mov.id} className="relative text-xs space-y-0.5">
                            <div className={`absolute -left-[23px] top-0.5 w-3 h-3 rounded-full ${dotColor} border-2 border-white`} />
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">{movTitle}</span>
                              <span className="text-[10px] font-mono text-slate-400">{mov.date}</span>
                            </div>
                            <p className="text-[11px] text-slate-600">
                              {mov.reason || mov.notes || 'Harakat tafsiloti'}
                            </p>
                            {mov.orderId && (
                              <div className="text-[10px] text-blue-600 font-mono">
                                Buyurtma: #{mov.orderId}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSelectedSerialForTimeline(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold text-xs cursor-pointer"
                >
                  Yopish
                </button>
              </div>
926:       </div>
927:     </div>
928:   )}
931: 
932:   {/* MODAL FOOTER */}        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500 font-mono">
            ID: {product.id}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Yopish
            </button>
          </div>
        </div>
      </div>

      {/* CONFIRM DELETE MODAL */}
      {isConfirmingDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Mahsulotni o'chirish
                </h3>
              </div>
              <button
                onClick={() => setIsConfirmingDelete(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="font-bold text-slate-900 text-sm">{product.name}</div>
                <div className="text-slate-500 font-mono">SKU: {product.sku}</div>
              </div>

              {product.serials.some((s) => s.status === 'rented') ? (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 leading-relaxed space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-rose-950">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Diqqat: Ushbu mahsulot hozirda ijarada!</span>
                  </div>
                  <p>
                    Ushbu mahsulotning nusxalari mijozlarga ijaraga berilgan. O'chirish hisobotlarga ta'sir qilishi mumkin. Haqiqatan ham o'chirmoqchimisiz?
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
                onClick={() => setIsConfirmingDelete(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold cursor-pointer"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteProduct) {
                    onDeleteProduct(product.id);
                  }
                  setIsConfirmingDelete(false);
                  onClose();
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
    </div>
  );
};
