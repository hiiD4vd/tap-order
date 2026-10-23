import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sseBroadcaster } from '@/lib/sse';
import { parseBody, handleApiError, requireAuth } from '@/lib/api-auth';
import { updateOrderSchema } from '@/lib/validation';

const ALLOWED_NEXT: Record<string, string[]> = {
  pending: ['preparing', 'cancelled'],
  preparing: ['served', 'cancelled'],
  served: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

/** Kasir/owner mengubah lifecycle order. Semua write DB harus atomik. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const session = await requireAuth(undefined, request);
    const { orderId } = await params;
    const body = await parseBody(request, updateOrderSchema);
    const { status, isPaid, paymentMethod, cancelledReason, newTableId } = body;

    const existing = await db.order.findUnique({
      where: { id: orderId },
      include: { table: true },
    });
    if (!existing) return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 });
    if (existing.venueId !== session.venueId) {
      return NextResponse.json({ error: 'Unauthorized venue access' }, { status: 403 });
    }

    if (!status && typeof isPaid === 'undefined' && !paymentMethod && !cancelledReason && !newTableId) {
      return NextResponse.json({ error: 'Tidak ada perubahan pesanan' }, { status: 400 });
    }

    // Order selesai/void bersifat terminal. Tidak boleh hidup lagi karena klik salah.
    if (status && status !== existing.status && !ALLOWED_NEXT[existing.status]?.includes(status)) {
      return NextResponse.json(
        { error: `Status ${existing.status} tidak dapat diubah menjadi ${status}` },
        { status: 409 }
      );
    }
    if (isPaid === false && existing.isPaid && status !== 'cancelled') {
      return NextResponse.json({ error: 'Pembayaran lunas tidak dapat dibatalkan dari layar status' }, { status: 409 });
    }
    if (newTableId && ['completed', 'cancelled'].includes(existing.status)) {
      return NextResponse.json({ error: 'Pesanan selesai atau dibatalkan tidak dapat dipindah meja' }, { status: 409 });
    }

    const oldTableId = existing.tableId;
    const targetTableId = newTableId && newTableId !== oldTableId ? newTableId : null;

    if (targetTableId) {
      const target = await db.table.findFirst({
        where: { id: targetTableId, venueId: session.venueId, isActive: true, deletedAt: null },
        select: { id: true },
      });
      if (!target) return NextResponse.json({ error: 'Meja tujuan tidak valid' }, { status: 400 });
    }

    const payingNow = isPaid === true || (status === 'completed' && !existing.isPaid);
    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (targetTableId) updateData.tableId = targetTableId;
    if (paymentMethod) updateData.paymentMethod = paymentMethod;
    else if (payingNow && existing.paymentMethod === 'cashier') updateData.paymentMethod = 'cash';
    if (cancelledReason) updateData.cancelledReason = cancelledReason.trim();

    // Model baru adalah bayar dulu: completed tanpa bukti pembayaran tidak valid.
    if (status === 'completed' && !(isPaid === true || existing.isPaid)) {
      return NextResponse.json({ error: 'Pesanan harus ditandai lunas sebelum selesai' }, { status: 409 });
    }

    if (status === 'cancelled') {
      // Void bukan penjualan: selalu keluar dari revenue dan cash/QRIS total.
      updateData.isPaid = false;
      updateData.paidAt = null;
    } else if (typeof isPaid === 'boolean') {
      updateData.isPaid = isPaid;
      if (isPaid) updateData.paidAt = new Date();
    } else if (payingNow) {
      updateData.isPaid = true;
      updateData.paidAt = new Date();
    }

    const updated = await db.$transaction(async (tx) => {
      if (targetTableId) {
        await tx.table.update({ where: { id: targetTableId }, data: { status: 'active' } });
      }

      const order = await tx.order.update({
        where: { id: orderId },
        data: updateData,
        include: { items: true, table: true },
      });

      if (status === 'cancelled') {
        await tx.auditLog.create({
          data: {
            venueId: order.venueId,
            action: 'VOID_ORDER',
            details: JSON.stringify({
              orderId: order.id,
              orderNumber: order.orderNumber,
              totalAmount: order.totalAmount,
              reason: cancelledReason || 'Dibatalkan oleh kasir',
              tableNumber: existing.table?.number || null,
            }),
          },
        });
      }
      if (payingNow && status !== 'cancelled') {
        await tx.auditLog.create({
          data: {
            venueId: order.venueId,
            action: 'MARK_ORDER_PAID',
            details: JSON.stringify({
              orderId: order.id,
              orderNumber: order.orderNumber,
              paymentMethod: order.paymentMethod,
              totalAmount: order.totalAmount,
            }),
          },
        });
      }

      // Meja lama kosong hanya bila tidak punya order yang masih berjalan.
      const tablesToCheck = targetTableId && oldTableId ? [oldTableId] : [order.tableId].filter(Boolean) as string[];
      for (const tableId of tablesToCheck) {
        if (!(status === 'completed' || status === 'cancelled' || payingNow || targetTableId)) continue;
        const remaining = await tx.order.count({
          where: {
            tableId,
            id: { not: orderId },
            status: { in: ['pending', 'preparing', 'served'] },
          },
        });
        if (remaining === 0) await tx.table.update({ where: { id: tableId }, data: { status: 'empty' } });
      }
      return order;
    });

    // Network event is intentionally after commit: SSE failure cannot half-save DB state.
    await sseBroadcaster.broadcast(updated.venueId, 'ORDER_UPDATED', { order: updated });
    return NextResponse.json({ success: true, order: updated });
  } catch (error) {
    console.error('Error updating order:', error);
    return handleApiError(error);
  }
}
