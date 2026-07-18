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

  const restaurantId = session.restaurantId;

  try {
    // GET PROFILE
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

    // UPDATE PROFILE
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
    console.error('Error in /api/restaurant index handler:', error);
    return jsonResponse({ error: 'Internal Server Error', message: error.message }, 500);
  }
}
