import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateToken } from '@/lib/utils';
import { hashPassword, signSession } from '@/lib/auth';
import { parseBody, handleApiError } from '@/lib/api-auth';
import { registerSchema } from '@/lib/validation';
import { checkRateLimit, getClientKey, rateLimitResponse } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    // Pendaftaran membuat venue, tabel, kategori, dan session. Batasi supaya
    // bot tidak bisa memenuhi database dengan trial outlet.
    const registrationLimit = await checkRateLimit(getClientKey(request, 'register'), 3, 60 * 60 * 1000);
    if (!registrationLimit.allowed) return rateLimitResponse(registrationLimit.retryAfter);

    const body = await parseBody(request, registerSchema);
    const {
      name,
      slug,
      phone,
      whatsapp,
      address,
      tablesCount = 10,
      pinCashier,
      ownerEmail,
      password,
    } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Nama usaha dan URL slug wajib diisi' },
        { status: 400 }
      );
    }

    const cleanSlug = slug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-');

    // Check if slug already exists
    const existing = await db.venue.findUnique({
      where: { slug: cleanSlug },
    });

    if (existing) {
      return NextResponse.json(
        { error: `URL slug "${cleanSlug}" sudah dipakai usaha lain. Silakan pilih nama lain.` },
        { status: 400 }
      );
    }

    // Hash owner password
    const hashedPassword = await hashPassword(password.trim());

    // Create Venue and Tables in transaction
    const newVenue = await db.$transaction(async (tx) => {
      const venue = await tx.venue.create({
        data: {
          name: name.trim(),
          slug: cleanSlug,
          phone: phone?.trim() || null,
          whatsapp: whatsapp?.trim() || null,
          address: address?.trim() || null,
          subscriptionTier: 'trial',
          expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14-day free trial
          pinCashier: pinCashier.trim(),
          ownerEmail: ownerEmail?.trim() || null,
          password: hashedPassword,
        },
      });

      // Generate Tables
      const count = Math.min(50, Math.max(1, tablesCount || 10));
      for (let i = 1; i <= count; i++) {
        const numStr = i < 10 ? `0${i}` : `${i}`;
        const token = generateToken(6);
        await tx.table.create({
          data: {
            venueId: venue.id,
            number: numStr,
            cardToken: `${cleanSlug.substring(0, 3).toUpperCase()}${token}`,
            label: i <= 5 ? 'Indoor' : 'Outdoor',
          },
        });
      }

      // Create Initial Categories
      const catMinuman = await tx.category.create({
        data: {
          venueId: venue.id,
          name: 'Minuman',
          sort: 1,
        },
      });

      const catMakanan = await tx.category.create({
        data: {
          venueId: venue.id,
          name: 'Makanan',
          sort: 2,
        },
      });

      // Sample Initial Menu Item
      await tx.menuItem.create({
        data: {
          venueId: venue.id,
          categoryId: catMinuman.id,
          name: 'Es Teh Manis',
          description: 'Teh melati wangi dengan es segar',
          price: 5000,
          isAvailable: true,
          sort: 1,
        },
      });

      return venue;
    });

    // Auto-login new owner with session cookie
    const token = await signSession({
      venueId: newVenue.id,
      venueSlug: newVenue.slug,
      role: 'owner',
    });

    const response = NextResponse.json({
      success: true,
      venue: { id: newVenue.id, name: newVenue.name, slug: newVenue.slug },
      message: 'Registrasi usaha berhasil! Outlet Anda siap digunakan.',
    });

    response.cookies.set({
      name: 'tap_session',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error('Error registering venue:', error);
    return handleApiError(error);
  }
}
