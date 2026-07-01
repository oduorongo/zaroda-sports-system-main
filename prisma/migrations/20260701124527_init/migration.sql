-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'TENANT_OWNER', 'TOURNAMENT_ADMIN', 'SCOREKEEPER', 'OFFICIAL');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('SCHOOL', 'OPEN_TOURNAMENT');

-- CreateEnum
CREATE TYPE "GameCategory" AS ENUM ('BALL_GAMES', 'ATHLETICS', 'MUSIC', 'OTHER_GAMES');

-- CreateEnum
CREATE TYPE "Level" AS ENUM ('BASE', 'ZONE', 'SUB_COUNTY', 'COUNTY', 'REGIONAL', 'NATIONAL');

-- CreateEnum
CREATE TYPE "SchoolLevel" AS ENUM ('PRIMARY', 'JUNIOR_SECONDARY', 'SECONDARY');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('BOYS', 'GIRLS', 'MIXED');

-- CreateEnum
CREATE TYPE "ParticipantStatus" AS ENUM ('REGISTERED', 'CONFIRMED_IN_CALL_ROOM', 'DISQUALIFIED');

-- CreateEnum
CREATE TYPE "PackageTier" AS ENUM ('ESSENTIAL', 'PROFESSIONAL', 'ELITE', 'SEASON_BUNDLE');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED');

-- CreateEnum
CREATE TYPE "TeamPaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED');

-- CreateEnum
CREATE TYPE "AuditOp" AS ENUM ('INSERT', 'UPDATE', 'DELETE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "championshipId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "organizationName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "accountType" "AccountType" NOT NULL,
    "county" TEXT NOT NULL,
    "subcounty" TEXT NOT NULL,
    "gameCategory" "GameCategory" NOT NULL,
    "userId" TEXT NOT NULL,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "championships" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" "Level" NOT NULL,
    "schoolLevel" "SchoolLevel" NOT NULL,
    "category" "GameCategory" NOT NULL,
    "county" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "championships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schools" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "zone" TEXT NOT NULL,
    "subcounty" TEXT NOT NULL,
    "county" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'Kenya',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournament_teams" (
    "id" TEXT NOT NULL,
    "championshipId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "teamCode" TEXT NOT NULL,
    "teamColor" TEXT,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tournament_teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "games" (
    "id" TEXT NOT NULL,
    "championshipId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "GameCategory" NOT NULL,
    "gender" "Gender" NOT NULL,
    "schoolLevel" "SchoolLevel" NOT NULL,
    "isTimed" BOOLEAN NOT NULL,
    "maxQualifiers" INTEGER NOT NULL DEFAULT 5,
    "raceType" TEXT,
    "scheduledDate" TIMESTAMP(3),
    "isPrimaryJunior" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participants" (
    "id" TEXT NOT NULL,
    "championshipId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "schoolId" TEXT,
    "tournamentTeamId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "gender" "Gender" NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "bibNumber" INTEGER NOT NULL,
    "laneNumber" INTEGER,
    "personalBest" DECIMAL(10,3),
    "timeTaken" DECIMAL(10,3),
    "position" INTEGER,
    "score" DECIMAL(10,3),
    "isQualified" BOOLEAN NOT NULL DEFAULT false,
    "status" "ParticipantStatus" NOT NULL DEFAULT 'REGISTERED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "heats" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "heatNumber" INTEGER NOT NULL,
    "heatType" TEXT NOT NULL DEFAULT 'heat',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "heats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "heat_participants" (
    "id" TEXT NOT NULL,
    "heatId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "timeTaken" DECIMAL(10,3),
    "position" INTEGER,
    "laneNumber" INTEGER,
    "score" DECIMAL(10,3),
    "isQualifiedForFinal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "heat_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_pools" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "roundName" TEXT NOT NULL DEFAULT 'Round 1',
    "teamAId" TEXT NOT NULL,
    "teamBId" TEXT NOT NULL,
    "teamAScore" INTEGER,
    "teamBScore" INTEGER,
    "winnerId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "match_pools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_bib_ranges" (
    "id" TEXT NOT NULL,
    "championshipId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "rangeStart" INTEGER NOT NULL,
    "rangeEnd" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "school_bib_ranges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_plans" (
    "id" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "packageTier" "PackageTier" NOT NULL DEFAULT 'ESSENTIAL',
    "level" "Level" NOT NULL,
    "priceKes" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "championship_subscriptions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "championshipId" TEXT,
    "category" "GameCategory",
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
    "trialStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trialEndsAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "amountPaidKes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "championship_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_transactions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "paystackReference" TEXT NOT NULL,
    "amountKes" INTEGER NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paystackResponse" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "championship_fees" (
    "id" TEXT NOT NULL,
    "championshipId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "amountKes" INTEGER NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "championship_fees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_fee_payments" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "feeId" TEXT NOT NULL,
    "championshipId" TEXT NOT NULL,
    "amountKes" INTEGER NOT NULL,
    "status" "TeamPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paystackReference" TEXT,
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_fee_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "circulars" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "senderRole" TEXT NOT NULL DEFAULT 'National Admin',
    "targetLevel" "Level" NOT NULL DEFAULT 'NATIONAL',
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "documentUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "circulars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_messages" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT,
    "parentId" TEXT,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isBroadcast" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "link" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "changedBy" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "operation" "AuditOp" NOT NULL,
    "tableName" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "oldData" JSONB,
    "newData" JSONB,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "user_roles_userId_idx" ON "user_roles"("userId");

-- CreateIndex
CREATE INDEX "user_roles_championshipId_idx" ON "user_roles"("championshipId");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_email_key" ON "tenants"("email");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_userId_key" ON "tenants"("userId");

-- CreateIndex
CREATE INDEX "championships_tenantId_idx" ON "championships"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_teams_championshipId_teamCode_key" ON "tournament_teams"("championshipId", "teamCode");

-- CreateIndex
CREATE INDEX "games_championshipId_idx" ON "games"("championshipId");

-- CreateIndex
CREATE INDEX "participants_gameId_idx" ON "participants"("gameId");

-- CreateIndex
CREATE INDEX "participants_schoolId_idx" ON "participants"("schoolId");

-- CreateIndex
CREATE INDEX "participants_tournamentTeamId_idx" ON "participants"("tournamentTeamId");

-- CreateIndex
CREATE UNIQUE INDEX "participants_championshipId_bibNumber_key" ON "participants"("championshipId", "bibNumber");

-- CreateIndex
CREATE INDEX "heats_gameId_idx" ON "heats"("gameId");

-- CreateIndex
CREATE INDEX "heat_participants_participantId_idx" ON "heat_participants"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "heat_participants_heatId_participantId_key" ON "heat_participants"("heatId", "participantId");

-- CreateIndex
CREATE INDEX "match_pools_gameId_idx" ON "match_pools"("gameId");

-- CreateIndex
CREATE UNIQUE INDEX "school_bib_ranges_championshipId_schoolId_key" ON "school_bib_ranges"("championshipId", "schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_packageTier_level_key" ON "subscription_plans"("packageTier", "level");

-- CreateIndex
CREATE INDEX "championship_subscriptions_tenantId_idx" ON "championship_subscriptions"("tenantId");

-- CreateIndex
CREATE INDEX "championship_subscriptions_championshipId_idx" ON "championship_subscriptions"("championshipId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_paystackReference_key" ON "payment_transactions"("paystackReference");

-- CreateIndex
CREATE INDEX "payment_transactions_tenantId_idx" ON "payment_transactions"("tenantId");

-- CreateIndex
CREATE INDEX "championship_fees_championshipId_idx" ON "championship_fees"("championshipId");

-- CreateIndex
CREATE INDEX "team_fee_payments_teamId_idx" ON "team_fee_payments"("teamId");

-- CreateIndex
CREATE INDEX "team_fee_payments_championshipId_idx" ON "team_fee_payments"("championshipId");

-- CreateIndex
CREATE INDEX "admin_messages_senderId_idx" ON "admin_messages"("senderId");

-- CreateIndex
CREATE INDEX "admin_messages_recipientId_idx" ON "admin_messages"("recipientId");

-- CreateIndex
CREATE INDEX "admin_messages_parentId_idx" ON "admin_messages"("parentId");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_tableName_recordId_idx" ON "audit_logs"("tableName", "recordId");

-- CreateIndex
CREATE INDEX "audit_logs_changedBy_idx" ON "audit_logs"("changedBy");

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_championshipId_fkey" FOREIGN KEY ("championshipId") REFERENCES "championships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "championships" ADD CONSTRAINT "championships_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "championships" ADD CONSTRAINT "championships_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_teams" ADD CONSTRAINT "tournament_teams_championshipId_fkey" FOREIGN KEY ("championshipId") REFERENCES "championships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_championshipId_fkey" FOREIGN KEY ("championshipId") REFERENCES "championships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participants" ADD CONSTRAINT "participants_championshipId_fkey" FOREIGN KEY ("championshipId") REFERENCES "championships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participants" ADD CONSTRAINT "participants_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participants" ADD CONSTRAINT "participants_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participants" ADD CONSTRAINT "participants_tournamentTeamId_fkey" FOREIGN KEY ("tournamentTeamId") REFERENCES "tournament_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "heats" ADD CONSTRAINT "heats_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "heat_participants" ADD CONSTRAINT "heat_participants_heatId_fkey" FOREIGN KEY ("heatId") REFERENCES "heats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "heat_participants" ADD CONSTRAINT "heat_participants_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_pools" ADD CONSTRAINT "match_pools_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_bib_ranges" ADD CONSTRAINT "school_bib_ranges_championshipId_fkey" FOREIGN KEY ("championshipId") REFERENCES "championships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_bib_ranges" ADD CONSTRAINT "school_bib_ranges_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "championship_subscriptions" ADD CONSTRAINT "championship_subscriptions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "championship_subscriptions" ADD CONSTRAINT "championship_subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "championship_subscriptions" ADD CONSTRAINT "championship_subscriptions_championshipId_fkey" FOREIGN KEY ("championshipId") REFERENCES "championships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "championship_fees" ADD CONSTRAINT "championship_fees_championshipId_fkey" FOREIGN KEY ("championshipId") REFERENCES "championships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_fee_payments" ADD CONSTRAINT "team_fee_payments_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "tournament_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_fee_payments" ADD CONSTRAINT "team_fee_payments_feeId_fkey" FOREIGN KEY ("feeId") REFERENCES "championship_fees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_fee_payments" ADD CONSTRAINT "team_fee_payments_championshipId_fkey" FOREIGN KEY ("championshipId") REFERENCES "championships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_messages" ADD CONSTRAINT "admin_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_messages" ADD CONSTRAINT "admin_messages_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_messages" ADD CONSTRAINT "admin_messages_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "admin_messages"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
