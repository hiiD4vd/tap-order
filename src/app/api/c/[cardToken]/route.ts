import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkRateLimit, getClientKey, rateLimitResponse } from '@/lib/rate-limit';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ cardToken: string }> }
) {
  try {
    // Token adalah bearer capability; tanpa limit, token lama (6-9 char,
    // <=45 bit) bisa di-brute-force langsung lewat endpoint ini.
    const limit = await checkRateLimit(getClientKey(request, 'card-lookup'), 30, 60 * 1000);
    if (!limit.allowed) return rateLimitResponse(limit.retryAfter);

    const { cardToken } = await params;

    if (!cardToken) {
      return NextResponse.json(
        { error: 'Token kartu meja wajib diisi' },
        { status: 400 }
      );
    }

    const table = await db.table.findUnique({
      where: { cardToken },
      include: {
        venue: {
          select: {
            id: true,
            name: true,
            slug: true,
            phone: true,
            whatsapp: true,
            address: true,
            logoUrl: true,
            currency: true,
          },
        },
      },
    });

    if (!table || !table.isActive || table.deletedAt) {
      return NextResponse.json(
        { error: 'Meja ini belum terdaftar atau sedang dinonaktifkan' },
        { status: 404 }
      );
    }
    // Order aktif meja ini. Filter berdasarkan STATUS saja — jangan pakai
    // `isPaid: false`. Dengan alur bayar-di-depan, order yang sudah lunas
    // masih perlu dilacak tamu sampai makanan selesai.
    const activeOrder = await db.order.findFirst({
      where: {
        tableId: table.id,
        status: { in: ['awaiting_payment', 'pending', 'preparing', 'served'] },
      },
      include: {
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      table: {
        id: table.id,
        number: table.number,
        label: table.label,
        status: table.status,
        cardToken: table.cardToken,
      },
      venue: table.venue,
      activeOrder: activeOrder || null,
    });
  } catch (error) {
    console.error('Error resolving card token:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server saat memproses kartu meja' },
      { status: 500 }
    );
  }
}
