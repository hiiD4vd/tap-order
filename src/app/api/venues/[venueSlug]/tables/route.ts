import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateToken } from '@/lib/utils';
import { parseBody, handleApiError } from '@/lib/api-auth';
import { createTableSchema, deleteTableQuerySchema } from '@/lib/validation';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ venueSlug: string }> }
) {
  try {
    const { requireAuth } = await import('@/lib/api-auth');
    const session = await requireAuth('owner'); // Only owner can see cardTokens
    
    const { venueSlug } = await params;
    const venue = await db.venue.findUnique({
      where: { slug: venueSlug, id: session.venueId },
      include: {
        tables: {
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

    // Verify table belongs to session venue
    const table = await db.table.findUnique({ where: { id: tableId } });
    if (!table || table.venueId !== session.venueId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await db.table.delete({ where: { id: tableId } });
    return NextResponse.json({ success: true, message: 'Meja berhasil dihapus' });
  } catch (error) {
    const { handleApiError } = await import('@/lib/api-auth');
    return handleApiError(error);
  }
}
