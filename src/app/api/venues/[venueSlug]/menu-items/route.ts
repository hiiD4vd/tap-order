import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { parseBody, handleApiError } from '@/lib/api-auth';
import { createMenuItemSchema, updateMenuItemSchema, deleteMenuItemQuerySchema } from '@/lib/validation';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ venueSlug: string }> }
) {
  try {
    const { requireAuth } = await import('@/lib/api-auth');
    const session = await requireAuth('owner');
    
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
    const session = await requireAuth('owner');
    
    const body = await parseBody(request, updateMenuItemSchema);
    const { itemId, isAvailable, price, name, description } = body;

    // Verify item belongs to session venue
    const item = await db.menuItem.findUnique({ where: { id: itemId } });
    if (!item || item.venueId !== session.venueId) {
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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ venueSlug: string }> }
) {
  try {
    const { requireAuth } = await import('@/lib/api-auth');
    const session = await requireAuth('owner');
    
    const { searchParams } = new URL(request.url);
    const parsedQuery = deleteMenuItemQuerySchema.safeParse({ itemId: searchParams.get('itemId') });
    if (!parsedQuery.success) {
      return NextResponse.json({ error: 'itemId tidak valid' }, { status: 400 });
    }
    const { itemId } = parsedQuery.data;

    // Verify item belongs to session venue
    const item = await db.menuItem.findUnique({ where: { id: itemId } });
    if (!item || item.venueId !== session.venueId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await db.menuItem.delete({ where: { id: itemId } });
    await db.auditLog.create({
      data: {
        venueId: session.venueId,
        action: 'DELETE_MENU_ITEM',
        details: JSON.stringify({ menuItemId: itemId }),
      },
    });
    return NextResponse.json({ success: true, message: 'Menu berhasil dihapus' });
  } catch (error) {
    return handleApiError(error);
  }
}
