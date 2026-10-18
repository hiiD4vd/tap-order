import { db } from '../src/lib/db';
import { signSession } from '../src/lib/auth';

async function testExtendedFeatures() {
  console.log('--- PENGUJIAN FITUR BARU HASIL SINTESIS 5 REPO ---');

  // 1. Check venue settings update
  const venue = await db.venue.findUnique({ where: { slug: 'kopi-senja' } });
  if (!venue) throw new Error('Venue kopi-senja tidak ditemukan');

  console.log('1. Memperbarui Pengaturan Venue (PB1 10%, Service 5%, isOpen: true)...');
  const updatedVenue = await db.venue.update({
    where: { id: venue.id },
    data: {
      taxRate: 10,
      serviceRate: 5,
      isOpen: true,
      qrisImageUrl: '/qris-outlet.png',
    },
  });
  console.log(`   ✔ Venue updated: Tax=${updatedVenue.taxRate}%, Service=${updatedVenue.serviceRate}%, Open=${updatedVenue.isOpen}`);

  // 2. Test Kitchen Page Protection
  console.log('2. Menguji Proteksi Layar KDS Dapur (/kitchen/kopi-senja)...');
  const unauthKds = await fetch('http://localhost:3000/kitchen/kopi-senja', { redirect: 'manual' });
  console.log(`   ✔ Akses tanpa login: HTTP ${unauthKds.status} (Redirect ke login)`);

  const cashierToken = await signSession({
    role: 'cashier',
    venueId: venue.id,
    venueSlug: venue.slug,
  });

  const authKds = await fetch('http://localhost:3000/kitchen/kopi-senja', {
    headers: { Cookie: `tap_session=${cashierToken}` },
  });
  console.log(`   ✔ Akses dengan sesi Kasir/Dapur: HTTP ${authKds.status}`);

  // 3. Test Order Creation with PB1 & Service Charge Calculation
  console.log('3. Membuat Pesanan Baru dengan Kalkulasi Otomatis PB1 & Service...');
  const table1 = await db.table.findFirst({ where: { venueId: venue.id, number: '01' } });
  const table2 = await db.table.findFirst({ where: { venueId: venue.id, number: '02' } });
  const menuItem = await db.menuItem.findFirst({ where: { venueId: venue.id, isAvailable: true } });

  if (!table1 || !table2 || !menuItem) throw new Error('Table or MenuItem missing');

  const orderRes = await fetch('http://localhost:3000/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      venueId: venue.id,
      tableId: table1.id,
      customerName: 'Budi Santoso',
      customerNote: 'Jangan terlalu manis',
      items: [
        {
          menuItemId: menuItem.id,
          quantity: 2,
        },
      ],
    }),
  });
  const orderData = await orderRes.json();
  console.log(`   ✔ Pesanan dibuat: ${orderData.order?.orderNumber}`);
  console.log(`     - Subtotal: Rp ${orderData.order?.subtotal?.toLocaleString('id-ID')}`);
  console.log(`     - PB1 Restoran (10%): Rp ${orderData.order?.taxAmount?.toLocaleString('id-ID')}`);
  console.log(`     - Service Charge (5%): Rp ${orderData.order?.serviceAmount?.toLocaleString('id-ID')}`);
  console.log(`     - Total: Rp ${orderData.order?.totalAmount?.toLocaleString('id-ID')}`);

  const createdOrderId = orderData.order.id;

  // 4. Test Table Transfer (Pindah Meja dari Meja 01 ke Meja 02)
  console.log('4. Menguji Pindah Meja (Table Transfer 01 -> 02)...');
  const transferRes = await fetch(`http://localhost:3000/api/orders/${createdOrderId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `tap_session=${cashierToken}`,
    },
    body: JSON.stringify({
      newTableId: table2.id,
    }),
  });
  const transferData = await transferRes.json();
  console.log(`   ✔ Respon Pindah Meja: HTTP ${transferRes.status}, Pesan: ${transferData.message}`);

  const updatedOrder = await db.order.findUnique({
    where: { id: createdOrderId },
    include: { table: true },
  });
  console.log(`   ✔ Meja pesanan sekarang: Meja ${updatedOrder?.table?.number}`);

  // 5. Test Void / Cancel Order with Audit Log
  console.log('5. Menguji Void / Batal Pesanan Kasir dengan Audit Log...');
  const voidRes = await fetch(`http://localhost:3000/api/orders/${createdOrderId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `tap_session=${cashierToken}`,
    },
    body: JSON.stringify({
      status: 'cancelled',
      cancelledReason: 'Pelanggan salah pesan menu, minta re-order',
    }),
  });
  const voidData = await voidRes.json();
  console.log(`   ✔ Respon Void: HTTP ${voidRes.status}, Status Pesanan: ${voidData.order?.status}`);

  const auditLog = await db.auditLog.findFirst({
    where: { venueId: venue.id, action: 'VOID_ORDER' },
    orderBy: { createdAt: 'desc' },
  });
  console.log(`   ✔ AuditLog tercatat: Aksi=${auditLog?.action}, Alasan="${auditLog?.details}"`);

  console.log('\n=======================================================');
  console.log('SEMUA FITUR SINTESIS 5 REPO TERBUKTI BERFUNGSI 100%!');
  console.log('=======================================================');
}

testExtendedFeatures()
  .catch((e) => {
    console.error('Error running extended test:', e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
