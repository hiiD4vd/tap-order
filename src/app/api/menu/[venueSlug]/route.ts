import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkRateLimit, getClientKey, rateLimitResponse } from '@/lib/rate-limit';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ venueSlug: string }> }
) {
  try {
    // Publik tanpa auth; batasi supaya tidak jadi vektor scraping/DoS murah.
    const limit = await checkRateLimit(getClientKey(request, 'menu'), 60, 60 * 1000);
    if (!limit.allowed) return rateLimitResponse(limit.retryAfter);

    const { venueSlug } = await params;

    const venue = await db.venue.findUnique({
      where: { slug: venueSlug },
      select: {
        id: true,
        name: true,
        slug: true,
        phone: true,
        whatsapp: true,
        address: true,
        logoUrl: true,
        currency: true,
        taxRate: true,
        serviceRate: true,
        qrisImageUrl: true,
        // wifiSsid/wifiPassword SENGAJA TIDAK diambil di sini: endpoint ini
        // publik tanpa auth/token kartu. SSID+password hanya lewat
        // /api/c/[cardToken] yang memverifikasi capability NFC dulu.
        announcement: true,
        isOpen: true,
        categories: {
          where: { isActive: true },
          orderBy: { sort: 'asc' },
          include: {
            menuItems: {
              // Menu terarsip (soft delete) tidak boleh muncul di katalog tamu.
              where: { deletedAt: null },
              orderBy: { sort: 'asc' },
              include: {
                optionGroups: {
                  orderBy: { sort: 'asc' },
                  include: {
                    choices: {
                      orderBy: { sort: 'asc' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!venue) {
      return NextResponse.json(
        { error: 'Outlet / Kafe tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      venue,
    });
  } catch (error) {
    console.error('Error fetching venue menu:', error);
    return NextResponse.json(
      { error: 'Gagal memuat katalog menu' },
      { status: 500 }
    );
  }
}
