import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { signSession, verifyPassword, hashPassword } from '@/lib/auth';
import { timingSafeEqual } from 'crypto';
import { parseBody, handleApiError } from '@/lib/api-auth';
import { loginSchema } from '@/lib/validation';
import { checkRateLimit, getClientKey, rateLimitResponse } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    const loginLimit = await checkRateLimit(getClientKey(request, 'login'), 5, 15 * 60 * 1000);
    if (!loginLimit.allowed) return rateLimitResponse(loginLimit.retryAfter);

    const body = await parseBody(request, loginSchema);
    const { identifier: rawId, slug, password, pin } = body;
    const type = body.type || (body.pin && !body.password ? 'cashier' : 'owner');
    const identifier = rawId || slug;

    if (!identifier) {
      return NextResponse.json(
        { error: 'Identifier (slug atau email) wajib diisi' },
        { status: 400 }
      );
    }

    // Find venue by slug or ownerEmail
    const venue = await db.venue.findFirst({
      where: {
        OR: [
          { slug: identifier.toLowerCase().trim() },
          { ownerEmail: identifier.trim() },
        ],
      },
    });

    if (!venue) {
      return NextResponse.json(
        { error: 'Outlet / Akun tidak ditemukan' },
        { status: 404 }
      );
    }

    if (type === 'cashier') {
      // Cashier PIN check with timing-safe comparison
      const inputPin = pin?.toString().trim();
      if (!venue.pinCashier || !inputPin) {
        return NextResponse.json(
          { error: 'PIN Kasir wajib diisi' },
          { status: 400 }
        );
      }
      
      // Pad both to same length before constant-time compare
      const storedPin = venue.pinCashier.padEnd(16, '\0');
      const submittedPin = inputPin.padEnd(16, '\0');
      
      const isValid = timingSafeEqual(
        Buffer.from(storedPin, 'utf8'),
        Buffer.from(submittedPin, 'utf8')
      );
      
      if (!isValid) {
        return NextResponse.json(
          { error: 'PIN Kasir salah. Silakan coba lagi.' },
          { status: 401 }
        );
      }

      // Generate signed session for cashier
      const token = await signSession({
        venueId: venue.id,
        venueSlug: venue.slug,
        role: 'cashier',
      });

      const response = NextResponse.json({
        success: true,
        redirectUrl: `/cashier/${venue.slug}`,
        venue: { id: venue.id, name: venue.name, slug: venue.slug, role: 'cashier' },
      });

      // Set secure HttpOnly session cookie
      response.cookies.set({
        name: 'tap_session',
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60, // 7 days
      });

      return response;
    }

    // Owner Login check
    const isValid = await verifyPassword(password || '', venue.password || '');
    if (!isValid) {
      return NextResponse.json(
        { error: 'Password pemilik salah. Silakan periksa kembali.' },
        { status: 401 }
      );
    }

    // Auto-upgrade legacy plaintext password to secure PBKDF2 hash in background
    if (venue.password && !venue.password.startsWith('pbkdf2:')) {
      const hashed = await hashPassword(password!);
      await db.venue.update({
        where: { id: venue.id },
        data: { password: hashed },
      });
    }

    // Generate signed session for owner
    const token = await signSession({
      venueId: venue.id,
      venueSlug: venue.slug,
      role: 'owner',
    });

    const response = NextResponse.json({
      success: true,
      redirectUrl: `/admin/${venue.slug}`,
      venue: { id: venue.id, name: venue.name, slug: venue.slug, role: 'owner' },
    });

    response.cookies.set({
      name: 'tap_session',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return handleApiError(error);
  }
}
