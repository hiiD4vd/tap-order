type SSEClient = {
  id: string;
  venueId: string;
  controller: ReadableStreamDefaultController;
};

class SSEBroadcaster {
  private clients: Set<SSEClient> = new Set();

  addClient(client: SSEClient) {
    this.clients.add(client);
  }

  removeClient(id: string) {
    this.clients.forEach((c) => {
      if (c.id === id) {
        this.clients.delete(c);
      }
    });
  }

  broadcast(venueId: string, eventName: string, data: any) {
    const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
    const encoder = new TextEncoder();
    const encoded = encoder.encode(payload);

    this.clients.forEach((client) => {
      if (client.venueId === venueId) {
        try {
          client.controller.enqueue(encoded);
        } catch {
          this.clients.delete(client);
        }
      }
    });
  }
}

const globalForSSE = globalThis as unknown as { sseBroadcaster: SSEBroadcaster };

export const sseBroadcaster = globalForSSE.sseBroadcaster || new SSEBroadcaster();
if (process.env.NODE_ENV !== 'production') globalForSSE.sseBroadcaster = sseBroadcaster;
