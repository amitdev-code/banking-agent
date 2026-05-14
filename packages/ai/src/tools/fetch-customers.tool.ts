import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';

import type { PrismaClient } from '@banking-crm/database';
import type { Customer } from '@banking-crm/types';

import type { CrmSessionState } from '../graph/state';
import type { ToolResult, EmitTool } from './index';

const whereClauseSchema = z.object({
  whereClause: z
    .string()
    .describe(
      'A PostgreSQL boolean expression for WHERE clause using customers alias c. Use EXISTS subqueries for related tables.',
    ),
});

export const fetchCustomersInputSchema = z.object({
  naturalLanguageQuery: z
    .string()
    .optional()
    .describe(
      'Natural language description of customer criteria, e.g. "customers with salary above 1 lakh in Mumbai with no existing loan"',
    ),
  limit: z
    .number()
    .optional()
    .describe('Maximum number of customers to fetch. Omit for all matching customers.'),
});

export type FetchCustomersInput = z.infer<typeof fetchCustomersInputSchema>;

interface DbSchemaColumnRow {
  table_name: string;
  column_name: string;
  data_type: string;
  udt_name: string;
  is_nullable: 'YES' | 'NO';
}

interface DbSchemaEnumRow {
  enum_name: string;
  enum_value: string;
}

async function loadSchemaContext(prisma: PrismaClient): Promise<string> {
  const columns = await prisma.$queryRaw<DbSchemaColumnRow[]>`
    SELECT
      table_name,
      column_name,
      data_type,
      udt_name,
      is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position
  `;

  const enums = await prisma.$queryRaw<DbSchemaEnumRow[]>`
    SELECT
      t.typname AS enum_name,
      e.enumlabel AS enum_value
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
    ORDER BY t.typname, e.enumsortorder
  `;

  const tableToColumns = new Map<string, string[]>();
  for (const col of columns) {
    const nullableSuffix = col.is_nullable === 'YES' ? ' (nullable)' : '';
    const pgType = col.data_type === 'USER-DEFINED' ? col.udt_name : col.data_type;
    const line = `${col.column_name}: ${pgType}${nullableSuffix}`;
    const existing = tableToColumns.get(col.table_name) ?? [];
    existing.push(line);
    tableToColumns.set(col.table_name, existing);
  }

  const enumToValues = new Map<string, string[]>();
  for (const item of enums) {
    const existing = enumToValues.get(item.enum_name) ?? [];
    existing.push(item.enum_value);
    enumToValues.set(item.enum_name, existing);
  }

  const tableSection = Array.from(tableToColumns.entries())
    .map(([table, cols]) => `TABLE ${table}\n- ${cols.join('\n- ')}`)
    .join('\n\n');

  const enumSection = Array.from(enumToValues.entries())
    .map(([name, values]) => `ENUM ${name}: ${values.join(', ')}`)
    .join('\n');

  return `Database schema (public):\n\n${tableSection}\n\n${enumSection}`;
}

function sanitizeWhereClause(whereClause: string): string {
  const clause = whereClause.trim();
  if (!clause) return 'TRUE';

  if (clause.includes(';')) {
    throw new Error('Generated query is invalid: semicolons are not allowed.');
  }

  const forbidden =
    /\b(insert|update|delete|drop|alter|truncate|create|grant|revoke|commit|rollback)\b/i;
  if (forbidden.test(clause)) {
    throw new Error('Generated query is invalid: non-read-only SQL detected.');
  }

  return clause;
}

async function generateWhereClause(
  naturalLanguageQuery: string,
  schemaContext: string,
  openaiApiKey: string,
): Promise<string> {
  const model = new ChatOpenAI({
    apiKey: openaiApiKey,
    model: 'gpt-4o-mini',
    temperature: 0,
  }).withStructuredOutput(whereClauseSchema, { name: 'generate_customer_where_clause' });

  const result = await model.invoke([
    {
      role: 'system',
      content:
        'Convert a user natural-language request into a PostgreSQL WHERE condition for customer search.\n\n' +
        'STRICT OUTPUT RULES:\n' +
        '- Return ONLY a boolean SQL expression (not a full SELECT).\n' +
        '- Assume the customer table alias is c.\n' +
        '- Use EXISTS subqueries for conditions on other tables (like transactions).\n' +
        '- Do NOT include tenant filter; tenant isolation is handled externally.\n' +
        '- If no filter is requested, return TRUE.\n' +
        '- Keep expression read-only and deterministic.\n\n' +
        'SQL STYLE RULES:\n' +
        '- Prefer exact column names from schema.\n' +
        '- Use quoted identifiers for camelCase fields, e.g. c."avgMonthlyBalance".\n' +
        '- When filtering transactions, correlate by c.id and c."tenantId".\n' +
        '- For transaction category constraints, always use EXISTS and enum values exactly as defined (e.g. GROCERY, TRAVEL, EMI).\n' +
        '- For location constraints, use customer city field (c.city), typically ILIKE for flexible matching.\n\n' +
        'EXAMPLES:\n' +
        '- "customers in pune spending on groceries" => c.city ILIKE \'%Pune%\' AND EXISTS (SELECT 1 FROM transactions t WHERE t."customerId" = c.id AND t."tenantId" = c."tenantId" AND t.category = \'GROCERY\')\n' +
        '- "mumbai customers with travel spends above 50000 in last 6 months" => c.city ILIKE \'%Mumbai%\' AND EXISTS (SELECT 1 FROM transactions t WHERE t."customerId" = c.id AND t."tenantId" = c."tenantId" AND t.category = \'TRAVEL\' AND t.type = \'DEBIT\' AND t."occurredAt" >= NOW() - INTERVAL \'6 months\' GROUP BY t."customerId" HAVING SUM(t.amount) > 50000)\n\n' +
        `${schemaContext}`,
    },
    { role: 'user', content: naturalLanguageQuery },
  ]);

  return sanitizeWhereClause(result.whereClause);
}

async function repairWhereClause(
  naturalLanguageQuery: string,
  schemaContext: string,
  brokenWhereClause: string,
  dbError: string,
  openaiApiKey: string,
): Promise<string> {
  const model = new ChatOpenAI({
    apiKey: openaiApiKey,
    model: 'gpt-4o-mini',
    temperature: 0,
  }).withStructuredOutput(whereClauseSchema, { name: 'repair_customer_where_clause' });

  const result = await model.invoke([
    {
      role: 'system',
      content:
        'You repair a PostgreSQL WHERE clause generated from natural language.\n' +
        'Return ONLY a corrected boolean expression for WHERE using customers alias c.\n' +
        'Keep it read-only. No semicolons. Use EXISTS for transaction filters.\n\n' +
        `${schemaContext}`,
    },
    {
      role: 'user',
      content:
        `Natural language query: ${naturalLanguageQuery}\n\n` +
        `Broken WHERE clause:\n${brokenWhereClause}\n\n` +
        `Database error:\n${dbError}\n\n` +
        'Return corrected WHERE clause only.',
    },
  ]);

  return sanitizeWhereClause(result.whereClause);
}

function buildCustomerQuery(whereClause: string, safeLimit?: number): string {
  return `
    SELECT c.*
    FROM customers c
    WHERE c."tenantId" = $1
      AND (${whereClause})
    ORDER BY c."createdAt" DESC
    ${safeLimit ? `LIMIT ${safeLimit}` : ''}
  `;
}

async function validateWhereClause(
  prisma: PrismaClient,
  tenantId: string,
  whereClause: string,
): Promise<void> {
  const sql = `
    SELECT 1
    FROM customers c
    WHERE c."tenantId" = $1
      AND (${whereClause})
    LIMIT 1
  `;
  await prisma.$queryRawUnsafe(sql, tenantId);
}

export async function runFetchCustomers(
  input: FetchCustomersInput,
  state: CrmSessionState,
  deps: { prisma: PrismaClient; openaiApiKey: string; emitTool: EmitTool },
): Promise<ToolResult> {
  deps.emitTool(state.sessionId, 'fetch_customers', 'start', 'Querying database...');

  let whereClause = 'TRUE';
  let schemaContext: string | null = null;
  if (input.naturalLanguageQuery) {
    schemaContext = await loadSchemaContext(deps.prisma);
    whereClause = await generateWhereClause(
      input.naturalLanguageQuery,
      schemaContext,
      deps.openaiApiKey,
    );

    // Validate and auto-repair common LLM SQL issues for complex constraints
    // (e.g. location + spending category + time windows).
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await validateWhereClause(deps.prisma, state.tenantId, whereClause);
        break;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        whereClause = await repairWhereClause(
          input.naturalLanguageQuery,
          schemaContext,
          whereClause,
          msg,
          deps.openaiApiKey,
        );
      }
    }
  }

  const safeLimit = input.limit ? Math.max(1, Math.min(input.limit, 5000)) : undefined;
  const sql = buildCustomerQuery(whereClause, safeLimit);

  let rows: Array<{
    id: string;
    tenantId: string;
    age: number;
    city: string;
    segment: string;
    accountType: string;
    kycStatus: string;
    joinedAt: Date;
    createdAt: Date;
    avgMonthlyBalance: number | string;
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
  }>;

  try {
    rows = await deps.prisma.$queryRawUnsafe<
      Array<{
        id: string;
        tenantId: string;
        age: number;
        city: string;
        segment: string;
        accountType: string;
        kycStatus: string;
        joinedAt: Date;
        createdAt: Date;
        avgMonthlyBalance: number | string;
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
      }>
    >(sql, state.tenantId);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (input.naturalLanguageQuery && schemaContext) {
      // One final repair pass from execution-time DB error.
      const repaired = await repairWhereClause(
        input.naturalLanguageQuery,
        schemaContext,
        whereClause,
        msg,
        deps.openaiApiKey,
      );
      const repairedSql = buildCustomerQuery(repaired, safeLimit);
      rows = await deps.prisma.$queryRawUnsafe<
        Array<{
          id: string;
          tenantId: string;
          age: number;
          city: string;
          segment: string;
          accountType: string;
          kycStatus: string;
          joinedAt: Date;
          createdAt: Date;
          avgMonthlyBalance: number | string;
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
        }>
      >(repairedSql, state.tenantId);
      whereClause = repaired;
    } else {
      throw err;
    }
  }

  const customers: Customer[] = rows.map((r) => ({
    id: r.id,
    tenantId: r.tenantId,
    age: r.age,
    city: r.city,
    segment: r.segment as Customer['segment'],
    accountType: r.accountType as Customer['accountType'],
    kycStatus: r.kycStatus as Customer['kycStatus'],
    joinedAt: r.joinedAt,
    createdAt: r.createdAt,
    avgMonthlyBalance: Number(r.avgMonthlyBalance),
    hasActiveLoan: r.hasActiveLoan,
    loanType: r.loanType,
    fullName: r.fullName,
    phone: r.phone,
    email: r.email,
    pan: r.pan,
    aadhaar: r.aadhaar,
    address: r.address,
    dob: r.dob,
    accountNumber: r.accountNumber,
  }));

  const summary = `Fetched ${customers.length} customers`;
  const cityBreakdown = Object.entries(
    customers.reduce<Record<string, number>>(
      (acc, c) => ({ ...acc, [c.city]: (acc[c.city] ?? 0) + 1 }),
      {},
    ),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([city, count]) => `${city}: ${count}`)
    .join(', ');

  return {
    summary,
    stateUpdate: { customers, resolvedFilters: {} },
    resultType: 'customer_list',
    resultData: {
      customers: customers.slice(0, 20).map((c) => ({
        id: c.id,
        fullName: c.fullName,
        city: c.city,
        age: c.age,
        avgMonthlyBalance: c.avgMonthlyBalance,
        segment: c.segment,
      })),
      totalCount: customers.length,
      appliedFilters: null,
      sqlWhereClause: whereClause,
      cityBreakdown,
    },
  };
}
