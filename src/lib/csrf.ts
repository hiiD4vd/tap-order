/**
 * CSRF guard untuk mutasi yang dilindungi session cookie owner/kasir.
 *
 * Fail closed: `APP_ORIGIN` wajib berupa canonical server-only origin.
 * Jangan percaya Host/X-Forwarded-* dari request untuk keputusan keamanan;
 * header itu hanya aman bila konfigurasi proxy terbukti selalu menimpanya.
 */
export function assertSameOrigin(request: Request): void {
  const configured = process.env.APP_ORIGIN;
  let allowedOrigin: string;
  try {
    if (!configured) throw new Error('missing');
    const parsed = new URL(configured);
    if (parsed.pathname !== '/' || parsed.search || parsed.hash) throw new Error('not an origin');
    allowedOrigin = parsed.origin;
  } catch {
    throw Object.assign(new Error('APP_ORIGIN wajib berisi canonical origin yang valid'), { status: 500 });
  }

  const origin = request.headers.get('origin');
  if (!origin || origin === 'null') {
    throw Object.assign(new Error('Origin wajib diisi'), { status: 403 });
  }

  let requestOrigin: string;
  try {
    requestOrigin = new URL(origin).origin;
  } catch {
    throw Object.assign(new Error('Origin tidak valid'), { status: 403 });
  }

  if (requestOrigin !== allowedOrigin) {
    throw Object.assign(new Error('Origin tidak diizinkan'), { status: 403 });
  }
}
