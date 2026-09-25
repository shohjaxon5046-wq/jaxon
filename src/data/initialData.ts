import {
  Client,
  CraneConfig,
  IntakeRecord,
  Order,
  Product,
  Salesperson,
  SellerCommissionConfig,
  ServicePartner,
  StaffMember,
  StaffPermissions,
  StaffRoleType,
  WasteTruckConfig
} from '../types';

export const DEFAULT_ROLE_PERMISSIONS: Record<StaffRoleType, StaffPermissions> = {
  admin: {
    canViewDashboard: true,
    canViewCalculator: true,
    canManageOrders: true,
    canManageProducts: true,
    canViewPriceCatalog: true,
    canManageClients: true,
    canManageIntake: true,
    canManagePlacement: true,
    canManageServices: true,
    canManageSuppliers: true,
    canManageStaff: true,
    canViewFinancials: true,
    canViewCommissions: true,
    canManagePartners: true
  },
  seller: {
    canViewDashboard: false,
    canViewCalculator: true,
    canManageOrders: true,
    canManageProducts: false,
    canViewPriceCatalog: true,
    canManageClients: true,
    canManageIntake: false,
    canManagePlacement: false,
    canManageServices: false,
    canManageSuppliers: false,
    canManageStaff: false,
    canViewFinancials: false,
    canViewCommissions: true,
    canManagePartners: false
  },
  master: {
    canViewDashboard: false,
    canViewCalculator: false,
    canManageOrders: false,
    canManageProducts: true,
    canViewPriceCatalog: true,
    canManageClients: false,
    canManageIntake: false,
    canManagePlacement: false,
    canManageServices: true,
    canManageSuppliers: false,
    canManageStaff: false,
    canViewFinancials: false,
    canViewCommissions: false,
    canManagePartners: false
  },
  assembler: {
    canViewDashboard: false,
    canViewCalculator: false,
    canManageOrders: true,
    canManageProducts: true,
    canViewPriceCatalog: false,
    canManageClients: false,
    canManageIntake: true,
    canManagePlacement: true,
    canManageServices: false,
    canManageSuppliers: false,
    canManageStaff: false,
    canViewFinancials: false,
    canViewCommissions: false,
    canManagePartners: false
  },
  warehouse: {
    canViewDashboard: false,
    canViewCalculator: false,
    canManageOrders: true,
    canManageProducts: true,
    canViewPriceCatalog: true,
    canManageClients: false,
    canManageIntake: true,
    canManagePlacement: true,
    canManageServices: false,
    canManageSuppliers: false,
    canManageStaff: false,
    canViewFinancials: false,
    canViewCommissions: false,
    canManagePartners: false
  },
  driver: {
    canViewDashboard: false,
    canViewCalculator: false,
    canManageOrders: true,
    canManageProducts: false,
    canViewPriceCatalog: false,
    canManageClients: false,
    canManageIntake: false,
    canManagePlacement: false,
    canManageServices: true,
    canManageSuppliers: false,
    canManageStaff: false,
    canViewFinancials: false,
    canViewCommissions: false,
    canManagePartners: false
  },
  accountant: {
    canViewDashboard: true,
    canViewCalculator: true,
    canManageOrders: true,
    canManageProducts: false,
    canViewPriceCatalog: true,
    canManageClients: true,
    canManageIntake: true,
    canManagePlacement: false,
    canManageServices: true,
    canManageSuppliers: true,
    canManageStaff: false,
    canViewFinancials: true,
    canViewCommissions: true,
    canManagePartners: true
  },
  custom: {
    canViewDashboard: false,
    canViewCalculator: true,
    canManageOrders: false,
    canManageProducts: false,
    canViewPriceCatalog: false,
    canManageClients: false,
    canManageIntake: false,
    canManagePlacement: false,
    canManageServices: false,
    canManageSuppliers: false,
    canManageStaff: false,
    canViewFinancials: false,
    canViewCommissions: false,
    canManagePartners: false
  }
};

export const INITIAL_COMMISSION_CONFIGS: SellerCommissionConfig[] = [
  {
    id: 'cfg-default',
    sellerId: 'default',
    sellerName: 'Standart (Umumiy)',
    calculationBasis: 'net_profit',
    productCommissionRate: 20, // 20% of net profit
    serviceCommissionRate: 15, // 15% of service profit
    estimatedProductMarginPercent: 50, // default 50% margin if cost not tracked
    estimatedServiceMarginPercent: 35, // default 35% margin for trucks/cranes
    minSalesQuotaUZS: 0,
    bonusTargetUZS: 50000000,
    bonusAmountUZS: 1500000,
    notes: 'Standart boshlang‘ich komissiya stavkasi: Sof foydaning 20% qismi',
    updatedAt: '2026-09-01',
    updatedBy: 'Admin'
  },
  {
    id: 'cfg-sotuvchi',
    sellerId: 'staff-2',
    sellerName: 'Alisher Zokirov (Sotuvchi)',
    sellerPhone: '+998 93 456 78 90',
    calculationBasis: 'net_profit',
    productCommissionRate: 20, // 20% of net profit
    serviceCommissionRate: 15, // 15% of service profit
    estimatedProductMarginPercent: 50,
    estimatedServiceMarginPercent: 35,
    minSalesQuotaUZS: 5000000,
    bonusTargetUZS: 60000000,
    bonusAmountUZS: 2000000,
    notes: 'Sof foydadan 20% asboblar, 15% xizmatlar uchun',
    updatedAt: '2026-09-01',
    updatedBy: 'Shohjaxon'
  }
];

export const INITIAL_STAFF: StaffMember[] = [
  {
    id: 'staff-1',
    fullName: 'Shohjaxon (Boshqaruvchi)',
    role: 'admin',
    phone: '+998 90 887 00 01',
    email: 'admin@shohrent.uz',
    username: 'shohjaxon',
    password: 'Jaxon887',
    warehouse: 'Bosh ombor',
    status: 'active',
    hireDate: '2026-01-10',
    salaryType: 'fixed',
    baseSalaryUZS: 15000000,
    notes: 'Tizim bosh administratori va egasi',
    permissions: DEFAULT_ROLE_PERMISSIONS.admin,
    createdAt: '2026-01-10'
  },
  {
    id: 'staff-2',
    fullName: 'Alisher Zokirov (Sotuvchi)',
    role: 'seller',
    phone: '+998 93 456 78 90',
    email: 'alisher@shohrent.uz',
    username: 'sotuvchi',
    password: 'Sotuvchi123',
    warehouse: 'Bosh ombor',
    status: 'active',
    hireDate: '2026-03-01',
    salaryType: 'commission',
    baseSalaryUZS: 4000000,
    commissionPercent: 5,
    notes: 'Kalkulyator va ijara buyurtmalarini rasmiylashtirish bo‘yicha sotuvchi menejer',
    permissions: DEFAULT_ROLE_PERMISSIONS.seller,
    createdAt: '2026-03-01'
  },
  {
    id: 'staff-3',
    fullName: 'Davron Karimov (Bosh Usta)',
    role: 'master',
    phone: '+998 94 333 44 55',
    email: 'davron.usta@shohrent.uz',
    username: 'usta_davron',
    password: 'Usta123',
    warehouse: 'Bosh ombor',
    status: 'active',
    hireDate: '2026-02-15',
    salaryType: 'per_task',
    baseSalaryUZS: 6000000,
    notes: 'Uskunalar texnik ko‘rigi, ta‘mirlash va profilaktika bo‘yicha usta',
    permissions: DEFAULT_ROLE_PERMISSIONS.master,
    createdAt: '2026-02-15'
  },
  {
    id: 'staff-4',
    fullName: 'Sardor Normurodov (Yig‘uvchi)',
    role: 'assembler',
    phone: '+998 97 123 99 88',
    email: 'sardor.yiguvchi@shohrent.uz',
    username: 'yiguvchi_sardor',
    password: 'Yiguvchi123',
    warehouse: 'Bosh ombor',
    status: 'active',
    hireDate: '2026-04-01',
    salaryType: 'fixed',
    baseSalaryUZS: 5000000,
    notes: 'Buyurtmalarni ombordan jamlash, tovarlarni tekshirish va razmeshenie kiritish',
    permissions: DEFAULT_ROLE_PERMISSIONS.assembler,
    createdAt: '2026-04-01'
  },
  {
    id: 'staff-5',
    fullName: 'Bobur Ismoilov (Omborchi)',
    role: 'warehouse',
    phone: '+998 99 777 66 55',
    email: 'bobur.ombor@shohrent.uz',
    username: 'omborchi_bobur',
    password: 'Ombor123',
    warehouse: 'Bosh ombor',
    status: 'active',
    hireDate: '2026-02-01',
    salaryType: 'fixed',
    baseSalaryUZS: 5500000,
    notes: 'Kirim-chiqim nazorati va omborxona tartibi mas‘uli',
    permissions: DEFAULT_ROLE_PERMISSIONS.warehouse,
    createdAt: '2026-02-01'
  }
];

// Clear initial state as requested by user ("HAMMA KIRM TOVOR XIZMATLARNI ZAKAZLARNI OCHIRIP TASHA OZIM YANGITAN QOSHAMAN")
export const INITIAL_PRODUCTS: Product[] = [];

export const INITIAL_INTAKE_RECORDS: IntakeRecord[] = [];

export const INITIAL_ORDERS: Order[] = [];

export const INITIAL_WASTE_TRUCKS: WasteTruckConfig[] = [];

export const INITIAL_CRANES: CraneConfig[] = [];

export const INITIAL_CATEGORIES: string[] = [
  'Asboblar va Uskunalar',
  'Perforatorlar va Asboblar',
  'Generatorlar',
  'Samosvallar va Chiqindi',
  'Kranlar va Maxsus Texnika',
  'Payvandlash uskunalari',
  'Kompressorlar'
];

export const INITIAL_SUPPLIERS: import('../types').Supplier[] = [
  {
    id: 'supp-1',
    name: 'Bosch Professional Uzbekistan',
    contactPerson: 'Rustam Aliyev',
    phone: '+998 71 200 44 55',
    address: 'Toshkent sh., Chilonzor 9, 21-bino',
    totalSuppliedUZS: 0,
    totalPaidUZS: 0,
    balanceUZS: 0,
    notes: 'Rasmiy Bosch dileri',
    createdAt: '2026-09-01',
    transactions: []
  },
  {
    id: 'supp-2',
    name: 'Hilti Tashkent Distribyutor',
    contactPerson: 'Jasur Saidov',
    phone: '+998 90 321 00 99',
    address: 'Toshkent sh., Sergeli sanoat zonasi',
    totalSuppliedUZS: 0,
    totalPaidUZS: 0,
    balanceUZS: 0,
    notes: 'Og‘ir beton teshish va kesish texnikalari',
    createdAt: '2026-09-01',
    transactions: []
  },
  {
    id: 'supp-3',
    name: 'Wacker Neuson Central Asia',
    contactPerson: 'Temur Mirzayev',
    phone: '+998 97 765 43 21',
    address: 'Toshkent sh., Yunusobod, Bog‘ishamol ko‘chasi',
    totalSuppliedUZS: 0,
    totalPaidUZS: 0,
    balanceUZS: 0,
    notes: 'Vibroplitlar va zichlagichlar',
    createdAt: '2026-09-01',
    transactions: []
  }
];

export const INITIAL_SALESPERSONS: Salesperson[] = [
  {
    id: 'sales-1',
    fullName: 'Shohjaxon (Bosh menejer)',
    phone: '+998 90 887 00 01',
    email: 'shohjaxon@shohrent.uz',
    role: 'Boshqaruvchi / Savdo rahbari',
    activeDealsCount: 0,
    totalRevenueUZS: 0,
    commissionRatePercent: 5,
    status: 'active'
  }
];

export const INITIAL_CLIENTS: Client[] = [
  {
    id: 'client-1',
    fullName: 'Akbar Shodiyev',
    phone: '+998 93 111 22 33',
    companyName: 'Grand Building Stroy MChJ',
    address: 'Toshkent sh., Yunusobod tumani, 4-mavze 12-uy',
    passportOrInn: '304918234',
    totalOrdersCount: 0,
    totalSpentUZS: 0,
    currentBalanceUZS: 0,
    activeRentalsCount: 0,
    createdAt: '2026-09-01'
  }
];

export const INITIAL_PARTNERS: ServicePartner[] = [
  {
    id: 'partner-crane-1',
    name: 'Omon Trans Kran MChJ',
    companyName: 'Omon Kran Servis',
    contactPerson: 'Omonjon Toirov',
    phone: '+998 90 111 22 33',
    secondaryPhone: '+998 99 888 77 66',
    serviceType: 'crane',
    vehicleOrEquipmentDetails: 'Avtokran XCMG 25t (01 777 AAB) va Kamaz 16t (01 555 XYZ)',
    commissionRatePercent: 20, // 20% to Shohrent, 80% to partner
    paymentMethod: 'bank_transfer',
    bankAccountOrCard: '20208000900123456789 (Ipak Yo‘li Bank)',
    totalOrdersCount: 0,
    totalServiceVolumeUZS: 0,
    totalEarnedPayoutUZS: 0,
    paidPayoutUZS: 0,
    pendingPayoutUZS: 0,
    status: 'active',
    notes: 'Katta obektlarga tezkor chiqadi, tajribali kran haydovchisi bilan',
    createdAt: '2026-09-01T08:00:00.000Z'
  },
  {
    id: 'partner-waste-1',
    name: 'Eko Samosval Toshkent',
    companyName: 'Chiqindi Chiqarish Logistika',
    contactPerson: 'Baxtiyor Karimov',
    phone: '+998 91 222 33 44',
    secondaryPhone: '+998 93 444 55 66',
    serviceType: 'waste_truck',
    vehicleOrEquipmentDetails: 'Kamaz 15m³ (10 888 AAA) va Isuzu 8m³ (10 222 BBB)',
    commissionRatePercent: 20, // 20% to Shohrent, 80% to partner
    paymentMethod: 'cash',
    bankAccountOrCard: '8600 1204 5544 3322 (Baxtiyor K.)',
    totalOrdersCount: 0,
    totalServiceVolumeUZS: 0,
    totalEarnedPayoutUZS: 0,
    paidPayoutUZS: 0,
    pendingPayoutUZS: 0,
    status: 'active',
    notes: 'Qurilish chiqindilari va musir tashish bo‘yicha ishonchli hamkor',
    createdAt: '2026-09-01T08:00:00.000Z'
  },
  {
    id: 'partner-loader-1',
    name: 'Chilonzor Yukchilar Brigadasi',
    companyName: 'Yuk Tashish Servis Guruhi',
    contactPerson: 'Rustam Qosimov',
    phone: '+998 93 333 44 55',
    secondaryPhone: '+998 90 999 00 11',
    serviceType: 'loader',
    vehicleOrEquipmentDetails: '6 kishilik maxsus jismoniy tayyorgarlikka ega yukchilar brigadasi',
    commissionRatePercent: 20, // 20% to Shohrent, 80% to partner
    paymentMethod: 'cash',
    bankAccountOrCard: '8600 4902 1122 3344 (Rustam Q.)',
    totalOrdersCount: 0,
    totalServiceVolumeUZS: 0,
    totalEarnedPayoutUZS: 0,
    paidPayoutUZS: 0,
    pendingPayoutUZS: 0,
    status: 'active',
    notes: 'Etajga asboblarni ko‘tarish va yuk ortish-tushirish brigadasi',
    createdAt: '2026-09-01T08:00:00.000Z'
  }
];
