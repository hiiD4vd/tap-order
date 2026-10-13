import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySession } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Check Admin / Owner Routes: /admin/:venueSlug
  if (pathname.startsWith('/admin')) {
    const segments = pathname.split('/').filter(Boolean);
    const targetVenueSlug = segments[1]; // /admin/[venueSlug]

    const token = request.cookies.get('tap_session')?.value;
    const session = await verifySession(token);

    // If no valid session or not an owner or wrong venue
    if (!session || session.role !== 'owner' || (targetVenueSlug && session.venueSlug !== targetVenueSlug)) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      if (targetVenueSlug) {
        loginUrl.searchParams.set('slug', targetVenueSlug);
      }
      loginUrl.searchParams.set('error', 'unauthorized');
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  // 2. Check Cashier & Kitchen Routes: /cashier/:venueSlug & /kitchen/:venueSlug
  if (pathname.startsWith('/cashier') || pathname.startsWith('/kitchen')) {
    const segments = pathname.split('/').filter(Boolean);
    const targetVenueSlug = segments[1]; // /[role]/[venueSlug]

    const token = request.cookies.get('tap_session')?.value;
    const session = await verifySession(token);

    // Allowed if role is 'owner' or 'cashier' matching target venue
    const isAuthorized =
      session &&
      (session.role === 'owner' || session.role === 'cashier') &&
      (!targetVenueSlug || session.venueSlug === targetVenueSlug);

    if (!isAuthorized) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('type', 'cashier');
      if (targetVenueSlug) {
        loginUrl.searchParams.set('slug', targetVenueSlug);
      }
      loginUrl.searchParams.set('error', 'pin_required');
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/cashier/:path*', '/kitchen/:path*'],
};
