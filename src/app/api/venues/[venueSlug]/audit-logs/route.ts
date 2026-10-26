import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { handleApiError, requireAuth } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

/**
 * Riwayat aksi krusial kasir/owner (void order, ubah harga, hapus menu, dll).
 * Read-only: audit log tidak pernah bisa diubah/dihapus lewat API.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ venueSlug: string }> }
) {
  try {
    const { venueSlug } = await params;
    const session = await requireAuth(request, 'owner');

    const venue = await db.venue.findUnique({
      where: { slug: venueSlug, id: session.venueId },
      select: { id: true },
    });
    if (!venue) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
    }

    const url = new URL(request.url);
    const take = Math.min(200, Math.max(1, Number(url.searchParams.get('take')) || 50));
    const cursor = url.searchParams.get('cursor') || undefined;
    const action = url.searchParams.get('action') || undefined;

    const logs = await db.auditLog.findMany({
      where: { venueId: venue.id, ...(action ? { action } : {}) },
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = logs.length > take;
    const page = hasMore ? logs.slice(0, take) : logs;

    return NextResponse.json({
      success: true,
      logs: page.map((log) => ({
        id: log.id,
        action: log.action,
        details: log.details,
        createdAt: log.createdAt,
      })),
      nextCursor: hasMore ? page[page.length - 1].id : null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
