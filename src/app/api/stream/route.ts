import { NextRequest } from 'next/server';
import { sseBroadcaster } from '@/lib/sse';

export async function GET(request: NextRequest) {
  try {
    const { requireAuth } = await import('@/lib/api-auth');
    const session = await requireAuth(request, 'cashier'); // cashier or kitchen only
    
    const { searchParams } = new URL(request.url);
    const venueId = searchParams.get('venueId');

    if (!venueId) {
      return new Response('venueId parameter is required', { status: 400 });
    }

    // Verify venueId matches session
    if (venueId !== session.venueId) {
      return new Response('Unauthorized', { status: 403 });
    }

    const clientId = crypto.randomUUID();
    const encoder = new TextEncoder();
    // Proxy/CDN sering memutus koneksi SSE yang diam. Comment heartbeat tidak
    // mengubah event UI, tapi menjaga koneksi tetap hidup.
    let heartbeat: ReturnType<typeof setInterval> | undefined;

    const stream = new ReadableStream({
      start(controller) {
        sseBroadcaster.addClient({
          id: clientId,
          venueId,
          controller,
        });

        controller.enqueue(
          encoder.encode(`event: CONNECTED\ndata: ${JSON.stringify({ clientId, timestamp: Date.now() })}\n\n`)
        );
        heartbeat = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(`: heartbeat ${Date.now()}\n\n`));
          } catch {
            if (heartbeat) clearInterval(heartbeat);
            sseBroadcaster.removeClient(clientId);
          }
        }, 25_000);
      },
      cancel() {
        if (heartbeat) clearInterval(heartbeat);
        sseBroadcaster.removeClient(clientId);
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error: any) {
    return new Response(error.message || 'Unauthorized', { status: 401 });
  }
}
