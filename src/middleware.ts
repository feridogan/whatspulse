import { NextResponse, type NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'whatspulse-super-secure-secret-key-2026';
const TOKEN_NAME = 'whatspulse_token';

interface DecodedToken {
  userId: string;
  email: string;
  role: 'ADMIN' | 'USER';
  name: string;
  isActive?: boolean;
  exp?: number;
}

// Edge-compatible JWT verification using Web Crypto API
async function verifyJwt(token: string, secret: string): Promise<DecodedToken | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;

    // Decode and parse payload
    const decodedPayloadStr = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
    const payload: DecodedToken = JSON.parse(decodedPayloadStr);

    // Check expiration
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return null;
    }

    if (payload.isActive === false) {
      return null;
    }

    // Verify HMAC SHA-256 signature
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    // Convert signature from base64url to binary Uint8Array
    const rawSig = atob(signatureB64.replace(/-/g, '+').replace(/_/g, '/'));
    const sigBytes = new Uint8Array(rawSig.length);
    for (let i = 0; i < rawSig.length; i++) {
      sigBytes[i] = rawSig.charCodeAt(i);
    }

    const dataToVerify = encoder.encode(`${headerB64}.${payloadB64}`);
    const isValid = await crypto.subtle.verify('HMAC', key, sigBytes, dataToVerify);

    if (!isValid) return null;
    return payload;
  } catch (error) {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Static and Public System Assets (Bypass check)
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/icons') ||
    pathname.startsWith('/api/webhook') ||
    pathname === '/favicon.ico' ||
    pathname === '/manifest.json' ||
    pathname === '/sw.js'
  ) {
    return NextResponse.next();
  }

  // 2. Read token from cookie or Authorization header
  const cookieToken = req.cookies.get(TOKEN_NAME)?.value;
  const authHeader = req.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
  const token = cookieToken || bearerToken;

  const user = token ? await verifyJwt(token, JWT_SECRET) : null;

  // 3. Login Page Handling
  if (pathname === '/login' || pathname === '/api/auth/login') {
    if (user && pathname === '/login') {
      // Authenticated user trying to access /login -> redirect to dashboard
      return NextResponse.redirect(new URL('/', req.url));
    }
    return NextResponse.next();
  }

  // 4. Unauthenticated Access Protection
  if (!user) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Oturum açmanız gerekmektedir.' }, { status: 401 });
    }
    // Redirect to login page
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 5. Role-Based Access Control (RBAC)
  const isAdminOnlyPage = pathname.startsWith('/settings') || pathname.startsWith('/admin');
  const isAdminOnlyApi =
    pathname.startsWith('/api/settings') ||
    pathname.startsWith('/api/admin') ||
    pathname.startsWith('/api/evolution');

  if (isAdminOnlyPage || isAdminOnlyApi) {
    if (user.role !== 'ADMIN') {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Bu işlem için ADMIN yetkisi gerekmektedir.' },
          { status: 403 }
        );
      }
      // Redirect unauthorized user to dashboard
      return NextResponse.redirect(new URL('/', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
