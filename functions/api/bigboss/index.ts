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

  const bossOwnerId = session.userId; // Google Sub ID or Owner UUID
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthStr = String(now.getMonth() + 1).padStart(2, '0');
  const todayStr = `${currentYear}-${currentMonthStr}-${String(now.getDate()).padStart(2, '0')}`;
  const monthPrefix = `${currentYear}-${currentMonthStr}`;

  try {
    // ==========================================
    // GET: Retrieve linked branches and their monthly stats
    // ==========================================
    if (request.method === 'GET') {
      // 1. Fetch aggregated branch profits for the current month
      const branchStatsQuery = await db.prepare(`
        SELECT 
          r.id as id,
          r.name as name,
          r.monthlyTargetProfit as monthlyTargetProfit,
          COALESCE(SUM(dp.profit), 0) as totalProfitMonth,
          COALESCE(SUM(CASE WHEN dp.date = ? THEN dp.profit ELSE 0 END), 0) as profitToday,
          COUNT(DISTINCT dp.date) as daysEntered
        FROM bigboss_links bl
        JOIN restaurants r ON bl.branchRestaurantId = r.id
        LEFT JOIN daily_profits dp ON r.id = dp.restaurantId AND dp.date LIKE ?
        WHERE bl.bossOwnerId = ?
        GROUP BY r.id, r.name, r.monthlyTargetProfit
      `).bind(todayStr, `${monthPrefix}-%`, bossOwnerId).all();

      const branchStats = branchStatsQuery.results || [];

      if (branchStats.length === 0) {
        return jsonResponse({ branches: [] });
      }

      // 2. Fetch monthly fixed expenses for all linked branches
      const expensesQuery = await db.prepare(`
        SELECT 
          restaurantId,
          sewaTempat, gajiKaryawan, royaltiFranchise, listrik, air, internet, marketing, pajak, cicilanBank, biayaLain
        FROM expenses
        WHERE month = ? AND restaurantId IN (
          SELECT branchRestaurantId FROM bigboss_links WHERE bossOwnerId = ?
        )
      `).bind(monthPrefix, bossOwnerId).all();

      const expensesList = expensesQuery.results || [];

      // Map expenses by restaurantId for O(1) retrieval
      const expensesMap = new Map<string, any>();
      for (const exp of expensesList) {
        const total = 
          (exp.sewaTempat || 0) +
          (exp.gajiKaryawan || 0) +
          (exp.royaltiFranchise || 0) +
          (exp.listrik || 0) +
          (exp.air || 0) +
          (exp.internet || 0) +
          (exp.marketing || 0) +
          (exp.pajak || 0) +
          (exp.cicilanBank || 0) +
          (exp.biayaLain || 0);
        expensesMap.set(exp.restaurantId, total);
      }

      // Combine profits and expenses to calculate final stats
      const branchesData = branchStats.map((branch: any) => {
        const totalExpenses = expensesMap.get(branch.id) || 0;
        return {
          id: branch.id,
          name: branch.name,
          monthlyTargetProfit: branch.monthlyTargetProfit,
          totalProfitMonth: branch.totalProfitMonth,
          profitToday: branch.profitToday,
          daysEntered: branch.daysEntered,
          totalExpenses
        };
      });

      return jsonResponse({ branches: branchesData });
    }

    // ==========================================
    // POST: Link a new branch using authorization code
    // ==========================================
    if (request.method === 'POST') {
      const body = await request.json() as any;
      const { code } = body;

      if (!code || typeof code !== 'string') {
        return jsonResponse({ error: 'Invalid request: code is required' }, 400);
      }

      const cleanCode = code.trim().toUpperCase();
      const currentIsoTime = new Date().toISOString();

      // Find restaurant with valid authorization code
      const restaurant = await db.prepare(
        'SELECT id, ownerId FROM restaurants WHERE authCode = ? AND authCodeExpiresAt > ?'
      ).bind(cleanCode, currentIsoTime).first();

      if (!restaurant) {
        return jsonResponse({ error: 'Kode otorisasi tidak valid atau sudah kedaluwarsa.' }, 400);
      }

      // Prevent Big Boss from linking their own main account as a branch (redundant)
      if (restaurant.ownerId === bossOwnerId) {
        return jsonResponse({ error: 'Anda tidak dapat menautkan akun utama Anda sendiri sebagai cabang.' }, 400);
      }

      const linkId = `${bossOwnerId}_${restaurant.id}`;
      const nowStr = new Date().toISOString();

      // Insert link using INSERT OR IGNORE to prevent duplicate errors
      await db.prepare(`
        INSERT OR IGNORE INTO bigboss_links (id, bossOwnerId, branchRestaurantId, createdAt)
        VALUES (?, ?, ?, ?)
      `).bind(linkId, bossOwnerId, restaurant.id, nowStr).run();

      // Expire authorization code immediately after use for security
      await db.prepare(
        'UPDATE restaurants SET authCode = NULL, authCodeExpiresAt = NULL WHERE id = ?'
      ).bind(restaurant.id).run();

      return jsonResponse({ success: true, message: 'Cabang berhasil ditambahkan!' });
    }

    // ==========================================
    // DELETE: Unlink a branch restaurant
    // ==========================================
    if (request.method === 'DELETE') {
      const url = new URL(request.url);
      const restaurantId = url.searchParams.get('restaurantId');

      if (!restaurantId) {
        return jsonResponse({ error: 'restaurantId query parameter is required' }, 400);
      }

      await db.prepare(
        'DELETE FROM bigboss_links WHERE bossOwnerId = ? AND branchRestaurantId = ?'
      ).bind(bossOwnerId, restaurantId).run();

      return jsonResponse({ success: true, message: 'Cabang berhasil dihapus dari pemantauan.' });
    }

    return jsonResponse({ error: 'Method Not Allowed' }, 405);
  } catch (error: any) {
    console.error('Error in /api/bigboss handler:', error);
    return jsonResponse({ error: 'Internal Server Error', message: error.message }, 500);
  }
}
