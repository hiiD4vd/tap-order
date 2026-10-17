import { db } from './db';

/** Pure date check — dipisah supaya bisa diuji tanpa database. */
export function isSubscriptionExpired(expiresAt: Date | null, now = Date.now()): boolean {
  if (!expiresAt) return false;
  return expiresAt.getTime() < now;
}

/**
 * Tolak aksi owner kalau masa trial/langganan sudah lewat.
 * Kasir & tamu sengaja TIDAK diblokir: menghentikan layanan di tengah jam
 * operasional jauh lebih merugikan daripada satu outlet telat bayar.
 */
export async function assertSubscriptionActive(venueId: string): Promise<void> {
  const venue = await db.venue.findUnique({
    where: { id: venueId },
    select: { expiresAt: true, subscriptionTier: true },
  });

  if (!venue) {
    throw Object.assign(new Error('Outlet tidak ditemukan'), { status: 404 });
  }

  // Tanpa expiresAt = langganan manual/permanen, tidak pernah kedaluwarsa.
  if (!isSubscriptionExpired(venue.expiresAt)) return;

  throw Object.assign(
    new Error(
      `Masa ${venue.subscriptionTier} outlet ini sudah berakhir pada ${venue.expiresAt!.toISOString().slice(0, 10)}. Perpanjang langganan untuk melanjutkan.`
    ),
    { status: 402 }
  );
}
