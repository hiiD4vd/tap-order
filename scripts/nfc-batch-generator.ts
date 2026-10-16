import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const slugArg = args.find((a) => a.startsWith('--slug='));
  const domainArg = args.find((a) => a.startsWith('--domain='));

  const venueSlug = slugArg ? slugArg.split('=')[1] : 'kopi-senja';
  const baseUrl = domainArg ? domainArg.split('=')[1] : 'https://taporder.id';

  console.log('====================================================');
  console.log('🏷️  TAP-ORDER: HARDWARE NFC BATCH GENERATOR');
  console.log('====================================================');
  console.log(`Outlet Slug : ${venueSlug}`);
  console.log(`Base Domain : ${baseUrl}`);

  const venue = await prisma.venue.findUnique({
    where: { slug: venueSlug },
    include: {
      tables: {
        orderBy: { number: 'asc' },
      },
    },
  });

  if (!venue) {
    console.error(`❌ Error: Outlet '${venueSlug}' tidak ditemukan di database.`);
    process.exit(1);
  }

  console.log(`Outlet Name : ${venue.name}`);
  console.log(`Total Meja  : ${venue.tables.length} meja\n`);

  if (venue.tables.length === 0) {
    console.log('⚠️ Belum ada meja terdaftar. Silakan buat meja terlebih dahulu.');
    process.exit(0);
  }

  // Generate CSV data
  const csvHeaders = [
    'No Meja',
    'Label Area',
    'Token Kartu',
    'NFC Chip Payload (NDEF URI)',
    'QR Code Data',
    'Teks Visual Depan Kartu',
    'Teks Visual Belakang Kartu',
    'Chip Rekomendasi',
  ];

  const rows = venue.tables.map((tbl) => {
    const targetUrl = `${baseUrl}/c/${tbl.cardToken}`;
    const frontText = `MEJA ${tbl.number} - ${tbl.label || 'UTAMA'}`;
    const backText = `TAP ATAU SCAN UNTUK PESAN & BAYAR | ${venue.name}`;
    return [
      `"${tbl.number}"`,
      `"${tbl.label || 'Indoor'}"`,
      `"${tbl.cardToken}"`,
      `"${targetUrl}"`,
      `"${targetUrl}"`,
      `"${frontText}"`,
      `"${backText}"`,
      '"NTAG213 / NTAG215"',
    ].join(',');
  });

  const csvContent = [csvHeaders.join(','), ...rows].join('\n');

  // JSON batch format for NFC Tools / ACR122U automated encoders
  const jsonBatch = {
    outlet: {
      name: venue.name,
      slug: venue.slug,
      generatedAt: new Date().toISOString(),
      totalCards: venue.tables.length,
      protocol: 'NDEF_URI',
    },
    cards: venue.tables.map((tbl) => ({
      tableNumber: tbl.number,
      label: tbl.label || 'Indoor',
      cardToken: tbl.cardToken,
      ndefPayloadUri: `${baseUrl}/c/${tbl.cardToken}`,
      suggestedChip: 'NTAG213 (144 bytes) atau NTAG215 (504 bytes)',
      readOnlyLockRecommended: true,
    })),
  };

  const outputDir = path.join(process.cwd(), 'nfc-batches');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const csvPath = path.join(outputDir, `nfc-batch-${venueSlug}.csv`);
  const jsonPath = path.join(outputDir, `nfc-batch-${venueSlug}.json`);

  fs.writeFileSync(csvPath, csvContent, 'utf-8');
  fs.writeFileSync(jsonPath, JSON.stringify(jsonBatch, null, 2), 'utf-8');

  console.log(`✅ File CSV Vendor siap cetak:`);
  console.log(`   -> ${csvPath}`);
  console.log(`✅ File JSON Batch Encoder:`);
  console.log(`   -> ${jsonPath}\n`);

  console.log('----------------------------------------------------');
  console.log('📋 DAFTAR KARTU NFC & PAYLOAD URL (PREVIEW):');
  console.log('----------------------------------------------------');
  console.table(
    venue.tables.map((t) => ({
      'Meja': `Meja ${t.number}`,
      'Area': t.label || '-',
      'Token': t.cardToken,
      'URL NFC (Burn ke Chip)': `${baseUrl}/c/${t.cardToken}`,
    }))
  );

  console.log('====================================================');
  console.log('💡 CARA ENCODE KARTU NFC:');
  console.log('1. Menggunakan HP Android/iPhone (Aplikasi "NFC Tools"):');
  console.log('   - Buka NFC Tools -> Write -> Add a record -> Custom URL / URI');
  console.log('   - Paste URL meja di atas -> Klik Write -> Tempelkan kartu NFC');
  console.log('   - Opsional: Kunci kartu (Lock) agar pembeli tidak bisa menimpa.');
  console.log('2. Menggunakan Vendor Percetakan (PrintID / Tokopedia):');
  console.log('   - Kirimkan file CSV di atas ke percetakan kartu NFC.');
  console.log('   - Vendor akan mencetak nomor meja di kartu dan mem-burn chip sekaligus.');
  console.log('====================================================\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
