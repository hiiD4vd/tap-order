import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { handleApiError, requireAuth } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

/**
 * Analytics tap kartu NFC — OWNER ONLY.
 *
 * Dua pertanyaan yang dijawab:
 * 1. Jam berapa outlet ramai, dan meja mana yang paling sering dipakai?
 * 2. Kartu meja mana yang kemungkinan chip-nya rusak?
 *
 * Deteksi kartu rusak memakai perbandingan, bukan ambang absolut: meja yang
 * nol tap sementara meja lain di outlet yang sama ramai. Meja yang sepi karena
 * outlet memang sepi tidak ikut tertuduh.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ venueSlug: string }> }
) {
  try {
    const { venueSlug } = await params;
    const session = await requireAuth('owner');

    const venue = await db.venue.findUnique({
      where: { slug: venueSlug, id: session.venueId },
      select: { id: true },
    });
    if (!venue) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
    }

    const url = new URL(request.url);
    const days = Math.min(90, Math.max(1, Number(url.searchParams.get('days')) || 7));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [perTable, perHour, tables, totalTaps] = await Promise.all([
      db.tableTap.groupBy({
        by: ['tableId'],
        where: { venueId: venue.id, createdAt: { gte: since } },
        _count: { tableId: true },
        _max: { createdAt: true },
      }),
      db.$queryRaw<{ hour: number; taps: bigint }[]>`
        SELECT EXTRACT(HOUR FROM "createdAt")::int AS hour, COUNT(*) AS taps
        FROM table_taps
        WHERE "venueId" = ${venue.id} AND "createdAt" >= ${since}
        GROUP BY 1 ORDER BY 1
      `,
      db.table.findMany({
        where: { venueId: venue.id, deletedAt: null },
        select: { id: true, number: true, label: true, cardTokenRotatedAt: true },
        orderBy: { number: 'asc' },
      }),
      db.tableTap.count({ where: { venueId: venue.id, createdAt: { gte: since } } }),
    ]);

    const tapByTable = new Map(perTable.map((r) => [r.tableId, r]));
    const activeTables = tables.filter((t) => (tapByTable.get(t.id)?._count.tableId ?? 0) > 0);
    // Rata-rata hanya dari meja yang hidup, supaya meja mati tidak menurunkan baseline.
    const avgActive = activeTables.length ? totalTaps / activeTables.length : 0;

    const perTableReport = tables.map((t) => {
      const row = tapByTable.get(t.id);
      const taps = row?._count.tableId ?? 0;
      // Dicurigai rusak: nol tap padahal outlet punya aktivitas nyata di meja lain.
      const suspectedBroken = taps === 0 && activeTables.length >= 3 && avgActive >= 3;
      return {
        tableId: t.id,
        number: t.number,
        label: t.label,
        taps,
        lastTapAt: row?._max.createdAt ?? null,
        cardTokenRotatedAt: t.cardTokenRotatedAt,
        suspectedBroken,
      };
    });

    return NextResponse.json({
      success: true,
      rangeDays: days,
      totalTaps,
      avgTapsPerActiveTable: Math.round(avgActive * 10) / 10,
      busiestHours: perHour.map((h) => ({ hour: h.hour, taps: Number(h.taps) })),
      tables: perTableReport,
      brokenCardAlerts: perTableReport.filter((t) => t.suspectedBroken),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
