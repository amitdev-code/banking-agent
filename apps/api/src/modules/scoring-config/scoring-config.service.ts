import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';

import { defaultScoringConfig, type ScoringRulesConfig } from '@banking-crm/types';

import { PrismaService } from '../../database/prisma.service';

const scoringConfigSchema = z.object({ config: z.record(z.unknown()) });

@Injectable()
export class ScoringConfigService {
  private readonly logger = new Logger(ScoringConfigService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async getConfig(tenantId: string): Promise<ScoringRulesConfig> {
    const row = await this.prisma.scoringConfig.findUnique({ where: { tenantId } });
    if (!row) return defaultScoringConfig;
    return row.rules as unknown as ScoringRulesConfig;
  }

  async upsertConfig(tenantId: string, rules: ScoringRulesConfig): Promise<ScoringRulesConfig> {
    const saved = await this.prisma.scoringConfig.upsert({
      where: { tenantId },
      create: { tenantId, rules: rules as object },
      update: { rules: rules as object },
    });
    this.logger.log(`Scoring config updated for tenant ${tenantId}`);
    return saved.rules as unknown as ScoringRulesConfig;
  }

  async suggestConfig(tenantId: string): Promise<{ proposed: ScoringRulesConfig; explanation: string[] }> {
    const [salaryDist, balanceDist, ageDist] = await Promise.all([
      this.prisma.$queryRaw<Array<{ p25: number; p50: number; p75: number; p90: number }>>`
        SELECT
          PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY s.total) AS p25,
          PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY s.total) AS p50,
          PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY s.total) AS p75,
          PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY s.total) AS p90
        FROM (
          SELECT t."customerId",
                 SUM(t.amount) / NULLIF(COUNT(DISTINCT DATE_TRUNC('month', t."occurredAt")), 0) AS total
          FROM transactions t
          JOIN customers c ON c.id = t."customerId"
          WHERE c."tenantId" = ${tenantId}
            AND t.category = 'SALARY'
            AND t.type = 'CREDIT'
          GROUP BY t."customerId"
        ) s
      `,
      this.prisma.$queryRaw<Array<{ p25: number; p50: number; p75: number; p90: number }>>`
        SELECT
          PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY "avgMonthlyBalance") AS p25,
          PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY "avgMonthlyBalance") AS p50,
          PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY "avgMonthlyBalance") AS p75,
          PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY "avgMonthlyBalance") AS p90
        FROM customers
        WHERE "tenantId" = ${tenantId}
      `,
      this.prisma.$queryRaw<Array<{ min: number; max: number; avg: number }>>`
        SELECT MIN(age) AS min, MAX(age) AS max, AVG(age) AS avg
        FROM customers
        WHERE "tenantId" = ${tenantId}
      `,
    ]);

    const currentConfig = await this.getConfig(tenantId);
    const distributionContext = [
      `Salary distribution (monthly avg): P25=₹${Math.round(salaryDist[0]?.p25 ?? 0)}, P50=₹${Math.round(salaryDist[0]?.p50 ?? 0)}, P75=₹${Math.round(salaryDist[0]?.p75 ?? 0)}, P90=₹${Math.round(salaryDist[0]?.p90 ?? 0)}`,
      `Balance distribution (monthly avg): P25=₹${Math.round(balanceDist[0]?.p25 ?? 0)}, P50=₹${Math.round(balanceDist[0]?.p50 ?? 0)}, P75=₹${Math.round(balanceDist[0]?.p75 ?? 0)}, P90=₹${Math.round(balanceDist[0]?.p90 ?? 0)}`,
      `Age range: min=${Math.round(ageDist[0]?.min ?? 0)}, max=${Math.round(ageDist[0]?.max ?? 0)}, avg=${Math.round(ageDist[0]?.avg ?? 0)}`,
    ].join('\n');

    const model = new ChatOpenAI({
      apiKey: this.config.get<string>('OPENAI_API_KEY'),
      model: 'gpt-4o-mini',
      temperature: 0,
    }).withStructuredOutput(
      z.object({
        proposed: z.record(z.unknown()),
        explanation: z.array(z.string()),
      }),
      { name: 'suggest_scoring_config' },
    );

    const result = await model.invoke([
      {
        role: 'system',
        content:
          'You are a credit risk expert calibrating a loan readiness scoring system for a bank. ' +
          'Given the actual customer portfolio distribution, propose scoring brackets that create ' +
          'good discrimination between low and high loan readiness. ' +
          'Use the existing config structure exactly — only update bracket thresholds and scores. ' +
          'Return the full proposed config and an explanation array (one string per changed section).',
      },
      {
        role: 'user',
        content:
          `Current config:\n${JSON.stringify(currentConfig, null, 2)}\n\n` +
          `Portfolio distribution:\n${distributionContext}\n\n` +
          'Suggest optimized brackets for salary and balance rules. ' +
          'Adjust qualifyThreshold if the distribution suggests most customers are either too easy or too hard to qualify.',
      },
    ]);

    return {
      proposed: result.proposed as unknown as ScoringRulesConfig,
      explanation: result.explanation,
    };
  }

  async tuneConfig(tenantId: string, instruction: string): Promise<{ proposed: ScoringRulesConfig; changeLog: string[] }> {
    const currentConfig = await this.getConfig(tenantId);

    const model = new ChatOpenAI({
      apiKey: this.config.get<string>('OPENAI_API_KEY'),
      model: 'gpt-4o-mini',
      temperature: 0,
    }).withStructuredOutput(
      z.object({
        proposed: z.record(z.unknown()),
        changeLog: z.array(z.string()),
      }),
      { name: 'tune_scoring_config' },
    );

    const result = await model.invoke([
      {
        role: 'system',
        content:
          'You are a credit risk expert updating a banking loan readiness scoring configuration. ' +
          'Apply the user\'s natural language instruction to the current JSON config. ' +
          'Return the full updated config and a changeLog array listing each field you changed and why. ' +
          'Only change fields that clearly match the user\'s intent. Preserve all other values exactly.',
      },
      {
        role: 'user',
        content:
          `Current config:\n${JSON.stringify(currentConfig, null, 2)}\n\n` +
          `Instruction: ${instruction}`,
      },
    ]);

    return {
      proposed: result.proposed as unknown as ScoringRulesConfig,
      changeLog: result.changeLog,
    };
  }
}
