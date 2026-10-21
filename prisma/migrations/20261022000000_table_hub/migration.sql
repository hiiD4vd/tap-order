-- AlterTable
ALTER TABLE "venues" ADD COLUMN     "announcement" TEXT,
ADD COLUMN     "gmapsReviewUrl" TEXT,
ADD COLUMN     "instagramUrl" TEXT,
ADD COLUMN     "wifiPassword" TEXT,
ADD COLUMN     "wifiSsid" TEXT;

-- CreateTable
CREATE TABLE "feedbacks" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "rating" INTEGER,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "table_taps" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "table_taps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "feedbacks_venueId_createdAt_idx" ON "feedbacks"("venueId", "createdAt");

-- CreateIndex
CREATE INDEX "table_taps_venueId_createdAt_idx" ON "table_taps"("venueId", "createdAt");

-- CreateIndex
CREATE INDEX "table_taps_tableId_createdAt_idx" ON "table_taps"("tableId", "createdAt");

-- AddForeignKey
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "table_taps" ADD CONSTRAINT "table_taps_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "table_taps" ADD CONSTRAINT "table_taps_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

