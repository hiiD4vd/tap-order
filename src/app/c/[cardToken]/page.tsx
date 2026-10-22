import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { db } from '@/lib/db';
import Link from 'next/link';
import { Smartphone } from 'lucide-react';
import TableHub from './TableHub';
import { checkRateLimit } from '@/lib/rate-limit';

/**
 * Halaman yang dibuka kartu NFC/QR meja.
 *
 * URL `/c/[cardToken]` TIDAK BOLEH BERUBAH — sudah di-burn ke chip fisik.
 *
 * Dulu halaman ini langsung redirect ke katalog. Sekarang menampilkan hub:
 * pesan, status pesanan, panggil pelayan, wifi, ulasan, kritik & saran.
 * Katalog tetap satu tap dari sini dan tetap jadi tile paling menonjol.
 */
export default async function TableEntryPage({
  params,
}: {
  params: Promise<{ cardToken: string }>;
}) {
  const { cardToken } = await params;

  // Brute-force guard: token lama (6-9 char) punya entropi rendah; tanpa
  // limit, endpoint ini bisa di-scan ribuan percobaan/detik.
  const hdrs = await headers();
  const ip = hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() || hdrs.get('x-real-ip')?.trim() || 'unknown';
  const limit = await checkRateLimit(`card-page:${ip}`, 30, 60 * 1000);
  if (!limit.allowed) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 max-w-md w-full text-center">
          <h1 className="text-xl font-bold text-slate-800 mb-2">Terlalu Banyak Percobaan</h1>
          <p className="text-slate-600 text-sm">Silakan coba lagi dalam satu menit.</p>
        </div>
      </div>
    );
  }

  const table = await db.table.findUnique({
    where: { cardToken },
    include: { venue: true },
  });

  // Meja terarsip (soft delete) tidak boleh lagi bisa dibuka dari chip NFC lama.
  if (!table || !table.isActive || table.deletedAt) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Smartphone className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">Kartu Meja Belum Terdaftar</h1>
          <p className="text-slate-600 text-sm mb-6 leading-relaxed">
            Kartu ini belum dihubungkan ke meja aktif di sistem. Silakan hubungi kasir atau pelayan.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    );
  }

  // Tamu yang sudah pernah tap boleh langsung ke katalog via ?go=menu,
  // supaya alur "pesan lagi" tidak terhalang satu tap tambahan.
  const menuUrl = `/m/${table.venue.slug}?tableId=${table.id}&tableNumber=${encodeURIComponent(
    table.number
  )}&token=${cardToken}`;

  // Log tap: bahan analytics jam sibuk & deteksi chip rusak (owner-only).
  // Jangan pernah menggagalkan halaman tamu karena logging gagal.
  try {
    await db.tableTap.create({
      data: { venueId: table.venueId, tableId: table.id },
    });
  } catch {
    // diabaikan dengan sengaja
  }

  // Order aktif meja ini. Filter berdasarkan STATUS saja, bukan isPaid:
  // dengan alur bayar-di-depan, order lunas masih perlu dilacak sampai selesai.
  const activeOrder = await db.order.findFirst({
    where: {
      tableId: table.id,
      status: { in: ['awaiting_payment', 'pending', 'preparing', 'served'] },
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      isPaid: true,
      totalAmount: true,
      createdAt: true,
      items: { select: { nameSnapshot: true, quantity: true } },
    },
  });

  // Estimasi tunggu: berapa order yang masuk dapur lebih dulu.
  let queueAhead = 0;
  if (activeOrder) {
    queueAhead = await db.order.count({
      where: {
        venueId: table.venueId,
        status: { in: ['pending', 'preparing'] },
        createdAt: { lt: activeOrder.createdAt },
      },
    });
  }

  const v = table.venue;

  return (
    <TableHub
      menuUrl={menuUrl}
      cardToken={cardToken}
      venue={{
        id: v.id,
        name: v.name,
        slug: v.slug,
        isOpen: v.isOpen,
        whatsapp: v.whatsapp,
        address: v.address,
        wifiSsid: v.wifiSsid,
        wifiPassword: v.wifiPassword,
        gmapsReviewUrl: v.gmapsReviewUrl,
        instagramUrl: v.instagramUrl,
      }}
      table={{ id: table.id, number: table.number, label: table.label }}
      activeOrder={
        activeOrder
          ? {
              id: activeOrder.id,
              orderNumber: activeOrder.orderNumber,
              status: activeOrder.status,
              isPaid: activeOrder.isPaid,
              totalAmount: activeOrder.totalAmount,
              items: activeOrder.items,
              queueAhead,
            }
          : null
      }
    />
  );
}
