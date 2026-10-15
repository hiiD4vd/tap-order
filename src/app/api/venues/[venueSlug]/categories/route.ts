import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { parseBody, handleApiError } from '@/lib/api-auth';
import { createCategorySchema, deleteCategoryQuerySchema } from '@/lib/validation';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ venueSlug: string }> }
) {
  try {
    const { requireAuth } = await import('@/lib/api-auth');
    const session = await requireAuth('owner');
    
    const { venueSlug } = await params;
    const body = await parseBody(request, createCategorySchema);
    const { name, sort = 0 } = body;

    const venue = await db.venue.findUnique({ where: { slug: venueSlug, id: session.venueId } });
    if (!venue) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
    }

    const newCat = await db.category.create({
      data: {
        venueId: venue.id,
        name: name.trim(),
        sort: sort || 0,
      },
    });

    return NextResponse.json({ success: true, category: newCat });
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
    const parsedQuery = deleteCategoryQuerySchema.safeParse({ categoryId: searchParams.get('categoryId') });
    if (!parsedQuery.success) {
      return NextResponse.json({ error: 'categoryId tidak valid' }, { status: 400 });
    }
    const { categoryId } = parsedQuery.data;

    // Verify category belongs to session venue
    const category = await db.category.findUnique({ where: { id: categoryId } });
    if (!category || category.venueId !== session.venueId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await db.category.delete({ where: { id: categoryId } });
    return NextResponse.json({ success: true, message: 'Kategori berhasil dihapus' });
  } catch (error) {
    return handleApiError(error);
  }
}
