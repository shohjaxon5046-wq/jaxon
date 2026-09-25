/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Commission Management Service for Shohrent WMS
 */

import {
  CommissionPayout,
  Order,
  OrderCommissionRecord,
  Product,
  Salesperson,
  SellerCommissionConfig,
  StaffMember
} from '../types';
import { calculateOrderCommission } from '../utils/commission';
import { AppStorage } from './storage';

export class CommissionService {
  /**
   * Get all seller commission configs, ensuring every seller has a config entry
   */
  static getConfigs(
    staffList: StaffMember[] = [],
    salespersons: Salesperson[] = []
  ): SellerCommissionConfig[] {
    let configs = AppStorage.getCommissionConfigs();
    let hasChanges = false;

    // Check staff members with seller role
    const sellersFromStaff = staffList.filter((s) => s.role === 'seller');
    for (const seller of sellersFromStaff) {
      const exists = configs.find(
        (c) => c.sellerId === seller.id || c.sellerName.toLowerCase() === seller.fullName.toLowerCase()
      );
      if (!exists) {
        const newCfg: SellerCommissionConfig = {
          id: `cfg-${seller.id}`,
          sellerId: seller.id,
          sellerName: seller.fullName,
          sellerPhone: seller.phone,
          calculationBasis: 'net_profit',
          productCommissionRate: seller.commissionPercent || 20,
          serviceCommissionRate: 15,
          estimatedProductMarginPercent: 50,
          estimatedServiceMarginPercent: 35,
          minSalesQuotaUZS: 0,
          bonusTargetUZS: 50000000,
          bonusAmountUZS: 1500000,
          notes: 'Admin tomonidan tizimda avtomatik kiritilgan boshlang‘ich stavka',
          updatedAt: new Date().toISOString(),
          updatedBy: 'Admin'
        };
        configs.push(newCfg);
        hasChanges = true;
      }
    }

    // Check salespersons
    for (const sp of salespersons) {
      const exists = configs.find(
        (c) => c.sellerId === sp.id || c.sellerName.toLowerCase() === sp.fullName.toLowerCase()
      );
      if (!exists) {
        const newCfg: SellerCommissionConfig = {
          id: `cfg-${sp.id}`,
          sellerId: sp.id,
          sellerName: sp.fullName,
          sellerPhone: sp.phone,
          calculationBasis: 'net_profit',
          productCommissionRate: sp.commissionRatePercent || 20,
          serviceCommissionRate: 15,
          estimatedProductMarginPercent: 50,
          estimatedServiceMarginPercent: 35,
          minSalesQuotaUZS: 0,
          bonusTargetUZS: 50000000,
          bonusAmountUZS: 1500000,
          notes: 'Admin tomonidan tizimda avtomatik kiritilgan boshlang‘ich stavka',
          updatedAt: new Date().toISOString(),
          updatedBy: 'Admin'
        };
        configs.push(newCfg);
        hasChanges = true;
      }
    }

    if (hasChanges) {
      AppStorage.saveCommissionConfigs(configs);
    }

    return configs;
  }

  /**
   * Find configuration for a specific seller
   */
  static getConfigForSeller(
    sellerId: string,
    sellerName?: string,
    configs?: SellerCommissionConfig[]
  ): SellerCommissionConfig {
    const list = configs || AppStorage.getCommissionConfigs();
    const found = list.find(
      (c) =>
        c.sellerId === sellerId ||
        (sellerName && c.sellerName.toLowerCase() === sellerName.toLowerCase())
    );

    if (found) return found;

    // Return global fallback config
    const def = list.find((c) => c.sellerId === 'default');
    if (def) {
      return {
        ...def,
        sellerId: sellerId || 'unknown',
        sellerName: sellerName || 'Sotuvchi'
      };
    }

    return {
      id: `cfg-${sellerId}`,
      sellerId: sellerId || 'default',
      sellerName: sellerName || 'Sotuvchi',
      calculationBasis: 'net_profit',
      productCommissionRate: 20,
      serviceCommissionRate: 15,
      estimatedProductMarginPercent: 50,
      estimatedServiceMarginPercent: 35,
      minSalesQuotaUZS: 0,
      bonusTargetUZS: 50000000,
      bonusAmountUZS: 1500000,
      updatedAt: new Date().toISOString(),
      updatedBy: 'Admin'
    };
  }

  /**
   * Update or create a seller commission configuration (Admin only)
   */
  static saveConfig(config: SellerCommissionConfig): void {
    const configs = AppStorage.getCommissionConfigs();
    const idx = configs.findIndex((c) => c.id === config.id || c.sellerId === config.sellerId);
    if (idx >= 0) {
      configs[idx] = {
        ...config,
        updatedAt: new Date().toISOString()
      };
    } else {
      configs.push({
        ...config,
        updatedAt: new Date().toISOString()
      });
    }
    AppStorage.saveCommissionConfigs([...configs]);
  }

  /**
   * Synchronize / recalculate all order commissions based on active configs
   */
  static syncOrderCommissions(
    orders: Order[],
    products: Product[],
    configs: SellerCommissionConfig[]
  ): OrderCommissionRecord[] {
    const existingRecords = AppStorage.getCommissionRecords();
    const existingMap = new Map(existingRecords.map((r) => [r.orderId, r]));

    const updatedRecords: OrderCommissionRecord[] = orders.map((order) => {
      const config = this.getConfigForSeller(
        order.salespersonId,
        order.salespersonName,
        configs
      );
      const existing = existingMap.get(order.id);
      return calculateOrderCommission(order, config, products, existing);
    });

    AppStorage.saveCommissionRecords(updatedRecords);
    return updatedRecords;
  }

  /**
   * Mark commission records as paid
   */
  static markAsPaid(
    recordIds: string[],
    paidBy: string,
    paymentMethod: 'cash' | 'card' | 'bank_transfer' = 'cash',
    notes?: string
  ): { updatedRecords: OrderCommissionRecord[]; payout: CommissionPayout } {
    const records = AppStorage.getCommissionRecords();
    const now = new Date().toISOString();
    let totalPaid = 0;
    let targetSellerId = '';
    let targetSellerName = '';

    const updated = records.map((rec) => {
      if (recordIds.includes(rec.id) && rec.payoutStatus !== 'paid') {
        totalPaid += rec.totalCommissionUZS;
        targetSellerId = rec.sellerId;
        targetSellerName = rec.sellerName;
        return {
          ...rec,
          payoutStatus: 'paid' as const,
          paidAt: now,
          paidBy,
          paidNote: notes
        };
      }
      return rec;
    });

    AppStorage.saveCommissionRecords(updated);

    const payout: CommissionPayout = {
      id: `payout-${Date.now()}`,
      sellerId: targetSellerId,
      sellerName: targetSellerName,
      amountUZS: totalPaid,
      paidAt: now,
      paidBy,
      paymentMethod,
      orderIds: recordIds,
      notes
    };

    const currentPayouts = AppStorage.getCommissionPayouts();
    AppStorage.saveCommissionPayouts([payout, ...currentPayouts]);

    return { updatedRecords: updated, payout };
  }
}
