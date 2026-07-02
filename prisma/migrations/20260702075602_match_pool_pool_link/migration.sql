-- AlterTable
ALTER TABLE "match_pools" ADD COLUMN     "poolId" TEXT;

-- CreateIndex
CREATE INDEX "match_pools_poolId_idx" ON "match_pools"("poolId");

-- AddForeignKey
ALTER TABLE "match_pools" ADD CONSTRAINT "match_pools_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "pools"("id") ON DELETE SET NULL ON UPDATE CASCADE;
