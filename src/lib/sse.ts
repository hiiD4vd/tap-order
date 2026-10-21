import { db } from '@/lib/db';

type SSEClient = {
  id: string;
  venueId: string;
  controller: ReadableStreamDefaultController;
};

/**
 * Broadcast event realtime ke kasir/dapur.
 *
 * Masalah lama: client disimpan di Set in-memory satu proses. Kasir di
 * replica A tidak menerima order yang dibuat di replica B, jadi replica
 * wajib 1.
 *
 * Sekarang tiap instance berlangganan channel Postgres LISTEN/NOTIFY, jadi
 * event menyebar ke semua instance tanpa broker tambahan (no Redis).
 *
 * ponytail: NOTIFY membawa payload penuh per event, dan tiap instance
 * membuka 1 koneksi khusus untuk LISTEN. Cukup untuk puluhan event/menit
 * per outlet; kalau nanti jadi ribuan, pindah ke Redis pub/sub atau
 * Postgres logical replication.
 */

const CHANNEL = 'taporder_events';
const RECONNECT_DELAY_MS = 2_000;

class SSEBroadcaster {
  private clients = new Set<SSEClient>();
  private listening = false;

  addClient(client: SSEClient) {
    this.clients.add(client);
    // Lazy start: jangan buka koneksi LISTEN kalau tidak ada yang menonton.
    void this.ensureListening();
  }

  removeClient(id: string) {
    for (const c of this.clients) {
      if (c.id === id) this.clients.delete(c);
    }
  }

  /**
   * Publikasikan event. Dipanggil dari route API, jadi harus selesai walau
   * pengirimnya di instance lain.
   */
  async broadcast(venueId: string, eventName: string, data: unknown) {
    const payload = JSON.stringify({ venueId, eventName, data });
    try {
      await db.$executeRaw`SELECT pg_notify(${CHANNEL}, ${payload})`;
    } catch (error) {
      // Jangan gagalkan request bisnis hanya karena notifikasi realtime gagal.
      console.error('SSE broadcast failed:', error);
    }
  }

  private deliver(venueId: string, eventName: string, data: unknown) {
    const encoded = new TextEncoder().encode(
      `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`,
    );
    for (const client of this.clients) {
      if (client.venueId !== venueId) continue;
      try {
        client.controller.enqueue(encoded);
      } catch {
        this.clients.delete(client);
      }
    }
  }

  private async ensureListening() {
    if (this.listening) return;
    this.listening = true;

    const connect = async (): Promise<void> => {
      try {
        // Koneksi khusus (bukan pool) karena LISTEN terikat pada session.
        // `pg` sudah tersedia lewat dependensi Prisma.
        const { Client } = await import('pg');
        const client = new Client({ connectionString: process.env.DATABASE_URL });

        client.on('notification', (msg) => {
          if (!msg.payload) return;
          try {
            const { venueId, eventName, data } = JSON.parse(msg.payload);
            this.deliver(venueId, eventName, data);
          } catch (error) {
            console.error('SSE payload parse failed:', error);
          }
        });

        client.on('error', async (error) => {
          console.error('SSE listener error, reconnecting:', error);
          this.listening = false;
          setTimeout(() => void this.ensureListening(), RECONNECT_DELAY_MS);
        });

        await client.connect();
        await client.query(`LISTEN ${CHANNEL}`);
      } catch (error) {
        console.error('SSE listener connect failed, retrying:', error);
        this.listening = false;
        setTimeout(() => void this.ensureListening(), RECONNECT_DELAY_MS);
      }
    };

    await connect();
  }
}

const globalForSSE = globalThis as unknown as { sseBroadcaster: SSEBroadcaster };

// Selalu pakai singleton global. Di produksi pun wajib sama: kalau bundle
// di-load ulang, dua broadcaster berarti dua koneksi LISTEN dan client
// lama tidak pernah menerima event.
export const sseBroadcaster = globalForSSE.sseBroadcaster || new SSEBroadcaster();
globalForSSE.sseBroadcaster = sseBroadcaster;
