export type AccountType = 'savings' | 'current' | 'salary';
export type Segment = 'retail' | 'premium' | 'sme' | 'nri';
export type KycStatus = 'verified' | 'pending' | 'failed';

export interface CustomerPii {
  fullName: string;
  phone: string;
  email: string;
  pan: string;
  aadhaar: string;
  address: string;
  dob: string;
  accountNumber: string;
}

export type MaskedValue = string | null;

export interface CustomerPiiMasked {
  fullName: MaskedValue;
  phone: MaskedValue;
  email: MaskedValue;
  pan: MaskedValue;
  aadhaar: MaskedValue;
  address: MaskedValue;
  dob: MaskedValue;
  accountNumber: MaskedValue;
}

export interface Customer {
  id: string;
  tenantId: string;
  age: number;
  city: string;
  segment: Segment;
  accountType: AccountType;
  kycStatus: KycStatus;
  joinedAt: Date;
  createdAt: Date;
  avgMonthlyBalance: number;
  hasActiveLoan: boolean;
  loanType: string | null;
  fullName: string;
  phone: string;
  email: string;
  pan: string;
  aadhaar: string;
  address: string;
  dob: Date;
  accountNumber: string;
}

export interface CustomerListItem {
  id: string;
  age: number;
  city: string;
  segment: Segment;
  accountType: AccountType;
  kycStatus: KycStatus;
  joinedAt: Date;
  avgMonthlyBalance: number;
  hasActiveLoan: boolean;
  loanType: string | null;
  fullName: string;
  phone: string;
  email: string;
  pan: string;
  aadhaar: string;
  address: string;
  dob: Date;
  accountNumber: string;
}

export interface CustomerFilters {
  minAge?: number;
  maxAge?: number;
  cities?: string[];
  segments?: Segment[];
  minAvgBalance?: number;
  hasExistingLoan?: boolean;
  minSalary?: number;
}

export interface PaginatedCustomers {
  items: CustomerListItem[];
  total: number;
  page: number;
  limit: number;
}
