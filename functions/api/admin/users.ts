import { jsonResponse, handleOptions, verifySession } from '../_helper';

export async function onRequest(context: any): Promise<Response> {
  const { request, env } = context;

  const corsResponse = handleOptions(request);
  if (corsResponse) return corsResponse;

  if (request.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const db = env.DB;

  try {
    // 1. Verifikasi Session Token
    const session = await verifySession(request, db);
    if (!session || !session.userId) {
      return jsonResponse({ error: 'Unauthorized: Harap login terlebih dahulu' }, 401);
    }

    // 2. Verifikasi Hak Akses: Hanya arianrisqi@gmail.com
    const currentOwner = await db.prepare('SELECT email FROM owners WHERE id = ?').bind(session.userId).first();
    const isMasterAdmin = currentOwner && currentOwner.email === 'arianrisqi@gmail.com';

    if (!isMasterAdmin) {
      return jsonResponse({ error: 'Forbidden: Akses ditolak. Hanya Owner Aplikasi yang berhak mengakses data ini.' }, 403);
    }

    // 3. Parse query parameters untuk pagination & search
    const url = new URL(request.url);
    const search = (url.searchParams.get('q') || '').trim();
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(5, parseInt(url.searchParams.get('limit') || '15', 10)));
    const offset = (page - 1) * limit;

    let totalCount = 0;
    let usersList: any[] = [];

    if (search) {
      const searchPattern = `%${search}%`;

      // Hitung total hasil pencarian
      const countRes = await db.prepare(`
        SELECT COUNT(DISTINCT o.id) as count
        FROM owners o
        LEFT JOIN restaurants r ON r.ownerId = o.id
        WHERE o.email LIKE ? OR o.name LIKE ? OR r.name LIKE ?
      `).bind(searchPattern, searchPattern, searchPattern).first();

      totalCount = countRes ? countRes.count : 0;

      // Ambil data dengan paging
      const { results } = await db.prepare(`
        SELECT 
          o.id,
          o.email,
          o.name as ownerName,
          o.picture,
          o.createdAt,
          o.accountType,
          r.name as restaurantName,
          r.id as restaurantId,
          (
            SELECT MAX(dp.date) 
            FROM daily_profits dp 
            WHERE dp.restaurantId = r.id
          ) as lastActiveProfitDate,
          (
            SELECT MAX(s.createdAt)
            FROM sessions s
            WHERE s.userId = o.id
          ) as lastLoginDate
        FROM owners o
        LEFT JOIN restaurants r ON r.ownerId = o.id
        WHERE o.email LIKE ? OR o.name LIKE ? OR r.name LIKE ?
        ORDER BY o.createdAt DESC
        LIMIT ? OFFSET ?
      `).bind(searchPattern, searchPattern, searchPattern, limit, offset).all();

      usersList = results || [];
    } else {
      // Hitung total semua pengguna
      const countRes = await db.prepare('SELECT COUNT(*) as count FROM owners').first();
      totalCount = countRes ? countRes.count : 0;

      // Ambil data default terurut dari yang terbaru mendaftar
      const { results } = await db.prepare(`
        SELECT 
          o.id,
          o.email,
          o.name as ownerName,
          o.picture,
          o.createdAt,
          o.accountType,
          r.name as restaurantName,
          r.id as restaurantId,
          (
            SELECT MAX(dp.date) 
            FROM daily_profits dp 
            WHERE dp.restaurantId = r.id
          ) as lastActiveProfitDate,
          (
            SELECT MAX(s.createdAt)
            FROM sessions s
            WHERE s.userId = o.id
          ) as lastLoginDate
        FROM owners o
        LEFT JOIN restaurants r ON r.ownerId = o.id
        ORDER BY o.createdAt DESC
        LIMIT ? OFFSET ?
      `).bind(limit, offset).all();

      usersList = results || [];
    }

    const totalPages = Math.ceil(totalCount / limit) || 1;

    return jsonResponse({
      users: usersList,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages
      }
    });

  } catch (e: any) {
    console.error('Error in /api/admin/users:', e);
    return jsonResponse({ error: 'Gagal memuat daftar pengguna', message: e.message }, 500);
  }
}
