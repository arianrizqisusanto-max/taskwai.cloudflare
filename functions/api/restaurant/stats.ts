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
    const activeRes = await db.prepare(`
      SELECT COUNT(DISTINCT restaurantId) as count FROM (
        SELECT restaurantId FROM daily_profits WHERE date = ?
        UNION
        SELECT restaurantId FROM sessions WHERE createdAt LIKE ? || '%'
      )
    `).bind(todayStr, todayStr).first();

    const totalBigBossRes = await db.prepare("SELECT COUNT(DISTINCT id) as count FROM owners WHERE accountType = 'bigboss' OR id IN (SELECT bossOwnerId FROM bigboss_links)").first();
    const activeBigBossRes = await db.prepare("SELECT COUNT(DISTINCT bossOwnerId) as count FROM bigboss_links").first();

    return jsonResponse({
      totalRestaurants: totalRes ? totalRes.count : 0,
      activeTodayCount: activeRes ? activeRes.count : 0,
      totalBigBoss: totalBigBossRes ? totalBigBossRes.count : 0,
      activeBigBoss: activeBigBossRes ? activeBigBossRes.count : 0
    });
  } catch (e: any) {
    return jsonResponse({ error: 'Failed to fetch stats', message: e.message }, 500);
  }
}
