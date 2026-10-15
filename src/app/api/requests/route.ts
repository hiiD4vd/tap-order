import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sseBroadcaster } from '@/lib/sse';
import { parseBody, handleApiError } from '@/lib/api-auth';
import { createRequestSchema, resolveRequestSchema } from '@/lib/validation';
import { checkRateLimit, getClientKey, rateLimitResponse } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    const requestLimit = checkRateLimit(getClientKey(request, 'table-request'), 3, 60 * 1000);
    if (!requestLimit.allowed) return rateLimitResponse(requestLimit.retryAfter);

    const body = await parseBody(request, createRequestSchema);
    const { venueId, tableId, type = 'waiter' } = body; // public guest request

    const table = await db.table.findFirst({
      where: { id: tableId, venueId, isActive: true },
    });

    if (!table) {
      return NextResponse.json({ error: 'Meja tidak ditemukan' }, { status: 404 });
    }
    
    const newRequest = await db.$transaction(async (tx) => {
      const existingOpen = await tx.tableRequest.findUnique({
        where: { openKey: `${tableId}:open` },
      });
      if (existingOpen) {
        throw Object.assign(new Error('Permintaan sebelumnya masih diproses, harap tunggu'), { status: 429 });
      }

      const created = await tx.tableRequest.create({
        data: {
          venueId,
          tableId,
          type,
          status: 'open',
          openKey: `${tableId}:open`,
        },
        include: { table: true },
      });

      if (type === 'bill') {
        await tx.table.update({
          where: { id: tableId },
          data: { status: 'bill_requested' },
        });
      }
      return created;
    });

    // Broadcast SSE to Cashier!
    sseBroadcaster.broadcast(venueId, 'NEW_REQUEST', {
      request: newRequest,
      message: `Meja ${table.number} ${type === 'bill' ? 'meminta Bill / Tagihan' : 'memanggil Pelayan'}`,
    });

    return NextResponse.json({
      success: true,
      request: newRequest,
      message: type === 'bill' ? 'Permintaan tagihan telah dikirim ke kasir' : 'Pelayan sedang menuju ke meja Anda',
    });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'Permintaan sebelumnya masih diproses, harap tunggu' },
        { status: 429 }
      );
    }
    console.error('Error creating table request:', error);
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const { requireAuth } = await import('@/lib/api-auth');
    const session = await requireAuth('cashier'); // cashier or kitchen can resolve
    
    const body = await parseBody(request, resolveRequestSchema);
    const { requestId, status = 'resolved' } = body;

    // Verify request belongs to session venue
    const existingRequest = await db.tableRequest.findUnique({ where: { id: requestId } });
    if (!existingRequest || existingRequest.venueId !== session.venueId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const updated = await db.tableRequest.update({
      where: { id: requestId },
      data: {
        status,
        resolvedAt: new Date(),
        openKey: null,
      },
      include: { table: true },
    });

    sseBroadcaster.broadcast(updated.venueId, 'REQUEST_RESOLVED', {
      requestId: updated.id,
      tableNumber: updated.table.number,
    });

    return NextResponse.json({ success: true, request: updated });
  } catch (error) {
    console.error('Error resolving request:', error);
    return handleApiError(error);
  }
}
