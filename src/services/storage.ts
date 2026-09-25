import {
  AuditLog,
  Client,
  CraneConfig,
  IntakeRecord,
  LoaderPricingRules,
  Order,
  Product,
  Salesperson,
  SerialNumber,
  WasteTruckConfig
} from '../types';
import {
  DEFAULT_LOADER_RULES
} from '../utils/pricing';
import {
  INITIAL_CLIENTS,
  INITIAL_CRANES,
  INITIAL_INTAKE_RECORDS,
  INITIAL_ORDERS,
  INITIAL_PRODUCTS,
  INITIAL_SALESPERSONS,
  INITIAL_WASTE_TRUCKS,
  INITIAL_SUPPLIERS,
  INITIAL_CATEGORIES,
  INITIAL_STAFF,
  INITIAL_COMMISSION_CONFIGS,
  INITIAL_PARTNERS
} from '../data/initialData';
import {
  Supplier,
  StaffMember,
  SellerCommissionConfig,
  OrderCommissionRecord,
  CommissionPayout,
  ServicePartner,
  PartnerPayoutRecord
} from '../types';

const STORAGE_KEYS = {
  PRODUCTS: 'shohrent_products_v2',
  WASTE_TRUCKS: 'shohrent_waste_trucks_v2',
  CRANES: 'shohrent_cranes_v2',
  LOADER_RULES: 'shohrent_loader_rules_v2',
  SALESPERSONS: 'shohrent_salespersons_v2',
  CLIENTS: 'shohrent_clients_v2',
  SUPPLIERS: 'shohrent_suppliers_v2',
  STAFF: 'shohrent_staff_v2',
  CURRENT_STAFF: 'shohrent_current_staff_v2',
  COMMISSION_CONFIGS: 'shohrent_commission_configs_v2',
  COMMISSION_RECORDS: 'shohrent_commission_records_v2',
  COMMISSION_PAYOUTS: 'shohrent_commission_payouts_v2',
  PARTNERS: 'shohrent_partners_v2',
  PARTNER_PAYOUTS: 'shohrent_partner_payouts_v2',
  CATEGORIES: 'shohrent_categories_v2',
  INTAKE_RECORDS: 'shohrent_intake_records_v2',
  ORDERS: 'shohrent_orders_v2',
  EXCHANGE_RATE: 'shohrent_exchange_rate_v2',
  AUTH: 'shohrent_auth_v2',
  LANG: 'shohrent_lang_v2',
  DELETED_SUPPLIERS: 'shohrent_deleted_suppliers_v2'
};

function loadItem<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(`Failed to load ${key}`, e);
  }
  return fallback;
}

function saveItem<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Failed to save ${key}`, e);
  }
}

export class AppStorage {
  static getProducts(): Product[] {
    return loadItem<Product[]>(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
  }
  static saveProducts(data: Product[]): void {
    saveItem(STORAGE_KEYS.PRODUCTS, data);
  }

  static getWasteTrucks(): WasteTruckConfig[] {
    return loadItem<WasteTruckConfig[]>(STORAGE_KEYS.WASTE_TRUCKS, INITIAL_WASTE_TRUCKS);
  }
  static saveWasteTrucks(data: WasteTruckConfig[]): void {
    saveItem(STORAGE_KEYS.WASTE_TRUCKS, data);
  }

  static getCranes(): CraneConfig[] {
    return loadItem<CraneConfig[]>(STORAGE_KEYS.CRANES, INITIAL_CRANES);
  }
  static saveCranes(data: CraneConfig[]): void {
    saveItem(STORAGE_KEYS.CRANES, data);
  }

  static getLoaderRules(): LoaderPricingRules {
    return loadItem<LoaderPricingRules>(STORAGE_KEYS.LOADER_RULES, {
      ...DEFAULT_LOADER_RULES,
      pricePerKg: 150,
      ratePerFloorNoElevator: 15000,
      elevatorFee: 5000
    });
  }
  static saveLoaderRules(data: LoaderPricingRules): void {
    saveItem(STORAGE_KEYS.LOADER_RULES, data);
  }

  static getSalespersons(): Salesperson[] {
    return loadItem<Salesperson[]>(STORAGE_KEYS.SALESPERSONS, INITIAL_SALESPERSONS);
  }
  static saveSalespersons(data: Salesperson[]): void {
    saveItem(STORAGE_KEYS.SALESPERSONS, data);
  }

  static getClients(): Client[] {
    return loadItem<Client[]>(STORAGE_KEYS.CLIENTS, INITIAL_CLIENTS);
  }
  static saveClients(data: Client[]): void {
    saveItem(STORAGE_KEYS.CLIENTS, data);
  }

  static getSuppliers(): Supplier[] {
    return loadItem<Supplier[]>(STORAGE_KEYS.SUPPLIERS, INITIAL_SUPPLIERS);
  }
  static saveSuppliers(data: Supplier[]): void {
    saveItem(STORAGE_KEYS.SUPPLIERS, data);
  }

  static getStaff(): StaffMember[] {
    return loadItem<StaffMember[]>(STORAGE_KEYS.STAFF, INITIAL_STAFF);
  }
  static saveStaff(data: StaffMember[]): void {
    saveItem(STORAGE_KEYS.STAFF, data);
  }

  static getCurrentStaff(): StaffMember | null {
    return loadItem<StaffMember | null>(STORAGE_KEYS.CURRENT_STAFF, null);
  }
  static saveCurrentStaff(data: StaffMember | null): void {
    saveItem(STORAGE_KEYS.CURRENT_STAFF, data);
  }

  static getCommissionConfigs(): SellerCommissionConfig[] {
    return loadItem<SellerCommissionConfig[]>(STORAGE_KEYS.COMMISSION_CONFIGS, INITIAL_COMMISSION_CONFIGS);
  }
  static saveCommissionConfigs(data: SellerCommissionConfig[]): void {
    saveItem(STORAGE_KEYS.COMMISSION_CONFIGS, data);
  }

  static getCommissionRecords(): OrderCommissionRecord[] {
    return loadItem<OrderCommissionRecord[]>(STORAGE_KEYS.COMMISSION_RECORDS, []);
  }
  static saveCommissionRecords(data: OrderCommissionRecord[]): void {
    saveItem(STORAGE_KEYS.COMMISSION_RECORDS, data);
  }

  static getCommissionPayouts(): CommissionPayout[] {
    return loadItem<CommissionPayout[]>(STORAGE_KEYS.COMMISSION_PAYOUTS, []);
  }
  static saveCommissionPayouts(data: CommissionPayout[]): void {
    saveItem(STORAGE_KEYS.COMMISSION_PAYOUTS, data);
  }

  static getPartners(): ServicePartner[] {
    return loadItem<ServicePartner[]>(STORAGE_KEYS.PARTNERS, INITIAL_PARTNERS);
  }
  static savePartners(data: ServicePartner[]): void {
    saveItem(STORAGE_KEYS.PARTNERS, data);
  }

  static getPartnerPayouts(): PartnerPayoutRecord[] {
    return loadItem<PartnerPayoutRecord[]>(STORAGE_KEYS.PARTNER_PAYOUTS, []);
  }
  static savePartnerPayouts(data: PartnerPayoutRecord[]): void {
    saveItem(STORAGE_KEYS.PARTNER_PAYOUTS, data);
  }

  static getDeletedSuppliers(): string[] {
    return loadItem<string[]>(STORAGE_KEYS.DELETED_SUPPLIERS, []);
  }
  static saveDeletedSuppliers(data: string[]): void {
    saveItem(STORAGE_KEYS.DELETED_SUPPLIERS, data);
  }

  static getCategories(): string[] {
    return loadItem<string[]>(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
  }
  static saveCategories(data: string[]): void {
    saveItem(STORAGE_KEYS.CATEGORIES, data);
  }

  static getIntakeRecords(): IntakeRecord[] {
    return loadItem<IntakeRecord[]>(STORAGE_KEYS.INTAKE_RECORDS, INITIAL_INTAKE_RECORDS);
  }
  static saveIntakeRecords(data: IntakeRecord[]): void {
    saveItem(STORAGE_KEYS.INTAKE_RECORDS, data);
  }

  static getOrders(): Order[] {
    return loadItem<Order[]>(STORAGE_KEYS.ORDERS, INITIAL_ORDERS);
  }
  static saveOrders(data: Order[]): void {
    saveItem(STORAGE_KEYS.ORDERS, data);
  }

  static getExchangeRate(): number {
    return loadItem<number>(STORAGE_KEYS.EXCHANGE_RATE, 12850);
  }
  static saveExchangeRate(rate: number): void {
    saveItem(STORAGE_KEYS.EXCHANGE_RATE, rate);
  }

  static getLanguage(): 'uz' | 'ru' {
    return loadItem<'uz' | 'ru'>(STORAGE_KEYS.LANG, 'uz');
  }
  static saveLanguage(lang: 'uz' | 'ru'): void {
    saveItem(STORAGE_KEYS.LANG, lang);
  }

  static clearAllData(): void {
    localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
    localStorage.removeItem(STORAGE_KEYS.WASTE_TRUCKS);
    localStorage.removeItem(STORAGE_KEYS.CRANES);
    localStorage.removeItem(STORAGE_KEYS.INTAKE_RECORDS);
    localStorage.removeItem(STORAGE_KEYS.ORDERS);
    localStorage.removeItem(STORAGE_KEYS.CLIENTS);
  }
}
