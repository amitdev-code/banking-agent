import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import type { ScoredCustomer } from '@banking-crm/types';
import { RunDetailView } from '@/components/history/run-detail-view';

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

function getStatusStyle(status: string): string {
  switch (status.toUpperCase()) {
    case 'COMPLETED':
      return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
    case 'RUNNING':
      return 'bg-blue-500/20 text-blue-300 border border-blue-500/30';
    case 'FAILED':
      return 'bg-red-500/20 text-red-300 border border-red-500/30';
    default:
      return 'bg-slate-500/20 text-slate-300 border border-slate-500/30';
  }
}

interface StatItemProps {
  label: string;
  value: string | number;
}

function StatItem({ label, value }: StatItemProps) {
  return (
    <div className="text-right">
      <p className="text-lg font-bold text-white leading-tight">{value}</p>
      <p className="text-[11px] text-slate-400">{label}</p>
    </div>
  );
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

  const statusStyle = getStatusStyle(run.status);

  const totalScored = run.scoredResults.length;
  const qualified = run.scoredResults.filter((c) => c.qualifies).length;
  const primed = run.scoredResults.filter((c) => c.readinessLabel === 'Primed').length;
  const avgScore = run.avgScore != null ? Math.round(run.avgScore) : '—';

  return (
    <div className="min-h-full bg-background">
      {/* Hero header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-6 py-5">
        {/* Breadcrumb */}
        <Link
          href="/history"
          className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 text-xs mb-4 transition-colors w-fit"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Analysis History
        </Link>

        {/* Run title row */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <h1 className="text-xl font-semibold capitalize">
                {run.mode.toLowerCase()} Mode Analysis
              </h1>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyle}`}
              >
                {run.status}
              </span>
            </div>
            <p className="text-slate-400 text-sm">{date}</p>
          </div>

          {/* Key stats — visible on md+ */}
          <div className="hidden md:flex items-center gap-6 shrink-0">
            <StatItem label="Total Scored" value={totalScored} />
            <div className="w-px h-8 bg-slate-700" />
            <StatItem label="Qualified" value={qualified} />
            <div className="w-px h-8 bg-slate-700" />
            <StatItem label="Primed" value={primed} />
            <div className="w-px h-8 bg-slate-700" />
            <StatItem label="Avg Score" value={avgScore} />
          </div>
        </div>

        {/* Mobile stats row */}
        <div className="flex md:hidden items-center gap-5 mt-4 pt-4 border-t border-slate-700">
          <div>
            <p className="text-base font-bold">{totalScored}</p>
            <p className="text-[10px] text-slate-400">Scored</p>
          </div>
          <div>
            <p className="text-base font-bold">{qualified}</p>
            <p className="text-[10px] text-slate-400">Qualified</p>
          </div>
          <div>
            <p className="text-base font-bold">{primed}</p>
            <p className="text-[10px] text-slate-400">Primed</p>
          </div>
          <div>
            <p className="text-base font-bold">{avgScore}</p>
            <p className="text-[10px] text-slate-400">Avg Score</p>
          </div>
        </div>
      </div>

      {/* Main content */}
      <RunDetailView run={run} />
    </div>
  );
}
