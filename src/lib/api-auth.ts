import { cookies } from 'next/headers';
import { verifySession, type SessionPayload } from './auth';
import { assertSameOrigin } from './csrf';
import type { z } from 'zod';

/**
 * Validate and parse a JSON request body against a Zod schema.
 * Throws a 400 error with field-level details on validation failure.
 */
export async function parseBody<T extends z.ZodType>(
  request: Request,
  schema: T,
  maxBytes = 256 * 1024
): Promise<z.infer<T>> {
  const declaredLength = Number(request.headers.get('content-length') || 0);
  if (declaredLength > maxBytes) {
    throw Object.assign(new Error('Ukuran request terlalu besar'), { status: 413 });
  }

  let raw: unknown;
  try {
    if (!request.body) throw new Error('missing body');
    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw Object.assign(new Error('Ukuran request terlalu besar'), { status: 413 });
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    raw = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch (error) {
    if ((error as { status?: number })?.status === 413) throw error;
    throw Object.assign(new Error('Body harus berupa JSON yang valid'), { status: 400 });
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    const details = result.error.issues
      .map((i) => `${i.path.join('.') || 'body'}: ${i.message}`)
      .join('; ');
    throw Object.assign(
      new Error(`Validasi gagal: ${details}`),
      { status: 400 }
    );
  }
  return result.data;
}

/**
 * Require authentication for API routes.
 * Throws if no session or role mismatch.
 *
 * @param requiredRole - Optional role requirement ('owner' | 'cashier')
 * @param request - Wajib diberikan oleh handler mutasi (POST/PATCH/DELETE).
 *   Origin harus sama persis dengan canonical app origin; absen/null ditolak.
 *   Handler GET boleh mengabaikannya karena tidak punya side effect.
 * @returns SessionPayload if valid
 * @throws Error with status-appropriate message
 */
export async function requireAuth(
  requiredRole?: 'owner' | 'cashier',
  request?: Request
): Promise<SessionPayload> {
  if (request && request.method !== 'GET' && request.method !== 'HEAD') {
    assertSameOrigin(request);
  }

  const cookieStore = await cookies();
  const token = cookieStore.get('tap_session')?.value;
  
  const session = await verifySession(token);
  
  if (!session) {
    throw Object.assign(
      new Error('Unauthorized: No valid session'),
      { status: 401 }
    );
  }
  
  // Owner can access everything
  if (session.role === 'owner') {
    // Owner-only routes are the billing boundary. Cashier/kitchen keep working
    // on an expired trial so a busy service never stops mid-shift.
    if (requiredRole === 'owner') {
      const { assertSubscriptionActive } = await import('./subscription');
      await assertSubscriptionActive(session.venueId);
    }
    return session;
  }
  
  // Check role match
  if (requiredRole && session.role !== requiredRole) {
    throw Object.assign(
      new Error(`Forbidden: Requires ${requiredRole} role`),
      { status: 403 }
    );
  }
  
  return session;
}

/**
 * Handle API errors uniformly.
 * Use in catch blocks to return proper HTTP responses.
 */
export function handleApiError(error: unknown): Response {
  if (error instanceof Error) {
    const status = (error as any).status || 500;
    return Response.json(
      { 
        success: false, 
        error: error.message 
      },
      { status }
    );
  }
  
  return Response.json(
    { success: false, error: 'Internal server error' },
    { status: 500 }
  );
}
