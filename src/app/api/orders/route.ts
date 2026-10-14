import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sseBroadcaster } from '@/lib/sse';
import { parseBody, handleApiError } from '@/lib/api-auth';
import { createOrderSchema } from '@/lib/validation';
import { checkRateLimit, getClientKey, rateLimitResponse } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    const orderLimit = checkRateLimit(getClientKey(request, 'order'), 10, 60 * 1000);
    if (!orderLimit.allowed) return rateLimitResponse(orderLimit.retryAfter);

    const body = await parseBody(request, createOrderSchema);
    const { venueId, tableId, customerName, customerNote, items } = body;

    // 1. Fetch venue to check store status and tax rates
    const venue = await db.venue.findUnique({ where: { id: venueId } });
    if (!venue) {
      return NextResponse.json({ error: 'Outlet tidak ditemukan' }, { status: 404 });
    }
    if (tableId) {
      const table = await db.table.findFirst({ where: { id: tableId, venueId } });
      if (!table || !table.isActive) {
        return NextResponse.json({ error: 'Meja tidak valid untuk outlet ini' }, { status: 400 });
      }
    }
    if (venue.isOpen === false) {
      return NextResponse.json(
        { error: 'Maaf, outlet/dapur saat ini sedang tutup. Pemesanan tidak dapat diproses.' },
        { status: 400 }
      );
    }

    // 2. Fetch menu items to verify server-side prices
    const itemIds = items.map((i: any) => i.menuItemId).filter(Boolean);
    const dbMenuItems = await db.menuItem.findMany({
      where: { id: { in: itemIds }, venueId },
      include: {
        optionGroups: {
          include: { choices: true },
        },
      },
    });

    const menuMap = new Map(dbMenuItems.map((m) => [m.id, m]));

    // 3. Calculate accurate total server-side
    let calculatedSubtotal = 0;
    const verifiedItems: any[] = [];

    for (const it of items) {
      const dbItem = menuMap.get(it.menuItemId);
      if (!dbItem) continue;

      if (!dbItem.isAvailable) {
        return NextResponse.json(
          { error: `Maaf, menu "${dbItem.name}" sedang habis.` },
          { status: 400 }
        );
      }

      let itemUnitPrice = dbItem.price;
      const selectedOptions = Array.isArray(it.selectedOptions) ? it.selectedOptions : [];
      const verifiedOptions: { group: string; choice: string; priceDelta: number }[] = [];
      const seenOptions = new Set<string>();

      // Never trust client-supplied option prices; resolve names and prices from DB.
      for (const selected of selectedOptions) {
        const optionKey = `${selected.group}\u0000${selected.choice}`;
        if (seenOptions.has(optionKey)) {
          return NextResponse.json({ error: 'Pilihan menu duplikat' }, { status: 400 });
        }
        seenOptions.add(optionKey);
        const group = dbItem.optionGroups.find((g) => g.name === selected.group);
        const choice = group?.choices.find((c) => c.name === selected.choice);
        if (!group || !choice) {
          return NextResponse.json({ error: 'Pilihan menu tidak valid' }, { status: 400 });
        }
        itemUnitPrice += choice.priceDelta;
        verifiedOptions.push({ group: group.name, choice: choice.name, priceDelta: choice.priceDelta });
      }

      for (const group of dbItem.optionGroups) {
        if (group.required && !verifiedOptions.some((o) => o.group === group.name)) {
          return NextResponse.json({ error: `Pilihan ${group.name} wajib diisi` }, { status: 400 });
        }
        if (group.type === 'single' && verifiedOptions.filter((o) => o.group === group.name).length > 1) {
          return NextResponse.json({ error: `Pilih satu opsi untuk ${group.name}` }, { status: 400 });
        }
      }

      const qty = it.quantity;
      calculatedSubtotal += itemUnitPrice * qty;

      verifiedItems.push({
        menuItemId: dbItem.id,
        nameSnapshot: dbItem.name,
        priceSnapshot: itemUnitPrice,
        quantity: qty,
        notes: it.notes || null,
        selectedOptions: verifiedOptions.length ? JSON.stringify(verifiedOptions) : null,
      });
    }

    if (verifiedItems.length === 0) {
      return NextResponse.json(
        { error: 'Tidak ada item pesanan yang valid' },
        { status: 400 }
      );
    }

    // Compute Tax & Service Charge
    const subtotal = calculatedSubtotal;
    const taxAmount = Math.round((subtotal * (venue.taxRate || 0)) / 100);
    const serviceAmount = Math.round((subtotal * (venue.serviceRate || 0)) / 100);
    const totalAmount = subtotal + taxAmount + serviceAmount;

    // 4. Generate sequential order number for today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todayOrderCount = await db.order.count({
      where: {
        venueId,
        createdAt: { gte: startOfToday },
      },
    });

    const orderNumber = `#${todayOrderCount + 101}`;

    // 5. Save Order in Transaction
    const newOrder = await db.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          venueId,
          tableId: tableId || null,
          orderNumber,
          customerName: customerName || null,
          customerNote: customerNote || null,
          subtotal,
          taxAmount,
          serviceAmount,
          totalAmount,
          status: 'pending',
          paymentMethod: 'cashier',
          isPaid: false,
          paidAt: null,
          items: {
            create: verifiedItems,
          },
        },
        include: {
          items: true,
          table: true,
        },
      });

      // Update table status to active
      if (tableId) {
        await tx.table.update({
          where: { id: tableId },
          data: { status: 'active' },
        });
      }

      return order;
    });

    // 5. Broadcast Realtime SSE to Cashier Screen!
    sseBroadcaster.broadcast(venueId, 'NEW_ORDER', {
      order: newOrder,
      message: `Pesanan Baru ${newOrder.orderNumber} dari ${newOrder.table ? 'Meja ' + newOrder.table.number : 'Pelanggan'}`,
    });

    return NextResponse.json({
      success: true,
      order: newOrder,
      message: 'Pesanan berhasil dikirim ke kasir!',
    });
  } catch (error) {
    console.error('Error creating order:', error);
    return handleApiError(error);
  }
}

export async function GET(request: Request) {
  try {
    const { requireAuth, handleApiError } = await import('@/lib/api-auth');
    const session = await requireAuth(); // Require cashier/owner login
    
    const { searchParams } = new URL(request.url);
    const venueSlug = searchParams.get('venueSlug');
    const venueId = searchParams.get('venueId');
    const status = searchParams.get('status');
    const tableId = searchParams.get('tableId');

    const where: any = {};

    // ALWAYS filter by session venueId for multi-tenant isolation
    where.venueId = session.venueId;
    
    // Ignore venueId/venueSlug params — always use session
    if (venueSlug || venueId) {
      const paramVenueId = venueId || (await db.venue.findUnique({ where: { slug: venueSlug! } }))?.id;
      if (paramVenueId !== session.venueId) {
        return NextResponse.json({ error: 'Unauthorized venue access' }, { status: 403 });
      }
    }

    if (status) {
      if (status.includes(',')) {
        where.status = { in: status.split(',').map((s) => s.trim()) };
      } else {
        where.status = status;
      }
    }

    if (tableId) {
      where.tableId = tableId;
    }

    const orders = await db.order.findMany({
      where,
      include: {
        items: true,
        table: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // Omset TIDAK boleh dihitung dari 100 order teratas — warung sibuk bisa
    // lewat 100 order/hari dan laporan jadi undercount. Agregat di DB.
    const [paidAgg, cashAgg, qrisAgg] = await Promise.all([
      db.order.aggregate({
        where: { ...where, OR: [{ isPaid: true }, { status: 'completed' }] },
        _sum: { totalAmount: true },
        _count: true,
      }),
      db.order.aggregate({
        where: { ...where, OR: [{ isPaid: true }, { status: 'completed' }], paymentMethod: 'cash' },
        _sum: { totalAmount: true },
      }),
      db.order.aggregate({
        where: { ...where, OR: [{ isPaid: true }, { status: 'completed' }], paymentMethod: 'qris' },
        _sum: { totalAmount: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      orders,
      summary: {
        paidCount: paidAgg._count,
        paidRevenue: paidAgg._sum.totalAmount || 0,
        cashRevenue: cashAgg._sum.totalAmount || 0,
        qrisRevenue: qrisAgg._sum.totalAmount || 0,
      },
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    const { handleApiError } = await import('@/lib/api-auth');
    return handleApiError(error);
  }
}
