/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Partner Management and Service Commission / Owner Profit-Sharing Service
 */

import {
  Order,
  OrderCraneService,
  OrderLoaderService,
  OrderWasteService,
  PartnerPayoutRecord,
  PartnerServiceType,
  ServicePartner,
  ServiceProfitAnalytics
} from '../types';
import { AppStorage } from './storage';

export interface ServiceJobDetail {
  orderId: string;
  orderDate: string;
  clientName: string;
  serviceType: 'waste_truck' | 'crane' | 'loader';
  serviceName: string;
  partnerId?: string;
  partnerName?: string;
  totalPriceUZS: number;
  partnerPayoutUZS: number;       // 80% to partner
  companyCommissionUZS: number;   // 20% Shohrent net profit
  ownerProfitShareUZS: number;    // 50% of company commission (Owner earnings)
  companyReserveUZS: number;      // 50% of company commission (Company reserve)
  address?: string;
}

export class PartnerService {
  /**
   * Default service margin rates:
   * - 20% Shohrent commission / net profit margin
   * - 80% Partner / Contractor share
   * - 50% Owner / Admin profit share out of the net profit
   */
  public static readonly DEFAULT_SERVICE_COMMISSION_PERCENT = 20;
  public static readonly DEFAULT_OWNER_PROFIT_SHARE_PERCENT = 50;

  /**
   * Calculate commission breakdown for a given service price
   */
  static calculateServiceBreakdown(
    priceUZS: number,
    partnerCommissionPercent: number = PartnerService.DEFAULT_SERVICE_COMMISSION_PERCENT
  ): {
    totalPriceUZS: number;
    partnerPayoutUZS: number;
    companyCommissionUZS: number;
    ownerProfitShareUZS: number;
    companyReserveUZS: number;
  } {
    const rate = partnerCommissionPercent > 0 ? partnerCommissionPercent : 20;
    const companyCommissionUZS = Math.round(priceUZS * (rate / 100));
    const partnerPayoutUZS = Math.max(0, priceUZS - companyCommissionUZS);
    const ownerProfitShareUZS = Math.round(companyCommissionUZS * 0.5);
    const companyReserveUZS = companyCommissionUZS - ownerProfitShareUZS;

    return {
      totalPriceUZS: priceUZS,
      partnerPayoutUZS,
      companyCommissionUZS,
      ownerProfitShareUZS,
      companyReserveUZS
    };
  }

  /**
   * Extract all service jobs from all orders with their commission & profit shares
   */
  static extractServiceJobs(
    orders: Order[],
    partnersMap?: Map<string, ServicePartner>
  ): ServiceJobDetail[] {
    const jobs: ServiceJobDetail[] = [];

    orders.forEach((order) => {
      // 1. Waste Services
      if (order.wasteServices && order.wasteServices.length > 0) {
        order.wasteServices.forEach((ws) => {
          const price = ws.totalPriceUZS || ws.totalUZS || 0;
          const partner = ws.partnerId && partnersMap ? partnersMap.get(ws.partnerId) : undefined;
          const rate = partner ? partner.commissionRatePercent : PartnerService.DEFAULT_SERVICE_COMMISSION_PERCENT;
          const breakdown = this.calculateServiceBreakdown(price, rate);

          jobs.push({
            orderId: order.id,
            orderDate: order.orderDate || order.date || order.createdAt?.split('T')[0] || 'Noma‘lum',
            clientName: order.clientName || 'Noma‘lum mijoz',
            serviceType: 'waste_truck',
            serviceName: ws.truckName || 'Musir moshina',
            partnerId: ws.partnerId,
            partnerName: ws.partnerName || (partner ? partner.name : 'Biriktirilmagan'),
            totalPriceUZS: price,
            partnerPayoutUZS: breakdown.partnerPayoutUZS,
            companyCommissionUZS: breakdown.companyCommissionUZS,
            ownerProfitShareUZS: breakdown.ownerProfitShareUZS,
            companyReserveUZS: breakdown.companyReserveUZS,
            address: ws.address || order.deliveryAddress
          });
        });
      }

      // 2. Crane Services
      if (order.craneServices && order.craneServices.length > 0) {
        order.craneServices.forEach((cs) => {
          const price = cs.totalPriceUZS || cs.totalUZS || 0;
          const partner = cs.partnerId && partnersMap ? partnersMap.get(cs.partnerId) : undefined;
          const rate = partner ? partner.commissionRatePercent : PartnerService.DEFAULT_SERVICE_COMMISSION_PERCENT;
          const breakdown = this.calculateServiceBreakdown(price, rate);

          jobs.push({
            orderId: order.id,
            orderDate: order.orderDate || order.date || order.createdAt?.split('T')[0] || 'Noma‘lum',
            clientName: order.clientName || 'Noma‘lum mijoz',
            serviceType: 'crane',
            serviceName: `${cs.craneName || 'Avtokran'} (${cs.tonnage || 0}t)`,
            partnerId: cs.partnerId,
            partnerName: cs.partnerName || (partner ? partner.name : 'Biriktirilmagan'),
            totalPriceUZS: price,
            partnerPayoutUZS: breakdown.partnerPayoutUZS,
            companyCommissionUZS: breakdown.companyCommissionUZS,
            ownerProfitShareUZS: breakdown.ownerProfitShareUZS,
            companyReserveUZS: breakdown.companyReserveUZS,
            address: cs.address || order.deliveryAddress
          });
        });
      }

      // 3. Loader Services
      if (order.loaderServices && order.loaderServices.length > 0) {
        order.loaderServices.forEach((ls) => {
          const price = ls.totalPriceUZS || ls.calculatedPriceUZS || 0;
          const partner = ls.partnerId && partnersMap ? partnersMap.get(ls.partnerId) : undefined;
          const rate = partner ? partner.commissionRatePercent : PartnerService.DEFAULT_SERVICE_COMMISSION_PERCENT;
          const breakdown = this.calculateServiceBreakdown(price, rate);

          jobs.push({
            orderId: order.id,
            orderDate: order.orderDate || order.date || order.createdAt?.split('T')[0] || 'Noma‘lum',
            clientName: order.clientName || 'Noma‘lum mijoz',
            serviceType: 'loader',
            serviceName: `Yukchilar (${ls.numberOfLoaders || ls.assignedPersonsCount || 2} kishi)`,
            partnerId: ls.partnerId,
            partnerName: ls.partnerName || (partner ? partner.name : 'Biriktirilmagan'),
            totalPriceUZS: price,
            partnerPayoutUZS: breakdown.partnerPayoutUZS,
            companyCommissionUZS: breakdown.companyCommissionUZS,
            ownerProfitShareUZS: breakdown.ownerProfitShareUZS,
            companyReserveUZS: breakdown.companyReserveUZS,
            address: ls.address || order.deliveryAddress
          });
        });
      }
    });

    return jobs;
  }

  /**
   * Calculate aggregated service profit analytics and Owner's 50% share
   */
  static calculateAnalytics(
    jobs: ServiceJobDetail[],
    dateRange?: { from?: string; to?: string }
  ): ServiceProfitAnalytics {
    let filtered = jobs;
    if (dateRange?.from) {
      filtered = filtered.filter((j) => j.orderDate >= dateRange.from!);
    }
    if (dateRange?.to) {
      filtered = filtered.filter((j) => j.orderDate <= dateRange.to!);
    }

    let totalServiceRevenueUZS = 0;
    let totalPartnerShareUZS = 0;
    let totalCompanyProfitUZS = 0;
    let ownerShareUZS = 0;
    let companyReserveUZS = 0;
    let wasteRevenueUZS = 0;
    let craneRevenueUZS = 0;
    let loaderRevenueUZS = 0;

    filtered.forEach((j) => {
      totalServiceRevenueUZS += j.totalPriceUZS;
      totalPartnerShareUZS += j.partnerPayoutUZS;
      totalCompanyProfitUZS += j.companyCommissionUZS;
      ownerShareUZS += j.ownerProfitShareUZS;
      companyReserveUZS += j.companyReserveUZS;

      if (j.serviceType === 'waste_truck') wasteRevenueUZS += j.totalPriceUZS;
      if (j.serviceType === 'crane') craneRevenueUZS += j.totalPriceUZS;
      if (j.serviceType === 'loader') loaderRevenueUZS += j.totalPriceUZS;
    });

    return {
      totalServiceRevenueUZS,
      totalPartnerShareUZS,
      totalCompanyProfitUZS,
      ownerShareUZS,
      companyReserveUZS,
      wasteRevenueUZS,
      craneRevenueUZS,
      loaderRevenueUZS,
      totalServiceJobsCount: filtered.length
    };
  }

  /**
   * Recalculate partner balances based on assigned orders and payouts
   */
  static recalculatePartnersWithJobs(
    partners: ServicePartner[],
    jobs: ServiceJobDetail[],
    payouts: PartnerPayoutRecord[]
  ): ServicePartner[] {
    const payoutsMap = new Map<string, number>();
    payouts.forEach((p) => {
      const current = payoutsMap.get(p.partnerId) || 0;
      payoutsMap.set(p.partnerId, current + p.amountUZS);
    });

    return partners.map((partner) => {
      const partnerJobs = jobs.filter((j) => j.partnerId === partner.id);
      const totalVolume = partnerJobs.reduce((acc, j) => acc + j.totalPriceUZS, 0);
      const totalEarnedPayout = partnerJobs.reduce((acc, j) => acc + j.partnerPayoutUZS, 0);
      const paid = payoutsMap.get(partner.id) || 0;
      const pending = Math.max(0, totalEarnedPayout - paid);

      return {
        ...partner,
        totalOrdersCount: partnerJobs.length,
        totalServiceVolumeUZS: totalVolume,
        totalEarnedPayoutUZS: totalEarnedPayout,
        paidPayoutUZS: paid,
        pendingPayoutUZS: pending
      };
    });
  }

  /**
   * Save a partner payout record
   */
  static recordPartnerPayout(
    partnerId: string,
    partnerName: string,
    amountUZS: number,
    paidBy: string,
    paymentMethod: 'cash' | 'card' | 'bank_transfer' = 'cash',
    orderIds: string[] = [],
    receiptNumber?: string,
    notes?: string
  ): { payout: PartnerPayoutRecord; updatedPartners: ServicePartner[] } {
    const payout: PartnerPayoutRecord = {
      id: `payout-partner-${Date.now()}`,
      partnerId,
      partnerName,
      amountUZS,
      paidAt: new Date().toISOString(),
      paidBy,
      paymentMethod,
      orderIds,
      receiptNumber,
      notes
    };

    const currentPayouts = AppStorage.getPartnerPayouts();
    const updatedPayouts = [payout, ...currentPayouts];
    AppStorage.savePartnerPayouts(updatedPayouts);

    const partners = AppStorage.getPartners();
    const orders = AppStorage.getOrders();
    const partnersMap = new Map(partners.map((p) => [p.id, p]));
    const jobs = this.extractServiceJobs(orders, partnersMap);
    const updatedPartners = this.recalculatePartnersWithJobs(partners, jobs, updatedPayouts);
    AppStorage.savePartners(updatedPartners);

    return { payout, updatedPartners };
  }
}
