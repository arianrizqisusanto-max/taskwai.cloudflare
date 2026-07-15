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
    if (request.method === 'GET') {
      const exp = await db.prepare(
        'SELECT * FROM expenses WHERE restaurantId = ?'
      ).bind(restaurantId).first();

      if (!exp) {
        // Create default if not found
        const expId = `exp_${session.userId}`;
        const nowStr = new Date().toISOString();
        await db.prepare(
          'INSERT INTO expenses (id, restaurantId, sewaTempat, gajiKaryawan, royaltiFranchise, listrik, air, internet, marketing, pajak, biayaLain, cicilanBank, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(expId, restaurantId, 6000000, 12000000, 2000000, 1800000, 500000, 350000, 1500000, 1200000, 1000000, 0, nowStr).run();

        const newExp = await db.prepare(
          'SELECT * FROM expenses WHERE restaurantId = ?'
        ).bind(restaurantId).first();

        return jsonResponse(newExp);
      }

      return jsonResponse(exp);
    }

    if (request.method === 'POST') {
      const body = await request.json() as any;
      const nowStr = new Date().toISOString();

      const fields = [
        'sewaTempat', 'gajiKaryawan', 'royaltiFranchise', 'listrik', 'air',
        'internet', 'marketing', 'pajak', 'biayaLain', 'cicilanBank'
      ];

      const updates: string[] = [];
      const values: any[] = [];

      for (const field of fields) {
        if (body[field] !== undefined) {
          updates.push(`${field} = ?`);
          values.push(Number(body[field]));
        }
      }

      updates.push('updatedAt = ?');
      values.push(nowStr);

      if (updates.length === 1) {
        return jsonResponse({ error: 'No fields to update' }, 400);
      }

      values.push(restaurantId);

      const query = `UPDATE expenses SET ${updates.join(', ')} WHERE restaurantId = ?`;
      await db.prepare(query).bind(...values).run();

      const updatedExp = await db.prepare(
        'SELECT * FROM expenses WHERE restaurantId = ?'
      ).bind(restaurantId).first();

      return jsonResponse(updatedExp);
    }

    return jsonResponse({ error: 'Method not allowed' }, 405);
  } catch (error: any) {
    console.error('Error in /api/expenses:', error);
    return jsonResponse({ error: 'Internal Server Error', message: error.message }, 500);
  }
}
