import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sseBroadcaster } from '@/lib/sse';
import { parseBody, handleApiError } from '@/lib/api-auth';
import { updateOrderSchema } from '@/lib/validation';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { requireAuth, handleApiError } = await import('@/lib/api-auth');
    const session = await requireAuth(); // Require cashier/owner
    
    const { orderId } = await params;
    const body = await parseBody(request, updateOrderSchema);
    const { status, isPaid, paymentMethod, cancelledReason, newTableId } = body;

    const existingOrder = await db.order.findUnique({
      where: { id: orderId },
      include: { table: true },
    });

    if (!existingOrder) {
      return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 });
    }
    
    // Multi-tenant isolation: ensure order belongs to session venue
    if (existingOrder.venueId !== session.venueId) {
      return NextResponse.json({ error: 'Unauthorized venue access' }, { status: 403 });
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    // `cashier` itu nilai awal saat order dibuat (metode belum dipilih). Begitu
    // kasir menandai lunas TANPA mengirim paymentMethod, tebak dari alur:
    // order `completed` di Tap-Order selalu tunai. Selain itu jangan biarkan
    // order lunas tetap berlabel `cashier`, karena laporan akan menghitungnya
    // sebagai "Lainnya" dan omset cash/qris jadi salah.
    const payingNow = isPaid === true || (status === 'completed' && existingOrder.isPaid === false);
    if (typeof isPaid === 'boolean') {
      updateData.isPaid = isPaid;
      if (isPaid) updateData.paidAt = new Date();
    }
    if (paymentMethod) {
      updateData.paymentMethod = paymentMethod;
    } else if (payingNow && existingOrder.paymentMethod === 'cashier') {
      updateData.paymentMethod = 'cash';
    }
    if (cancelledReason) updateData.cancelledReason = cancelledReason.trim();

    // Table Transfer handling
    const oldTableId = existingOrder.tableId;
    if (newTableId && newTableId !== oldTableId) {
      const newTable = await db.table.findFirst({ where: { id: newTableId, venueId: session.venueId, isActive: true } });
      if (!newTable) {
        return NextResponse.json({ error: 'Meja tujuan tidak valid' }, { status: 400 });
      }
      updateData.tableId = newTableId;
      // Mark new table as active
      await db.table.update({
        where: { id: newTableId },
        data: { status: 'active' },
      });
    }

    const updatedOrder = await db.order.update({
      where: { id: orderId },
      data: updateData,
      include: {
        items: true,
        table: true,
      },
    });

    // If cancelled, record AuditLog
    if (status === 'cancelled') {
      await db.auditLog.create({
        data: {
          venueId: updatedOrder.venueId,
          action: 'VOID_ORDER',
          details: JSON.stringify({
            orderId: updatedOrder.id,
            orderNumber: updatedOrder.orderNumber,
            totalAmount: updatedOrder.totalAmount,
            reason: cancelledReason || 'Dibatalkan oleh kasir',
            tableNumber: existingOrder.table?.number || null,
          }),
        },
      });
    }

    if (isPaid === true || (status === 'completed' && existingOrder.isPaid === false)) {
      await db.auditLog.create({
        data: {
          venueId: updatedOrder.venueId,
          action: 'MARK_ORDER_PAID',
          details: JSON.stringify({ orderId: updatedOrder.id, orderNumber: updatedOrder.orderNumber, paymentMethod: updatedOrder.paymentMethod, totalAmount: updatedOrder.totalAmount }),
        },
      });
    }

    // Check old table status: if table transfer happened or order was completed/cancelled
    const checkTableId = (newTableId && newTableId !== oldTableId) ? oldTableId : updatedOrder.tableId;
    if (checkTableId && (isPaid || status === 'completed' || status === 'cancelled' || newTableId)) {
      const remainingActive = await db.order.count({
        where: {
          tableId: checkTableId,
          id: { not: orderId },
          status: { in: ['pending', 'preparing', 'served'] },
          isPaid: false,
        },
      });

      if (remainingActive === 0) {
        await db.table.update({
          where: { id: checkTableId },
          data: { status: 'empty' },
        });
      }
    }

    // Broadcast SSE update
    sseBroadcaster.broadcast(updatedOrder.venueId, 'ORDER_UPDATED', {
      order: updatedOrder,
    });

    return NextResponse.json({
      success: true,
      order: updatedOrder,
    });
  } catch (error) {
    console.error('Error updating order:', error);
    const { handleApiError } = await import('@/lib/api-auth');
    return handleApiError(error);
  }
}
