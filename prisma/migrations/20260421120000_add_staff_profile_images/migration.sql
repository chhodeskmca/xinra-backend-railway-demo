ALTER TABLE "users"
ADD COLUMN "profile_image_key" TEXT,
ADD COLUMN "profile_image_content_type" TEXT,
ADD COLUMN "profile_image_size_bytes" INTEGER,
ADD COLUMN "profile_image_updated_at" TIMESTAMP(3);
