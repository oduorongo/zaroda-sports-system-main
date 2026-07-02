-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SchoolLevel" ADD VALUE 'PRIMARY';
ALTER TYPE "SchoolLevel" ADD VALUE 'JS';

-- AlterTable
ALTER TABLE "tournament_teams" ADD COLUMN     "gender" "Gender" NOT NULL DEFAULT 'MIXED';

