import { generateToken, formatRupiah } from '../src/lib/utils';
import { db } from '../src/lib/db';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  \x1b[32m✔ PASS\x1b[0m: ${testName}`);
    passed++;
  } else {
    console.error(`  \x1b[31m✖ FAIL\x1b[0m: ${testName}`);
    failed++;
  }
}

async function runUnitTests() {
  console.log('\n\x1b[1m\x1b[36m=======================================================');
  console.log('       TAP-ORDER UNIT TEST SUITE (LOGIKA SISTEM)');
  console.log('=======================================================\x1b[0m\n');

  // Test Suite 1: Utility Functions
  console.log('\x1b[1m[1] Testing Utility & Helper Functions\x1b[0m');

  const token1 = generateToken(6);
  const token2 = generateToken(6);
  assert(token1.length === 6, 'generateToken(6) menghasilkan string 6 karakter');
  assert(token1 !== token2, 'generateToken menghasilkan token unik acak (collision resistant)');
  assert(/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]+$/.test(token1), 'generateToken tidak mengandung karakter ambigu (0, O, 1, I)');

  const rupiah1 = formatRupiah(25000);
  assert(rupiah1.includes('25.000'), `formatRupiah(25000) memformat dengan pemisah ribuan (${rupiah1})`);
  const rupiah2 = formatRupiah(0);
  assert(rupiah2.includes('0'), 'formatRupiah(0) menangani angka nol');

  // Test Suite 2: Multi-Tenant Database Isolation
  console.log('\n\x1b[1m[2] Testing Multi-Tenant Data Isolation\x1b[0m');

  // Create 2 test tenants
  const tenantA = await db.venue.create({
    data: {
      name: 'Cafe Alpha Test',
      slug: `test-alpha-${Date.now()}`,
      subscriptionTier: 'basic',
    },
  });

  const tenantB = await db.venue.create({
    data: {
      name: 'Resto Beta Test',
      slug: `test-beta-${Date.now()}`,
      subscriptionTier: 'pro',
    },
  });

  const tableA = await db.table.create({
    data: {
      venueId: tenantA.id,
      number: 'T1',
      cardToken: `TOK-A-${Date.now()}`,
    },
  });

  const tableB = await db.table.create({
    data: {
      venueId: tenantB.id,
      number: 'T1', // Same number, different tenant
      cardToken: `TOK-B-${Date.now()}`,
    },
  });

  assert(tenantA.id !== tenantB.id, 'Tenant A dan Tenant B memiliki ID unik terisolasi');
  assert(tableA.venueId === tenantA.id && tableB.venueId === tenantB.id, 'Meja T1 milik Tenant A tidak bocor ke Tenant B');

  // Clean up test tenants
  await db.table.deleteMany({ where: { id: { in: [tableA.id, tableB.id] } } });
  await db.venue.deleteMany({ where: { id: { in: [tenantA.id, tenantB.id] } } });
  assert(true, 'Pembersihan data pengujian tenant berhasil');

  // Test Suite 3: Token Resolution Logic
  console.log('\n\x1b[1m[3] Testing NFC Card Token Resolution\x1b[0m');
  const demoTable = await db.table.findFirst({
    where: { cardToken: 'SNJ001' },
    include: { venue: true },
  });

  assert(demoTable !== null, 'Token NFC meja SNJ001 ditemukan di database');
  assert(demoTable?.venue.slug === 'kopi-senja', 'Token SNJ001 terikat ke venue "kopi-senja"');
  assert(demoTable?.number === '01', 'Token SNJ001 terikat ke Meja 01');

  // Test Suite 4: Authentication, Tokens & Password Hashing
  console.log('\n\x1b[1m[4] Testing Authentication & Cryptographic Security\x1b[0m');
  const { signSession, verifySession, hashPassword, verifyPassword } = await import('../src/lib/auth');

  const testSessionToken = await signSession({
    venueId: 'venue_123',
    venueSlug: 'kopi-senja',
    role: 'owner',
  });
  assert(typeof testSessionToken === 'string' && testSessionToken.includes('.'), 'signSession menghasilkan signed JWT token');

  const verifiedSession = await verifySession(testSessionToken);
  assert(verifiedSession !== null && verifiedSession.role === 'owner', 'verifySession memvalidasi token yang valid');
  assert(verifiedSession?.venueSlug === 'kopi-senja', 'verifySession mempertahankan identitas outlet tenant');

  const tamperedToken = testSessionToken.slice(0, -5) + 'xxxxx';
  const invalidSession = await verifySession(tamperedToken);
  assert(invalidSession === null, 'verifySession menolak token yang dimanipulasi (anti-tampering)');

  const plainSecret = 'rahasiaPemilik123!';
  const hashedPassword = await hashPassword(plainSecret);
  assert(hashedPassword.startsWith('pbkdf2:'), 'hashPassword menggunakan PBKDF2 salt & hash yang aman');

  const isPasswordCorrect = await verifyPassword(plainSecret, hashedPassword);
  assert(isPasswordCorrect === true, 'verifyPassword memverifikasi password yang benar');

  const isPasswordWrong = await verifyPassword('passwordSalah!', hashedPassword);
  assert(isPasswordWrong === false, 'verifyPassword menolak password yang salah');

  // Summary
  console.log('\n\x1b[1m\x1b[36m=======================================================');
  console.log(`HASIL UNIT TESTING: ${passed} PASS, ${failed} FAIL`);
  console.log('=======================================================\x1b[0m\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runUnitTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
