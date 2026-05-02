import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import type { ScoredCustomer } from '@banking-crm/types';
import { ResultsPanel } from '@/components/dashboard/results-panel';

interface RunReplayData {
  id: string;
  mode: string;
  status: string;
  createdAt: string;
  customerCount: number | null;
  highValueCount: number | null;
  avgScore: number | null;
  scoredResults: Array<
    ScoredCustomer & {
      fullName: string;
      phone: string;
      city: string;
      age: number;
      avgMonthlyBalance: number;
      messageEn: string;
      messageHi: string;
      resultId: string;
      isMessageEdited: boolean;
      editedMessage: string | null;
    }
  >;
}

async function fetchRun(id: string): Promise<RunReplayData | null> {
  const cookieStore = await cookies();
  const res = await fetch(`${process.env.API_URL}/crm/history/${id}`, {
    headers: { Cookie: cookieStore.toString() },
    cache: 'no-store',
  });

  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch run');

  return res.json() as Promise<RunReplayData>;
}

export default async function RunReplayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const run = await fetchRun(id);

  if (!run) notFound();

  const date = new Date(run.createdAt).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const summary = {
    runId: run.id,
    customerCount: run.customerCount ?? 0,
    highValueCount: run.highValueCount ?? 0,
    avgScore: run.avgScore ?? 0,
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-6 py-4 border-b flex-shrink-0 flex items-center gap-4">
        <Link
          href="/history"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          History
        </Link>
        <div className="h-4 w-px bg-border" />
        <div>
          <p className="text-sm font-semibold capitalize">{run.mode.toLowerCase()} mode run</p>
          <p className="text-xs text-muted-foreground">{date} · {run.scoredResults.length} customers</p>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <ResultsPanel
          customers={run.scoredResults}
          isLoading={false}
          summary={summary}
        />
      </div>
    </div>
  );
}
