-- AlterTable
ALTER TABLE "menu_items" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tables" ADD COLUMN     "cardTokenRotatedAt" TIMESTAMP(3),
ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "rate_limit_buckets" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "resetAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_limit_buckets_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "rate_limit_buckets_resetAt_idx" ON "rate_limit_buckets"("resetAt");

-- CreateIndex
CREATE INDEX "menu_items_venueId_deletedAt_idx" ON "menu_items"("venueId", "deletedAt");

-- CreateIndex
CREATE INDEX "tables_venueId_deletedAt_idx" ON "tables"("venueId", "deletedAt");

