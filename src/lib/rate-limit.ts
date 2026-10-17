type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const CLEANUP_INTERVAL = 1_000;
let lastCleanup = 0;

export function getClientKey(request: Request, scope: string): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const realIp = request.headers.get('x-real-ip')?.trim();
  return `${scope}:${forwarded || realIp || 'unknown'}`;
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; remaining: number; retryAfter: number } {
  const now = Date.now();
  if (now - lastCleanup >= CLEANUP_INTERVAL) {
    for (const [bucketKey, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(bucketKey);
    }
    lastCleanup = now;
  }

  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfter: 0 };
  }

  current.count += 1;
  const remaining = Math.max(0, limit - current.count);
  const retryAfter = Math.ceil((current.resetAt - now) / 1000);
  return { allowed: current.count <= limit, remaining, retryAfter };
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
