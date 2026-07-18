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
  if (!session) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const restaurantId = session.restaurantId;

  try {
    const nowStr = new Date().toISOString();

    // Get staff hash to delete account
    const rest = await db.prepare('SELECT staffHash FROM restaurants WHERE id = ?').bind(restaurantId).first();
    if (rest && rest.staffHash) {
      await db.prepare('DELETE FROM staff_accounts WHERE hash = ?').bind(rest.staffHash).run();
    }

    // Delete profits
    await db.prepare('DELETE FROM daily_profits WHERE restaurantId = ?').bind(restaurantId).run();

    // Reset expenses to 0
    await db.prepare('DELETE FROM expenses WHERE restaurantId = ?').bind(restaurantId).run();
    const currentMonth = nowStr.substring(0, 7);
    const expId = `${restaurantId}_${currentMonth}`;
    await db.prepare(
      `INSERT INTO expenses (id, restaurantId, month, sewaTempat, gajiKaryawan, royaltiFranchise, listrik, air, internet, marketing, pajak, biayaLain, cicilanBank, updatedAt) 
       VALUES (?, ?, ?, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, ?)`
    ).bind(expId, restaurantId, currentMonth, nowStr).run();

    // Reset restaurant
    await db.prepare(
      `UPDATE restaurants SET 
        name = 'Nama Usaha Baru', monthlyTargetProfit = 0, 
        staffUsername = '', staffPassword = '', staffHash = '', staffActive = 0, branches = '[]' 
       WHERE id = ?`
    ).bind(restaurantId).run();

    return jsonResponse({ success: true });
  } catch (error: any) {
    console.error('Error in /api/restaurant/reset handler:', error);
    return jsonResponse({ error: 'Internal Server Error', message: error.message }, 500);
  }
}
