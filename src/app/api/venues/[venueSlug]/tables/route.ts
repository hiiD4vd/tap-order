import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateToken } from '@/lib/utils';
import { parseBody, handleApiError } from '@/lib/api-auth';
import { createTableSchema, deleteTableQuerySchema } from '@/lib/validation';

/**
 * Soft delete meja + rotasi token NFC.
 *
 * Dua hal yang tidak boleh dilakukan dengan DELETE:
 * 1. Meja punya riwayat order & request. Menghapusnya memutus relasi dan
 *    membuat audit log menunjuk id yang tidak ada.
 * 2. `cardToken` sudah dibakar ke chip/kartu fisik. Kalau kartu hilang,
 *    token harus bisa diganti tanpa menghapus meja — kalau dihapus lalu
 *    dibuat ulang, riwayat meja ikut hilang.
 */
const notDeleted = { deletedAt: null };

export async function GET(
  request: Request,
  { params }: { params: Promise<{ venueSlug: string }> }
) {
  try {
    const { requireAuth } = await import('@/lib/api-auth');
    const session = await requireAuth('owner'); // Only owner can see cardTokens
    
    const { venueSlug } = await params;
    const { searchParams } = new URL(request.url);

    if (searchParams.get('archived') === '1') {
      const archived = await db.table.findMany({
        where: { venueId: session.venueId, deletedAt: { not: null } },
        orderBy: { deletedAt: 'desc' },
        take: 100,
      });
      return NextResponse.json({ success: true, tables: archived });
    }

    const venue = await db.venue.findUnique({
      where: { slug: venueSlug, id: session.venueId },
      include: {
        tables: {
          where: notDeleted,
          orderBy: { number: 'asc' },
        },
      },
    });

    if (!venue) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, tables: venue.tables });
  } catch (error) {
    const { handleApiError } = await import('@/lib/api-auth');
    return handleApiError(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ venueSlug: string }> }
) {
  try {
    const { requireAuth } = await import('@/lib/api-auth');
    const session = await requireAuth('owner');
    
    const { venueSlug } = await params;
    const body = await parseBody(request, createTableSchema);
    const { number, label } = body;

    const venue = await db.venue.findUnique({ where: { slug: venueSlug, id: session.venueId } });
    if (!venue) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
    }

    const token = `${venue.slug.substring(0, 3).toUpperCase()}${generateToken(6)}`;

    const newTable = await db.table.create({
      data: {
        venueId: venue.id,
        number: number.trim(),
        label: label?.trim() || null,
        cardToken: token,
      },
    });

    return NextResponse.json({ success: true, table: newTable });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Nomor meja sudah ada' }, { status: 400 });
    }
    return handleApiError(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ venueSlug: string }> }
) {
  try {
    const { requireAuth } = await import('@/lib/api-auth');
    const session = await requireAuth('owner');
    void (await params);

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const tableId = searchParams.get('tableId');

    if (!tableId) {
      return NextResponse.json({ error: 'tableId wajib diisi' }, { status: 400 });
    }

    const table = await db.table.findFirst({
      where: { id: tableId, venueId: session.venueId },
    });
    if (!table) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Ganti token kartu yang hilang. URL lama langsung mati.
    if (action === 'rotate-token') {
      const oldToken = table.cardToken;
      const newToken = generateToken(8);

      const updated = await db.table.update({
        where: { id: tableId },
        data: { cardToken: newToken, cardTokenRotatedAt: new Date() },
      });

      await db.auditLog.create({
        data: {
          venueId: session.venueId,
          action: 'ROTATE_TABLE_TOKEN',
          details: JSON.stringify({ tableId, number: table.number, oldToken, newToken }),
        },
      });

      return NextResponse.json({ success: true, table: updated });
    }

    // Pulihkan meja yang terarsip.
    if (action === 'restore') {
      if (!table.deletedAt) {
        return NextResponse.json({ error: 'Meja tidak dalam arsip' }, { status: 400 });
      }
      const restored = await db.table.update({
        where: { id: tableId },
        data: { deletedAt: null },
      });
      await db.auditLog.create({
        data: {
          venueId: session.venueId,
          action: 'RESTORE_TABLE',
          details: JSON.stringify({ tableId, number: table.number }),
        },
      });
      return NextResponse.json({ success: true, table: restored });
    }

    return NextResponse.json({ error: 'action tidak dikenal' }, { status: 400 });
  } catch (error) {
    const { handleApiError } = await import('@/lib/api-auth');
    return handleApiError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ venueSlug: string }> }
) {
  try {
    const { requireAuth } = await import('@/lib/api-auth');
    const session = await requireAuth('owner');
    
    const { searchParams } = new URL(request.url);
    const parsedQuery = deleteTableQuerySchema.safeParse({ tableId: searchParams.get('tableId') });
    if (!parsedQuery.success) {
      return NextResponse.json({ error: 'tableId tidak valid' }, { status: 400 });
    }
    const { tableId } = parsedQuery.data;

    // Verify table belongs to session venue and is still active
    const table = await db.table.findFirst({ where: { id: tableId, venueId: session.venueId, ...notDeleted } });
    if (!table) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Arsipkan, jangan hapus: riwayat order tetap utuh dan meja bisa dipulihkan.
    await db.table.update({
      where: { id: tableId },
      data: { deletedAt: new Date(), isActive: false, status: 'empty' },
    });
    await db.auditLog.create({
      data: {
        venueId: session.venueId,
        action: 'DELETE_TABLE',
        details: JSON.stringify({ tableId, number: table.number, softDelete: true }),
      },
    });
    return NextResponse.json({ success: true, message: 'Meja diarsipkan dan bisa dipulihkan' });
  } catch (error) {
    const { handleApiError } = await import('@/lib/api-auth');
    return handleApiError(error);
  }
}
