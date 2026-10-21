import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { parseBody, handleApiError, requireAuth } from '@/lib/api-auth';
import { createFeedbackSchema } from '@/lib/validation';
import { checkRateLimit, getClientKey, rateLimitResponse } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * Kritik & saran tamu — MURNI ANONIM.
 *
 * Yang sengaja TIDAK disimpan: nomor meja, id order, IP, user agent. Kalau
 * tableId ikut tersimpan, staf bisa menebak penulisnya dari meja yang sedang
 * terisi, dan tamu berhenti jujur. Token kartu hanya dipakai sekali untuk
 * memastikan pengirim benar-benar ada di outlet, lalu dibuang.
 */
export async function POST(request: Request) {
  try {
    const limit = await checkRateLimit(getClientKey(request, 'feedback'), 3, 10 * 60 * 1000);
    if (!limit.allowed) return rateLimitResponse(limit.retryAfter);

    const { venueId, cardToken, rating, message } = await parseBody(request, createFeedbackSchema);

    // Capability check: hanya tamu yang memegang kartu meja outlet ini.
    const table = await db.table.findFirst({
      where: { venueId, cardToken, isActive: true, deletedAt: null },
      select: { id: true },
    });
    if (!table) {
      return NextResponse.json({ error: 'Kartu meja tidak valid' }, { status: 404 });
    }

    await db.feedback.create({
      data: { venueId, rating: rating ?? null, message },
    });

    return NextResponse.json({
      success: true,
      message: 'Terima kasih! Masukan Anda terkirim secara anonim.',
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/** Owner membaca masukan. Tidak ada identitas untuk ditampilkan. */
export async function GET(request: Request) {
  try {
    const session = await requireAuth('owner');

    const url = new URL(request.url);
    const take = Math.min(100, Math.max(1, Number(url.searchParams.get('take')) || 50));

    const feedbacks = await db.feedback.findMany({
      where: { venueId: session.venueId },
      orderBy: { createdAt: 'desc' },
      take,
      select: { id: true, rating: true, message: true, createdAt: true },
    });

    return NextResponse.json({ success: true, feedbacks });
  } catch (error) {
    return handleApiError(error);
  }
}
