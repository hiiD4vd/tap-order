import { NextResponse } from 'next/server';
import { assertSameOrigin } from '@/lib/csrf';
import { handleApiError } from '@/lib/api-auth';

export async function POST(request: Request) {
  try {
    // Logout tetap mutasi session cookie. Tidak perlu session valid, tapi wajib
    // same-origin agar situs/subdomain lain tidak bisa memaksa logout korban.
    assertSameOrigin(request);

    const response = NextResponse.json({
      success: true,
      message: 'Berhasil keluar',
    });

    response.cookies.set({
      name: 'tap_session',
      value: '',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
