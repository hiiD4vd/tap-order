import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { parseBody, handleApiError } from '@/lib/api-auth';
import { createMenuItemSchema, updateMenuItemSchema, deleteMenuItemQuerySchema } from '@/lib/validation';

/**
 * Soft delete: hapus menu mengisi `deletedAt`, bukan DELETE.
 *
 * Alasan: audit log menunjuk id menu, laporan penjualan lama menyimpan
 * snapshot item, dan kasir sering salah tekan. Arsip bisa dipulihkan lewat
 * ?restore=<itemId>; menu terarsip tidak muncul di katalog tamu.
 */
const notDeleted = { deletedAt: null };

export async function POST(
  request: Request,
  { params }: { params: Promise<{ venueSlug: string }> }
) {
  try {
    const { requireAuth } = await import('@/lib/api-auth');
    const session = await requireAuth('owner', request);
    
    const { venueSlug } = await params;
    const body = await parseBody(request, createMenuItemSchema);
    const { categoryId, name, description, price, imageUrl, optionGroups = [] } = body;

    const venue = await db.venue.findUnique({ where: { slug: venueSlug, id: session.venueId } });
    if (!venue) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
    }

    const category = await db.category.findFirst({ where: { id: categoryId, venueId: venue.id, isActive: true } });
    if (!category) {
      return NextResponse.json({ error: 'Kategori tidak valid untuk outlet ini' }, { status: 400 });
    }

    const newItem = await db.menuItem.create({
      data: {
        venueId: venue.id,
        categoryId,
        name: name.trim(),
        description: description?.trim() || null,
        price,
        imageUrl: imageUrl || null,
        isAvailable: true,
        optionGroups: {
          create: optionGroups.map((g: any, gIdx: number) => ({
            name: g.name,
            type: g.type || 'single',
            required: !!g.required,
            sort: gIdx + 1,
            choices: {
              create: (g.choices || []).map((c: { name: string; priceDelta?: number }, cIdx: number) => ({
                name: c.name,
                priceDelta: c.priceDelta || 0,
                sort: cIdx + 1,
              })),
            },
          })),
        },
      },
      include: {
        optionGroups: {
          include: { choices: true },
        },
      },
    });

    await db.auditLog.create({
      data: {
        venueId: venue.id,
        action: 'CREATE_MENU_ITEM',
        details: JSON.stringify({ menuItemId: newItem.id, name: newItem.name, price: newItem.price }),
      },
    });

    return NextResponse.json({ success: true, item: newItem });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ venueSlug: string }> }
) {
  try {
    const { requireAuth } = await import('@/lib/api-auth');
    const session = await requireAuth('owner', request);
    
    const { searchParams } = new URL(request.url);
    const restoreId = searchParams.get('restore');

    // Pulihkan menu yang terarsip. Dilakukan sebelum parseBody karena
    // payload-nya kosong.
    if (restoreId) {
      const archived = await db.menuItem.findFirst({
        where: { id: restoreId, venueId: session.venueId, deletedAt: { not: null } },
      });
      if (!archived) {
        return NextResponse.json({ error: 'Menu terarsip tidak ditemukan' }, { status: 404 });
      }
      const restored = await db.menuItem.update({
        where: { id: restoreId },
        data: { deletedAt: null },
      });
      await db.auditLog.create({
        data: {
          venueId: session.venueId,
          action: 'RESTORE_MENU_ITEM',
          details: JSON.stringify({ menuItemId: restoreId, name: restored.name }),
        },
      });
      return NextResponse.json({ success: true, item: restored });
    }

    const body = await parseBody(request, updateMenuItemSchema);
    const { itemId, isAvailable, price, name, description } = body;

    // Verify item belongs to session venue and is not archived
    const item = await db.menuItem.findFirst({ where: { id: itemId, venueId: session.venueId, ...notDeleted } });
    if (!item) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const updateData: any = {};
    if (typeof isAvailable === 'boolean') updateData.isAvailable = isAvailable;
    if (typeof price === 'number') updateData.price = price;
    if (name) updateData.name = name.trim();
    if (typeof description === 'string') updateData.description = description.trim();

    const updated = await db.menuItem.update({
      where: { id: itemId },
      data: updateData,
    });

    await db.auditLog.create({
      data: {
        venueId: session.venueId,
        action: 'UPDATE_MENU_ITEM',
        details: JSON.stringify({ menuItemId: itemId, fields: Object.keys(updateData) }),
      },
    });

    return NextResponse.json({ success: true, item: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

/** Daftar menu terarsip, untuk halaman pemulihan. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ venueSlug: string }> }
) {
  try {
    const { requireAuth } = await import('@/lib/api-auth');
    const session = await requireAuth('owner');
    void (await params);

    const archived = await db.menuItem.findMany({
      where: { venueId: session.venueId, deletedAt: { not: null } },
      orderBy: { deletedAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({ success: true, items: archived });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ venueSlug: string }> }
) {
  try {
    const { requireAuth } = await import('@/lib/api-auth');
    const session = await requireAuth('owner', request);
    
    const { searchParams } = new URL(request.url);
    const parsedQuery = deleteMenuItemQuerySchema.safeParse({ itemId: searchParams.get('itemId') });
    if (!parsedQuery.success) {
      return NextResponse.json({ error: 'itemId tidak valid' }, { status: 400 });
    }
    const { itemId } = parsedQuery.data;

    // Verify item belongs to session venue and is still active
    const item = await db.menuItem.findFirst({ where: { id: itemId, venueId: session.venueId, ...notDeleted } });
    if (!item) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Arsipkan, jangan hapus: riwayat order dan audit log masih menunjuk id ini.
    await db.menuItem.update({
      where: { id: itemId },
      data: { deletedAt: new Date(), isAvailable: false },
    });
    await db.auditLog.create({
      data: {
        venueId: session.venueId,
        action: 'DELETE_MENU_ITEM',
        details: JSON.stringify({ menuItemId: itemId, name: item.name, softDelete: true }),
      },
    });
    return NextResponse.json({ success: true, message: 'Menu diarsipkan dan bisa dipulihkan' });
  } catch (error) {
    return handleApiError(error);
  }
}
