-- AlterEnum
BEGIN;
CREATE TYPE "SchoolLevel_new" AS ENUM ('PRIMARY_JS', 'SENIOR_SCHOOL', 'TERTIARY');
ALTER TABLE "championships" ALTER COLUMN "schoolLevel" TYPE "SchoolLevel_new" USING ("schoolLevel"::text::"SchoolLevel_new");
ALTER TABLE "games" ALTER COLUMN "schoolLevel" TYPE "SchoolLevel_new" USING ("schoolLevel"::text::"SchoolLevel_new");
ALTER TYPE "SchoolLevel" RENAME TO "SchoolLevel_old";
ALTER TYPE "SchoolLevel_new" RENAME TO "SchoolLevel";
DROP TYPE "SchoolLevel_old";
COMMIT;

-- AlterTable
ALTER TABLE "games" DROP COLUMN "isPrimaryJunior";

