import { verifySession, jsonResponse, handleOptions } from '../_helper';

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

  try {
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
  } catch (error: any) {
    console.error('Error in /api/staff/toggle:', error);
    return jsonResponse({ error: 'Internal Server Error', message: error.message }, 500);
  }
}
