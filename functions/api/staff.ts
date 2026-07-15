import { verifySession, jsonResponse, handleOptions } from './_helper';

// Hash function matching frontend
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

  const url = new URL(request.url);
  const path = url.pathname;
  const db = env.DB;

  try {
    // 1. LOGIN STAFF (Public endpoint)
    if (path.endsWith('/api/staff/login') && request.method === 'POST') {
      const body = await request.json() as any;
      const { username, password } = body;

      if (!username || !password) {
        return jsonResponse({ error: 'Username and password are required' }, 400);
      }

      // Check for hardcoded demo staff fallback
      if (username === 'demo_staff' && password === 'demo123') {
        // Generate temporary demo session
        const sessionToken = `demo_session_${crypto.randomUUID()}`;
        const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours
        await db.prepare(
          'INSERT INTO sessions (token, userId, role, restaurantId, createdAt, expiresAt) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(sessionToken, 'demo', 'staff', 'rest_demo', new Date().toISOString(), expires).run();

        return jsonResponse({
          token: sessionToken,
          restaurantId: 'rest_demo',
          ownerId: 'demo'
        });
      }

      const hash = await hashCredentials(username, password);

      // Query staff accounts table
      const staffAccount = await db.prepare(
        'SELECT * FROM staff_accounts WHERE hash = ?'
      ).bind(hash).first();

      if (!staffAccount) {
        return jsonResponse({ error: 'Username atau Password staff salah.' }, 401);
      }

      if (staffAccount.staffActive === 0) {
        return jsonResponse({ error: 'Akun staff telah dinonaktifkan oleh pemilik usaha.' }, 403);
      }

      // Generate Session Token
      const sessionToken = crypto.randomUUID();
      const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 Days
      await db.prepare(
        'INSERT INTO sessions (token, userId, role, restaurantId, createdAt, expiresAt) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(sessionToken, staffAccount.ownerId, 'staff', staffAccount.restaurantId, new Date().toISOString(), expires).run();

      return jsonResponse({
        token: sessionToken,
        restaurantId: staffAccount.restaurantId,
        ownerId: staffAccount.ownerId
      });
    }

    // AUTHENTICATED ENDPOINTS (Owner-only)
    const session = await verifySession(request, db);
    if (!session || session.role !== 'owner') {
      return jsonResponse({ error: 'Unauthorized or not an owner' }, 401);
    }

    const restaurantId = session.restaurantId;
    const ownerId = session.userId;

    // 2. SETUP CREDENTIALS
    if (path.endsWith('/api/staff/setup') && request.method === 'POST') {
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
    }

    // 3. TOGGLE STAFF ACTIVE STATUS
    if (path.endsWith('/api/staff/toggle') && request.method === 'POST') {
      const body = await request.json() as any;
      const { active } = body;

      if (active === undefined) {
        return jsonResponse({ error: 'Active status is required' }, 400);
      }

      const activeVal = active ? 1 : 0;

      // Update in staff_accounts
      const rest = await db.prepare(
        'SELECT staffHash FROM restaurants WHERE id = ?'
      ).bind(restaurantId).first();

      const hash = rest ? rest.staffHash : '';

      if (hash) {
        await db.prepare(
          'UPDATE staff_accounts SET staffActive = ? WHERE hash = ?'
        ).bind(activeVal, hash).run();
      }

      // Update in restaurants
      await db.prepare(
        'UPDATE restaurants SET staffActive = ? WHERE id = ?'
      ).bind(activeVal, restaurantId).run();

      return jsonResponse({ success: true });
    }

    return jsonResponse({ error: 'Endpoint not found' }, 404);

  } catch (error: any) {
    console.error('Error in /api/staff:', error);
    return jsonResponse({ error: 'Internal Server Error', message: error.message }, 500);
  }
}
