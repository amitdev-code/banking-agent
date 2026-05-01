import { faker } from '@faker-js/faker';

import { INDIAN_CITIES, CITY_WEIGHTS } from '../data/cities';
import { INDIAN_FIRST_NAMES, INDIAN_LAST_NAMES, DOMAINS } from '../data/names';
import type { ScenarioProfile } from '../data/scenarios';

function weightedRandomCity(): string {
  const totalWeight = Object.values(CITY_WEIGHTS).reduce((a, b) => a + b, 0);
  let random = Math.random() * totalWeight;
  for (const [city, weight] of Object.entries(CITY_WEIGHTS)) {
    random -= weight;
    if (random <= 0) return city;
  }
  return INDIAN_CITIES[Math.floor(Math.random() * INDIAN_CITIES.length)] ?? 'Mumbai';
}

function randomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generatePan(): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits = '0123456789';
  return (
    Array.from({ length: 5 }, () => letters[Math.floor(Math.random() * 26)]).join('') +
    Array.from({ length: 4 }, () => digits[Math.floor(Math.random() * 10)]).join('') +
    (letters[Math.floor(Math.random() * 26)] ?? 'A')
  );
}

function generateAadhaar(): string {
  return Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join('');
}

function generateAccountNumber(index: number): string {
  return String(1000000000 + index).padStart(16, '0');
}

function generatePhone(): string {
  const prefixes = ['98', '97', '96', '95', '94', '93', '92', '91', '90', '89', '88', '87', '86'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)] ?? '98';
  return prefix + Array.from({ length: 8 }, () => Math.floor(Math.random() * 10)).join('');
}

export interface CustomerSeedData {
  tenantId: string;
  age: number;
  city: string;
  segment: string;
  accountType: string;
  kycStatus: string;
  joinedAt: Date;
  fullName: string;
  phone: string;
  email: string;
  pan: string;
  aadhaar: string;
  address: string;
  dob: Date;
  accountNumber: string;
  hasActiveLoan: boolean;
  loanType: string | null;
  avgMonthlyBalance: number;
}

export function generateCustomer(
  scenario: ScenarioProfile,
  tenantId: string,
  globalIndex: number,
): CustomerSeedData {
  faker.seed(globalIndex * 31337);

  const firstName =
    INDIAN_FIRST_NAMES[Math.floor(Math.random() * INDIAN_FIRST_NAMES.length)] ?? 'Aarav';
  const lastName =
    INDIAN_LAST_NAMES[Math.floor(Math.random() * INDIAN_LAST_NAMES.length)] ?? 'Sharma';
  const fullName = `${firstName} ${lastName}`;

  const age = randomInRange(scenario.ageRange[0], scenario.ageRange[1]);
  const dob = new Date();
  dob.setFullYear(dob.getFullYear() - age);
  dob.setMonth(Math.floor(Math.random() * 12));
  dob.setDate(Math.floor(Math.random() * 28) + 1);

  const domain = DOMAINS[Math.floor(Math.random() * DOMAINS.length)] ?? 'gmail.com';
  const emailHandle = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${Math.floor(Math.random() * 999)}`;
  const email = `${emailHandle}@${domain}`;

  const joinedMonthsAgo = randomInRange(6, 60);
  const joinedAt = new Date();
  joinedAt.setMonth(joinedAt.getMonth() - joinedMonthsAgo);

  const avgMonthlyBalance = randomInRange(
    scenario.avgBalanceRange[0],
    scenario.avgBalanceRange[1],
  );

  const city = weightedRandomCity();
  const state = faker.location.state();

  return {
    tenantId,
    age,
    city,
    segment: scenario.segment,
    accountType: scenario.accountType,
    kycStatus: scenario.kycStatus,
    joinedAt,
    fullName,
    phone: generatePhone(),
    email,
    pan: generatePan(),
    aadhaar: generateAadhaar(),
    address: `${faker.location.buildingNumber()}, ${faker.location.street()}, ${city}, ${state}`,
    dob,
    accountNumber: generateAccountNumber(globalIndex),
    hasActiveLoan: scenario.hasActiveLoan,
    loanType: scenario.loanType,
    avgMonthlyBalance,
  };
}
