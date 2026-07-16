import { verifySession, jsonResponse, handleOptions } from '../_helper';

async function hashCredentials(username: string, password: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(`${username.trim().toLowerCase()}:${password}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequest(context: any): Promise<Response> {
  const { request, env } = context;

  const corsResponse = handleOptions(request);
  if (corsResponse) return corsResponse;

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const db = env.DB;
  const session = await verifySession(request, db);
  if (!session || session.role !== 'owner') {
    return jsonResponse({ error: 'Unauthorized or not an owner' }, 401);
  }

  const restaurantId = session.restaurantId;
  const ownerId = session.userId;

  try {
    const body = await request.json() as any;
    const { username, password } = body;

    if (!username || !password) {
      return jsonResponse({ error: 'Username and password are required' }, 400);
    }

    const hash = await hashCredentials(username, password);
    const updatedAtIso = new Date().toISOString();

    // Get old hash if exists
    const rest = await db.prepare(
      'SELECT staffHash FROM restaurants WHERE id = ?'
    ).bind(restaurantId).first();

    const oldHash = rest ? rest.staffHash : '';

    // Delete old staff account if hash changed
    if (oldHash && oldHash !== hash) {
      await db.prepare('DELETE FROM staff_accounts WHERE hash = ?').bind(oldHash).run();
    }

    // Insert/Update staff account mapping
    await db.prepare(
      `INSERT OR REPLACE INTO staff_accounts (hash, restaurantId, ownerId, staffActive) 
       VALUES (?, ?, ?, 1)`
    ).bind(hash, restaurantId, ownerId).run();

    // Update restaurant details
    await db.prepare(
      `UPDATE restaurants SET 
        staffUsername = ?, staffPassword = ?, staffHash = ?, 
        staffActive = 1, staffUpdatedAt = ? 
       WHERE id = ?`
    ).bind(username, password, hash, updatedAtIso, restaurantId).run();

    return jsonResponse({ success: true });
  } catch (error: any) {
    console.error('Error in /api/staff/setup:', error);
    return jsonResponse({ error: 'Internal Server Error', message: error.message }, 500);
  }
}
