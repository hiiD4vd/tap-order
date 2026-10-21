import { strict as assert } from 'node:assert';
import { checkRateLimit } from '../src/lib/rate-limit';
import { createOrderSchema, createRequestSchema } from '../src/lib/validation';
import { isSubscriptionExpired } from '../src/lib/subscription';
import { db } from '../src/lib/db';

async function main() {
  // Rate limit sekarang tersimpan di DB (bukan Map), jadi harus async.
  const key = `test-${Date.now()}`;
  for (let i = 0; i < 3; i++) {
    assert.equal((await checkRateLimit(key, 3, 60_000)).allowed, true);
  }
  assert.equal((await checkRateLimit(key, 3, 60_000)).allowed, false);

  // Bukti persistensi: bucket ada di tabel, bukan di memori proses.
  const row = await db.rateLimitBucket.findUnique({ where: { key } });
  assert.ok(row, 'bucket rate limit harus tersimpan di database');
  assert.equal(row!.count, 4);
  await db.rateLimitBucket.delete({ where: { key } });

  assert.equal(createOrderSchema.safeParse({ venueId: 'venue1', items: [] }).success, false);
  assert.equal(createRequestSchema.safeParse({ venueId: 'venue1', tableId: 'table1', type: 'bad' }).success, false);
  assert.equal(createRequestSchema.safeParse({ venueId: 'venue1', tableId: 'table1', type: 'waiter' }).success, true);

  // Langganan: tanpa expiresAt = permanen, masa depan = aktif, masa lalu = kedaluwarsa.
  const now = new Date('2026-06-01T00:00:00Z').getTime();
  assert.equal(isSubscriptionExpired(null, now), false);
  assert.equal(isSubscriptionExpired(new Date('2026-06-02T00:00:00Z'), now), false);
  assert.equal(isSubscriptionExpired(new Date('2026-05-31T00:00:00Z'), now), true);

  console.log('security checks: PASS');
  await db.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await db.$disconnect();
  process.exit(1);
});
