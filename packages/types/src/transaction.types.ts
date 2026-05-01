export type TransactionType = 'CREDIT' | 'DEBIT';

export type Category =
  | 'SALARY'
  | 'EMI'
  | 'GROCERY'
  | 'FUEL'
  | 'ENTERTAINMENT'
  | 'MEDICAL'
  | 'TRAVEL'
  | 'UTILITIES'
  | 'SHOPPING'
  | 'DINING'
  | 'INSURANCE'
  | 'INVESTMENT'
  | 'ATM_WITHDRAWAL'
  | 'TRANSFER'
  | 'OTHER';

export interface Transaction {
  id: string;
  customerId: string;
  tenantId: string;
  amount: number;
  type: TransactionType;
  category: Category;
  description: string;
  merchantName: string | null;
  occurredAt: Date;
  createdAt: Date;
}

export interface CategoryTotal {
  category: Category;
  type: TransactionType;
  total: number;
  count: number;
}

export interface MonthlySalaryRecord {
  month: Date;
  total: number;
}

export interface TransactionSummary {
  customerId: string;
  categoryTotals: CategoryTotal[];
  monthlySalaryCredits: number[];
  totalCreditLast12Months: number;
  totalDebitLast12Months: number;
  transactionCountLast30Days: number;
  avgMonthlyBalance: number;
  hasRegularIncome: boolean;
  hasActiveLoan: boolean;
  loanType: string | null;
}
