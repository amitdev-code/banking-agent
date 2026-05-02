'use client';

import { useQuery } from '@tanstack/react-query';
import { History } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { RunTimeline } from '@/components/history/run-timeline';

interface Run {
  id: string;
  mode: string;
  status: string;
  customerCount: number | null;
  highValueCount: number | null;
  avgScore: number | null;
  createdAt: string;
}

export default function HistoryPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['history'],
    queryFn: () => apiClient.get<{ items: Run[] }>('/crm/history'),
    staleTime: 60_000,
  });

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-6 py-5 border-b flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <History className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold">Analysis History</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Past workflow runs — click "View Results" to replay any completed analysis.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <RunTimeline runs={data?.items ?? []} isLoading={isLoading} />
      </div>
    </div>
  );
}
