/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Pure Commission & Profit-Sharing Calculation Engine for Shohrent WMS
 */

import {
  Order,
  OrderCommissionRecord,
  Product,
  SellerCommissionConfig
} from '../types';

/**
 * Calculates commission and profit breakdown for an individual Order
 */
export function calculateOrderCommission(
  order: Order,
  config: SellerCommissionConfig,
  products: Product[],
  existingRecord?: Partial<OrderCommissionRecord>
): OrderCommissionRecord {
  const toolsAmount = order.subtotalToolsUZS || 0;
  const servicesAmount = order.subtotalServicesUZS || 0;
  const totalAmount =
    order.grandTotalUZS || toolsAmount + servicesAmount;

  // 1. Calculate Tools Cost & Net Profit
  let toolsEstimatedCost = 0;
  if (order.tools && order.tools.length > 0) {
    // Attempt amortized product cost estimation
    let calculatedCost = 0;
    let hasProductCost = false;

    for (const tool of order.tools) {
      const prod = products.find((p) => p.id === tool.productId);
      if (prod && prod.purchasePriceUZS > 0) {
        const paybackDays = prod.targetPaybackDays || 60;
        const dailyDepreciation = prod.purchasePriceUZS / paybackDays;
        calculatedCost += dailyDepreciation * (tool.durationDays || 1);
        hasProductCost = true;
      }
    }

    if (hasProductCost && calculatedCost > 0) {
      // Cap cost at 75% of tool rental price to ensure reasonable baseline
      toolsEstimatedCost = Math.min(calculatedCost, toolsAmount * 0.75);
    } else {
      // Default to margin assumption
      const margin = config.estimatedProductMarginPercent || 50;
      toolsEstimatedCost = toolsAmount * (1 - margin / 100);
    }
  } else {
    const margin = config.estimatedProductMarginPercent || 50;
    toolsEstimatedCost = toolsAmount * (1 - margin / 100);
  }

  const toolsNetProfit = Math.max(0, toolsAmount - toolsEstimatedCost);

  // 2. Calculate Services Cost & Net Profit
  const serviceMargin = config.estimatedServiceMarginPercent || 35;
  const servicesEstimatedCost = servicesAmount * (1 - serviceMargin / 100);
  const servicesNetProfit = Math.max(0, servicesAmount - servicesEstimatedCost);
  const totalNetProfit = toolsNetProfit + servicesNetProfit;

  // 3. Apply Commission Rates based on Calculation Basis
  let earnedToolsCommission = 0;
  let earnedServicesCommission = 0;

  if (config.calculationBasis === 'net_profit') {
    // Percentage of Net Profit (e.g. 20% of net profit)
    earnedToolsCommission = Math.round(
      toolsNetProfit * (config.productCommissionRate / 100)
    );
    earnedServicesCommission = Math.round(
      servicesNetProfit * (config.serviceCommissionRate / 100)
    );
  } else {
    // Percentage of Gross Sales (e.g. 5% of gross turnover)
    earnedToolsCommission = Math.round(
      toolsAmount * (config.productCommissionRate / 100)
    );
    earnedServicesCommission = Math.round(
      servicesAmount * (config.serviceCommissionRate / 100)
    );
  }

  const totalCommission = earnedToolsCommission + earnedServicesCommission;

  return {
    id: existingRecord?.id || `comm-${order.id}`,
    orderId: order.id,
    sellerId: config.sellerId,
    sellerName: config.sellerName || order.salespersonName || 'Sotuvchi',
    orderDate: order.orderDate || new Date().toISOString().split('T')[0],
    clientName: order.clientName || 'Mijoz',
    toolsAmountUZS: toolsAmount,
    servicesAmountUZS: servicesAmount,
    totalAmountUZS: totalAmount,
    calculationBasis: config.calculationBasis,
    productRatePercent: config.productCommissionRate,
    serviceRatePercent: config.serviceCommissionRate,
    toolsEstimatedCostUZS: Math.round(toolsEstimatedCost),
    toolsNetProfitUZS: Math.round(toolsNetProfit),
    servicesEstimatedCostUZS: Math.round(servicesEstimatedCost),
    servicesNetProfitUZS: Math.round(servicesNetProfit),
    totalNetProfitUZS: Math.round(totalNetProfit),
    earnedToolsCommissionUZS: earnedToolsCommission,
    earnedServicesCommissionUZS: earnedServicesCommission,
    totalCommissionUZS: totalCommission,
    payoutStatus: existingRecord?.payoutStatus || 'pending',
    paidAt: existingRecord?.paidAt,
    paidBy: existingRecord?.paidBy,
    payoutReference: existingRecord?.payoutReference,
    createdAt: existingRecord?.createdAt || new Date().toISOString()
  };
}

/**
 * Explains how the commission is calculated in readable text
 */
export function getCommissionExplanation(
  record: OrderCommissionRecord
): string {
  if (record.calculationBasis === 'net_profit') {
    return `Sof foydadan: Asboblar sof foydasi (${Math.round(
      record.toolsNetProfitUZS
    ).toLocaleString()} so'm) ning ${record.productRatePercent}% qismi + Xizmatlar sof foydasi (${Math.round(
      record.servicesNetProfitUZS
    ).toLocaleString()} so'm) ning ${record.serviceRatePercent}% qismi.`;
  }
  return `Umumiy tushumdan: Asboblar tushumi (${Math.round(
    record.toolsAmountUZS
  ).toLocaleString()} so'm) ning ${record.productRatePercent}% qismi + Xizmatlar tushumi (${Math.round(
    record.servicesAmountUZS
  ).toLocaleString()} so'm) ning ${record.serviceRatePercent}% qismi.`;
}

/**
 * Calculates aggregate stats for a specific seller
 */
export interface SellerAggregateStats {
  sellerId: string;
  sellerName: string;
  totalDeals: number;
  totalSalesUZS: number;
  totalNetProfitUZS: number;
  totalCommissionEarnedUZS: number;
  totalPaidUZS: number;
  totalPendingUZS: number;
  bonusAchieved: boolean;
  bonusAmountUZS: number;
}

export function calculateSellerAggregates(
  records: OrderCommissionRecord[],
  config: SellerCommissionConfig
): SellerAggregateStats {
  const sellerRecords = records.filter(
    (r) => r.sellerId === config.sellerId || r.sellerName === config.sellerName
  );

  const totalDeals = sellerRecords.length;
  const totalSalesUZS = sellerRecords.reduce(
    (acc, r) => acc + (r.totalAmountUZS || 0),
    0
  );
  const totalNetProfitUZS = sellerRecords.reduce(
    (acc, r) => acc + (r.totalNetProfitUZS || 0),
    0
  );
  const totalCommissionEarnedUZS = sellerRecords.reduce(
    (acc, r) => acc + (r.totalCommissionUZS || 0),
    0
  );
  const totalPaidUZS = sellerRecords
    .filter((r) => r.payoutStatus === 'paid')
    .reduce((acc, r) => acc + (r.totalCommissionUZS || 0), 0);
  const totalPendingUZS = sellerRecords
    .filter((r) => r.payoutStatus !== 'paid')
    .reduce((acc, r) => acc + (r.totalCommissionUZS || 0), 0);

  const bonusAchieved =
    !!config.bonusTargetUZS &&
    config.bonusTargetUZS > 0 &&
    totalSalesUZS >= config.bonusTargetUZS;
  const bonusAmountUZS = bonusAchieved ? config.bonusAmountUZS || 0 : 0;

  return {
    sellerId: config.sellerId,
    sellerName: config.sellerName,
    totalDeals,
    totalSalesUZS,
    totalNetProfitUZS,
    totalCommissionEarnedUZS,
    totalPaidUZS,
    totalPendingUZS,
    bonusAchieved,
    bonusAmountUZS
  };
}
