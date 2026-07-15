import { verifySession, jsonResponse, handleOptions } from '../_helper';

export async function onRequest(context: any): Promise<Response> {
  const { request, env } = context;

  const corsResponse = handleOptions(request);
  if (corsResponse) return corsResponse;

  if (request.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const session = await verifySession(request, env.DB);
  if (!session) {
    return jsonResponse({ user: null }, 200);
  }

  try {
    const db = env.DB;
    if (session.role === 'owner') {
      const owner = await db.prepare(
        'SELECT * FROM owners WHERE id = ?'
      ).bind(session.userId).first();

      if (!owner) {
        return jsonResponse({ user: null }, 200);
      }

      return jsonResponse({
        user: {
          uid: owner.id,
          email: owner.email,
          name: owner.name,
          picture: owner.picture,
          role: 'owner'
        },
        restaurantId: session.restaurantId
      });
    } else {
      // Staff session active
      return jsonResponse({
        user: null,
        staffSession: {
          restaurantId: session.restaurantId,
          ownerId: session.userId,
          role: 'staff'
        }
      });
    }
  } catch (error: any) {
    console.error('Error in /api/auth/me:', error);
    return jsonResponse({ error: 'Internal Server Error' }, 500);
  }
}
