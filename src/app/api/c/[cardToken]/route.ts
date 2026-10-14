import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ cardToken: string }> }
) {
  try {
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

    if (!table || !table.isActive) {
      return NextResponse.json(
        { error: 'Meja ini belum terdaftar atau sedang dinonaktifkan' },
        { status: 404 }
      );
    }

    // Get any active pending/preparing/served orders for this table
    const activeOrder = await db.order.findFirst({
      where: {
        tableId: table.id,
        status: { in: ['pending', 'preparing', 'served'] },
        isPaid: false,
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
