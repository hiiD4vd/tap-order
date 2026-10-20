-- CreateTable
CREATE TABLE "order_number_counters" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,
    "seq" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "order_number_counters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "order_number_counters_venueId_day_key" ON "order_number_counters"("venueId", "day");

-- CreateIndex
CREATE INDEX "orders_venueId_createdAt_idx" ON "orders"("venueId", "createdAt");

-- CreateIndex
-- Nomor order unik per outlet PER HARI (bukan seumur outlet). Nomor di-reset
-- tiap hari, tapi dua order di hari yang sama tidak boleh bernomor sama.
-- Index ekspresi: Prisma schema tidak bisa mendeklarasikan "createdAt"::date,
-- jadi index ini hidup di sini saja (bukan di schema.prisma).
CREATE UNIQUE INDEX "orders_venueId_day_orderNumber_key"
  ON "orders" ("venueId", ("createdAt"::date), "orderNumber");

-- AddForeignKey
ALTER TABLE "order_number_counters" ADD CONSTRAINT "order_number_counters_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

