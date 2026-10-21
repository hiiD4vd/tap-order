import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cleanupRateLimits } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startedAt = Date.now();
  try {
    await db.$queryRaw`SELECT 1`;
    // Tabel rate limit tidak punya cron sendiri; bersihkan saat healthcheck.
    // Railway memanggil endpoint ini berkala, jadi ini cukup.
    await cleanupRateLimits().catch((e) => console.error('rate limit cleanup failed:', e));
    return NextResponse.json({
      ok: true,
      database: 'up',
      latencyMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({
      ok: false,
      database: 'down',
      latencyMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
