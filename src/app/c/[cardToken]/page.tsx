import { notFound, redirect } from 'next/navigation';
import { db } from '@/lib/db';
import Link from 'next/link';
import { Utensils, ArrowRight, Smartphone, CheckCircle2 } from 'lucide-react';

export default async function TableEntryPage({
  params,
}: {
  params: Promise<{ cardToken: string }>;
}) {
  const { cardToken } = await params;

  const table = await db.table.findUnique({
    where: { cardToken },
    include: {
      venue: true,
    },
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
            Kode kartu <code className="bg-slate-100 px-2 py-0.5 rounded font-mono text-amber-700">{cardToken}</code> belum dihubungkan ke meja aktif di sistem. Silakan hubungi kasir atau pelayan.
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

  // Redirect directly into the customer mobile menu with table params
  redirect(`/m/${table.venue.slug}?tableId=${table.id}&tableNumber=${encodeURIComponent(table.number)}&token=${cardToken}`);
}
