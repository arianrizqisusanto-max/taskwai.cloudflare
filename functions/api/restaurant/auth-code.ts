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

  // Only allow owners to access authorization code settings
  if (session.role !== 'owner') {
    return jsonResponse({ error: 'Forbidden: Owner role required' }, 403);
  }

  const restaurantId = session.restaurantId;

  try {
    // Check if this restaurant is currently linked and frozen to a Big Boss
    const link = await db.prepare(`
      SELECT bl.createdAt, o.name as bossName, o.email as bossEmail
      FROM bigboss_links bl
      JOIN owners o ON bl.bossOwnerId = o.id
      WHERE bl.branchRestaurantId = ?
    `).bind(restaurantId).first();

    // GET: Retrieve current freeze & auth code status
    if (request.method === 'GET') {
      if (link) {
        return jsonResponse({
          isFrozen: true,
          bossName: link.bossName || 'Big Boss',
          bossEmail: link.bossEmail || '',
          linkedAt: link.createdAt
        });
      }

      const rest = await db.prepare(
        'SELECT authCode, authCodeExpiresAt FROM restaurants WHERE id = ?'
      ).bind(restaurantId).first();

      const nowIso = new Date().toISOString();
      const isValid = rest?.authCode && rest?.authCodeExpiresAt && rest.authCodeExpiresAt > nowIso;

      return jsonResponse({
        isFrozen: false,
        code: isValid ? rest.authCode : null,
        expiresAt: isValid ? rest.authCodeExpiresAt : null
      });
    }

    // POST: Generate a new 6-character authorization code
    if (request.method === 'POST') {
      if (link) {
        return jsonResponse({
          error: 'Akun restoran Anda terhubung & terkunci (freeze) ke Big Boss. Minta akun Big Boss terkait melepaskan kunci (unlock) terlebih dahulu.'
        }, 400);
      }

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

      return jsonResponse({ isFrozen: false, code, expiresAt });
    }

    return jsonResponse({ error: 'Method Not Allowed' }, 405);
  } catch (error: any) {
    console.error('Error in /api/restaurant/auth-code:', error);
    return jsonResponse({ error: 'Internal Server Error', message: error.message }, 500);
  }
}
