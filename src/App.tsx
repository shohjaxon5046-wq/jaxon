/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Sidebar, ActiveNavTab } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { InventoryIntakeView } from './components/InventoryIntakeView';
import { PlacementView } from './components/PlacementView';
import { ProductsCatalogView } from './components/ProductsCatalogView';
import { PriceCatalogView } from './components/PriceCatalogView';
import { ServicesManagementView } from './components/ServicesManagementView';
import { SalespersonsView } from './components/SalespersonsView';
import { ClientsView } from './components/ClientsView';
import { OrdersDispatchView } from './components/OrdersDispatchView';
import { GlobalSerialSearchModal } from './components/GlobalSerialSearchModal';
import { PrintableInvoiceModal } from './components/PrintableInvoiceModal';
import { LoginScreen } from './components/LoginScreen';
import { SuppliersView } from './components/SuppliersView';
import { RentalCalculatorView } from './components/RentalCalculatorView';
import { StaffManagementView } from './components/StaffManagementView';
import { CommissionManagementView } from './components/CommissionManagementView';
import { PartnersManagementView } from './components/PartnersManagementView';
import { CommissionService } from './services/commissionService';
import { PartnerService } from './services/partnerService';
import { AppStorage } from './services/storage';
import { fetchLiveExchangeRate } from './services/currency';
import {
  Client,
  CraneConfig,
  IntakeRecord,
  Language,
  LoaderPricingRules,
  Order,
  OrderCommissionRecord,
  PartnerPayoutRecord,
  Product,
  Salesperson,
  SellerCommissionConfig,
  SerialNumber,
  ServicePartner,
  StaffMember,
  Supplier,
  UserRole,
  WasteTruckConfig
} from './types';
import { Menu, X, Search, DollarSign, LogOut } from 'lucide-react';

export default function App() {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('shohrent_auth_active') === 'true';
  });
  const [currentUser, setCurrentUser] = useState<string>(() => {
    return localStorage.getItem('shohrent_current_user') || 'Shohjaxon (Boshqaruvchi)';
  });
  const [userRole, setUserRole] = useState<UserRole>(() => {
    return (localStorage.getItem('shohrent_user_role') as UserRole) || 'admin';
  });

  // Language & Currency State
  const [language, setLanguageState] = useState<Language>(() => AppStorage.getLanguage());
  const [exchangeRate, setExchangeRateState] = useState<number>(() => AppStorage.getExchangeRate());
  const [isRateRefreshing, setIsRateRefreshing] = useState<boolean>(false);

  // Active module tab
  const [activeTab, setActiveTab] = useState<ActiveNavTab>(() => {
    return (localStorage.getItem('shohrent_active_tab') as ActiveNavTab) || 'dashboard';
  });

  useEffect(() => {
    try {
      localStorage.setItem('shohrent_active_tab', activeTab);
    } catch (e) {}
  }, [activeTab]);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Application Data States
  const [products, setProducts] = useState<Product[]>(() => AppStorage.getProducts());
  const [intakeRecords, setIntakeRecords] = useState<IntakeRecord[]>(() => AppStorage.getIntakeRecords());
  const [orders, setOrders] = useState<Order[]>(() => AppStorage.getOrders());
  const [clients, setClients] = useState<Client[]>(() => AppStorage.getClients());
  const [salespersons, setSalespersons] = useState<Salesperson[]>(() => AppStorage.getSalespersons());
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => AppStorage.getSuppliers());
  const [staffList, setStaffList] = useState<StaffMember[]>(() => AppStorage.getStaff());
  const [currentStaff, setCurrentStaff] = useState<StaffMember | null>(() => AppStorage.getCurrentStaff());
  const [commissionConfigs, setCommissionConfigs] = useState<SellerCommissionConfig[]>(() => {
    return CommissionService.getConfigs(AppStorage.getStaff(), AppStorage.getSalespersons());
  });
  const [commissionRecords, setCommissionRecords] = useState<OrderCommissionRecord[]>(() => {
    const cfgs = CommissionService.getConfigs(AppStorage.getStaff(), AppStorage.getSalespersons());
    return CommissionService.syncOrderCommissions(AppStorage.getOrders(), AppStorage.getProducts(), cfgs);
  });
  const [wasteTrucks, setWasteTrucks] = useState<WasteTruckConfig[]>(() => AppStorage.getWasteTrucks());
  const [cranes, setCranes] = useState<CraneConfig[]>(() => AppStorage.getCranes());
  const [loaderRules, setLoaderRules] = useState<LoaderPricingRules>(() => AppStorage.getLoaderRules());
  const [categories, setCategories] = useState<string[]>(() => AppStorage.getCategories());
  const [partners, setPartners] = useState<ServicePartner[]>(() => AppStorage.getPartners());
  const [partnerPayouts, setPartnerPayouts] = useState<PartnerPayoutRecord[]>(() => AppStorage.getPartnerPayouts());

  // Modal states
  const [isSerialSearchOpen, setIsSerialSearchOpen] = useState(false);
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState<Order | null>(null);

  // Fetch live exchange rate on load
  const loadLiveExchangeRate = async () => {
    setIsRateRefreshing(true);
    try {
      const liveRate = await fetchLiveExchangeRate();
      if (liveRate && liveRate > 10000) {
        setExchangeRateState(liveRate);
        AppStorage.saveExchangeRate(liveRate);
      }
    } finally {
      setIsRateRefreshing(false);
    }
  };

  useEffect(() => {
    loadLiveExchangeRate();
  }, []);

  // Keyboard shortcut listener for Global Serial Search ('/' key) - Admin only
  useEffect(() => {
    if (userRole === 'seller') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        setIsSerialSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [userRole]);

  // Update Language
  const handleSetLanguage = (lang: Language) => {
    setLanguageState(lang);
    AppStorage.saveLanguage(lang);
  };

  // Update Exchange Rate manually
  const handleUpdateExchangeRate = (newRate: number) => {
    setExchangeRateState(newRate);
    AppStorage.saveExchangeRate(newRate);
  };

  // Login handler
  const handleLoginSuccess = (user: string, role: UserRole, staff?: StaffMember) => {
    setIsAuthenticated(true);
    setCurrentUser(user);
    setUserRole(role);
    setCurrentStaff(staff || null);
    AppStorage.saveCurrentStaff(staff || null);
    localStorage.setItem('shohrent_auth_active', 'true');
    localStorage.setItem('shohrent_current_user', user);
    localStorage.setItem('shohrent_user_role', role);

    if (staff) {
      if (staff.permissions.canViewDashboard) {
        setActiveTab('dashboard');
      } else if (staff.permissions.canViewCalculator) {
        setActiveTab('calculator');
      } else if (staff.permissions.canManageOrders) {
        setActiveTab('orders');
      } else if (staff.permissions.canManagePlacement) {
        setActiveTab('placement');
      } else if (staff.permissions.canManageProducts) {
        setActiveTab('products');
      } else if (staff.permissions.canManageServices) {
        setActiveTab('services');
      } else {
        setActiveTab('calculator');
      }
    } else if (role === 'seller') {
      setActiveTab('calculator');
    } else {
      setActiveTab('dashboard');
    }
  };

  // Role switch handler
  const handleSwitchRole = (newRole: UserRole) => {
    setUserRole(newRole);
    localStorage.setItem('shohrent_user_role', newRole);
    if (newRole === 'seller' && ['dashboard', 'intake', 'placement', 'suppliers', 'services', 'sales', 'staff'].includes(activeTab)) {
      setActiveTab('calculator');
    }
  };

  // Logout handler
  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentStaff(null);
    AppStorage.saveCurrentStaff(null);
    localStorage.removeItem('shohrent_auth_active');
  };

  // Staff CRUD Handlers
  const handleAddStaff = (newStaffData: Omit<StaffMember, 'id' | 'createdAt'>) => {
    const created: StaffMember = {
      ...newStaffData,
      id: `staff-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString()
    };
    const updated = [created, ...staffList];
    setStaffList(updated);
    AppStorage.saveStaff(updated);
  };

  const handleUpdateStaff = (id: string, updates: Partial<StaffMember>) => {
    const updated = staffList.map((s) =>
      s.id === id ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s
    );
    setStaffList(updated);
    AppStorage.saveStaff(updated);
    if (currentStaff && currentStaff.id === id) {
      const refreshed = updated.find((s) => s.id === id) || null;
      setCurrentStaff(refreshed);
      AppStorage.saveCurrentStaff(refreshed);
    }
  };

  const handleDeleteStaff = (id: string) => {
    const updated = staffList.filter((s) => s.id !== id);
    setStaffList(updated);
    AppStorage.saveStaff(updated);
    if (currentStaff && currentStaff.id === id) {
      handleLogout();
    }
  };

  const handleSwitchSessionToStaff = (staff: StaffMember) => {
    handleLoginSuccess(staff.fullName, staff.role as UserRole, staff);
  };

  // Commission handlers
  const handleSaveCommissionConfig = (config: SellerCommissionConfig) => {
    CommissionService.saveConfig(config);
    const updatedConfigs = CommissionService.getConfigs(staffList, salespersons);
    setCommissionConfigs(updatedConfigs);
    const updatedRecords = CommissionService.syncOrderCommissions(orders, products, updatedConfigs);
    setCommissionRecords(updatedRecords);
  };

  const handleMarkCommissionAsPaid = (
    recordIds: string[],
    paidBy: string,
    paymentMethod: 'cash' | 'card' | 'bank_transfer' = 'cash',
    notes?: string
  ) => {
    const { updatedRecords } = CommissionService.markAsPaid(
      recordIds,
      paidBy,
      paymentMethod,
      notes
    );
    setCommissionRecords([...updatedRecords]);
  };

  // Save suppliers list
  const handleSaveSuppliers = (newSuppliers: Supplier[]) => {
    setSuppliers(newSuppliers);
    AppStorage.saveSuppliers(newSuppliers);
  };

  // Delete supplier handler
  const handleDeleteSupplier = (id: string, name: string) => {
    const updated = suppliers.filter(
      (s) => s.id !== id && s.name.toLowerCase().trim() !== name.toLowerCase().trim()
    );
    setSuppliers(updated);
    AppStorage.saveSuppliers(updated);

    // Also persist into deleted suppliers list in AppStorage so auto-discovery won't re-create it
    const currentDeleted = AppStorage.getDeletedSuppliers();
    const nextDeleted = Array.from(new Set([...currentDeleted, id, name.toLowerCase().trim()]));
    AppStorage.saveDeletedSuppliers(nextDeleted);
  };

  // Categories handler
  const handleSaveCategories = (newCategories: string[]) => {
    setCategories(newCategories);
    AppStorage.saveCategories(newCategories);
  };

  // Clear all data (Clean reset)
  const handleClearAllData = () => {
    AppStorage.clearAllData();
    setProducts([]);
    setIntakeRecords([]);
    setOrders([]);
    setClients([]);
    setSalespersons([]);
    setSuppliers([]);
    setWasteTrucks([]);
    setCranes([]);
    setActiveTab('dashboard');
  };

  // Calculate pending placement count across all active intakes
  const pendingPlacementCount = React.useMemo(() => {
    let count = 0;
    intakeRecords
      .filter((rec) => rec.status !== 'deleted')
      .forEach((rec) => {
        rec.items.forEach((item) => {
          const placed = item.placedQuantity || 0;
          if (placed < item.quantity) {
            count += item.quantity - placed;
          }
        });
      });
    return count;
  }, [intakeRecords]);

  // Module 1: Save new Intake record
  const handleSaveNewIntake = (newRecord: IntakeRecord, updatedProducts: Product[]) => {
    const newRecords = [newRecord, ...intakeRecords];
    setIntakeRecords(newRecords);
    AppStorage.saveIntakeRecords(newRecords);

    setProducts(updatedProducts);
    AppStorage.saveProducts(updatedProducts);

    // Auto-sync supplier into suppliers directory
    const supName = newRecord.supplier?.trim();
    if (supName) {
      setSuppliers((prev) => {
        const existing = prev.find((s) => s.name.toLowerCase().trim() === supName.toLowerCase());
        let updatedList: Supplier[];
        if (!existing) {
          const newSupp: Supplier = {
            id: `supp-${Date.now()}`,
            name: supName,
            contactPerson: "Mas'ul vakil",
            phone: '—',
            address: newRecord.warehouse || 'Bosh ombor',
            totalSuppliedUZS: newRecord.totalAmountUZS,
            totalPaidUZS: 0,
            balanceUZS: -newRecord.totalAmountUZS,
            notes: "Kirim orqali avtomatik kiritildi",
            createdAt: newRecord.date ? newRecord.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
            transactions: []
          };
          updatedList = [...prev, newSupp];
        } else {
          updatedList = prev.map((s) =>
            s.id === existing.id
              ? {
                  ...s,
                  totalSuppliedUZS: (s.totalSuppliedUZS || 0) + newRecord.totalAmountUZS,
                  balanceUZS: (s.balanceUZS || 0) - newRecord.totalAmountUZS
                }
              : s
          );
        }
        AppStorage.saveSuppliers(updatedList);
        return updatedList;
      });
    }
  };

  // Module 1: Update past intake record (Izmenit)
  const handleUpdatePastIntake = (updatedRecord: IntakeRecord, updatedProducts?: Product[]) => {
    const oldRecord = intakeRecords.find((r) => r.id === updatedRecord.id);

    // Sync supplier financial balance if both old and new are active
    if (oldRecord && oldRecord.status !== 'deleted' && updatedRecord.status !== 'deleted') {
      const oldSup = oldRecord.supplier?.trim().toLowerCase();
      const newSup = updatedRecord.supplier?.trim().toLowerCase();
      const oldAmt = oldRecord.totalAmountUZS || 0;
      const newAmt = updatedRecord.totalAmountUZS || 0;

      if (oldSup === newSup) {
        const diff = newAmt - oldAmt;
        if (diff !== 0 && newSup) {
          setSuppliers((prev) => {
            const updated = prev.map((s) => {
              if (s.name.trim().toLowerCase() === newSup) {
                return {
                  ...s,
                  totalSuppliedUZS: Math.max(0, (s.totalSuppliedUZS || 0) + diff),
                  balanceUZS: (s.balanceUZS || 0) - diff
                };
              }
              return s;
            });
            AppStorage.saveSuppliers(updated);
            return updated;
          });
        }
      } else {
        // Supplier changed: revert old supplier and credit new supplier
        setSuppliers((prev) => {
          let updated = [...prev];
          if (oldSup) {
            updated = updated.map((s) => {
              if (s.name.trim().toLowerCase() === oldSup) {
                return {
                  ...s,
                  totalSuppliedUZS: Math.max(0, (s.totalSuppliedUZS || 0) - oldAmt),
                  balanceUZS: (s.balanceUZS || 0) + oldAmt
                };
              }
              return s;
            });
          }
          if (newSup) {
            const existingNew = updated.find((s) => s.name.trim().toLowerCase() === newSup);
            if (existingNew) {
              updated = updated.map((s) => {
                if (s.name.trim().toLowerCase() === newSup) {
                  return {
                    ...s,
                    totalSuppliedUZS: (s.totalSuppliedUZS || 0) + newAmt,
                    balanceUZS: (s.balanceUZS || 0) - newAmt
                  };
                }
                return s;
              });
            } else {
              const newS: Supplier = {
                id: `supp-${Date.now()}`,
                name: updatedRecord.supplier,
                contactPerson: "Mas'ul vakil",
                phone: '—',
                address: updatedRecord.warehouse || 'Bosh ombor',
                totalSuppliedUZS: newAmt,
                totalPaidUZS: 0,
                balanceUZS: -newAmt,
                notes: "Kirim tahrirlash orqali biriktirildi",
                createdAt: new Date().toISOString().slice(0, 10),
                transactions: []
              };
              updated.push(newS);
            }
          }
          AppStorage.saveSuppliers(updated);
          return updated;
        });
      }
    }

    const updated = intakeRecords.map((r) => (r.id === updatedRecord.id ? updatedRecord : r));
    setIntakeRecords(updated);
    AppStorage.saveIntakeRecords(updated);

    if (updatedProducts && updatedProducts.length > 0) {
      setProducts(updatedProducts);
      AppStorage.saveProducts(updatedProducts);
    }
  };

  // Module 1: Soft Delete Intake record (Arxivlash)
  const handleDeleteIntake = (intakeId: string, reason: string) => {
    const target = intakeRecords.find((r) => r.id === intakeId);
    if (!target) return;

    // Adjust supplier financial balance if not already deleted
    if (target.status !== 'deleted' && target.supplier?.trim()) {
      const supName = target.supplier.trim().toLowerCase();
      setSuppliers((prev) => {
        const updated = prev.map((s) => {
          if (s.name.toLowerCase().trim() === supName) {
            return {
              ...s,
              totalSuppliedUZS: Math.max(0, (s.totalSuppliedUZS || 0) - target.totalAmountUZS),
              balanceUZS: (s.balanceUZS || 0) + target.totalAmountUZS
            };
          }
          return s;
        });
        AppStorage.saveSuppliers(updated);
        return updated;
      });
    }

    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const updated = intakeRecords.map((r) => {
      if (r.id === intakeId) {
        const auditLogs = r.auditLogs || [];
        return {
          ...r,
          status: 'deleted' as const,
          deletedAt: nowStr,
          deletedBy: currentUser,
          deleteReason: reason,
          auditLogs: [
            ...auditLogs,
            {
              id: `log-${Date.now()}`,
              timestamp: nowStr,
              operator: currentUser,
              action: "Kirim o'chirildi (arxivlandi)",
              details: `Sabab: ${reason}`
            }
          ]
        };
      }
      return r;
    });
    setIntakeRecords(updated);
    AppStorage.saveIntakeRecords(updated);
  };

  // Module 1: Restore Soft Deleted Intake record
  const handleRestoreIntake = (intakeId: string) => {
    const target = intakeRecords.find((r) => r.id === intakeId);
    if (!target) return;

    // Re-apply supplier financial balance if currently deleted
    if (target.status === 'deleted' && target.supplier?.trim()) {
      const supName = target.supplier.trim().toLowerCase();
      setSuppliers((prev) => {
        const updated = prev.map((s) => {
          if (s.name.toLowerCase().trim() === supName) {
            return {
              ...s,
              totalSuppliedUZS: (s.totalSuppliedUZS || 0) + target.totalAmountUZS,
              balanceUZS: (s.balanceUZS || 0) - target.totalAmountUZS
            };
          }
          return s;
        });
        AppStorage.saveSuppliers(updated);
        return updated;
      });
    }

    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const updated = intakeRecords.map((r) => {
      if (r.id === intakeId) {
        const auditLogs = r.auditLogs || [];
        return {
          ...r,
          status: 'active' as const,
          deletedAt: undefined,
          deletedBy: undefined,
          deleteReason: undefined,
          auditLogs: [
            ...auditLogs,
            {
              id: `log-${Date.now()}`,
              timestamp: nowStr,
              operator: currentUser,
              action: "Kirim qayta tiklandi",
              details: "O'chirilgan kirim faol holatga qaytarildi"
            }
          ]
        };
      }
      return r;
    });
    setIntakeRecords(updated);
    AppStorage.saveIntakeRecords(updated);
  };

  // Module 1: Permanent Delete from Archive
  const handlePermanentDeleteIntake = (intakeId: string) => {
    const updated = intakeRecords.filter((r) => r.id !== intakeId);
    setIntakeRecords(updated);
    AppStorage.saveIntakeRecords(updated);
  };

  // Module 2: Save placed serial numbers
  const handleSavePlacedSerials = (
    intakeId: string,
    productId: string,
    newSerials: SerialNumber[]
  ) => {
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const updatedIntakes = intakeRecords.map((intake) => {
      if (intake.id === intakeId) {
        const updatedItems = intake.items.map((item) => {
          if (item.productId === productId) {
            const currentPlaced = item.placedQuantity || 0;
            const newPlaced = currentPlaced + newSerials.length;
            return {
              ...item,
              placedQuantity: newPlaced,
              generatedSerials: [
                ...(item.generatedSerials || []),
                ...newSerials.map((s) => s.serialNumber)
              ]
            };
          }
          return item;
        });
        const allDone = updatedItems.every(
          (it) => (it.placedQuantity || 0) >= it.quantity
        );
        const auditLogs = intake.auditLogs || [];
        return {
          ...intake,
          items: updatedItems,
          isFullyPlaced: allDone,
          auditLogs: [
            ...auditLogs,
            {
              id: `log-${Date.now()}`,
              timestamp: nowStr,
              operator: currentUser,
              action: "Razmeshenie (Seriyalar biriktirildi)",
              details: `${newSerials.length} ta seriya raqami kiritildi: [${newSerials.map((s) => s.serialNumber).join(', ')}]`
            }
          ]
        };
      }
      return intake;
    });

    setIntakeRecords(updatedIntakes);
    AppStorage.saveIntakeRecords(updatedIntakes);

    const targetIntake = intakeRecords.find((r) => r.id === intakeId);
    const intakeWh = targetIntake?.warehouse || 'Bosh ombor';

    const updatedProds = products.map((p) => {
      if (p.id === productId) {
        return {
          ...p,
          warehouse: p.warehouse || intakeWh,
          totalQuantity: p.totalQuantity + newSerials.length,
          serials: [...p.serials, ...newSerials]
        };
      }
      return p;
    });

    setProducts(updatedProds);
    AppStorage.saveProducts(updatedProds);
  };

  // Products Management
  const handleSaveProduct = (prodToSave: Product) => {
    setProducts((prev) => {
      const idx = prev.findIndex((p) => p.id === prodToSave.id);
      let updated: Product[];
      if (idx >= 0) {
        updated = [...prev];
        updated[idx] = prodToSave;
      } else {
        updated = [prodToSave, ...prev];
      }
      AppStorage.saveProducts(updated);
      return updated;
    });
  };

  const handleDeleteProduct = (productId: string) => {
    setProducts((prev) => {
      const updated = prev.filter((p) => p.id !== productId);
      AppStorage.saveProducts(updated);
      return updated;
    });
  };

  const handleUpdateProductSerials = (productId: string, serials: SerialNumber[]) => {
    const updated = products.map((p) => {
      if (p.id === productId) {
        return {
          ...p,
          serials,
          totalQuantity: serials.length
        };
      }
      return p;
    });
    setProducts(updated);
    AppStorage.saveProducts(updated);
  };

  // Katalog: Update product price
  const handleUpdateProductPrice = (productId: string, dailyRate: number, deposit: number) => {
    const updated = products.map((p) => {
      if (p.id === productId) {
        return {
          ...p,
          dailyRate,
          depositAmount: deposit
        };
      }
      return p;
    });
    setProducts(updated);
    AppStorage.saveProducts(updated);
  };

  // Katalog: Update waste truck price
  const handleUpdateWasteTruckPrice = (truckId: string, pricePerTrip: number, pricePerM3: number) => {
    const updated = wasteTrucks.map((t) => {
      if (t.id === truckId) {
        return {
          ...t,
          pricePerTrip,
          pricePerM3
        };
      }
      return t;
    });
    setWasteTrucks(updated);
    AppStorage.saveWasteTrucks(updated);
  };

  // Katalog: Update crane price
  const handleUpdateCranePrice = (craneId: string, hourlyRate: number, dailyRate: number) => {
    const updated = cranes.map((c) => {
      if (c.id === craneId) {
        return {
          ...c,
          hourlyRate,
          dailyRate
        };
      }
      return c;
    });
    setCranes(updated);
    AppStorage.saveCranes(updated);
  };

  // Services: Waste Trucks
  const handleSaveWasteTrucks = (updated: WasteTruckConfig[]) => {
    setWasteTrucks(updated);
    AppStorage.saveWasteTrucks(updated);
  };

  // Services: Cranes
  const handleSaveCranes = (updated: CraneConfig[]) => {
    setCranes(updated);
    AppStorage.saveCranes(updated);
  };

  // Services: Loader Rules
  const handleSaveLoaderRules = (rules: LoaderPricingRules) => {
    setLoaderRules(rules);
    AppStorage.saveLoaderRules(rules);
  };

  // Salespersons
  const handleAddSalesperson = (sp: Salesperson) => {
    const updated = [...salespersons, sp];
    setSalespersons(updated);
    AppStorage.saveSalespersons(updated);
  };

  // Clients
  const handleAddClient = (client: Client) => {
    const updated = [...clients, client];
    setClients(updated);
    AppStorage.saveClients(updated);
  };

  // Orders
  const handleSaveNewOrder = (order: Order, updatedProducts: Product[], updatedClients: Client[]) => {
    const updatedOrders = [order, ...orders];
    setOrders(updatedOrders);
    AppStorage.saveOrders(updatedOrders);

    setProducts(updatedProducts);
    AppStorage.saveProducts(updatedProducts);

    setClients(updatedClients);
    AppStorage.saveClients(updatedClients);

    const updatedCommissions = CommissionService.syncOrderCommissions(
      updatedOrders,
      updatedProducts,
      commissionConfigs
    );
    setCommissionRecords(updatedCommissions);
  };

  const handleUpdateOrder = (updatedOrder: Order, updatedProducts: Product[]) => {
    const updatedOrders = orders.map((o) => (o.id === updatedOrder.id ? updatedOrder : o));
    setOrders(updatedOrders);
    AppStorage.saveOrders(updatedOrders);

    setProducts(updatedProducts);
    AppStorage.saveProducts(updatedProducts);

    const updatedCommissions = CommissionService.syncOrderCommissions(
      updatedOrders,
      updatedProducts,
      commissionConfigs
    );
    setCommissionRecords(updatedCommissions);
  };

  const handleCompleteReturn = (orderId: string, updatedProducts: Product[]) => {
    const updatedOrders = orders.map((o) => {
      if (o.id === orderId) {
        return {
          ...o,
          status: 'completed' as const,
          returnedAt: new Date().toISOString()
        };
      }
      return o;
    });

    setOrders(updatedOrders);
    AppStorage.saveOrders(updatedOrders);

    setProducts(updatedProducts);
    AppStorage.saveProducts(updatedProducts);

    const updatedCommissions = CommissionService.syncOrderCommissions(
      updatedOrders,
      updatedProducts,
      commissionConfigs
    );
    setCommissionRecords(updatedCommissions);
  };

  // Partner Management Handlers
  const handleSavePartner = (partner: ServicePartner) => {
    const exists = partners.some((p) => p.id === partner.id);
    const updated = exists
      ? partners.map((p) => (p.id === partner.id ? partner : p))
      : [partner, ...partners];
    setPartners(updated);
    AppStorage.savePartners(updated);
  };

  const handleDeletePartner = (partnerId: string) => {
    if (window.confirm("Haqiqatan ham bu hamkorni o'chirmoqchimisiz?")) {
      const updated = partners.filter((p) => p.id !== partnerId);
      setPartners(updated);
      AppStorage.savePartners(updated);
    }
  };

  const handleRecordPartnerPayout = (
    partnerId: string,
    partnerName: string,
    amountUZS: number,
    paidBy: string,
    paymentMethod: 'cash' | 'card' | 'bank_transfer' = 'cash',
    notes?: string
  ) => {
    const result = PartnerService.recordPartnerPayout(
      partnerId,
      partnerName,
      amountUZS,
      paidBy,
      paymentMethod,
      [],
      undefined,
      notes
    );
    setPartnerPayouts(AppStorage.getPartnerPayouts());
    setPartners(result.updatedPartners);
  };

  // If not authenticated, render Login screen
  if (!isAuthenticated) {
    return (
      <LoginScreen
        language={language}
        setLanguage={handleSetLanguage}
        onLoginSuccess={handleLoginSuccess}
        staffList={staffList}
      />
    );
  }

  // Determine active tab considering seller restrictions if no custom permissions
  const effectiveActiveTab =
    userRole === 'seller' && !currentStaff
      ? activeTab === 'commissions'
        ? 'commissions'
        : 'calculator'
      : activeTab;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col md:flex-row antialiased">
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between p-3 bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="p-1.5 text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="font-bold text-slate-900 tracking-tight flex items-center gap-1.5 text-sm">
            <span className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-black">
              S
            </span>
            <span>Shohrent</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {userRole !== 'seller' && (
            <button
              onClick={() => setIsSerialSearchOpen(true)}
              className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              title="Seriya qidiruvi"
            >
              <Search className="w-4 h-4" />
            </button>
          )}
          <div className="text-[11px] font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
            1$ = {exchangeRate.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 md:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        >
          <div className="w-64 h-full bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <Sidebar
              activeTab={effectiveActiveTab}
              setActiveTab={(t) => {
                setActiveTab(t);
                setIsMobileSidebarOpen(false);
              }}
              language={language}
              setLanguage={handleSetLanguage}
              exchangeRate={exchangeRate}
              onUpdateExchangeRate={handleUpdateExchangeRate}
              onRefreshLiveRate={loadLiveExchangeRate}
              isRateRefreshing={isRateRefreshing}
              onOpenSerialSearch={() => {
                setIsMobileSidebarOpen(false);
                setIsSerialSearchOpen(true);
              }}
              currentUser={currentUser}
              userRole={userRole}
              currentStaff={currentStaff}
              onSwitchRole={handleSwitchRole}
              onLogout={handleLogout}
              pendingPlacementCount={pendingPlacementCount}
              onClearAllData={handleClearAllData}
            />
          </div>
        </div>
      )}

      {/* Desktop Left Sidebar (Sticky) */}
      <div className="hidden md:block">
        <Sidebar
          activeTab={effectiveActiveTab}
          setActiveTab={(t) => {
            setActiveTab(t);
          }}
          language={language}
          setLanguage={handleSetLanguage}
          exchangeRate={exchangeRate}
          onUpdateExchangeRate={handleUpdateExchangeRate}
          onRefreshLiveRate={loadLiveExchangeRate}
          isRateRefreshing={isRateRefreshing}
          onOpenSerialSearch={() => {
            setIsSerialSearchOpen(true);
          }}
          currentUser={currentUser}
          userRole={userRole}
          currentStaff={currentStaff}
          onSwitchRole={handleSwitchRole}
          onLogout={handleLogout}
          pendingPlacementCount={pendingPlacementCount}
          onClearAllData={handleClearAllData}
        />
      </div>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {/* Strict RBAC: Seller only has access to Calculator */}
        {userRole === 'seller' ? (
          <RentalCalculatorView
            language={language}
            products={products}
            categories={categories}
            wasteTruckConfigs={wasteTrucks}
            craneConfigs={cranes}
            loaderRules={loaderRules}
            onCreateOrderFromCalculator={() => {
              // Seller stays on calculator; admin creates orders
            }}
          />
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <DashboardView
                language={language}
                products={products}
                orders={orders}
                intakeRecords={intakeRecords}
                clients={clients}
                salespersons={salespersons}
                suppliers={suppliers}
                onNavigateTab={setActiveTab}
                onOpenNewOrder={() => setActiveTab('orders')}
                onOpenNewIntake={() => setActiveTab('intake')}
                onOpenSerialSearch={() => setIsSerialSearchOpen(true)}
                onViewOrderDetails={(ord) => setSelectedOrderForInvoice(ord)}
              />
            )}

        {activeTab === 'calculator' && (
          <RentalCalculatorView
            language={language}
            products={products}
            categories={categories}
            wasteTruckConfigs={wasteTrucks}
            craneConfigs={cranes}
            loaderRules={loaderRules}
            onCreateOrderFromCalculator={() => {
              setActiveTab('orders');
            }}
          />
        )}

        {activeTab === 'intake' && (
          <InventoryIntakeView
            language={language}
            intakeRecords={intakeRecords}
            products={products}
            exchangeRate={exchangeRate}
            currentUser={currentUser}
            onSaveNewIntake={handleSaveNewIntake}
            onUpdatePastIntake={handleUpdatePastIntake}
            onDeleteIntake={handleDeleteIntake}
            onRestoreIntake={handleRestoreIntake}
            onPermanentDeleteIntake={handlePermanentDeleteIntake}
            onSaveProduct={handleSaveProduct}
            onNavigateToPlacement={() => setActiveTab('placement')}
          />
        )}

        {activeTab === 'placement' && (
          <PlacementView
            language={language}
            intakeRecords={intakeRecords}
            products={products}
            onSavePlacedSerials={handleSavePlacedSerials}
          />
        )}

        {activeTab === 'products' && (
          <ProductsCatalogView
            language={language}
            products={products}
            categories={categories}
            currentUser={currentUser}
            onSaveProduct={handleSaveProduct}
            onDeleteProduct={handleDeleteProduct}
            onUpdateProductSerials={handleUpdateProductSerials}
            onSaveCategories={handleSaveCategories}
            onNavigateToOrder={(orderId) => {
              const ord = orders.find((o) => o.id === orderId);
              if (ord) setSelectedOrderForInvoice(ord);
            }}
          />
        )}

        {activeTab === 'price_catalog' && (
          <PriceCatalogView
            language={language}
            products={products}
            wasteTrucks={wasteTrucks}
            cranes={cranes}
            loaderRules={loaderRules}
            onUpdateProductPrice={handleUpdateProductPrice}
            onUpdateWasteTruckPrice={handleUpdateWasteTruckPrice}
            onUpdateCranePrice={handleUpdateCranePrice}
            onUpdateLoaderRules={handleSaveLoaderRules}
            onSaveProducts={(prods) => {
              setProducts(prods);
              AppStorage.saveProducts(prods);
            }}
            onSaveWasteTrucks={handleSaveWasteTrucks}
            onSaveCranes={handleSaveCranes}
            onAddProduct={handleSaveProduct}
            onAddWasteTruck={(newTruck) => handleSaveWasteTrucks([...wasteTrucks, newTruck])}
            onAddCrane={(newCrane) => handleSaveCranes([...cranes, newCrane])}
            onDeleteWasteTruck={(id) => handleSaveWasteTrucks(wasteTrucks.filter((t) => t.id !== id))}
            onDeleteCrane={(id) => handleSaveCranes(cranes.filter((c) => c.id !== id))}
            onDeleteProduct={handleDeleteProduct}
          />
        )}

        {activeTab === 'services' && (
          <ServicesManagementView
            language={language}
            wasteTrucks={wasteTrucks}
            cranes={cranes}
            loaderRules={loaderRules}
            onSaveWasteTrucks={handleSaveWasteTrucks}
            onSaveCranes={handleSaveCranes}
            onSaveLoaderRules={handleSaveLoaderRules}
          />
        )}

        {activeTab === 'orders' && (
          <OrdersDispatchView
            language={language}
            orders={orders}
            products={products}
            clients={clients}
            salespersons={salespersons}
            wasteTrucks={wasteTrucks}
            cranes={cranes}
            loaderRules={loaderRules}
            partners={partners}
            onSaveNewOrder={handleSaveNewOrder}
            onUpdateOrder={handleUpdateOrder}
            onCompleteReturn={handleCompleteReturn}
          />
        )}

        {activeTab === 'clients' && (
          <ClientsView
            language={language}
            clients={clients}
            orders={orders}
            onAddClient={handleAddClient}
            onViewOrderDetails={(ord) => setSelectedOrderForInvoice(ord)}
          />
        )}

        {activeTab === 'suppliers' && (
          <SuppliersView
            language={language}
            suppliers={suppliers}
            intakeRecords={intakeRecords}
            currentUser={currentUser}
            onSaveSuppliers={handleSaveSuppliers}
            onDeleteSupplier={handleDeleteSupplier}
            onInspectIntake={() => {
              setActiveTab('intake');
            }}
          />
        )}

        {activeTab === 'sales' && (
          <SalespersonsView
            language={language}
            salespersons={salespersons}
            orders={orders}
            onAddSalesperson={handleAddSalesperson}
            onViewOrderDetails={(ord: Order) => setSelectedOrderForInvoice(ord)}
          />
        )}

        {activeTab === 'staff' && (
          <StaffManagementView
            staffList={staffList}
            onAddStaff={handleAddStaff}
            onUpdateStaff={handleUpdateStaff}
            onDeleteStaff={handleDeleteStaff}
            onSwitchSessionToStaff={handleSwitchSessionToStaff}
            language={language}
            currentStaffId={currentStaff?.id}
          />
        )}

        {activeTab === 'commissions' && (
          <CommissionManagementView
            language={language}
            orders={orders}
            products={products}
            salespersons={salespersons}
            staffList={staffList}
            configs={commissionConfigs}
            records={commissionRecords}
            onSaveConfig={handleSaveCommissionConfig}
            onMarkAsPaid={handleMarkCommissionAsPaid}
            currentUser={currentUser}
            userRole={userRole}
            currentStaff={currentStaff}
          />
        )}

        {activeTab === 'partners' && (
          <PartnersManagementView
            language={language}
            partners={partners}
            orders={orders}
            currentUser={currentUser}
            onSavePartner={handleSavePartner}
            onDeletePartner={handleDeletePartner}
            onRecordPayout={handleRecordPartnerPayout}
            onInspectOrder={(orderId: string) => {
              const ord = orders.find((o) => o.id === orderId);
              if (ord) setSelectedOrderForInvoice(ord);
            }}
          />
        )}
          </>
        )}
      </main>

      {/* Global Serial Search Modal (Opens via '/' key or sidebar button) */}
      {isSerialSearchOpen && (
        <GlobalSerialSearchModal
          isOpen={isSerialSearchOpen}
          language={language}
          products={products}
          onClose={() => setIsSerialSearchOpen(false)}
          onNavigateToOrder={(orderId) => {
            setIsSerialSearchOpen(false);
            const ord = orders.find((o) => o.id === orderId);
            if (ord) setSelectedOrderForInvoice(ord);
          }}
        />
      )}

      {/* Invoice Modal */}
      {selectedOrderForInvoice && (
        <PrintableInvoiceModal
          language={language}
          order={selectedOrderForInvoice}
          onClose={() => setSelectedOrderForInvoice(null)}
        />
      )}
    </div>
  );
}
