import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ venueSlug: string }> }
) {
  try {
    const { requireAuth } = await import('@/lib/api-auth');
    const session = await requireAuth('owner');
    
    const { venueSlug } = await params;
    const venue = await db.venue.findUnique({ where: { slug: venueSlug, id: session.venueId } });

    if (!venue) {
      return new Response('Venue not found', { status: 404 });
    }

    const url = new URL(request.url);
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const start = from ? new Date(`${from}T00:00:00.000`) : null;
    const end = to ? new Date(`${to}T23:59:59.999`) : null;
    if ((from && Number.isNaN(start?.getTime())) || (to && Number.isNaN(end?.getTime())) || (start && end && start > end)) {
      return new Response('Rentang tanggal tidak valid', { status: 400 });
    }

    // Laporan penjualan hanya transaksi financial valid. Void/cancelled serta
    // order belum dibayar tidak boleh muncul sebagai omzet.
    const orders = await db.order.findMany({
      where: {
        venueId: venue.id,
        isPaid: true,
        status: { not: 'cancelled' },
        ...(start || end ? { paidAt: { ...(start ? { gte: start } : {}), ...(end ? { lte: end } : {}) } } : {}),
      },
      include: { table: true, items: true },
      orderBy: { paidAt: 'desc' },
      take: 10_000,
    });

    // Formula CSV bisa dieksekusi Excel/Sheets. Escape nilai teks dari input tamu/menu.
    const csvCell = (value: string | number) => {
      const text = String(value).replace(/"/g, '""');
      return `"${/^[=+\-@]/.test(text) ? `'${text}` : text}"`;
    };
    let csv = 'No. Pesanan,Tanggal,Waktu,Lokasi Meja,Nama Pemesan,Daftar Menu,Total Tagihan (Rp),Metode Bayar,Status Bayar,Status Dapur\n';

    for (const o of orders) {
      const paidAt = o.paidAt || o.createdAt;
      const dateStr = new Date(paidAt).toLocaleDateString('id-ID');
      const timeStr = new Date(paidAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      const tableStr = o.table ? `Meja ${o.table.number}` : 'Pesan Langsung';
      const nameStr = o.customerName || '-';
      const itemsSummary = o.items.map((it) => `${it.quantity}x ${it.nameSnapshot}`).join(' | ');
      const paymentStatus = o.isPaid ? 'LUNAS' : 'BELUM LUNAS';
      const kitchenStatus = o.status.toUpperCase();

      csv += [
        csvCell(o.orderNumber), csvCell(dateStr), csvCell(timeStr), csvCell(tableStr),
        csvCell(nameStr), csvCell(itemsSummary), o.totalAmount,
        csvCell(o.paymentMethod.toUpperCase()), csvCell(paymentStatus), csvCell(kitchenStatus),
      ].join(',') + '\n';
    }

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="Laporan_Penjualan_${venueSlug}_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    const { handleApiError } = await import('@/lib/api-auth');
    const status = (error as any)?.status || 500;
    if (status !== 500) return handleApiError(error);
    console.error('Export error:', error);
    return new Response('Failed to generate export', { status: 500 });
  }
}
