import { z } from 'zod';

/**
 * Shared validation schemas for API routes.
 * Using Zod to reject malformed/malicious payloads before they hit the DB.
 */

// ---------- Primitives ----------
export const cuidLike = z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/);

export const shortText = (max = 200) => z.string().trim().min(1).max(max);

export const nonNegInt = z.coerce.number().int().min(0).max(100_000_000);

// ---------- /api/login ----------
export const loginSchema = z.object({
  identifier: z.string().trim().min(1).max(120).optional(),
  slug: z.string().trim().min(1).max(120).optional(),
  password: z.string().min(1).max(200).optional(),
  pin: z.union([z.string().regex(/^\d{4,8}$/), z.number().int().min(1000).max(99_999_999)]).optional(),
  type: z.enum(['owner', 'cashier']).optional(),
}).strict().refine((d) => d.identifier || d.slug, {
  message: 'Identifier (slug atau email) wajib diisi',
  path: ['identifier'],
}).refine((d) => d.type !== 'cashier' || d.pin !== undefined, {
  message: 'PIN Kasir wajib diisi',
  path: ['pin'],
}).refine((d) => d.type === 'cashier' || Boolean(d.password), {
  message: 'Password wajib diisi',
  path: ['password'],
});

// ---------- /api/register ----------
export const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z.string().trim().min(2).max(50).regex(/^[a-z0-9-]+$/),
  phone: z.string().trim().max(30).optional(),
  whatsapp: z.string().trim().max(30).optional(),
  address: z.string().trim().max(300).optional(),
  tablesCount: z.coerce.number().int().min(1).max(50).optional(),
  pinCashier: z.string().regex(/^\d{4,8}$/, 'PIN Kasir wajib 4-8 digit'),
  ownerEmail: z.string().trim().email().max(120).optional(),
  password: z.string().min(10).max(200),
}).strict();

export const registerExtraSchema = z.object({
  pinCashier: z.string().regex(/^\d{4,8}$/, 'PIN Kasir harus 4-8 digit').optional(),
  pinManager: z.string().regex(/^\d{4,8}$/, 'PIN Manager harus 4-8 digit').optional(),
});

// ---------- /api/orders (POST) ----------
export const selectedOptionSchema = z.object({
  group: z.string().trim().min(1).max(80),
  choice: z.string().trim().min(1).max(80),
  priceDelta: z.number().int().min(-100_000).max(100_000),
});

export const orderItemSchema = z.object({
  menuItemId: cuidLike,
  quantity: z.coerce.number().int().min(1).max(99),
  notes: z.string().trim().max(300).optional(),
  selectedOptions: z.array(selectedOptionSchema).max(20).optional(),
});

export const createOrderSchema = z.object({
  tableId: cuidLike.nullable().optional(),
  // Capability dari NFC scan. Legacy kartu pendek tetap didukung saat migrasi.
  cardToken: z.string().trim().min(1).max(128).optional(),
  venueId: cuidLike,
  customerName: z.string().trim().max(80).optional(),
  customerNote: z.string().trim().max(300).optional(),
  items: z.array(orderItemSchema).min(1, 'Keranjang tidak boleh kosong').max(50),
}).strict();

// ---------- /api/orders/[orderId] (PATCH) ----------
export const updateOrderSchema = z.object({
  status: z.enum(['pending', 'preparing', 'served', 'completed', 'cancelled']).optional(),
  isPaid: z.boolean().optional(),
  paymentMethod: z.enum(['cash', 'qris', 'card', 'transfer']).optional(),
  cancelledReason: z.string().trim().max(200).optional(),
  newTableId: cuidLike.optional(),
}).passthrough();

// ---------- /api/requests ----------
export const createRequestSchema = z.object({
  venueId: cuidLike,
  tableId: cuidLike,
  // Table capability from NFC URL; blocks forged waiter/bill requests.
  cardToken: z.string().trim().min(1).max(128),
  // `bill` dipertahankan untuk outlet yang masih bayar di akhir.
  type: z.enum(['waiter', 'bill', 'tissue', 'water', 'condiment', 'clean']).optional(),
}).passthrough();

// ---------- /api/feedback (tamu, anonim) ----------
export const createFeedbackSchema = z.object({
  venueId: cuidLike,
  cardToken: z.string().trim().min(1).max(128),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  message: z.string().trim().min(3).max(1000),
}).strict();

export const resolveRequestSchema = z.object({
  requestId: cuidLike,
  status: z.enum(['resolved', 'dismissed']).optional(),
}).strict();

// ---------- /api/venues/[slug]/tables ----------
export const createTableSchema = z.object({
  number: shortText(20),
  label: z.string().trim().max(60).optional(),
}).passthrough();

export const deleteTableQuerySchema = z.object({
  tableId: cuidLike,
});

// ---------- /api/venues/[slug]/categories ----------
export const createCategorySchema = z.object({
  name: shortText(80),
  sort: z.coerce.number().int().min(-1000).max(1000).optional(),
}).passthrough();

export const deleteCategoryQuerySchema = z.object({
  categoryId: cuidLike,
});

// ---------- /api/venues/[slug]/menu-items ----------
export const choiceSchema = z.object({
  name: shortText(80),
  priceDelta: z.coerce.number().int().min(-100_000).max(100_000).optional(),
});

export const optionGroupSchema = z.object({
  name: shortText(80),
  type: z.enum(['single', 'multiple']).optional(),
  required: z.boolean().optional(),
  choices: z.array(choiceSchema).max(30),
});

export const createMenuItemSchema = z.object({
  categoryId: cuidLike,
  name: shortText(120),
  description: z.string().trim().max(500).optional(),
  price: nonNegInt,
  imageUrl: z.string().trim().url().max(500).optional().or(z.literal('')),
  optionGroups: z.array(optionGroupSchema).max(15).optional(),
}).passthrough();

export const updateMenuItemSchema = z.object({
  itemId: cuidLike,
  isAvailable: z.boolean().optional(),
  price: nonNegInt.optional(),
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(500).optional(),
}).passthrough();

export const deleteMenuItemQuerySchema = z.object({
  itemId: cuidLike,
});

// ---------- /api/venues/[slug]/settings ----------
export const settingsSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  phone: z.string().trim().max(30).optional(),
  whatsapp: z.string().trim().max(30).optional(),
  address: z.string().trim().max(300).optional(),
  logoUrl: z.string().trim().url().max(500).optional().or(z.literal('')),
  qrisImageUrl: z.string().trim().url().max(500).optional().or(z.literal('')),
  // --- Table hub ---
  wifiSsid: z.string().trim().max(64).optional().or(z.literal('')),
  wifiPassword: z.string().trim().max(64).optional().or(z.literal('')),
  gmapsReviewUrl: z.string().trim().url().max(500).optional().or(z.literal('')),
  instagramUrl: z.string().trim().url().max(500).optional().or(z.literal('')),
  announcement: z.string().trim().max(200).optional().or(z.literal('')),
  currency: z.enum(['IDR', 'USD', 'PHP', 'VND', 'THB']).optional(),
  taxRate: z.coerce.number().min(0).max(100).optional(),
  serviceRate: z.coerce.number().min(0).max(100).optional(),
  isOpen: z.boolean().optional(),
  pinCashier: z.string().regex(/^\d{4,8}$/, 'PIN Kasir harus 4-8 digit').optional(),
  pinManager: z.string().regex(/^\d{4,8}$/, 'PIN Manager harus 4-8 digit').optional(),
}).passthrough();
