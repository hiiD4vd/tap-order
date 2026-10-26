import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { handleApiError, requireAuth } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

/** Filter "uang masuk": sudah dibayar ATAU order ditutup sebagai selesai. */
const PAID = { OR: [{ isPaid: true }, { status: 'completed' }] } as const;

/**
 * Ringkasan omset outlet. Dipisah dari GET /api/orders karena kasir & dapur
 * polling daftar order tiap 5-6 detik; menempelkan 3 agregat di situ berarti
 * puluhan query mahal per menit per layar. Angka uang tidak berubah secepat itu.
 *
 * Dihitung di DB, bukan dari 100 order teratas, supaya warung >100 order/hari
 * tidak undercount.
 */
export async function GET(request: Request) {
  try {
    const session = await requireAuth(request);

    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const where: any = { venueId: session.venueId };
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const paidWhere = { ...where, ...PAID };

    const [paidAgg, cashAgg, qrisAgg, cashierAgg] = await Promise.all([
      db.order.aggregate({ where: paidWhere, _sum: { totalAmount: true }, _count: true }),
      db.order.aggregate({ where: { ...paidWhere, paymentMethod: 'cash' }, _sum: { totalAmount: true } }),
      db.order.aggregate({ where: { ...paidWhere, paymentMethod: 'qris' }, _sum: { totalAmount: true } }),
      // Sisa metode (card/transfer) + order lunas lama yang masih berlabel
      // 'cashier'. Dilaporkan terpisah supaya tidak diam-diam menutupi
      // kesalahan klasifikasi.
      db.order.aggregate({
        where: { ...paidWhere, paymentMethod: { notIn: ['cash', 'qris'] } },
        _sum: { totalAmount: true },
        _count: true,
      }),
    ]);

    return NextResponse.json({
      success: true,
      summary: {
        paidCount: paidAgg._count,
        paidRevenue: paidAgg._sum.totalAmount || 0,
        cashRevenue: cashAgg._sum.totalAmount || 0,
        qrisRevenue: qrisAgg._sum.totalAmount || 0,
        unclassifiedCount: cashierAgg._count,
        unclassifiedRevenue: cashierAgg._sum.totalAmount || 0,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
