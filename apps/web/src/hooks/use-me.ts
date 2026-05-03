'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

import type { SessionUser } from '@banking-crm/types';
import { apiClient, ApiError } from '@/lib/api-client';

export function useMe() {
  const router = useRouter();

  const query = useQuery({
    queryKey: ['me'],
    queryFn: () => apiClient.get<{ user: SessionUser }>('/auth/me'),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (query.error instanceof ApiError && query.error.status === 401) {
      router.push('/login');
    }
  }, [query.error, router]);

  return {
    user: query.data?.user ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
