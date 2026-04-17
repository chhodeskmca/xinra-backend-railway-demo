ALTER TABLE "users" ADD COLUMN "stripe_account_id" TEXT;

CREATE TYPE "TipStatus" AS ENUM ('RECORDED', 'PENDING_PAYMENT', 'SUCCEEDED', 'FAILED', 'CANCELED');
CREATE TYPE "ReviewStatus" AS ENUM ('ACTIVE', 'PENDING_PAYMENT', 'CANCELED');

CREATE TABLE "tip_transactions" (
    "id" TEXT NOT NULL,
    "venue_id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "platform_fee" INTEGER NOT NULL DEFAULT 3,
    "platform_earn_amount" DECIMAL(10,2) NOT NULL,
    "staff_earn_amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'AUD',
    "status" "TipStatus" NOT NULL DEFAULT 'RECORDED',
    "destination_stripe_account_id" TEXT,
    "stripe_payment_intent_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tip_transactions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "staff_reviews" (
    "id" TEXT NOT NULL,
    "venue_id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "tip_id" TEXT,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "status" "ReviewStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_reviews_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tip_transactions_stripe_payment_intent_id_key" ON "tip_transactions"("stripe_payment_intent_id");
CREATE INDEX "tip_transactions_venue_id_idx" ON "tip_transactions"("venue_id");
CREATE INDEX "tip_transactions_staff_id_idx" ON "tip_transactions"("staff_id");
CREATE INDEX "tip_transactions_status_idx" ON "tip_transactions"("status");

CREATE UNIQUE INDEX "staff_reviews_tip_id_key" ON "staff_reviews"("tip_id");
CREATE INDEX "staff_reviews_venue_id_idx" ON "staff_reviews"("venue_id");
CREATE INDEX "staff_reviews_staff_id_idx" ON "staff_reviews"("staff_id");
CREATE INDEX "staff_reviews_status_idx" ON "staff_reviews"("status");
CREATE INDEX "staff_reviews_rating_idx" ON "staff_reviews"("rating");

ALTER TABLE "tip_transactions" ADD CONSTRAINT "tip_transactions_venue_id_fkey"
FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "tip_transactions" ADD CONSTRAINT "tip_transactions_staff_id_fkey"
FOREIGN KEY ("staff_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "staff_reviews" ADD CONSTRAINT "staff_reviews_venue_id_fkey"
FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "staff_reviews" ADD CONSTRAINT "staff_reviews_staff_id_fkey"
FOREIGN KEY ("staff_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "staff_reviews" ADD CONSTRAINT "staff_reviews_tip_id_fkey"
FOREIGN KEY ("tip_id") REFERENCES "tip_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
