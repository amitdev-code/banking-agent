import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { ArrowLeft, Lock } from 'lucide-react';
import Link from 'next/link';
import { PiiGrid, ScoreBadge, ScoreBreakdownChart } from '@banking-crm/ui';

import type { Customer, ScoredCustomer } from '@banking-crm/types';

type CustomerDetail = Customer & {
  latestScore?: ScoredCustomer & {
    messageEn?: string;
    messageHi?: string;
  };
};

async function fetchCustomer(id: string): Promise<CustomerDetail | null | 'forbidden'> {
  const cookieStore = await cookies();
  const res = await fetch(`${process.env.API_URL}/customers/${id}`, {
    headers: { Cookie: cookieStore.toString() },
    cache: 'no-store',
  });

  if (res.status === 403) return 'forbidden';
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch customer');

  return res.json() as Promise<CustomerDetail>;
}

function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
      <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
        <Lock className="h-6 w-6 text-destructive" />
      </div>
      <div>
        <p className="font-semibold">Access Restricted</p>
        <p className="text-sm text-muted-foreground mt-1">
          You don't have permission to view this customer's full profile.
        </p>
      </div>
      <Link href="/dashboard" className="text-sm text-primary hover:underline">
        Return to dashboard
      </Link>
    </div>
  );
}

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await fetchCustomer(id);

  if (customer === null) notFound();

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-6 py-4 border-b flex-shrink-0 flex items-center gap-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Dashboard
        </Link>
        <div className="h-4 w-px bg-border" />
        <h1 className="text-sm font-semibold">Customer Profile</h1>
      </div>

      {customer === 'forbidden' ? (
        <AccessDenied />
      ) : (
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 max-w-3xl mx-auto w-full">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold">{customer.fullName}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {customer.city} · Age {customer.age}
              </p>
            </div>
            {customer.latestScore && (
              <ScoreBadge label={customer.latestScore.readinessLabel} />
            )}
          </div>

          <div className="rounded-lg border p-4">
            <h3 className="text-sm font-semibold mb-3">Contact & Identity</h3>
            <PiiGrid
              fields={[
                { label: 'Phone', value: customer.phone },
                { label: 'Email', value: customer.email },
                { label: 'PAN', value: customer.pan },
                { label: 'Aadhaar', value: customer.aadhaar },
                { label: 'Account No.', value: customer.accountNumber },
                { label: 'Date of Birth', value: customer.dob instanceof Date ? customer.dob.toLocaleDateString('en-IN') : String(customer.dob) },
                { label: 'Address', value: customer.address },
              ]}
            />
          </div>

          {customer.latestScore && (
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">Scoring Breakdown</h3>
                <span className="text-lg font-bold tabular-nums">
                  {customer.latestScore.totalScore}
                  <span className="text-xs text-muted-foreground font-normal">/110</span>
                </span>
              </div>
              <ScoreBreakdownChart breakdown={customer.latestScore.breakdown} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
