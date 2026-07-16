import { jsonResponse, handleOptions } from '../_helper';

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

  try {
    const body = await request.json() as any;
    const { username, password } = body;

    if (!username || !password) {
      return jsonResponse({ error: 'Username and password are required' }, 400);
    }

    // Check for hardcoded demo staff fallback
    if (username === 'demo_staff' && password === 'demo123') {
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
  } catch (error: any) {
    console.error('Error in /api/staff/login:', error);
    return jsonResponse({ error: 'Internal Server Error', message: error.message }, 500);
  }
}
