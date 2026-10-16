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

    const orders = await db.order.findMany({
      where: { venueId: venue.id },
      include: {
        table: true,
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Generate CSV Header
    let csv = 'No. Pesanan,Tanggal,Waktu,Lokasi Meja,Nama Pemesan,Daftar Menu,Total Tagihan (Rp),Metode Bayar,Status Bayar,Status Dapur\n';

    for (const o of orders) {
      const dateStr = new Date(o.createdAt).toLocaleDateString('id-ID');
      const timeStr = new Date(o.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      const tableStr = o.table ? `Meja ${o.table.number}` : 'Pesan Langsung';
      const nameStr = (o.customerName || '-').replace(/,/g, ' ');
      const itemsSummary = o.items.map((it) => `${it.quantity}x ${it.nameSnapshot}`).join(' | ').replace(/,/g, ' ');
      const paymentStatus = o.isPaid ? 'LUNAS' : 'BELUM LUNAS';
      const kitchenStatus = o.status.toUpperCase();

      csv += `"${o.orderNumber}","${dateStr}","${timeStr}","${tableStr}","${nameStr}","${itemsSummary}",${o.totalAmount},"${o.paymentMethod.toUpperCase()}","${paymentStatus}","${kitchenStatus}"\n`;
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
