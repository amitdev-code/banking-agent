'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Loader2, MapPin, Target, TrendingUp, Users } from 'lucide-react';

import type { RecommendationCardResultData, ScoreCardResultData } from '@banking-crm/types';
import { formatCurrency } from '@/lib/formatters';

interface SidebarCustomer {
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

interface FetchedCustomersSidebarProps {
  customers: SidebarCustomer[];
  totalCount: number;
  isLoading: boolean;
  latestScoreData: ScoreCardResultData | null;
  latestRecommendationData: RecommendationCardResultData | null;
  onTriggerWhatsapp: (customerId: string, fullName: string) => void;
}

export function FetchedCustomersSidebar({
  customers,
  totalCount,
  isLoading,
  latestScoreData,
  latestRecommendationData,
  onTriggerWhatsapp,
}: FetchedCustomersSidebarProps) {
  const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>(null);

  return (
    <aside className="w-96 border-l bg-muted/20 flex-shrink-0 flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b bg-background/80">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Fetched Customers</h3>
          <span className="ml-auto text-xs text-muted-foreground">{totalCount} total</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">Full session dataset from latest fetch</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {(latestScoreData || latestRecommendationData) && (
          <div className="p-3 space-y-2 border-b bg-background/70">
            {latestScoreData && (
              <div className="rounded-lg border bg-card p-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <p className="text-sm font-medium text-foreground">Latest Analysis</p>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Scored</p>
                    <p className="font-semibold text-foreground">{latestScoreData.totalScored}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Qualified</p>
                    <p className="font-semibold text-foreground">
                      {latestScoreData.qualifiedCount}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Avg Score</p>
                    <p className="font-semibold text-foreground">{latestScoreData.avgScore}</p>
                  </div>
                </div>
              </div>
            )}

            {latestRecommendationData && (
              <div className="rounded-lg border bg-card p-3">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  <p className="text-sm font-medium text-foreground">Product Allocation</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {latestRecommendationData.totalCustomers} customers matched
                </p>
                <div className="mt-2 space-y-1">
                  {latestRecommendationData.productBreakdown.map((item) => (
                    <div key={item.product} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {item.product.replaceAll('_', ' ')}
                      </span>
                      <span className="font-medium text-foreground">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : customers.length === 0 ? (
          <div className="h-full px-6 flex flex-col items-center justify-center text-center">
            <Users className="h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">No customers fetched yet.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Ask the agent to fetch customers and they will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {customers.map((customer) => (
              <div key={customer.id} className="px-4 py-3 hover:bg-muted/30 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/customer/${customer.id}`}
                      className="text-sm font-medium text-foreground hover:underline truncate block"
                    >
                      {customer.fullName}
                    </Link>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {customer.city}
                      </span>
                      <span>Age {customer.age}</span>
                    </div>
                  </div>
                  <p className="text-xs px-2 py-0.5 rounded-full border bg-background capitalize">
                    {customer.segment}
                  </p>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Balance</p>
                    <p className="font-medium text-foreground">
                      {formatCurrency(customer.avgMonthlyBalance)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Account</p>
                    <p className="font-medium text-foreground capitalize">{customer.accountType}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Loan Status</p>
                    <p className="font-medium text-foreground">
                      {customer.hasActiveLoan ? 'Has active loan' : 'No active loan'}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Allocated Products</p>
                    {customer.allocatedProducts.length > 0 ? (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {customer.allocatedProducts.map((product) => (
                          <span
                            key={`${customer.id}-${product}`}
                            className="text-[10px] px-2 py-0.5 rounded-full border bg-primary/5 text-primary"
                          >
                            {product.replaceAll('_', ' ')}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="font-medium text-muted-foreground">Not allocated yet</p>
                    )}
                  </div>
                  <div className="col-span-2 mt-1">
                    <div className="flex items-center gap-2">
                      {customer.generatedMessage ? (
                        <button
                          onClick={() =>
                            setExpandedCustomerId(
                              expandedCustomerId === customer.id ? null : customer.id,
                            )
                          }
                          className="text-xs px-2 py-1 rounded-md border bg-background hover:bg-muted transition-colors"
                        >
                          {expandedCustomerId === customer.id ? 'Hide WhatsApp' : 'View WhatsApp'}
                        </button>
                      ) : (
                        <button
                          onClick={() => onTriggerWhatsapp(customer.id, customer.fullName)}
                          disabled={!customer.qualifies}
                          className="text-xs px-2 py-1 rounded-md border bg-background hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title={
                            customer.qualifies
                              ? 'Generate WhatsApp message'
                              : 'Customer not qualified yet'
                          }
                        >
                          Generate WhatsApp
                        </button>
                      )}

                      {customer.spendingInsight && (
                        <button
                          onClick={() =>
                            setExpandedCustomerId(
                              expandedCustomerId === customer.id ? null : customer.id,
                            )
                          }
                          className="text-xs px-2 py-1 rounded-md border bg-background hover:bg-muted transition-colors"
                        >
                          {expandedCustomerId === customer.id ? 'Hide Analytics' : 'View Analytics'}
                        </button>
                      )}
                    </div>
                  </div>
                  {expandedCustomerId === customer.id && (
                    <div className="col-span-2 space-y-2 mt-2 rounded-md border bg-background p-2.5">
                      <div>
                        <p className="text-muted-foreground">Spending snapshot</p>
                        {customer.totalCreditLast12Months != null &&
                        customer.totalDebitLast12Months != null ? (
                          <p className="font-medium text-foreground">
                            Credit {formatCurrency(customer.totalCreditLast12Months)} | Debit{' '}
                            {formatCurrency(customer.totalDebitLast12Months)}
                          </p>
                        ) : (
                          <p className="font-medium text-muted-foreground">
                            Run transaction analysis to populate.
                          </p>
                        )}
                        {customer.topSpendingCategories &&
                          customer.topSpendingCategories.length > 0 && (
                            <p className="text-muted-foreground mt-1">
                              Top categories: {customer.topSpendingCategories.join(', ')}
                            </p>
                          )}
                      </div>

                      <div>
                        <p className="text-muted-foreground">Product rationale</p>
                        {customer.productRationales.length > 0 ? (
                          <div className="mt-1 space-y-1">
                            {customer.productRationales.map((item) => (
                              <div
                                key={`${customer.id}-${item.product}-reason`}
                                className="rounded border p-2"
                              >
                                <p className="font-medium text-foreground text-[11px]">
                                  {item.product.replaceAll('_', ' ')} (
                                  {Math.round(item.confidence * 100)}%)
                                </p>
                                <p className="text-muted-foreground">{item.rationale}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="font-medium text-muted-foreground">
                            No recommendation reason available yet.
                          </p>
                        )}
                      </div>

                      <div>
                        <p className="text-muted-foreground">LLM spending analytics</p>
                        {customer.spendingInsight ? (
                          <div className="mt-1 space-y-1">
                            <p className="font-medium text-foreground">
                              {customer.spendingInsight.summary}
                            </p>
                            {customer.spendingInsight.keyCategories.length > 0 && (
                              <p className="text-muted-foreground">
                                Key categories: {customer.spendingInsight.keyCategories.join(', ')}
                              </p>
                            )}
                            {customer.spendingInsight.opportunities.length > 0 && (
                              <p className="text-muted-foreground">
                                Opportunities: {customer.spendingInsight.opportunities.join(' | ')}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="font-medium text-muted-foreground">
                            Run analyze_spending to view insights.
                          </p>
                        )}
                      </div>

                      <div>
                        <p className="text-muted-foreground">Generated WhatsApp message</p>
                        {customer.generatedMessage ? (
                          <div className="mt-1 space-y-1 rounded border p-2">
                            <p className="text-[11px] text-muted-foreground">English</p>
                            <p className="text-foreground">{customer.generatedMessage.messageEn}</p>
                            <p className="text-[11px] text-muted-foreground mt-1">Hindi</p>
                            <p className="text-foreground">{customer.generatedMessage.messageHi}</p>
                          </div>
                        ) : (
                          <p className="font-medium text-muted-foreground">
                            Message not generated yet.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
