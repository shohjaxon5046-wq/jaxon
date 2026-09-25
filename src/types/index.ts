// Global Types for Shohrent Platform

export type Language = 'uz' | 'ru';
export type Currency = 'UZS' | 'USD';
export type UserRole = 'admin' | 'seller' | 'master' | 'assembler' | 'warehouse' | 'custom';

export type StaffRoleType =
  | 'admin'          // Boshqaruvchi / Admin
  | 'seller'         // Sotuvchi / Menejer
  | 'master'         // Usta / Texnik ta'mirchi
  | 'assembler'      // Yig'uvchi / Komplektovshik
  | 'warehouse'      // Omborchi / Zavsklad
  | 'driver'         // Haydovchi / Logist
  | 'accountant'     // Buxgalter / Kassir
  | 'custom';        // Boshqa maxsus lavozim

export interface StaffPermissions {
  canViewDashboard: boolean;
  canViewCalculator: boolean;
  canManageOrders: boolean;
  canManageProducts: boolean;
  canViewPriceCatalog: boolean;
  canManageClients: boolean;
  canManageIntake: boolean;
  canManagePlacement: boolean;
  canManageServices: boolean;
  canManageSuppliers: boolean;
  canManageStaff: boolean;
  canViewFinancials: boolean;
  canViewCommissions?: boolean;
  canManagePartners?: boolean;
}

export interface StaffMember {
  id: string;
  fullName: string;
  role: StaffRoleType;
  customRoleName?: string;
  phone: string;
  email?: string;
  username: string;
  password?: string;
  warehouse?: string; // Masalan: "Bosh ombor", "Chilonzor filiali"
  status: 'active' | 'inactive';
  avatar?: string;
  salaryType?: 'fixed' | 'commission' | 'hourly' | 'per_task';
  baseSalaryUZS?: number;
  commissionPercent?: number;
  hireDate: string;
  notes?: string;
  permissions: StaffPermissions;
  lastLogin?: string;
  createdAt: string;
  updatedAt?: string;
}

export type SerialStatus = 'available' | 'rented' | 'maintenance' | 'decommissioned';

export type MovementType =
  | 'intake'        // Kirim qilingan
  | 'placement'     // Joylashtirish / Qator o'zgarishi
  | 'rent'          // Ijaraga berilgan (Mijozga)
  | 'return'        // Qaytarib olingan (Omborga)
  | 'technician'    // Ustaga berilgan (Ta'mir / Profilaktika)
  | 'maintenance'   // Servisdan qaytgan
  | 'transfer'      // Boshqa omborga o'tkazilgan
  | 'write_off';    // Hisobdan chiqarilgan

export interface ProductMovement {
  id: string;
  productId: string;
  productName: string;
  serialNumber?: string;
  type: MovementType;
  date: string;
  operator: string;             // Mas'ul xodim
  clientName?: string;          // Mijoz
  orderId?: string;             // Buyurtma ID
  technicianName?: string;      // Usta ismi / Servis ustaxonasi
  warehouse?: string;           // Omborxona
  reason?: string;              // Sabab yoki tavsif
  costUZS?: number;             // Xarajat yoki ijara summasi
  notes?: string;               // Qo'shimcha izoh
  createdAt?: string;
}

export interface SerialNumber {
  id: string;
  serialNumber: string;
  status: SerialStatus;
  notes?: string;
  assignedDate: string;
  createdAt?: string;
  currentOrderId?: string;
  currentClientName?: string;
  inboundId?: string;
  inboundDate?: string;
  placementDate?: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  group: string;
  brand?: string;
  model?: string;
  barcode?: string; // 13-digit EAN-13 yoki Shtrix-kod
  unit?: string; // 'dona' | 'L' | 'metr' | 'kg' | 'm2' | 'komplekt'
  description?: string; // Mahsulot haqida to'liq izoh/tavsif (nima ekanligi va nima uchun ishlatilishi)
  warehouse?: string; // Masalan: "Bosh ombor", "Chilonzor filiali", "Yunusobod ombori"
  createdBy?: string; // Mahsulotni yaratgan xodim
  image?: string;
  dailyRate: number; // UZS
  depositAmount: number; // UZS
  discountPercent?: number; // % chegirma
  discountRateUZS?: number; // Chegirmali kunlik stavka
  purchasePriceUZS: number;
  targetPaybackDays?: number; // Maqsadli to'lov kunlari (masalan, 30-60 kun)
  targetMarginPercent?: number; // Maqsadli foyda marjasi % (default 5%)
  totalQuantity: number;
  serials: SerialNumber[];
  movementHistory?: ProductMovement[]; // Mahsulotning to'liq harakat tarixi
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
}

export interface SupplierTransaction {
  id: string;
  date: string;
  type: 'intake' | 'payment';
  amountUZS: number;
  intakeId?: string;
  paymentMethod?: string;
  notes?: string;
  operator?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  address?: string;
  totalSuppliedUZS: number;
  totalPaidUZS: number;
  balanceUZS: number; // Musbat = ortiqcha to'langan / avans, Manfiy = bizning qarzimiz
  notes?: string;
  createdAt: string;
  transactions?: SupplierTransaction[];
}

// Waste Truck Configuration
export interface WasteLoadingOptions {
  pricePerFloorNoElevator: number; // UZS per floor
  hasElevatorDiscount: number; // UZS
  baggedSurcharge: number; // Qoplangan chiqindi
  looseSurcharge: number; // Qoplanmagan / sochiluvchan
  oversizeSurcharge: number; // Nogabarit
}

export interface WasteTruckConfig {
  id: string;
  truckName: string; // e.g. "ZIL Samosval", "KamAZ 10m³"
  capacityM3: number; // 5, 10, 15, 20 m3
  pricePerTrip: number; // UZS
  pricePerM3: number; // UZS
  loadingServicePrice?: number; // Yuklash xizmati / Gruschiklar narxi (per trip / mashina)
  floorHandlingFee?: number;
  elevatorFee?: number;
  oversizedFee?: number;
  isAvailable?: boolean;
  loadingRules?: WasteLoadingOptions;
}

// Cranes & Heavy Machinery
export interface CraneConfig {
  id: string;
  name: string;
  tonnage: number; // 4, 10, 16, 25 tons
  hourlyRate: number; // UZS
  dailyRate: number; // UZS
  discountPercent?: number; // Chegirma foizi %
  discountHourlyRate?: number; // Chegirmali soatlik narx
  discountDailyRate?: number; // Chegirmali kunlik narx
  minHours: number; // e.g. 4 hours
  multiDayDiscountPercent: number; // e.g. 15%
  isAvailable?: boolean;
}

// Hand Labor / Loaders (Gruschik) Pricing Matrix
export interface LoaderPricingRules {
  baseHourlyPerPerson: number; // e.g. 70,000 UZS
  pricePerKg: number; // e.g. 150 UZS per kg
  ratePerFloorNoElevator: number; // e.g. 15,000 UZS per floor
  elevatorFee: number; // e.g. 5,000 UZS flat
  oversizeMultiplier: number; // e.g. 1.3x
  minLoadersForWeight: {
    maxKg: number;
    recommendedPersons: number;
  }[];
}

// Intake (Kirim)
export interface IntakeItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPriceUSD?: number;
  unitPriceUZS: number;
  totalPriceUZS: number;
  needsPlacement?: boolean; // Needs serial numbers entered in Razmeshenie
  placedQuantity?: number;
  generatedSerials: string[];
}

export interface AuditLog {
  id: string;
  timestamp: string;
  operator: string;
  action: string;
  details: string;
}

export type AuditLogEntry = AuditLog;

export interface ExcelImportRow {
  rowNumber: number;
  productName: string;
  sku: string;
  brand?: string;
  model?: string;
  quantity: number;
  unitPriceUSD?: number;
  unitPriceUZS: number;
  matchedProductId?: string;
  matchedProductName?: string;
  matchType: 'exact_name' | 'matched_sku' | 'matched_model_brand' | 'unmatched';
  isValid: boolean;
  errors: string[];
}

export interface IntakeRecord {
  id: string; // KRM-XXXXXX
  supplier: string;
  operator: string;
  warehouse: string; // e.g. "Bosh ombor", "Yunusobod", "Chilonzor"
  date: string;
  currency: Currency;
  exchangeRate: number; // e.g. 12850
  totalAmountUZS: number;
  totalAmountUSD: number;
  items: IntakeItem[];
  notes?: string;
  isFullyPlaced?: boolean;
  status?: 'active' | 'deleted'; // Soft delete support
  deletedAt?: string;
  deletedBy?: string;
  deleteReason?: string;
  auditLogs: AuditLog[];
  createdAt: string;
  updatedAt?: string;
}

// Pending placement item in Razmeshenie
export interface PendingPlacementItem {
  intakeId: string;
  intakeDate: string;
  supplier: string;
  productId: string;
  productName: string;
  sku: string;
  totalQuantity: number;
  placedQuantity: number;
}

// Salesperson (Sotuvchilar)
export interface Salesperson {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  role: string;
  avatar?: string;
  activeDealsCount: number;
  totalRevenueUZS: number;
  commissionRatePercent: number;
  status: 'active' | 'inactive';
}

// Client (Mijozlar)
export interface Client {
  id: string;
  fullName: string;
  phone: string;
  companyName?: string;
  address: string;
  passportOrInn?: string;
  totalOrdersCount: number;
  totalSpentUZS: number;
  currentBalanceUZS: number; // positive = credit, negative = debt
  activeRentalsCount: number;
  notes?: string;
  createdAt: string;
}

// Order & Rental Items
export interface OrderToolItem {
  productId: string;
  productName: string;
  sku: string;
  serialNumberId: string;
  serialNumber: string;
  serialNumberValue?: string;
  durationDays: number;
  dailyRateUZS: number;
  totalUZS?: number;
  lineTotalUZS?: number;
  depositUZS: number;
  startDate?: string;
  endDate?: string;
  returned?: boolean;
  returnDate?: string;
}

export interface OrderWasteService {
  truckConfigId: string;
  truckName: string;
  capacityM3?: number;
  m3Volume: number;
  tripsCount: number;
  includeLoading?: boolean;
  floorCount?: number;
  hasElevator?: boolean;
  isBagged?: boolean; // Qoplangan vs qoplanmagan
  isOversized?: boolean; // Gabarit vs nogabarit
  totalUZS?: number;
  totalPriceUZS?: number;
  address?: string;
  partnerId?: string; // Assigned contractor/partner
  partnerName?: string;
  partnerPayoutUZS?: number; // 80% to partner
  companyCommissionUZS?: number; // 20% Shohrent net profit
  ownerProfitShareUZS?: number; // 50% of company commission
}

export interface OrderCraneService {
  craneConfigId: string;
  craneName: string;
  tonnage: number;
  rentalType?: 'hours' | 'days';
  pricingType?: 'hourly' | 'daily';
  quantityUnits?: number; // hours or days
  hours?: number;
  days?: number;
  operatorIncluded?: boolean;
  totalUZS?: number;
  totalPriceUZS?: number;
  address?: string;
  partnerId?: string; // Assigned crane partner
  partnerName?: string;
  partnerPayoutUZS?: number; // 80% to partner
  companyCommissionUZS?: number; // 20% Shohrent net profit
  ownerProfitShareUZS?: number; // 50% of company commission
}

export interface OrderLoaderService {
  numberOfLoaders?: number;
  hours?: number;
  weightKg?: number;
  totalWeightKg?: number;
  floorCount: number;
  hasElevator: boolean;
  isOversized: boolean;
  assignedPersonsCount?: number;
  estimatedHours?: number;
  calculatedPriceUZS?: number;
  totalPriceUZS?: number;
  address?: string;
  partnerId?: string; // Assigned loader brigade/partner
  partnerName?: string;
  partnerPayoutUZS?: number; // 80% to partner
  companyCommissionUZS?: number; // 20% Shohrent net profit
  ownerProfitShareUZS?: number; // 50% of company commission
}

export type OrderStatus = 'new' | 'active' | 'returning_today' | 'overdue' | 'completed' | 'cancelled';
export type PaymentStatus = 'paid' | 'partial' | 'unpaid';
export type PaymentMethod = 'cash' | 'uzcard_humo' | 'bank_transfer' | 'usd_cash';

export interface Order {
  id: string; // ORD-XXXXXX
  orderDate: string;
  date?: string; // Compatibility alias
  salespersonId: string;
  salespersonName: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  deliveryAddress: string;
  status: OrderStatus;
  tools: OrderToolItem[];
  wasteServices: OrderWasteService[];
  craneServices: OrderCraneService[];
  loaderServices: OrderLoaderService[];
  subtotalToolsUZS: number;
  subtotalServicesUZS: number;
  depositTotalUZS: number;
  grandTotalUZS: number;
  // Payment tracking
  paymentStatus: PaymentStatus;
  paidAmountUZS: number;
  remainingAmountUZS: number;
  paymentDueDate?: string; // Qachon pul beradi
  paymentMethod: PaymentMethod;
  notes?: string;
  auditLogs?: AuditLog[];
  createdAt: string;
  completedAt?: string;
}

// =========================================================================
// Seller Commissions & Profit-Sharing Models
// =========================================================================

export type CommissionCalculationBasis = 'net_profit' | 'gross_sales';

export interface SellerCommissionConfig {
  id: string;
  sellerId: string; // matches StaffMember.id or Salesperson.id
  sellerName: string;
  sellerPhone?: string;
  calculationBasis: CommissionCalculationBasis;
  productCommissionRate: number; // e.g. 15% (percentage of profit or gross sales)
  serviceCommissionRate: number; // e.g. 10% (percentage of profit or gross sales)
  estimatedProductMarginPercent: number; // e.g. 45% default profit margin for rental tools when cost isn't explicit
  estimatedServiceMarginPercent: number; // e.g. 35% default profit margin for services (fuel, operator, amortisation)
  minSalesQuotaUZS?: number; // minimum sales amount required before commission activates
  bonusTargetUZS?: number; // threshold for extra bonus
  bonusAmountUZS?: number; // cash bonus amount if target is met
  notes?: string;
  updatedAt: string;
  updatedBy: string;
}

export type PayoutStatus = 'pending' | 'approved' | 'paid';

export interface OrderCommissionRecord {
  id: string;
  orderId: string;
  sellerId: string;
  sellerName: string;
  orderDate: string;
  clientName: string;
  
  // Amounts
  toolsAmountUZS: number;
  servicesAmountUZS: number;
  totalAmountUZS: number;

  // Calculation parameters applied
  calculationBasis: CommissionCalculationBasis;
  productRatePercent: number;
  serviceRatePercent: number;

  // Cost and Profit breakdown
  toolsEstimatedCostUZS: number;
  toolsNetProfitUZS: number;
  servicesEstimatedCostUZS: number;
  servicesNetProfitUZS: number;
  totalNetProfitUZS: number;

  // Commission earned
  earnedToolsCommissionUZS: number;
  earnedServicesCommissionUZS: number;
  totalCommissionUZS: number;

  // Payout tracking
  payoutStatus: PayoutStatus;
  paidAt?: string;
  paidBy?: string;
  payoutReference?: string;
  createdAt: string;
}

export interface CommissionPayout {
  id: string;
  sellerId: string;
  sellerName: string;
  amountUZS: number;
  paidAt: string;
  paidBy: string;
  paymentMethod: 'cash' | 'card' | 'bank_transfer';
  orderIds: string[];
  notes?: string;
}

// =========================================================================
// Service Partners & Owner Profit Sharing Models
// =========================================================================

export type PartnerServiceType = 'waste_truck' | 'crane' | 'loader' | 'all';

export interface ServicePartner {
  id: string;
  name: string; // F.I.O yoki tashkilot nomi
  companyName?: string;
  contactPerson: string;
  phone: string;
  secondaryPhone?: string;
  serviceType: PartnerServiceType;
  vehicleOrEquipmentDetails?: string; // Masalan: "XCMG 25t kran (01 123 ABC)", "Kamaz 18m3 (10 A777AA)"
  commissionRatePercent: number; // default 20% to Shohrent (meaning 80% goes to partner)
  paymentMethod?: 'cash' | 'card' | 'bank_transfer';
  bankAccountOrCard?: string;
  totalOrdersCount: number;
  totalServiceVolumeUZS: number;
  totalEarnedPayoutUZS: number; // 80%
  paidPayoutUZS: number;
  pendingPayoutUZS: number;
  status: 'active' | 'inactive';
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PartnerPayoutRecord {
  id: string;
  partnerId: string;
  partnerName: string;
  amountUZS: number;
  paidAt: string;
  paidBy: string;
  paymentMethod: 'cash' | 'card' | 'bank_transfer';
  orderIds?: string[];
  receiptNumber?: string;
  notes?: string;
}

export interface ServiceProfitAnalytics {
  totalServiceRevenueUZS: number;
  totalPartnerShareUZS: number; // 80% of service turnover
  totalCompanyProfitUZS: number; // 20% Shohrent margin
  ownerShareUZS: number; // 50% of 20% (Shohjaxon / Owner ish haqi / shaxsiy ulushi)
  companyReserveUZS: number; // 50% of 20% (Kompaniya rivojlanishi / operatsion foyda)
  wasteRevenueUZS: number;
  craneRevenueUZS: number;
  loaderRevenueUZS: number;
  totalServiceJobsCount: number;
}
