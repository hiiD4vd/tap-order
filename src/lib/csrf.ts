/**
 * CSRF guard untuk mutasi yang dilindungi session cookie owner/kasir.
 *
 * Fail closed: browser normal selalu mengirim `Origin` pada fetch mutasi.
 * Header absen atau `Origin: null` tidak boleh dianggap aman — sandboxed
 * iframe, extension, privacy tooling, atau klien non-browser masih bisa
 * membawa cookie/session yang disalin. Klien API terautentikasi harus
 * mengirim Origin aplikasi secara eksplisit.
 *
 * Endpoint publik tamu tidak memakai helper ini karena tidak memakai
 * session cookie; autentikasinya capability `cardToken` di body/URL.
 */
export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get('origin');
  if (!origin || origin === 'null') {
    throw Object.assign(new Error('Origin wajib diisi'), { status: 403 });
  }

  const configured = process.env.NEXT_PUBLIC_APP_URL;
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const host = forwardedHost || request.headers.get('host');
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();

  let allowedOrigin: string;
  try {
    if (configured) {
      allowedOrigin = new URL(configured).origin;
    } else {
      if (!host) throw new Error('host missing');
      const proto = forwardedProto || new URL(request.url).protocol.replace(':', '');
      allowedOrigin = new URL(`${proto}://${host}`).origin;
    }
  } catch {
    throw Object.assign(new Error('Konfigurasi origin aplikasi tidak valid'), { status: 500 });
  }

  let requestOrigin: string;
  try {
    requestOrigin = new URL(origin).origin;
  } catch {
    throw Object.assign(new Error('Origin tidak valid'), { status: 403 });
  }

  // Bandingkan origin penuh, bukan host saja: http dan https tidak setara.
  if (requestOrigin !== allowedOrigin) {
    throw Object.assign(new Error('Origin tidak diizinkan'), { status: 403 });
  }
}
