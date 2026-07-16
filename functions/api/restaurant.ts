import { verifySession, jsonResponse, handleOptions } from './_helper';

export async function onRequest(context: any): Promise<Response> {
  const { request, env } = context;

  const corsResponse = handleOptions(request);
  if (corsResponse) return corsResponse;

  const url = new URL(request.url);
  const path = url.pathname;
  const db = env.DB;

  // 1. GET SYSTEM STATS (Admin only, or public for stats console)
  if (path.endsWith('/api/restaurant/stats') && request.method === 'GET') {
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

  // Authenticate session
  const session = await verifySession(request, db);
  if (!session) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const restaurantId = session.restaurantId;
  const userId = session.userId;

  try {
    // 2. RESET ALL DATA
    if (path.endsWith('/api/restaurant/reset') && request.method === 'POST') {
      const nowStr = new Date().toISOString();

      // Get staff hash to delete account
      const rest = await db.prepare('SELECT staffHash FROM restaurants WHERE id = ?').bind(restaurantId).first();
      if (rest && rest.staffHash) {
        await db.prepare('DELETE FROM staff_accounts WHERE hash = ?').bind(rest.staffHash).run();
      }

      // Delete profits
      await db.prepare('DELETE FROM daily_profits WHERE restaurantId = ?').bind(restaurantId).run();

      // Reset expenses
      await db.prepare('DELETE FROM expenses WHERE restaurantId = ?').bind(restaurantId).run();
      const currentMonth = nowStr.substring(0, 7);
      const expId = `${restaurantId}_${currentMonth}`;
      await db.prepare(
        `INSERT INTO expenses (id, restaurantId, month, sewaTempat, gajiKaryawan, royaltiFranchise, listrik, air, internet, marketing, pajak, biayaLain, cicilanBank, updatedAt) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(expId, restaurantId, currentMonth, 6000000, 12000000, 2000000, 1800000, 500000, 350000, 1500000, 1200000, 1000000, 0, nowStr).run();

      // Reset restaurant
      await db.prepare(
        `UPDATE restaurants SET 
          name = 'Nama Usaha Baru', monthlyTargetProfit = 0, 
          staffUsername = '', staffPassword = '', staffHash = '', staffActive = 0, branches = '[]' 
         WHERE id = ?`
      ).bind(restaurantId).run();

      return jsonResponse({ success: true });
    }

    // 3. GET PROFILE
    if (request.method === 'GET') {
      const rest = await db.prepare(
        'SELECT * FROM restaurants WHERE id = ?'
      ).bind(restaurantId).first();

      if (!rest) {
        return jsonResponse({ error: 'Restaurant not found' }, 404);
      }

      let branches = [];
      try {
        branches = rest.branches ? JSON.parse(rest.branches) : [];
      } catch (e) {}

      return jsonResponse({
        ...rest,
        branches
      });
    }

    // 4. UPDATE PROFILE
    if (request.method === 'POST') {
      const body = await request.json() as any;
      const { name, monthlyTargetProfit, branches } = body;

      const updates: string[] = [];
      const values: any[] = [];

      if (name !== undefined) {
        updates.push('name = ?');
        values.push(name);
      }
      if (monthlyTargetProfit !== undefined) {
        updates.push('monthlyTargetProfit = ?');
        values.push(Number(monthlyTargetProfit));
      }
      if (branches !== undefined) {
        updates.push('branches = ?');
        values.push(JSON.stringify(branches));
      }

      if (updates.length === 0) {
        return jsonResponse({ error: 'No fields to update' }, 400);
      }

      values.push(restaurantId);

      const query = `UPDATE restaurants SET ${updates.join(', ')} WHERE id = ?`;
      await db.prepare(query).bind(...values).run();

      const updatedRest = await db.prepare(
        'SELECT * FROM restaurants WHERE id = ?'
      ).bind(restaurantId).first();

      let parsedBranches = [];
      try {
        parsedBranches = updatedRest.branches ? JSON.parse(updatedRest.branches) : [];
      } catch (e) {}

      return jsonResponse({
        ...updatedRest,
        branches: parsedBranches
      });
    }

    return jsonResponse({ error: 'Method not allowed' }, 405);
  } catch (error: any) {
    console.error('Error in /api/restaurant handler:', error);
    return jsonResponse({ error: 'Internal Server Error', message: error.message }, 500);
  }
}
