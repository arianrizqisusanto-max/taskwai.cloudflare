import { verifyGoogleToken, jsonResponse, handleOptions } from '../_helper';

export async function onRequest(context: any): Promise<Response> {
  const { request, env } = context;

  // Handle CORS Preflight
  const corsResponse = handleOptions(request);
  if (corsResponse) return corsResponse;

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const body = await request.json() as { idToken?: string };
    const { idToken } = body;

    if (!idToken) {
      return jsonResponse({ error: 'Google ID Token is required' }, 400);
    }

    // Verify Google ID Token
    const googleUser = await verifyGoogleToken(idToken);
    if (!googleUser) {
      return jsonResponse({ error: 'Invalid Google ID Token' }, 401);
    }

    const { sub: googleId, email, name, picture } = googleUser;
    const db = env.DB;

    // Check if owner already exists
    const existingOwner = await db.prepare(
      'SELECT * FROM owners WHERE id = ?'
    ).bind(googleId).first();

    const restaurantId = `rest_${googleId}`;

    if (!existingOwner) {
      // 1. Create new Owner
      const nowStr = new Date().toISOString();
      await db.prepare(
        'INSERT INTO owners (id, email, name, picture, createdAt) VALUES (?, ?, ?, ?, ?)'
      ).bind(googleId, email, name || null, picture || null, nowStr).run();

      // 2. Create Default Restaurant
      await db.prepare(
        'INSERT INTO restaurants (id, ownerId, name, monthlyTargetProfit, createdAt, branches) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(restaurantId, googleId, 'Warung Kopi Senja', 35000000, nowStr, '[]').run();

      // 3. Create Default Expenses
      const currentMonth = nowStr.substring(0, 7);
      const expId = `${restaurantId}_${currentMonth}`;
      await db.prepare(
        'INSERT INTO expenses (id, restaurantId, month, sewaTempat, gajiKaryawan, royaltiFranchise, listrik, air, internet, marketing, pajak, biayaLain, cicilanBank, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(expId, restaurantId, currentMonth, 6000000, 12000000, 2000000, 1800000, 500000, 350000, 1500000, 1200000, 1000000, 0, nowStr).run();
    }

    // Generate Session Token
    const sessionToken = crypto.randomUUID();
    const now = new Date();
    const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 Days

    await db.prepare(
      'INSERT INTO sessions (token, userId, role, restaurantId, createdAt, expiresAt) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(sessionToken, googleId, 'owner', restaurantId, now.toISOString(), expires.toISOString()).run();

    return jsonResponse({
      token: sessionToken,
      user: {
        uid: googleId,
        email,
        name,
        picture,
        role: 'owner'
      },
      restaurantId
    });

  } catch (error: any) {
    console.error('Error in /api/auth/google:', error);
    return jsonResponse({ error: 'Internal Server Error', message: error.message }, 500);
  }
}
