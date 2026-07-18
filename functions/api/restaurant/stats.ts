import { jsonResponse, handleOptions } from '../_helper';

export async function onRequest(context: any): Promise<Response> {
  const { request, env } = context;

  const corsResponse = handleOptions(request);
  if (corsResponse) return corsResponse;

  if (request.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const url = new URL(request.url);
  const db = env.DB;

  try {
    const todayStr = url.searchParams.get('today') || new Date().toISOString().split('T')[0];
    
    const totalRes = await db.prepare('SELECT COUNT(*) as count FROM restaurants').first();
    const activeRes = await db.prepare(
      'SELECT COUNT(DISTINCT restaurantId) as count FROM daily_profits WHERE date = ?'
    ).bind(todayStr).first();

    return jsonResponse({
      totalRestaurants: totalRes ? totalRes.count : 0,
      activeTodayCount: activeRes ? activeRes.count : 0
    });
  } catch (e: any) {
    return jsonResponse({ error: 'Failed to fetch stats', message: e.message }, 500);
  }
}
