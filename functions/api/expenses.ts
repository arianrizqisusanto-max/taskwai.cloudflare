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
  const url = new URL(request.url);

  // Default to current month "YYYY-MM"
  const month = url.searchParams.get('month') || new Date().toISOString().substring(0, 7);

  try {
    if (request.method === 'GET') {
      const exp = await db.prepare(
        'SELECT * FROM expenses WHERE restaurantId = ? AND month = ?'
      ).bind(restaurantId, month).first();

      if (!exp) {
        // Find most recent month's expenses for cloning
        const lastExp = await db.prepare(
          'SELECT * FROM expenses WHERE restaurantId = ? ORDER BY month DESC LIMIT 1'
        ).bind(restaurantId).first();

        const defaults = lastExp || {
          sewaTempat: 6000000,
          gajiKaryawan: 12000000,
          royaltiFranchise: 2000000,
          listrik: 1800000,
          air: 500000,
          internet: 350000,
          marketing: 1500000,
          pajak: 1200000,
          biayaLain: 1000000,
          cicilanBank: 0
        };

        const expId = `${restaurantId}_${month}`;
        const nowStr = new Date().toISOString();
        
        await db.prepare(
          `INSERT INTO expenses (id, restaurantId, month, sewaTempat, gajiKaryawan, royaltiFranchise, listrik, air, internet, marketing, pajak, biayaLain, cicilanBank, updatedAt) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          expId, restaurantId, month,
          defaults.sewaTempat, defaults.gajiKaryawan, defaults.royaltiFranchise,
          defaults.listrik, defaults.air, defaults.internet,
          defaults.marketing, defaults.pajak, defaults.biayaLain,
          defaults.cicilanBank, nowStr
        ).run();

        const newExp = await db.prepare(
          'SELECT * FROM expenses WHERE restaurantId = ? AND month = ?'
        ).bind(restaurantId, month).first();

        return jsonResponse(newExp);
      }

      return jsonResponse(exp);
    }

    if (request.method === 'POST') {
      const body = await request.json() as any;
      const postMonth = body.month || month;
      const expId = `${restaurantId}_${postMonth}`;
      const nowStr = new Date().toISOString();

      const fields = [
        'sewaTempat', 'gajiKaryawan', 'royaltiFranchise', 'listrik', 'air',
        'internet', 'marketing', 'pajak', 'biayaLain', 'cicilanBank'
      ];

      // Check if monthly expenses row exists
      const existing = await db.prepare(
        'SELECT id FROM expenses WHERE id = ?'
      ).bind(expId).first();

      if (!existing) {
        // Insert new monthly record
        const values = [
          expId, restaurantId, postMonth,
          Number(body.sewaTempat !== undefined ? body.sewaTempat : 0),
          Number(body.gajiKaryawan !== undefined ? body.gajiKaryawan : 0),
          Number(body.royaltiFranchise !== undefined ? body.royaltiFranchise : 0),
          Number(body.listrik !== undefined ? body.listrik : 0),
          Number(body.air !== undefined ? body.air : 0),
          Number(body.internet !== undefined ? body.internet : 0),
          Number(body.marketing !== undefined ? body.marketing : 0),
          Number(body.pajak !== undefined ? body.pajak : 0),
          Number(body.biayaLain !== undefined ? body.biayaLain : 0),
          Number(body.cicilanBank !== undefined ? body.cicilanBank : 0),
          nowStr
        ];
        await db.prepare(
          `INSERT INTO expenses (id, restaurantId, month, sewaTempat, gajiKaryawan, royaltiFranchise, listrik, air, internet, marketing, pajak, biayaLain, cicilanBank, updatedAt) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(...values).run();
      } else {
        // Update existing record
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

        values.push(expId);

        const query = `UPDATE expenses SET ${updates.join(', ')} WHERE id = ?`;
        await db.prepare(query).bind(...values).run();
      }

      const updatedExp = await db.prepare(
        'SELECT * FROM expenses WHERE id = ?'
      ).bind(expId).first();

      return jsonResponse(updatedExp);
    }

    return jsonResponse({ error: 'Method not allowed' }, 405);
  } catch (error: any) {
    console.error('Error in /api/expenses:', error);
    return jsonResponse({ error: 'Internal Server Error', message: error.message }, 500);
  }
}
