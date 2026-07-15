import { jsonResponse, handleOptions } from '../_helper';

export async function onRequest(context: any): Promise<Response> {
  const { request, env } = context;

  const corsResponse = handleOptions(request);
  if (corsResponse) return corsResponse;

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token) {
      try {
        await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
      } catch (error) {
        console.error('Error deleting session:', error);
      }
    }
  }

  return jsonResponse({ success: true });
}
