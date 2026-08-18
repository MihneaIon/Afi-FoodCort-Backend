-- AlterTable: add author fields to reviews
-- userName is NOT NULL with a default so existing rows are backfilled safely.
-- userEmail is optional.
ALTER TABLE "public"."reviews" ADD COLUMN "userName" TEXT NOT NULL DEFAULT 'Anonymous';
ALTER TABLE "public"."reviews" ADD COLUMN "userEmail" TEXT;
