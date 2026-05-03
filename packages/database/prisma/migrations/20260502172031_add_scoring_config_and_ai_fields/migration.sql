-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MANAGER', 'ANALYST');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "Category" AS ENUM ('SALARY', 'EMI', 'GROCERY', 'FUEL', 'ENTERTAINMENT', 'MEDICAL', 'TRAVEL', 'UTILITIES', 'SHOPPING', 'DINING', 'INSURANCE', 'INVESTMENT', 'ATM_WITHDRAWAL', 'TRANSFER', 'OTHER');

-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED', 'PAUSED');

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "piiVisibility" JSONB NOT NULL DEFAULT '{"showFullName":true,"showPhone":false,"showEmail":false,"showPan":false,"showAadhaar":false,"showAddress":false,"showDob":false,"showAccountNumber":false}',

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "city" TEXT NOT NULL,
    "segment" TEXT NOT NULL,
    "accountType" TEXT NOT NULL,
    "kycStatus" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "pan" TEXT NOT NULL,
    "aadhaar" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "dob" TIMESTAMP(3) NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "avgMonthlyBalance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "hasActiveLoan" BOOLEAN NOT NULL DEFAULT false,
    "loanType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "type" "TransactionType" NOT NULL,
    "category" "Category" NOT NULL,
    "description" TEXT NOT NULL,
    "merchantName" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analysis_runs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "status" "RunStatus" NOT NULL DEFAULT 'RUNNING',
    "query" TEXT,
    "filters" JSONB,
    "agentOutput" JSONB,
    "customerCount" INTEGER NOT NULL DEFAULT 0,
    "highValueCount" INTEGER NOT NULL DEFAULT 0,
    "avgScore" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "checkpointId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analysis_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scored_results" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "totalScore" DECIMAL(6,2) NOT NULL,
    "readinessLabel" TEXT NOT NULL,
    "conversionProbability" DECIMAL(5,4) NOT NULL,
    "qualifies" BOOLEAN NOT NULL,
    "breakdown" JSONB NOT NULL,
    "recommendations" JSONB NOT NULL,
    "messageEn" TEXT,
    "messageHi" TEXT,
    "isMessageEdited" BOOLEAN NOT NULL DEFAULT false,
    "editedMessage" TEXT,
    "hasExistingLoan" BOOLEAN NOT NULL DEFAULT false,
    "loanPenalty" DECIMAL(4,2) NOT NULL DEFAULT 0,
    "disqualifiedReason" TEXT,
    "scoreExplanation" TEXT,
    "persona" TEXT,
    "llmAdjustment" INTEGER,
    "llmAdjustReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scored_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scoring_configs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "rules" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scoring_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE INDEX "users_tenantId_idx" ON "users"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenantId_email_key" ON "users"("tenantId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "customers_accountNumber_key" ON "customers"("accountNumber");

-- CreateIndex
CREATE INDEX "customers_tenantId_idx" ON "customers"("tenantId");

-- CreateIndex
CREATE INDEX "customers_tenantId_city_idx" ON "customers"("tenantId", "city");

-- CreateIndex
CREATE INDEX "customers_tenantId_segment_idx" ON "customers"("tenantId", "segment");

-- CreateIndex
CREATE INDEX "customers_tenantId_age_idx" ON "customers"("tenantId", "age");

-- CreateIndex
CREATE INDEX "transactions_customerId_idx" ON "transactions"("customerId");

-- CreateIndex
CREATE INDEX "transactions_customerId_category_idx" ON "transactions"("customerId", "category");

-- CreateIndex
CREATE INDEX "transactions_customerId_occurredAt_idx" ON "transactions"("customerId", "occurredAt");

-- CreateIndex
CREATE INDEX "transactions_tenantId_category_idx" ON "transactions"("tenantId", "category");

-- CreateIndex
CREATE INDEX "transactions_occurredAt_idx" ON "transactions"("occurredAt");

-- CreateIndex
CREATE INDEX "analysis_runs_tenantId_idx" ON "analysis_runs"("tenantId");

-- CreateIndex
CREATE INDEX "analysis_runs_tenantId_createdAt_idx" ON "analysis_runs"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "analysis_runs_tenantId_status_idx" ON "analysis_runs"("tenantId", "status");

-- CreateIndex
CREATE INDEX "scored_results_runId_idx" ON "scored_results"("runId");

-- CreateIndex
CREATE INDEX "scored_results_runId_totalScore_idx" ON "scored_results"("runId", "totalScore");

-- CreateIndex
CREATE INDEX "scored_results_runId_qualifies_idx" ON "scored_results"("runId", "qualifies");

-- CreateIndex
CREATE UNIQUE INDEX "scored_results_runId_customerId_key" ON "scored_results"("runId", "customerId");

-- CreateIndex
CREATE UNIQUE INDEX "scoring_configs_tenantId_key" ON "scoring_configs"("tenantId");

-- CreateIndex
CREATE INDEX "scoring_configs_tenantId_idx" ON "scoring_configs"("tenantId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_runs" ADD CONSTRAINT "analysis_runs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_runs" ADD CONSTRAINT "analysis_runs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scored_results" ADD CONSTRAINT "scored_results_runId_fkey" FOREIGN KEY ("runId") REFERENCES "analysis_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scored_results" ADD CONSTRAINT "scored_results_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scoring_configs" ADD CONSTRAINT "scoring_configs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
