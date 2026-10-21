import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { parseBody, handleApiError, requireAuth } from '@/lib/api-auth';
import { settingsSchema } from '@/lib/validation';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ venueSlug: string }> }
) {
  try {
    const { venueSlug } = await params;
    const session = await requireAuth('owner');
    const body = await parseBody(request, settingsSchema);
    const { name, whatsapp, phone, address, logoUrl, currency, pinCashier, taxRate, serviceRate, qrisImageUrl, isOpen } = body;

    const venue = await db.venue.findUnique({ where: { slug: venueSlug, id: session.venueId } });
    if (!venue) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (name) updateData.name = name.trim();
    if (whatsapp) updateData.whatsapp = whatsapp.trim();
    if (phone) updateData.phone = phone.trim();
    if (typeof address === 'string') updateData.address = address.trim();
    if (typeof logoUrl !== 'undefined') updateData.logoUrl = logoUrl?.trim() || null;
    if (currency) updateData.currency = currency;
    if (pinCashier) updateData.pinCashier = pinCashier.trim();
    if (typeof taxRate !== 'undefined') updateData.taxRate = taxRate;
    if (typeof serviceRate !== 'undefined') updateData.serviceRate = serviceRate;
    if (typeof qrisImageUrl !== 'undefined') updateData.qrisImageUrl = qrisImageUrl?.trim() || null;
    if (typeof isOpen === 'boolean') updateData.isOpen = isOpen;

    const updated = await db.venue.update({
      where: { slug: venueSlug },
      data: updateData,
    });

    await db.auditLog.create({
      data: {
        venueId: venue.id,
        action: 'UPDATE_SETTINGS',
        details: JSON.stringify({ fields: Object.keys(updateData) }),
      },
    });

    const safeVenue = await db.venue.findUnique({
      where: { id: updated.id },
      select: { id: true, slug: true, name: true, phone: true, whatsapp: true, address: true, logoUrl: true, currency: true, taxRate: true, serviceRate: true, qrisImageUrl: true, isOpen: true },
    });

    return NextResponse.json({
      success: true,
      venue: safeVenue,
      message: 'Pengaturan outlet berhasil disimpan!',
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    return handleApiError(error);
  }
}
