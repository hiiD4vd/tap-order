import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sseBroadcaster } from '@/lib/sse';
import { parseBody, handleApiError } from '@/lib/api-auth';
import { createRequestSchema, resolveRequestSchema } from '@/lib/validation';
import { checkRateLimit, getClientKey, rateLimitResponse } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    const requestLimit = await checkRateLimit(getClientKey(request, 'table-request'), 3, 60 * 1000);
    if (!requestLimit.allowed) return rateLimitResponse(requestLimit.retryAfter);

    const body = await parseBody(request, createRequestSchema);
    const { venueId, tableId, cardToken, type = 'waiter' } = body; // public guest request

    // tableId bisa terlihat di URL/menu; token kartu adalah capability pemanggil.
    const table = await db.table.findFirst({
      where: { id: tableId, venueId, cardToken, isActive: true, deletedAt: null },
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

      return created;
    });

    // Broadcast SSE to Cashier!
    await sseBroadcaster.broadcast(venueId, 'NEW_REQUEST', {
      request: newRequest,
      message: `Meja ${table.number} meminta bantuan: ${type}`,
    });

    return NextResponse.json({
      success: true,
      request: newRequest,
      message: 'Permintaan bantuan telah dikirim ke kasir',
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
    const session = await requireAuth(request, 'cashier'); // cashier or kitchen can resolve
    
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

    await sseBroadcaster.broadcast(updated.venueId, 'REQUEST_RESOLVED', {
      requestId: updated.id,
      tableNumber: updated.table.number,
    });

    return NextResponse.json({ success: true, request: updated });
  } catch (error) {
    console.error('Error resolving request:', error);
    return handleApiError(error);
  }
}
