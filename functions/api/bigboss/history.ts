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

  // Only owners can access Big Boss features
  if (session.role !== 'owner') {
    return jsonResponse({ error: 'Forbidden: Owner role required' }, 403);
  }

  const bossOwnerId = session.userId;
  const url = new URL(request.url);
  const restaurantId = url.searchParams.get('restaurantId');
  const month = url.searchParams.get('month');

  if (!restaurantId || !month) {
    return jsonResponse({ error: 'restaurantId and month are required' }, 400);
  }

  try {
    if (request.method === 'GET') {
      // Verify that this branch belongs to this Big Boss
      const linkCheck = await db.prepare(
        'SELECT id FROM bigboss_links WHERE bossOwnerId = ? AND branchRestaurantId = ?'
      ).bind(bossOwnerId, restaurantId).first();

      if (!linkCheck) {
        return jsonResponse({ error: 'Forbidden: Branch not linked to your Big Boss account' }, 403);
      }

      // Fetch history
      const historyQuery = await db.prepare(
        'SELECT * FROM expenses_history WHERE restaurantId = ? AND month = ? ORDER BY updatedAt DESC'
      ).bind(restaurantId, month).all();

      return jsonResponse({ history: historyQuery.results || [] });
    }

    return jsonResponse({ error: 'Method Not Allowed' }, 405);
  } catch (error: any) {
    console.error('Error in /api/bigboss/history handler:', error);
    return jsonResponse({ error: 'Internal Server Error', message: error.message }, 500);
  }
}
