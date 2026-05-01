import { faker } from '@faker-js/faker';

import type { ScenarioProfile, SpendingProfile } from '../data/scenarios';

type CategoryKey = keyof SpendingProfile;

const MERCHANT_NAMES: Record<string, string[]> = {
  GROCERY: ['BigBasket', 'Zepto', 'DMart', 'Reliance Fresh', 'More Supermarket', 'Spencer\'s', 'Nature\'s Basket'],
  FUEL: ['Indian Oil', 'HP Petrol', 'BPCL', 'Shell', 'Essar Petroleum'],
  ENTERTAINMENT: ['BookMyShow', 'PVR Cinemas', 'Netflix', 'Amazon Prime', 'Hotstar', 'INOX'],
  DINING: ['Zomato', 'Swiggy', 'McDonald\'s', 'KFC', 'Domino\'s', 'Pizza Hut', 'Haldiram\'s', 'Barbeque Nation'],
  SHOPPING: ['Flipkart', 'Amazon', 'Myntra', 'Ajio', 'Meesho', 'Nykaa', 'Snapdeal'],
  TRAVEL: ['MakeMyTrip', 'Goibibo', 'IRCTC', 'IndiGo', 'Air India', 'Yatra', 'OYO', 'Uber'],
  MEDICAL: ['Apollo Pharmacy', 'Fortis', 'Max Healthcare', 'Medanta', 'Netmeds', '1mg', 'Pharmeasy'],
  UTILITIES: ['BESCOM', 'Tata Power', 'BWSSB', 'MTNL', 'Jio', 'Airtel', 'Vi', 'BSES Yamuna'],
  INSURANCE: ['LIC', 'HDFC Life', 'Max Life', 'ICICI Prudential', 'SBI Life', 'Bajaj Allianz', 'Star Health'],
  INVESTMENT: ['Zerodha', 'Groww', 'Upstox', 'SBI Mutual Fund', 'HDFC MF', 'ICICI Mutual Fund', 'Paytm Money'],
  EMI: ['HDFC Bank EMI', 'ICICI Bank EMI', 'SBI EMI', 'Bajaj Finserv EMI', 'Axis Bank EMI'],
};

function randomAmount(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function randomDateInMonth(year: number, month: number, minDay = 1, maxDay = 28): Date {
  const day = Math.floor(Math.random() * (maxDay - minDay + 1)) + minDay;
  return new Date(year, month, day);
}

export interface TransactionSeedData {
  customerId: string;
  tenantId: string;
  amount: number;
  type: 'CREDIT' | 'DEBIT';
  category: string;
  description: string;
  merchantName: string | null;
  occurredAt: Date;
}

export function generateTransactions(
  customerId: string,
  tenantId: string,
  scenario: ScenarioProfile,
  customerIndex: number,
): TransactionSeedData[] {
  faker.seed(customerIndex * 99991);

  const transactions: TransactionSeedData[] = [];
  const now = new Date();

  // Generate 12 months of history
  for (let monthOffset = 11; monthOffset >= 0; monthOffset--) {
    const targetDate = new Date(now);
    targetDate.setMonth(targetDate.getMonth() - monthOffset);
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();

    // Salary credit (1st-5th of month)
    if (
      scenario.salaryMonthsPresent > 0 &&
      monthOffset <= 11 &&
      12 - monthOffset <= scenario.salaryMonthsPresent
    ) {
      const salaryAmount = randomAmount(
        scenario.avgSalaryRange[0],
        scenario.avgSalaryRange[1],
      );
      if (salaryAmount > 0) {
        transactions.push({
          customerId,
          tenantId,
          amount: salaryAmount,
          type: 'CREDIT',
          category: 'SALARY',
          description: 'Monthly Salary Credit',
          merchantName: null,
          occurredAt: randomDateInMonth(year, month, 1, 5),
        });
      }
    }

    // Spending transactions per category
    for (const [categoryKey, profile] of Object.entries(scenario.spendingProfile) as Array<
      [CategoryKey, NonNullable<SpendingProfile[CategoryKey]>]
    >) {
      if (!profile || Math.random() > profile.chance) continue;

      const isCredit = categoryKey === 'TRANSFER' && Math.random() < 0.6;
      const amount = randomAmount(profile.amountRange[0], profile.amountRange[1]);
      const merchants = MERCHANT_NAMES[categoryKey as string] ?? [];
      const merchantName =
        merchants.length > 0
          ? (merchants[Math.floor(Math.random() * merchants.length)] ?? null)
          : null;

      // Some categories have multiple transactions per month
      const txCount = ['GROCERY', 'DINING', 'FUEL'].includes(categoryKey as string)
        ? Math.floor(Math.random() * 3) + 1
        : 1;

      for (let i = 0; i < txCount; i++) {
        transactions.push({
          customerId,
          tenantId,
          amount: amount / txCount,
          type: isCredit ? 'CREDIT' : 'DEBIT',
          category: categoryKey as string,
          description: merchantName
            ? `${merchantName} - ${categoryKey}`
            : `${categoryKey} transaction`,
          merchantName,
          occurredAt: randomDateInMonth(year, month, 5, 28),
        });
      }
    }

    // ATM withdrawal for certain scenarios (last 30 days emphasis)
    if (scenario.spendingProfile.ATM_WITHDRAWAL && Math.random() < 0.4) {
      const atmProfile = scenario.spendingProfile.ATM_WITHDRAWAL;
      if (atmProfile) {
        transactions.push({
          customerId,
          tenantId,
          amount: randomAmount(atmProfile.amountRange[0], atmProfile.amountRange[1]),
          type: 'DEBIT',
          category: 'ATM_WITHDRAWAL',
          description: 'ATM Cash Withdrawal',
          merchantName: null,
          occurredAt: randomDateInMonth(year, month, 10, 25),
        });
      }
    }
  }

  return transactions;
}
