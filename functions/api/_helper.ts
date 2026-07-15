export interface Session {
  token: string;
  userId: string;
  role: 'owner' | 'staff';
  restaurantId: string;
  createdAt: string;
  expiresAt: string;
}

export interface GooglePayload {
  iss: string;
  aud: string;
  exp: number;
  sub: string;
  email: string;
  name?: string;
  picture?: string;
}

// Convert base64url to Uint8Array for Web Crypto verification
function base64urlToUint8Array(base64url: string): Uint8Array {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Verify Google Sign-In ID Token (JWT) using Web Crypto API
export async function verifyGoogleToken(idToken: string): Promise<GooglePayload | null> {
  try {
    const parts = idToken.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;
    
    // Decode Header & Payload
    const header = JSON.parse(atob(headerB64.replace(/-/g, '+').replace(/_/g, '/')));
    const payload: GooglePayload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));

    // 1. Verify Issuer
    if (payload.iss !== 'https://accounts.google.com' && payload.iss !== 'accounts.google.com') {
      console.error('Invalid token issuer:', payload.iss);
      return null;
    }

    // 2. Verify Expiration
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (payload.exp < nowSeconds) {
      console.error('Token has expired');
      return null;
    }

    // 3. Verify Signature
    // Fetch Google public certificates (JWKs)
    const certsRes = await fetch('https://www.googleapis.com/oauth2/v3/certs', {
      cf: {
        cacheTtl: 86400, // Cache for 24 hours
        cacheEverything: true
      }
    } as any);
    if (!certsRes.ok) {
      throw new Error('Failed to fetch Google public keys');
    }
    const { keys } = await certsRes.json() as { keys: any[] };

    // Find the JWK matching the key ID (kid) in header
    const jwk = keys.find(k => k.kid === header.kid);
    if (!jwk) {
      console.error('JWK key not found for kid:', header.kid);
      return null;
    }

    // Import JWK
    const publicKey = await crypto.subtle.importKey(
      'jwk',
      jwk,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: { name: 'SHA-256' }
      },
      false,
      ['verify']
    );

    // Verify signature
    const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const signature = base64urlToUint8Array(signatureB64);

    const isSignatureValid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      publicKey,
      signature,
      data
    );

    if (!isSignatureValid) {
      console.error('Google ID Token signature is invalid');
      return null;
    }

    return payload;
  } catch (error) {
    console.error('Error verifying Google ID token:', error);
    return null;
  }
}

// Verify Session Token and return session if valid
export async function verifySession(request: Request, db: any): Promise<Session | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7).trim();
  if (!token) return null;

  try {
    const { results } = await db.prepare(
      'SELECT * FROM sessions WHERE token = ?'
    ).bind(token).all();

    if (!results || results.length === 0) {
      return null;
    }

    const session = results[0] as Session;

    // Check expiration
    if (new Date(session.expiresAt) < new Date()) {
      // Clean up expired session
      await db.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
      return null;
    }

    return session;
  } catch (error) {
    console.error('Database error in verifySession:', error);
    return null;
  }
}

// Generate a standard CORS / JSON Response
export function jsonResponse(data: any, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      ...headers
    }
  });
}

// Handle preflight OPTIONS requests
export function handleOptions(request: Request): Response | null {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400'
      }
    });
  }
  return null;
}
