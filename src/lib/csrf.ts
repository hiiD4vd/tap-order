/**
 * CSRF origin guard untuk route mutasi (POST/PATCH/DELETE) yang dilindungi
 * session cookie (owner/kasir). Cookie `tap_session` pakai SameSite=Lax,
 * yang sudah menahan submit form cross-site lintas top-level navigation,
 * tapi TIDAK menahan fetch/XHR dari tab lain yang sama-sama top-level
 * (contoh: iframe same-tab atau navigasi GET diikuti fetch). Origin check
 * ini lapisan kedua yang murah dan tidak mengubah UX sama sekali untuk
 * request normal dari aplikasi sendiri.
 *
 * Endpoint publik tamu (orders/requests/feedback/menu) SENGAJA tidak
 * dipasangi guard ini — mereka tidak pakai session cookie, otentikasinya
 * cardToken di body, dan tamu scan dari NFC/QR tanpa Origin header yang
 * konsisten (in-app browser WA/IG kadang strip header ini).
 */
export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get('origin');
  // Tidak semua klien (curl, beberapa in-app browser) mengirim Origin pada
  // same-site request. Kalau header absen, request tanpa browser context
  // (jadi tidak membawa cookie korban) — bukan ancaman CSRF. Lanjutkan.
  if (!origin) return;

  const host = request.headers.get('host');
  const configured = process.env.NEXT_PUBLIC_APP_URL;

  let allowedHost: string | null = null;
  try {
    allowedHost = configured ? new URL(configured).host : host;
  } catch {
    allowedHost = host;
  }

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw Object.assign(new Error('Origin tidak valid'), { status: 403 });
  }

  if (!allowedHost || originHost !== allowedHost) {
    throw Object.assign(new Error('Origin tidak diizinkan'), { status: 403 });
  }
}
