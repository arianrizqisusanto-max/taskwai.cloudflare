import { verifySession, jsonResponse, handleOptions } from './_helper';

const getJakartaYearMonth = () => {
  const d = new Date(new Date().getTime() + 7 * 60 * 60 * 1000);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

export async function onRequest(context: any): Promise<Response> {
  const { request, env } = context;

  const corsResponse = handleOptions(request);
  if (corsResponse) return corsResponse;

  const session = await verifySession(request, env.DB);
  if (!session) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const db = env.DB;
  const restaurantId = session.restaurantId;

  try {
    // 1. GET: Fetch all daily profits
    if (request.method === 'GET') {
      const { results } = await db.prepare(
        'SELECT * FROM daily_profits WHERE restaurantId = ? ORDER BY date DESC, createdAt DESC'
      ).bind(restaurantId).all();

      return jsonResponse(results || []);
    }

    // 2. POST: Add daily profit (Always insert a new log entry)
    if (request.method === 'POST') {
      const entry = await request.json() as any;
      const { 
        date, profit, notes, omzet, hppType, hppVal, 
        otherExpenses, branchName, inputterName 
      } = entry;

      if (!date || profit === undefined) {
        return jsonResponse({ error: 'Date and profit are required' }, 400);
      }

      const targetYearMonth = date.substring(0, 7);
      const currentYearMonth = getJakartaYearMonth();
      if (targetYearMonth < currentYearMonth) {
        return jsonResponse({ error: 'Data untuk bulan-bulan lalu telah dikunci dan tidak dapat diubah.' }, 403);
      }

      const cleanBranch = branchName ? branchName.trim() : '';

      // Update restaurant branches list if it's a new branch
      if (cleanBranch) {
        const rest = await db.prepare(
          'SELECT branches FROM restaurants WHERE id = ?'
        ).bind(restaurantId).first();

        if (rest) {
          let branchesList: string[] = [];
          try {
            branchesList = rest.branches ? JSON.parse(rest.branches) : [];
          } catch (e) {}

          if (!branchesList.includes(cleanBranch)) {
            branchesList.push(cleanBranch);
            await db.prepare(
              'UPDATE restaurants SET branches = ? WHERE id = ?'
            ).bind(JSON.stringify(branchesList), restaurantId).run();
          }
        }
      }

      const nowStr = new Date().toISOString();

      // Create new entry
      const id = `dp_${restaurantId}_${date}_${Math.random().toString(36).substring(2, 7)}`;
      await db.prepare(
        `INSERT INTO daily_profits (
          id, restaurantId, date, profit, notes, createdAt, 
          omzet, hppType, hppVal, otherExpenses, branchName, inputterName
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        id,
        restaurantId,
        date,
        Number(profit),
        notes || '',
        nowStr,
        omzet !== undefined ? Number(omzet) : null,
        hppType || null,
        hppVal !== undefined ? Number(hppVal) : null,
        otherExpenses !== undefined ? Number(otherExpenses) : null,
        cleanBranch || null,
        inputterName || null
      ).run();

      const created = await db.prepare(
        'SELECT * FROM daily_profits WHERE id = ?'
      ).bind(id).first();

      return jsonResponse(created);
    }

    // 3. DELETE: Remove an entry
    if (request.method === 'DELETE') {
      const url = new URL(request.url);
      const id = url.searchParams.get('id');

      if (!id) {
        return jsonResponse({ error: 'ID is required' }, 400);
      }

      // Check if entry belongs to a past month
      const existing = await db.prepare(
        'SELECT date FROM daily_profits WHERE id = ? AND restaurantId = ?'
      ).bind(id, restaurantId).first();

      if (!existing) {
        return jsonResponse({ error: 'Entry not found' }, 404);
      }

      const targetYearMonth = existing.date.substring(0, 7);
      const currentYearMonth = getJakartaYearMonth();
      if (targetYearMonth < currentYearMonth) {
        return jsonResponse({ error: 'Data untuk bulan-bulan lalu telah dikunci dan tidak dapat diubah.' }, 403);
      }

      await db.prepare(
        'DELETE FROM daily_profits WHERE id = ? AND restaurantId = ?'
      ).bind(id, restaurantId).run();

      return jsonResponse({ success: true });
    }

    return jsonResponse({ error: 'Method not allowed' }, 405);
  } catch (error: any) {
    console.error('Error in /api/profits:', error);
    return jsonResponse({ error: 'Internal Server Error', message: error.message }, 500);
  }
}
