import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ venueSlug: string }> }
) {
  try {
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
        isOpen: true,
        categories: {
          where: { isActive: true },
          orderBy: { sort: 'asc' },
          include: {
            menuItems: {
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
