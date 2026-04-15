-- DropIndex
DROP INDEX IF EXISTS "users_venue_id_idx";

-- AlterTable
ALTER TABLE "users" DROP COLUMN IF EXISTS "venue_id";
