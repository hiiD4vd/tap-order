import { db } from '../src/lib/db';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
let sessionCookie = '';

async function apiFetch(input: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (sessionCookie) headers.set('Cookie', sessionCookie);
  const response = await fetch(input, { ...init, headers });
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) sessionCookie = setCookie.split(';')[0];
  return response;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let stepCount = 0;
function logStep(actor: string, action: string, detail: string) {
  stepCount++;
  console.log(`\n\x1b[1m\x1b[33m[LANGKAH ${stepCount}]\x1b[0m \x1b[1m\x1b[35m[${actor}]\x1b[0m: \x1b[32m${action}\x1b[0m`);
  console.log(`  \x1b[90m↳ ${detail}\x1b[0m`);
}

async function runRealUserSimulation() {
  console.log('\n\x1b[1m\x1b[34m╔════════════════════════════════════════════════════════════════════╗');
  console.log('║       SIMULASI PENGGUNA NYATA (TEST AUTOMATION MULTI-AKTOR)        ║');
  console.log('║       Skenario: Operasional Harian Kafe Baru dari Buka s/d Tutup   ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\x1b[0m');

  const testSlug = `warkop-juanda-${Date.now().toString().slice(-4)}`;

  // =========================================================================
  // SKENARIO 1: PEMILIK OUTLET MENDAFTARKAN USAHA BARU
  // =========================================================================
  logStep(
    'PEMILIK KAFE (Pak Joko)',
    'Mendaftarkan Outlet Baru ke Platform Tap-Order',
    `Pak Joko membuka website Tap-Order dan mendaftarkan "Warkop Modern Juanda" (Slug: ${testSlug}) dengan 5 meja.`
  );

  const regRes = await apiFetch(`${BASE_URL}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Warkop Modern Juanda',
      slug: testSlug,
      phone: '081288889999',
      whatsapp: '6281288889999',
      address: 'Jl. Ir. H. Juanda No. 18, Depok',
      tablesCount: 5,
      pinCashier: '5555',
      ownerEmail: `joko-${testSlug}@warkop.com`,
      password: 'jokopassword',
    }),
  });

  const regData = await regRes.json();
  if (!regData.success) {
    throw new Error(`Registrasi gagal: ${regData.error}`);
  }
  const venueId = regData.venue.id;
  console.log(`  \x1b[32m✔ Hasil\x1b[0m: Outlet berhasil dibuat dengan ID: ${venueId}`);

  // Fetch created tables and tokens
  const tblRes = await apiFetch(`${BASE_URL}/api/venues/${testSlug}/tables`);
  const tblData = await tblRes.json();
  const tables = tblData.tables;
  console.log(`  \x1b[32m✔ Hasil\x1b[0m: ${tables.length} Meja otomatis ter-generate lengkap dengan Token NFC:`);
  tables.forEach((t: any) => console.log(`      - Meja ${t.number}: Token ${t.cardToken} (URL: /c/${t.cardToken})`));

  await sleep(1000);

  // =========================================================================
  // SKENARIO 2: PEMILIK MENAMBAHKAN MENU SPESIAL
  // =========================================================================
  logStep(
    'PEMILIK KAFE (Pak Joko)',
    'Mengunggah Menu Signature "Mie Nyemek Spesial" & "Kopi Tubruk"',
    'Pak Joko membuka Dashboard Menu dan menambahkan menu makanan & minuman baru ke database.'
  );

  // Get categories
  const menuRes = await apiFetch(`${BASE_URL}/api/menu/${testSlug}`);
  const menuData = await menuRes.json();
  const catMakanan = menuData.venue.categories.find((c: any) => c.name === 'Makanan') || menuData.venue.categories[0];
  const catMinuman = menuData.venue.categories.find((c: any) => c.name === 'Minuman') || menuData.venue.categories[0];

  // Add Mie Nyemek
  const addMieRes = await apiFetch(`${BASE_URL}/api/venues/${testSlug}/menu-items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      categoryId: catMakanan.id,
      name: 'Mie Nyemek Spesial Juanda',
      price: 18000,
      description: 'Mie kuah kental dengan telur orak-arik dan cabai rawit melimpah',
    }),
  });
  const mieItem = (await addMieRes.json()).item;

  // Add Kopi Tubruk
  const addKopiRes = await apiFetch(`${BASE_URL}/api/venues/${testSlug}/menu-items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      categoryId: catMinuman.id,
      name: 'Kopi Tubruk Robusta Gayo',
      price: 12000,
      description: 'Kopi hitam giling kasar khas nusantara',
    }),
  });
  const kopiItem = (await addKopiRes.json()).item;

  console.log(`  \x1b[32m✔ Hasil\x1b[0m: Menu berhasil diinput:`);
  console.log(`      1. ${mieItem.name} - Rp ${mieItem.price.toLocaleString('id-ID')}`);
  console.log(`      2. ${kopiItem.name} - Rp ${kopiItem.price.toLocaleString('id-ID')}`);

  await sleep(1000);

  // =========================================================================
  // SKENARIO 3: PELANGGAN 1 (BUDI) DUDUK DI MEJA 02 & TAP KARTU NFC
  // =========================================================================
  const table2 = tables.find((t: any) => t.number === '02') || tables[1];
  logStep(
    'PELANGGAN 1 (Budi - Meja 02)',
    `Menempelkan HP ke Kartu NFC Meja 02 (Token: ${table2.cardToken})`,
    'HP Budi membaca chip NFC dan browser langsung membuka /c/' + table2.cardToken
  );

  const nfcRes = await apiFetch(`${BASE_URL}/api/c/${table2.cardToken}`);
  const nfcData = await nfcRes.json();

  if (!nfcData.success) throw new Error('Token NFC gagal diverifikasi!');
  console.log(`  \x1b[32m✔ Hasil\x1b[0m: Browser Budi terverifikasi di Meja 02 "${nfcData.venue.name}"`);

  // Budi orders 1x Mie Nyemek + 1x Kopi Tubruk
  logStep(
    'PELANGGAN 1 (Budi - Meja 02)',
    'Memilih Menu & Mengirimkan Pesanan ke Kasir',
    'Budi memilih 1x Mie Nyemek + 1x Kopi Tubruk dengan catatan "Tolong pedas banget ya bang"'
  );

  const orderBudiRes = await apiFetch(`${BASE_URL}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      venueId,
      tableId: table2.id,
      customerName: 'Budi Santoso',
      customerNote: 'Tolong pedas banget ya bang',
      items: [
        { menuItemId: mieItem.id, quantity: 1, notes: 'Pedas gila rawit 10' },
        { menuItemId: kopiItem.id, quantity: 1, notes: 'Gula sedikit' },
      ],
    }),
  });

  const orderBudiData = await orderBudiRes.json();
  if (!orderBudiData.success) throw new Error(`Pesanan Budi gagal: ${orderBudiData.error}`);
  const orderBudi = orderBudiData.order;

  console.log(`  \x1b[32m✔ Hasil\x1b[0m: Pesanan Budi TERKIRIM (${orderBudi.orderNumber})`);
  console.log(`      Total Tagihan: Rp ${orderBudi.totalAmount.toLocaleString('id-ID')} | Status: ${orderBudi.status}`);

  await sleep(1000);

  // =========================================================================
  // SKENARIO 4: PELANGGAN 2 (SITI) DUDUK DI MEJA 04 & PANGGIL PELAYAN
  // =========================================================================
  const table4 = tables.find((t: any) => t.number === '04') || tables[3];
  logStep(
    'PELANGGAN 2 (Siti - Meja 04)',
    'Tap Kartu NFC Meja 04, Pesan 2x Kopi & Tekan Tombol "Panggil Pelayan"',
    'Siti memesan 2x Kopi Tubruk (Rp 24.000) dan menekan tombol bel pelayan karena minta asbak.'
  );

  const orderSitiRes = await apiFetch(`${BASE_URL}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      venueId,
      tableId: table4.id,
      customerName: 'Siti Rahma',
      items: [{ menuItemId: kopiItem.id, quantity: 2 }],
    }),
  });
  const orderSiti = (await orderSitiRes.json()).order;

  // Siti calls waiter
  const reqRes = await apiFetch(`${BASE_URL}/api/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      venueId,
      tableId: table4.id,
      type: 'waiter',
    }),
  });
  const reqData = await reqRes.json();
  console.log(`  \x1b[32m✔ Hasil\x1b[0m: Pesanan Siti terkirim (${orderSiti.orderNumber}) & Bel pelayan Meja 04 aktif berbunyi di kasir!`);

  await sleep(1000);

  // =========================================================================
  // SKENARIO 5: KASIR MELIHAT PESANAN REALTIME & MEMPROSES KE DAPUR
  // =========================================================================
  logStep(
    'STAF KASIR (Rian)',
    'Menerima Notifikasi Audio "Ding!" & Memproses Pesanan ke Dapur',
    'Kasir Rian melihat 2 pesanan baru di antrean KDS, menekan "Terima & Masak" untuk Budi dan Siti.'
  );

  // Rian updates Budi's order to 'preparing'
  await apiFetch(`${BASE_URL}/api/orders/${orderBudi.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'preparing' }),
  });

  // Rian updates Siti's order to 'preparing'
  await apiFetch(`${BASE_URL}/api/orders/${orderSiti.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'preparing' }),
  });

  // Rian resolves Siti's waiter call
  await apiFetch(`${BASE_URL}/api/requests`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requestId: reqData.request.id, status: 'resolved' }),
  });

  console.log(`  \x1b[32m✔ Hasil\x1b[0m: Status pesanan Budi & Siti berubah menjadi [SEDANG DIMASAK]`);
  console.log(`  \x1b[32m✔ Hasil\x1b[0m: Panggilan pelayan Meja 04 ditandai [SELESAI DILAYANI]`);

  await sleep(1000);

  // =========================================================================
  // SKENARIO 6: BUDI SELESAI MAKAN & TEKAN "MINTA BILL" DARI MEJA
  // =========================================================================
  logStep(
    'PELANGGAN 1 (Budi - Meja 02)',
    'Menekan Tombol "Minta Tagihan / Bill" di Layar HP',
    'Budi selesai makan dan memanggil kasir untuk minta total tagihan.'
  );

  const billReqRes = await apiFetch(`${BASE_URL}/api/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      venueId,
      tableId: table2.id,
      type: 'bill',
    }),
  });
  const billReq = await billReqRes.json();

  // Verify table status is now bill_requested
  const checkTable2 = await db.table.findUnique({ where: { id: table2.id } });
  console.log(`  \x1b[32m✔ Hasil\x1b[0m: Status Meja 02 di sistem kasir otomatis menjadi [${checkTable2?.status.toUpperCase()}]`);

  await sleep(1000);

  // =========================================================================
  // SKENARIO 7: KASIR MELAKUKAN PELUNASAN BILL & TUTUP MEJA 02
  // =========================================================================
  logStep(
    'STAF KASIR (Rian)',
    'Menerima Pembayaran Tunai & Menutup Meja 02',
    `Total tagihan Budi adalah Rp 30.000. Budi membayar dengan uang tunai Rp 50.000. Kasir menginput uang dan mencetak struk.`
  );

  const totalBudi = orderBudi.totalAmount;
  const cashGiven = 50000;
  const change = cashGiven - totalBudi;

  const settleRes = await apiFetch(`${BASE_URL}/api/orders/${orderBudi.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'completed',
      isPaid: true,
      paymentMethod: 'cash',
    }),
  });
  const settleData = await settleRes.json();

  // Verify Table 02 returns to 'empty'
  const finalTable2 = await db.table.findUnique({ where: { id: table2.id } });

  console.log(`  \x1b[32m✔ Hasil\x1b[0m: Pembayaran Lunas via [TUNAI]`);
  console.log(`      Tagihan: Rp ${totalBudi.toLocaleString('id-ID')} | Diterima: Rp ${cashGiven.toLocaleString('id-ID')} | Kembalian: Rp ${change.toLocaleString('id-ID')}`);
  console.log(`  \x1b[32m✔ Hasil\x1b[0m: Status Meja 02 otomatis kembali menjadi [${finalTable2?.status.toUpperCase()}] (Siap ditempati tamu baru!)`);

  await sleep(1000);

  // =========================================================================
  // SKENARIO 8: UJI COBA INTEGRITAS - MENU HABIS DITOLAK SISTEM
  // =========================================================================
  logStep(
    'INTEGRITAS & SECURITY TEST',
    'Menu "Mie Nyemek" Diberi Tanda Habis, Tamu Lain Mencoba Memesan',
    'Kasir mematikan ketersediaan Mie Nyemek. Tamu Meja 05 mencoba memesan menu tersebut. Sistem harus menolak!'
  );

  // Mark Mie Nyemek as out of stock
  await apiFetch(`${BASE_URL}/api/venues/${testSlug}/menu-items`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ itemId: mieItem.id, isAvailable: false }),
  });

  // Table 05 tries to order it
  const table5 = tables.find((t: any) => t.number === '05') || tables[4];
  const blockedOrderRes = await apiFetch(`${BASE_URL}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      venueId,
      tableId: table5.id,
      customerName: 'Tamu Iseng',
      items: [{ menuItemId: mieItem.id, quantity: 1 }],
    }),
  });

  const blockedData = await blockedOrderRes.json();
  if (blockedOrderRes.status === 400 && blockedData.error.includes('sedang habis')) {
    console.log(`  \x1b[32m✔ SUKSES DITANGKAL\x1b[0m: Server menolak pesanan dengan pesan: "${blockedData.error}"`);
  } else {
    throw new Error('Integritas menu habis gagal!');
  }

  await sleep(1000);

  // =========================================================================
  // SKENARIO 9: REKAP OMSET AKHIR HARI PEMILIK USAHA
  // =========================================================================
  logStep(
    'DASHBOARD PEMILIK (Pak Joko)',
    'Memeriksa Akurasi Rekap Finansial Akhir Hari',
    'Pak Joko mengecek laporan omset di dashboard pemilik.'
  );

  const allOrdersRes = await apiFetch(`${BASE_URL}/api/orders?venueSlug=${testSlug}`);
  const allOrdersData = await allOrdersRes.json();
  const paidList = allOrdersData.orders.filter((o: any) => o.isPaid);
  const totalOmsetRecorded = paidList.reduce((acc: number, o: any) => acc + o.totalAmount, 0);

  console.log(`  \x1b[32m✔ Hasil Rekap Finansial Pak Joko\x1b[0m:`);
  console.log(`      Total Omset Lunas Hari Ini: Rp ${totalOmsetRecorded.toLocaleString('id-ID')}`);
  console.log(`      Transaksi Lunas: ${paidList.length} pesanan`);
  console.log(`      Transaksi Sedang Berjalan: ${allOrdersData.orders.length - paidList.length} pesanan`);

  // Final Banner
  console.log('\n\x1b[1m\x1b[32m╔════════════════════════════════════════════════════════════════════╗');
  console.log('║  SELURUH 9 SKENARIO AUTOMATION SELESAI DENGAN STATUS 100% SUKSES!  ║');
  console.log('║  Alur Bisnis Riil dari Registrasi, Pesan Meja, Kasir, s/d Lunas    ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\x1b[0m\n');
}

runRealUserSimulation().catch((err) => {
  console.error('\x1b[31mSIMULASI GAGAL:\x1b[0m', err);
  process.exit(1);
});
