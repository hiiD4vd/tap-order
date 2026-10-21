import { db } from '@/lib/db';

/**
 * Rate limiter berbasis database.
 *
 * Sebelumnya pakai Map in-memory: rekor hilang tiap restart/redeploy dan
 * tidak berlaku lintas replica. Railway sering restart, jadi batas login
 * efektif lebih longgar dari yang tertulis. Tabel `rate_limit_buckets`
 * dipakai sebagai penyimpanan bersama supaya batas berlaku untuk seluruh
 * instance.
 *
 * ponytail: satu upsert per request (round-trip DB). Cukup untuk skala satu
 * outlet; kalau nanti jadi hot path, ganti ke Redis/Upstash dengan API sama.
 */

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfter: number;
};

export function getClientKey(request: Request, scope: string): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const realIp = request.headers.get('x-real-ip')?.trim();
  return `${scope}:${forwarded || realIp || 'unknown'}`;
}

export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const now = Date.now();

  try {
    // Satu statement: hitung + reset jendela kalau sudah lewat. Atomik, jadi
    // dua request bersamaan tidak bisa sama-sama membaca count lama.
    const rows = await db.$queryRaw<{ count: number; resetAt: Date }[]>`
      INSERT INTO rate_limit_buckets ("key", count, "resetAt")
      VALUES (${key}, 1, ${new Date(now + windowMs)})
      ON CONFLICT ("key") DO UPDATE SET
        count = CASE
          WHEN rate_limit_buckets."resetAt" <= ${new Date(now)}
            THEN 1
          ELSE rate_limit_buckets.count + 1
        END,
        "resetAt" = CASE
          WHEN rate_limit_buckets."resetAt" <= ${new Date(now)}
            THEN ${new Date(now + windowMs)}
          ELSE rate_limit_buckets."resetAt"
        END
      RETURNING count, "resetAt"
    `;

    const { count, resetAt } = rows[0];
    const retryAfter = Math.ceil((new Date(resetAt).getTime() - now) / 1000);
    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      retryAfter: Math.max(1, retryAfter),
    };
  } catch (error) {
    // Fail-open dengan sengaja: kalau DB bermasalah, order tamu tetap bisa
    // masuk. Memblokir seluruh POS karena tabel rate-limit rusak lebih mahal
    // daripada melewatkan beberapa request.
    console.error('Rate limit check failed, allowing request:', error);
    return { allowed: true, remaining: limit, retryAfter: 0 };
  }
}

/** Hapus bucket kedaluwarsa. Dipanggil dari /api/health supaya tidak perlu cron. */
export async function cleanupRateLimits(): Promise<number> {
  const deleted = await db.$executeRaw`
    DELETE FROM rate_limit_buckets WHERE "resetAt" <= ${new Date()}
  `;
  return deleted;
}

export function rateLimitResponse(retryAfter: number): Response {
  return Response.json(
    { success: false, error: 'Terlalu banyak permintaan. Coba lagi nanti.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(Math.max(1, retryAfter)),
        'Cache-Control': 'no-store',
      },
    },
  );
}
