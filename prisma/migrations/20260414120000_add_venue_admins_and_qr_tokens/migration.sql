-- RenameRole
ALTER TYPE "Role" RENAME VALUE 'SUPER_ADMIN' TO 'ADMIN';

-- AddQrToken
ALTER TABLE "venues" ADD COLUMN "qr_token" TEXT;

UPDATE "venues"
SET "qr_token" = md5(random()::text || clock_timestamp()::text || "id")
WHERE "qr_token" IS NULL;

ALTER TABLE "venues" ALTER COLUMN "qr_token" SET NOT NULL;

-- CreateTable
CREATE TABLE "venue_admins" (
    "id" TEXT NOT NULL,
    "venue_id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "assigned_by_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "venue_admins_pkey" PRIMARY KEY ("id")
);

-- Backfill existing venue creators as venue admins where applicable.
INSERT INTO "venue_admins" ("id", "venue_id", "admin_id", "assigned_by_id", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text || "id"), "id", "created_by_id", "created_by_id", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "venues"
WHERE EXISTS (
    SELECT 1
    FROM "users"
    WHERE "users"."id" = "venues"."created_by_id"
      AND "users"."role" = 'VENUE_ADMIN'
);

-- CreateIndex
CREATE UNIQUE INDEX "venues_qr_token_key" ON "venues"("qr_token");

-- CreateIndex
CREATE UNIQUE INDEX "venue_admins_venue_id_admin_id_key" ON "venue_admins"("venue_id", "admin_id");

-- CreateIndex
CREATE INDEX "venue_admins_venue_id_idx" ON "venue_admins"("venue_id");

-- CreateIndex
CREATE INDEX "venue_admins_admin_id_idx" ON "venue_admins"("admin_id");

-- CreateIndex
CREATE INDEX "venue_admins_assigned_by_id_idx" ON "venue_admins"("assigned_by_id");

-- AddForeignKey
ALTER TABLE "venue_admins" ADD CONSTRAINT "venue_admins_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venue_admins" ADD CONSTRAINT "venue_admins_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venue_admins" ADD CONSTRAINT "venue_admins_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
