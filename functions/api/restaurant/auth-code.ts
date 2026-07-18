import { verifySession, jsonResponse, handleOptions } from '../_helper';

export async function onRequest(context: any): Promise<Response> {
  const { request, env } = context;

  const corsResponse = handleOptions(request);
  if (corsResponse) return corsResponse;

  const db = env.DB;
  const session = await verifySession(request, db);
  if (!session) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  // Only allow owners to generate authorization codes
  if (session.role !== 'owner') {
    return jsonResponse({ error: 'Forbidden: Owner role required' }, 403);
  }

  const restaurantId = session.restaurantId;

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method Not Allowed' }, 405);
  }

  try {
    // Generate a secure 6-character code excluding confusing characters (0, O, 1, I)
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes from now

    await db.prepare(
      'UPDATE restaurants SET authCode = ?, authCodeExpiresAt = ? WHERE id = ?'
    ).bind(code, expiresAt, restaurantId).run();

    return jsonResponse({ code, expiresAt });
  } catch (error: any) {
    console.error('Error generating auth code:', error);
    return jsonResponse({ error: 'Internal Server Error', message: error.message }, 500);
  }
}
