'use client';

import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';

interface SessionCustomer {
  id: string;
  fullName: string;
  city: string;
  age: number;
  segment: string;
  accountType: string;
  avgMonthlyBalance: number;
  hasActiveLoan: boolean;
  allocatedProducts: string[];
  productRationales: Array<{
    product: string;
    rationale: string;
    confidence: number;
  }>;
  spendingInsight: {
    summary: string;
    keyCategories: string[];
    riskFlags: string[];
    opportunities: string[];
  } | null;
  generatedMessage: {
    messageEn: string;
    messageHi: string;
  } | null;
  qualifies: boolean;
  totalCreditLast12Months?: number;
  totalDebitLast12Months?: number;
  topSpendingCategories?: string[];
}

interface SessionCustomersResponse {
  sessionId: string;
  totalCount: number;
  customers: SessionCustomer[];
}

export function useSessionCustomers(sessionId: string | null) {
  const query = useQuery({
    queryKey: ['crm-session-customers', sessionId],
    queryFn: () => apiClient.get<SessionCustomersResponse>(`/crm-session/${sessionId}/customers`),
    enabled: !!sessionId,
    refetchOnWindowFocus: true,
    staleTime: 5000,
  });

  return {
    customers: query.data?.customers ?? [],
    totalCount: query.data?.totalCount ?? 0,
    isLoading: query.isLoading,
    refresh: query.refetch,
  };
}
