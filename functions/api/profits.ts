import { verifySession, jsonResponse, handleOptions } from './_helper';

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

    // 2. POST: Add or update daily profit
    if (request.method === 'POST') {
      const entry = await request.json() as any;
      const { 
        date, profit, notes, omzet, hppType, hppVal, 
        otherExpenses, branchName, inputterName 
      } = entry;

      if (!date || profit === undefined) {
        return jsonResponse({ error: 'Date and profit are required' }, 400);
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

      // Check if entry for this date AND branch already exists
      const existing = await db.prepare(
        'SELECT id FROM daily_profits WHERE restaurantId = ? AND date = ? AND (branchName = ? OR (branchName IS NULL AND ? = ""))'
      ).bind(restaurantId, date, cleanBranch, cleanBranch).first();

      const nowStr = new Date().toISOString();

      if (existing) {
        // Update existing entry
        await db.prepare(
          `UPDATE daily_profits SET 
            profit = ?, notes = ?, omzet = ?, hppType = ?, hppVal = ?, 
            otherExpenses = ?, inputterName = ?, createdAt = ? 
           WHERE id = ?`
        ).bind(
          Number(profit),
          notes || '',
          omzet !== undefined ? Number(omzet) : null,
          hppType || null,
          hppVal !== undefined ? Number(hppVal) : null,
          otherExpenses !== undefined ? Number(otherExpenses) : null,
          inputterName || null,
          nowStr,
          existing.id
        ).run();

        const updated = await db.prepare(
          'SELECT * FROM daily_profits WHERE id = ?'
        ).bind(existing.id).first();

        return jsonResponse(updated);
      } else {
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
    }

    // 3. DELETE: Remove an entry
    if (request.method === 'DELETE') {
      const url = new URL(request.url);
      const id = url.searchParams.get('id');

      if (!id) {
        return jsonResponse({ error: 'ID is required' }, 400);
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
