-- AlterTable
ALTER TABLE "tournament_teams" ADD COLUMN     "poolId" TEXT;

-- CreateTable
CREATE TABLE "pools" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pools_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pools_gameId_idx" ON "pools"("gameId");

-- CreateIndex
CREATE INDEX "tournament_teams_poolId_idx" ON "tournament_teams"("poolId");

-- AddForeignKey
ALTER TABLE "pools" ADD CONSTRAINT "pools_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_teams" ADD CONSTRAINT "tournament_teams_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "pools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

