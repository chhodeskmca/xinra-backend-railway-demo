-- CreateTable
CREATE TABLE "venues" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "email" TEXT,
    "telephone_number" TEXT,
    "stripe_account_id" TEXT,
    "australian_business_number" TEXT,
    "created_by_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "venues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_venues" (
    "id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "venue_id" TEXT NOT NULL,
    "assigned_by_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_venues_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "venues_created_by_id_idx" ON "venues"("created_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "staff_venues_staff_id_venue_id_key" ON "staff_venues"("staff_id", "venue_id");

-- CreateIndex
CREATE INDEX "staff_venues_staff_id_idx" ON "staff_venues"("staff_id");

-- CreateIndex
CREATE INDEX "staff_venues_venue_id_idx" ON "staff_venues"("venue_id");

-- CreateIndex
CREATE INDEX "staff_venues_assigned_by_id_idx" ON "staff_venues"("assigned_by_id");

-- AddForeignKey
ALTER TABLE "venues" ADD CONSTRAINT "venues_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_venues" ADD CONSTRAINT "staff_venues_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_venues" ADD CONSTRAINT "staff_venues_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_venues" ADD CONSTRAINT "staff_venues_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
