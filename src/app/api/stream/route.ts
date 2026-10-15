import { NextRequest } from 'next/server';
import { sseBroadcaster } from '@/lib/sse';

export async function GET(request: NextRequest) {
  try {
    const { requireAuth } = await import('@/lib/api-auth');
    const session = await requireAuth('cashier'); // cashier or kitchen only
    
    const { searchParams } = new URL(request.url);
    const venueId = searchParams.get('venueId');

    if (!venueId) {
      return new Response('venueId parameter is required', { status: 400 });
    }

    // Verify venueId matches session
    if (venueId !== session.venueId) {
      return new Response('Unauthorized', { status: 403 });
    }

    const clientId = Math.random().toString(36).substring(2, 9);

    const stream = new ReadableStream({
      start(controller) {
        sseBroadcaster.addClient({
          id: clientId,
          venueId,
          controller,
        });

        const encoder = new TextEncoder();
        controller.enqueue(
          encoder.encode(`event: CONNECTED\ndata: ${JSON.stringify({ clientId, timestamp: Date.now() })}\n\n`)
        );
      },
      cancel() {
        sseBroadcaster.removeClient(clientId);
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (error: any) {
    return new Response(error.message || 'Unauthorized', { status: 401 });
  }
}
