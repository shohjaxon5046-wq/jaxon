import { CraneConfig, LoaderPricingRules, WasteTruckConfig } from '../types';

export const DEFAULT_LOADER_RULES: LoaderPricingRules = {
  baseHourlyPerPerson: 75000, // 75,000 UZS / hour
  pricePerKg: 100, // 100 UZS / kg
  ratePerFloorNoElevator: 15000, // 15,000 UZS per floor per 50kg
  elevatorFee: 5000,
  oversizeMultiplier: 1.35,
  minLoadersForWeight: [
    { maxKg: 70, recommendedPersons: 1 },
    { maxKg: 180, recommendedPersons: 2 },
    { maxKg: 350, recommendedPersons: 3 },
    { maxKg: 600, recommendedPersons: 4 },
    { maxKg: 1200, recommendedPersons: 6 },
    { maxKg: 999999, recommendedPersons: 8 }
  ]
};

export function calculateLoaderService({
  weightKg,
  floorCount,
  hasElevator,
  isOversized,
  rules = DEFAULT_LOADER_RULES
}: {
  weightKg: number;
  floorCount: number;
  hasElevator: boolean;
  isOversized: boolean;
  rules?: LoaderPricingRules;
}) {
  // 1. Determine crew size
  let recommendedPersons = 1;
  for (const tier of rules.minLoadersForWeight) {
    if (weightKg <= tier.maxKg) {
      recommendedPersons = tier.recommendedPersons;
      break;
    }
  }

  if (isOversized && recommendedPersons < 2) {
    recommendedPersons = 2;
  }

  // 2. Base labor fee
  const estimatedHours = Math.max(2, Math.ceil(weightKg / 300) + (hasElevator ? 0 : Math.floor(floorCount / 3)));
  const basePrice = recommendedPersons * rules.baseHourlyPerPerson * estimatedHours;

  // 3. Weight and Floor calculations
  const weightCost = weightKg * (rules.pricePerKg || 100);
  let floorFee = 0;
  if (!hasElevator && floorCount > 1) {
    const stairsWalked = floorCount - 1;
    floorFee = stairsWalked * (rules.ratePerFloorNoElevator || 15000);
  } else if (hasElevator) {
    floorFee = rules.elevatorFee || 5000;
  }

  let total = basePrice + weightCost + floorFee;

  // 4. Oversize coefficient
  if (isOversized) {
    total = Math.round(total * (rules.oversizeMultiplier || 1.35));
  }

  return {
    recommendedPersons,
    estimatedHours,
    basePrice,
    floorFee,
    totalPriceUZS: total
  };
}

export function calculateCraneService({
  crane,
  rentalType,
  units
}: {
  crane: CraneConfig;
  rentalType: 'hours' | 'days';
  units: number;
}) {
  if (rentalType === 'hours') {
    const billableHours = Math.max(crane.minHours, units);
    const total = billableHours * crane.hourlyRate;
    return {
      billableHours,
      totalPriceUZS: total
    };
  } else {
    let rate = crane.dailyRate;
    if (units >= 3) {
      rate = rate * (1 - crane.multiDayDiscountPercent / 100);
    }
    const total = Math.round(units * rate);
    return {
      billableDays: units,
      dailyRateApplied: rate,
      totalPriceUZS: total
    };
  }
}

export function calculateWasteRemovalService({
  truck,
  tripsCount = 1,
  floorCount = 1,
  hasElevator = false,
  isBagged = true,
  isOversized = false
}: {
  truck: WasteTruckConfig;
  tripsCount: number;
  floorCount?: number;
  hasElevator?: boolean;
  isBagged?: boolean;
  isOversized?: boolean;
}) {
  let base = truck.pricePerTrip * tripsCount;
  if (truck.loadingRules) {
    const rules = truck.loadingRules;
    if (floorCount > 1) {
      base += rules.pricePerFloorNoElevator * (floorCount - 1);
    }
    if (hasElevator) {
      base = Math.max(0, base - rules.hasElevatorDiscount);
    }
    if (isBagged) base += rules.baggedSurcharge;
    if (!isBagged) base += rules.looseSurcharge;
    if (isOversized) base += rules.oversizeSurcharge;
  }

  return {
    totalPriceUZS: base
  };
}

export function generateRandomCode(prefix: string): string {
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}-${randomNum}`;
}

export function generateEAN13Barcode(): string {
  // Uzbekistan GS1 prefix is 478
  const base = '478' + Math.floor(100000000 + Math.random() * 900000000).toString().slice(0, 9);
  // Calculate EAN-13 check digit
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(base[i], 10);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return base + checkDigit;
}

export function formatUZS(amount?: number | null): string {
  const safe = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  return new Intl.NumberFormat('uz-UZ').format(safe) + " so'm";
}

export function formatUSD(amount?: number | null): string {
  const safe = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(safe);
}
